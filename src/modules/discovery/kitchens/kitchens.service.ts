import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Paginated, paginate, toSkip } from '../../../common/dto/pagination.dto';
import { isKitchenOpenNow } from '../../../common/utils/kitchen';
import { MEAL_CARD_SELECT, toMealCard } from '../meals/meals.selectors';
import { KitchenQueryDto, KitchenSortBy } from './dto/kitchens.dto';

const KITCHEN_CARD_SELECT = Prisma.validator<Prisma.KitchenSelect>()({
  id: true,
  slug: true,
  name: true,
  tagline: true,
  logoUrl: true,
  coverImage: true,
  isVerified: true,
  rating: true,
  ratingCount: true,
  followerCount: true,
  locality: true,
  city: true,
  prepTimeMins: true,
  opensAt: true,
  closesAt: true,
  isAcceptingOrders: true,
});

@Injectable()
export class KitchensService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // LIST — "Featured / curated kitchens" rail on Home, and the full list
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(query: KitchenQueryDto): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.KitchenWhereInput = {
      status: 'ACTIVE',
      ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
      ...(query.locality && { locality: { equals: query.locality, mode: 'insensitive' } }),
      ...(query.verifiedOnly && { isVerified: true }),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { tagline: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.kitchen.findMany({
        where,
        select: {
          ...KITCHEN_CARD_SELECT,
          // One signature dish per card, exactly what the Home rail renders.
          meals: {
            where: { isAvailable: true },
            orderBy: [{ isBestseller: 'desc' }, { orderCount: 'desc' }],
            take: 1,
            select: { id: true, name: true, images: true, price: true },
          },
        },
        orderBy: this.buildOrderBy(query.sortBy),
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.kitchen.count({ where }),
    ]);

    let items = rows.map((row) => this.toKitchenCard(row));
    if (query.openOnly) items = items.filter((k) => k.isOpenNow);

    return paginate(items, page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL — Kitchen Profile screen
  // ──────────────────────────────────────────────────────────────────────────

  async findOne(idOrSlug: string, userId?: string) {
    const kitchen = await this.prisma.kitchen.findFirst({
      // A kitchen mid-onboarding (PENDING, unverified) must stay invisible to
      // customers even if someone guesses its id or slug — only ACTIVE
      // kitchens (approved by the team) are ever shown here.
      where: { status: 'ACTIVE', OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        ...KITCHEN_CARD_SELECT,
        description: true,
        addressLine: true,
        state: true,
        pincode: true,
        latitude: true,
        longitude: true,
        contactPhone: true,
        fssaiLicense: true,
        hygieneScore: true,
        status: true,
        createdAt: true,
        _count: { select: { meals: true, reels: true, reviews: true } },
      },
    });

    if (!kitchen) throw new NotFoundException('Kitchen not found');

    const isFollowing = userId
      ? (await this.prisma.kitchenFollow.findUnique({
          where: { userId_kitchenId: { userId, kitchenId: kitchen.id } },
          select: { id: true },
        })) !== null
      : false;

    return {
      ...this.toKitchenCard(kitchen),
      description: kitchen.description,
      address: {
        line: kitchen.addressLine,
        locality: kitchen.locality,
        city: kitchen.city,
        state: kitchen.state,
        pincode: kitchen.pincode,
        latitude: kitchen.latitude,
        longitude: kitchen.longitude,
      },
      contactPhone: kitchen.contactPhone,
      fssaiLicense: kitchen.fssaiLicense,
      hygieneScore: kitchen.hygieneScore,
      counts: {
        meals: kitchen._count.meals,
        reels: kitchen._count.reels,
        reviews: kitchen._count.reviews,
      },
      isFollowing,
      memberSince: kitchen.createdAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GALLERY — Phase 1 lightweight photo/video grid
  // ──────────────────────────────────────────────────────────────────────────

  async getMedia(kitchenId: string) {
    await this.assertExists(kitchenId);
    return this.prisma.kitchenMedia.findMany({
      where: { kitchenId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        caption: true,
        createdAt: true,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MENU — reuses the exact meal-card shape from the Home feed
  // ──────────────────────────────────────────────────────────────────────────

  async getMenu(kitchenId: string, page = 1, limit = 30, userId?: string): Promise<Paginated<any>> {
    await this.assertExists(kitchenId);

    const where: Prisma.MealWhereInput = { kitchenId };

    const [rows, total, favorites] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        select: MEAL_CARD_SELECT,
        orderBy: [{ isBestseller: 'desc' }, { isAvailable: 'desc' }, { orderCount: 'desc' }],
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.meal.count({ where }),
      userId
        ? this.prisma.favorite.findMany({ where: { userId }, select: { mealId: true } })
        : Promise.resolve([]),
    ]);

    const favouriteIds = new Set(favorites.map((f) => f.mealId));
    return paginate(rows.map((r) => toMealCard(r, favouriteIds)), page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FOLLOW
  // ──────────────────────────────────────────────────────────────────────────

  async toggleFollow(userId: string, kitchenId: string) {
    await this.assertExists(kitchenId);

    const existing = await this.prisma.kitchenFollow.findUnique({
      where: { userId_kitchenId: { userId, kitchenId } },
    });

    if (existing) {
      const [, kitchen] = await this.prisma.$transaction([
        this.prisma.kitchenFollow.delete({ where: { id: existing.id } }),
        this.prisma.kitchen.update({
          where: { id: kitchenId },
          data: { followerCount: { decrement: 1 } },
          select: { followerCount: true },
        }),
      ]);
      return { kitchenId, isFollowing: false, followerCount: kitchen.followerCount };
    }

    const [, kitchen] = await this.prisma.$transaction([
      this.prisma.kitchenFollow.create({ data: { userId, kitchenId } }),
      this.prisma.kitchen.update({
        where: { id: kitchenId },
        data: { followerCount: { increment: 1 } },
        select: { followerCount: true },
      }),
    ]);
    return { kitchenId, isFollowing: true, followerCount: kitchen.followerCount };
  }

  async listFollowed(userId: string, page = 1, limit = 20): Promise<Paginated<any>> {
    const where: Prisma.KitchenFollowWhereInput = { userId };

    const [follows, total] = await Promise.all([
      this.prisma.kitchenFollow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
        select: { kitchen: { select: KITCHEN_CARD_SELECT } },
      }),
      this.prisma.kitchenFollow.count({ where }),
    ]);

    return paginate(
      follows.map((f) => ({ ...this.toKitchenCard(f.kitchen), isFollowing: true })),
      page,
      limit,
      total,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private toKitchenCard(kitchen: any) {
    const isOpenNow =
      kitchen.isAcceptingOrders && isKitchenOpenNow(kitchen.opensAt, kitchen.closesAt);

    return {
      id: kitchen.id,
      slug: kitchen.slug,
      name: kitchen.name,
      tagline: kitchen.tagline,
      logoUrl: kitchen.logoUrl,
      coverImage: kitchen.coverImage,
      isVerified: kitchen.isVerified,
      rating: kitchen.rating,
      ratingCount: kitchen.ratingCount,
      followerCount: kitchen.followerCount,
      locality: kitchen.locality,
      city: kitchen.city,
      prepTimeMins: kitchen.prepTimeMins,
      openingHours: { opensAt: kitchen.opensAt, closesAt: kitchen.closesAt },
      isOpenNow,
      signatureDish: kitchen.meals?.[0]
        ? {
            id: kitchen.meals[0].id,
            name: kitchen.meals[0].name,
            image: kitchen.meals[0].images?.[0] ?? null,
            price: kitchen.meals[0].price,
          }
        : null,
    };
  }

  private buildOrderBy(sortBy?: KitchenSortBy): Prisma.KitchenOrderByWithRelationInput[] {
    switch (sortBy) {
      case KitchenSortBy.RATING:
        return [{ rating: 'desc' }, { ratingCount: 'desc' }];
      case KitchenSortBy.NEWEST:
        return [{ createdAt: 'desc' }];
      case KitchenSortBy.POPULAR:
        return [{ followerCount: 'desc' }];
      case KitchenSortBy.RECOMMENDED:
      default:
        return [{ isVerified: 'desc' }, { rating: 'desc' }, { followerCount: 'desc' }];
    }
  }

  /**
   * Used by every endpoint that scopes a request to one kitchen (gallery,
   * menu, follow). Only matches ACTIVE kitchens — the same visibility rule as
   * `findOne` — so a kitchen mid-onboarding cannot be reached by id even from
   * an authenticated request.
   */
  private async assertExists(kitchenId: string) {
    const exists = await this.prisma.kitchen.findFirst({
      where: { id: kitchenId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Kitchen not found');
  }
}
