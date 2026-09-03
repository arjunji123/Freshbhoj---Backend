import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Paginated, paginate, toSkip } from '../../../common/dto/pagination.dto';
import { CreateReviewDto, ReviewQueryDto, ReviewSortBy } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // WRITE
  // ──────────────────────────────────────────────────────────────────────────

  async create(userId: string, kitchenId: string, dto: CreateReviewDto) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id: kitchenId },
      select: { id: true },
    });
    if (!kitchen) throw new NotFoundException('Kitchen not found');

    // A review tied to a delivered order of your own earns the "Verified" badge.
    let isVerified = false;
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true, userId: true, kitchenId: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.userId !== userId) throw new ForbiddenException('This order does not belong to you');
      if (order.kitchenId !== kitchenId) {
        throw new BadRequestException('This order is not from this kitchen');
      }
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('You can review an order once it has been delivered');
      }

      const existing = await this.prisma.review.findUnique({
        where: { orderId_userId: { orderId: dto.orderId, userId } },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('You have already reviewed this order');

      isVerified = true;
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        kitchenId,
        mealId: dto.mealId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        photos: dto.photos ?? [],
        tags: dto.tags ?? [],
        isVerified,
      },
      include: this.reviewerInclude(),
    });

    await this.recalculateRatings(kitchenId, dto.mealId);

    return this.toReview(review);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────────────────────────────

  async findForKitchen(kitchenId: string, query: ReviewQueryDto): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.ReviewWhereInput = {
      kitchenId,
      ...(query.rating && { rating: query.rating }),
      ...(query.mealId && { mealId: query.mealId }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: this.reviewerInclude(),
        orderBy: this.buildOrderBy(query.sortBy),
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(rows.map((r) => this.toReview(r)), page, limit, total);
  }

  async findForMeal(mealId: string, query: ReviewQueryDto): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.ReviewWhereInput = { mealId, ...(query.rating && { rating: query.rating }) };

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: this.reviewerInclude(),
        orderBy: this.buildOrderBy(query.sortBy),
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(rows.map((r) => this.toReview(r)), page, limit, total);
  }

  /**
   * Aggregate block above the review list: average, count, and the 5→1 star
   * histogram the UI draws as bars.
   */
  async getSummary(kitchenId: string) {
    const [grouped, aggregate] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { kitchenId },
        _count: { rating: true },
      }),
      this.prisma.review.aggregate({
        where: { kitchenId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const total = aggregate._count._all;
    const counts = new Map(grouped.map((g) => [g.rating, g._count.rating]));

    return {
      average: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      total,
      distribution: [5, 4, 3, 2, 1].map((star) => {
        const count = counts.get(star) ?? 0;
        return {
          star,
          count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      }),
    };
  }

  /** Delivered orders the user hasn't rated yet — powers the rating prompt. */
  async getPendingReviewPrompts(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: OrderStatus.DELIVERED,
        reviews: { none: { userId } },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        deliveredAt: true,
        kitchen: { select: { id: true, name: true, logoUrl: true } },
        items: { take: 1, select: { name: true, imageUrl: true, mealId: true } },
      },
    });

    return orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      deliveredAt: o.deliveredAt,
      kitchen: o.kitchen,
      highlightItem: o.items[0] ?? null,
    }));
  }

  async toggleHelpful(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    });
    return updated;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Ratings are denormalised onto kitchen/meal rows so every card can show a
   * rating without an aggregate query. Recomputed from source after each write.
   */
  private async recalculateRatings(kitchenId: string, mealId?: string) {
    const kitchenAgg = await this.prisma.review.aggregate({
      where: { kitchenId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await this.prisma.kitchen.update({
      where: { id: kitchenId },
      data: {
        rating: Math.round((kitchenAgg._avg.rating ?? 0) * 10) / 10,
        ratingCount: kitchenAgg._count._all,
      },
    });

    if (mealId) {
      const mealAgg = await this.prisma.review.aggregate({
        where: { mealId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await this.prisma.meal.update({
        where: { id: mealId },
        data: {
          rating: Math.round((mealAgg._avg.rating ?? 0) * 10) / 10,
          ratingCount: mealAgg._count._all,
        },
      });
    }
  }

  private reviewerInclude() {
    return {
      user: { select: { id: true, fullName: true, profileImage: true } },
      meal: { select: { id: true, name: true } },
    } satisfies Prisma.ReviewInclude;
  }

  private toReview(review: any) {
    const name: string = review.user?.fullName ?? 'FreshBhoj User';
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      photos: review.photos,
      tags: review.tags,
      isVerified: review.isVerified,
      likeCount: review.likeCount,
      createdAt: review.createdAt,
      meal: review.meal,
      author: {
        id: review.user?.id,
        name,
        avatar: review.user?.profileImage ?? null,
        // Fallback monogram for the avatar circle, e.g. "AM" for Arjun Mehta.
        initials: name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part[0]?.toUpperCase())
          .join(''),
      },
    };
  }

  private buildOrderBy(sortBy?: ReviewSortBy): Prisma.ReviewOrderByWithRelationInput[] {
    switch (sortBy) {
      case ReviewSortBy.HIGHEST:
        return [{ rating: 'desc' }, { createdAt: 'desc' }];
      case ReviewSortBy.LOWEST:
        return [{ rating: 'asc' }, { createdAt: 'desc' }];
      case ReviewSortBy.HELPFUL:
        return [{ likeCount: 'desc' }, { createdAt: 'desc' }];
      case ReviewSortBy.RECENT:
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}
