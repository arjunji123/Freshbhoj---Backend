import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Paginated, paginate, toSkip } from '../../../common/dto/pagination.dto';
import { boundingBox, formatDistance, haversineKm, isKitchenOpenNow } from '../../../common/utils/kitchen';
import { MealQueryDto, MealSortBy, TrendingNearbyQueryDto } from './dto/meals.dto';
import {
  MEAL_CARD_SELECT,
  MEAL_DETAIL_SELECT,
  NEARBY_KITCHEN_SELECT,
  toMealCard,
  toMealDetail,
} from './meals.selectors';

@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // LIST / SEARCH / FILTER — backs the Home feed, Search, and kitchen menus
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(query: MealQueryDto, userId?: string): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = this.buildWhere(query);

    const [rows, total, favouriteIds] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        select: MEAL_CARD_SELECT,
        orderBy: this.buildOrderBy(query.sortBy),
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.meal.count({ where }),
      this.getFavouriteIds(userId),
    ]);

    let items = rows.map((row) => toMealCard(row, favouriteIds));

    // "Open only" depends on wall-clock time, which SQL can't filter on here.
    if (query.openOnly) {
      items = items.filter((m) => m.isOrderable);
    }

    return paginate(items, page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TRENDING NEAR YOU — demand-ranked, radius-limited
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Ranks by real demand (orders, then rating) among kitchens the customer can
   * actually be delivered from.
   *
   * The radius is applied as an indexed bounding-box prefilter in SQL and then
   * refined with an exact haversine distance in JS — Postgres cannot index a
   * trigonometric expression without PostGIS, and adding PostGIS for one rail
   * is not a trade worth making yet.
   */
  async findTrendingNearby(query: TrendingNearbyQueryDto, userId?: string): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const radiusKm = query.radiusKm ?? 8;
    const box = boundingBox(query.lat, query.lng, radiusKm);

    const where: Prisma.MealWhereInput = {
      isAvailable: true,
      kitchen: {
        status: 'ACTIVE',
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
      ...(query.goalTags?.length && { goalTags: { hasSome: query.goalTags } }),
      ...(query.cuisine && { cuisine: { slug: query.cuisine } }),
    };

    const [rows, favouriteIds] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        select: { ...MEAL_CARD_SELECT, kitchen: { select: NEARBY_KITCHEN_SELECT } },
        orderBy: [{ orderCount: 'desc' }, { rating: 'desc' }, { ratingCount: 'desc' }],
        // Over-fetch: the box is wider than the circle, so some rows are
        // dropped by the exact distance check below.
        take: (page + 2) * limit,
      }),
      this.getFavouriteIds(userId),
    ]);

    const withinRadius = rows
      .map((row) => {
        const kitchen = row.kitchen as any;
        const distanceKm = haversineKm(query.lat, query.lng, kitchen.latitude, kitchen.longitude);
        return { row, distanceKm };
      })
      .filter(({ distanceKm }) => distanceKm <= radiusKm);

    const total = withinRadius.length;
    const pageRows = withinRadius.slice(toSkip(page, limit), toSkip(page, limit) + limit);

    const items = pageRows.map(({ row, distanceKm }) => ({
      ...toMealCard(row as any, favouriteIds),
      distanceKm,
      distanceLabel: formatDistance(distanceKm),
    }));

    return paginate(items, page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL — nutrition transparency page
  // ──────────────────────────────────────────────────────────────────────────

  async findOne(mealId: string, userId?: string) {
    const meal = await this.prisma.meal.findFirst({
      // A dish from a kitchen that isn't ACTIVE yet (mid-onboarding, paused,
      // suspended) must not be reachable by id even though it has one — the
      // same visibility rule `findAll` already applies to the listing.
      where: { id: mealId, kitchen: { status: 'ACTIVE' } },
      select: MEAL_DETAIL_SELECT,
    });

    if (!meal) throw new NotFoundException('Meal not found');

    const favouriteIds = await this.getFavouriteIds(userId);
    return toMealDetail(meal, favouriteIds.has(meal.id));
  }

  /** "You may also like" — same kitchen first, then same category elsewhere. */
  async findSimilar(mealId: string, limit = 6, userId?: string) {
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, kitchen: { status: 'ACTIVE' } },
      select: { id: true, kitchenId: true, categoryId: true, goalTags: true },
    });
    if (!meal) throw new NotFoundException('Meal not found');

    const [rows, favouriteIds] = await Promise.all([
      this.prisma.meal.findMany({
        where: {
          id: { not: meal.id },
          isAvailable: true,
          kitchen: { status: 'ACTIVE' },
          OR: [
            { kitchenId: meal.kitchenId },
            ...(meal.categoryId ? [{ categoryId: meal.categoryId }] : []),
            ...(meal.goalTags.length ? [{ goalTags: { hasSome: meal.goalTags } }] : []),
          ],
        },
        select: MEAL_CARD_SELECT,
        orderBy: [{ rating: 'desc' }, { orderCount: 'desc' }],
        take: limit,
      }),
      this.getFavouriteIds(userId),
    ]);

    return rows.map((row) => toMealCard(row, favouriteIds));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FAVORITES
  // ──────────────────────────────────────────────────────────────────────────

  async toggleFavorite(userId: string, mealId: string) {
    const meal = await this.prisma.meal.findUnique({ where: { id: mealId }, select: { id: true } });
    if (!meal) throw new NotFoundException('Meal not found');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_mealId: { userId, mealId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { mealId, isFavorite: false };
    }

    await this.prisma.favorite.create({ data: { userId, mealId } });
    return { mealId, isFavorite: true };
  }

  async listFavorites(userId: string, page = 1, limit = 20): Promise<Paginated<any>> {
    const where: Prisma.FavoriteWhereInput = { userId };

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
        select: { meal: { select: MEAL_CARD_SELECT } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    const ids = new Set(favorites.map((f) => f.meal.id));
    return paginate(favorites.map((f) => toMealCard(f.meal, ids)), page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private buildWhere(query: MealQueryDto): Prisma.MealWhereInput {
    const where: Prisma.MealWhereInput = {
      isAvailable: true,
      kitchen: { status: 'ACTIVE' },
    };
    const and: Prisma.MealWhereInput[] = [];

    if (query.q) {
      and.push({
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          { kitchen: { name: { contains: query.q, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.goalTags?.length) and.push({ goalTags: { hasSome: query.goalTags } });
    if (query.slots?.length) and.push({ slots: { hasSome: query.slots } });
    if (query.foodTypes?.length) and.push({ foodType: { in: query.foodTypes } });
    if (query.category) and.push({ category: { slug: query.category } });
    if (query.cuisine) and.push({ cuisine: { slug: query.cuisine } });
    if (query.kitchenId) and.push({ kitchenId: query.kitchenId });

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      and.push({
        price: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      });
    }

    if (query.maxCalories !== undefined) and.push({ calories: { lte: query.maxCalories } });
    if (query.minProtein !== undefined) and.push({ proteinG: { gte: query.minProtein } });

    if (and.length) where.AND = and;
    return where;
  }

  private buildOrderBy(sortBy?: MealSortBy): Prisma.MealOrderByWithRelationInput[] {
    switch (sortBy) {
      case MealSortBy.RATING:
        return [{ rating: 'desc' }, { ratingCount: 'desc' }];
      case MealSortBy.PRICE_LOW:
        return [{ price: 'asc' }];
      case MealSortBy.PRICE_HIGH:
        return [{ price: 'desc' }];
      case MealSortBy.CALORIES_LOW:
        return [{ calories: 'asc' }];
      case MealSortBy.PROTEIN_HIGH:
        return [{ proteinG: 'desc' }];
      case MealSortBy.NEWEST:
        return [{ createdAt: 'desc' }];
      case MealSortBy.RECOMMENDED:
      default:
        // Bestsellers first, then what people actually order, then rating.
        return [{ isBestseller: 'desc' }, { orderCount: 'desc' }, { rating: 'desc' }];
    }
  }

  /** One query for the whole page instead of an is-favourite check per card. */
  private async getFavouriteIds(userId?: string): Promise<Set<string>> {
    if (!userId) return new Set();
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { mealId: true },
    });
    return new Set(favorites.map((f) => f.mealId));
  }

  /** Shared with CartService/OrdersService for the open-now guard. */
  static isKitchenOpen = isKitchenOpenNow;
}
