import { Injectable } from '@nestjs/common';
import { GoalTag, MealSlot } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { KitchensService } from '../kitchens/kitchens.service';
import { MealsService } from '../meals/meals.service';
import { OrdersService } from '../../customer/orders/orders.service';
import { ReelsService } from '../reels/reels.service';
import { MealSortBy } from '../meals/dto/meals.dto';
import { KitchenSortBy } from '../kitchens/dto/kitchens.dto';
import { ReelFeedType } from '../reels/dto/reels.dto';

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    private readonly kitchensService: KitchensService,
    private readonly mealsService: MealsService,
    private readonly ordersService: OrdersService,
    private readonly reelsService: ReelsService,
  ) {}

  /**
   * Everything the Home screen renders above the infinite meal feed, in one
   * round-trip. The feed itself paginates separately via GET /meals, so this
   * payload stays a fixed size no matter how far the user scrolls.
   */
  async getFeed(userId?: string) {
    const [
      categories,
      featuredKitchens,
      recommendedMeals,
      trendingReels,
      activeOrders,
    ] = await Promise.all([
      this.catalogService.getCategories(),
      this.kitchensService.findAll({
        page: 1,
        limit: 10,
        verifiedOnly: true,
        sortBy: KitchenSortBy.RECOMMENDED,
      }),
      this.mealsService.findAll(
        { page: 1, limit: 10, sortBy: MealSortBy.RECOMMENDED },
        userId,
      ),
      this.reelsService.getFeed({ page: 1, limit: 6, feed: ReelFeedType.TRENDING }, userId),
      userId ? this.ordersService.findActive(userId) : Promise.resolve([]),
    ]);

    return {
      greeting: this.buildGreeting(),
      /** The slot we lead with, so Home feels different at 8am vs 8pm. */
      currentSlot: this.currentSlot(),
      goalTags: this.catalogService.getGoalTags(),
      categories,
      featuredKitchens: featuredKitchens.items,
      recommendedMeals: recommendedMeals.items,
      trendingReels: trendingReels.items,
      activeOrders,
    };
  }

  /** Search suggestions shown before the user has typed anything. */
  async getSearchSuggestions() {
    const [popularMeals, popularKitchens] = await Promise.all([
      this.prisma.meal.findMany({
        where: { isAvailable: true },
        orderBy: { orderCount: 'desc' },
        take: 8,
        select: { id: true, name: true },
      }),
      this.prisma.kitchen.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { followerCount: 'desc' },
        take: 6,
        select: { id: true, name: true, slug: true, logoUrl: true, isVerified: true },
      }),
    ]);

    return {
      trendingSearches: popularMeals.map((m) => m.name),
      popularKitchens,
      goalTags: this.catalogService.getGoalTags(),
    };
  }

  private buildGreeting(): string {
    const hour = this.istHour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private currentSlot(): MealSlot {
    const hour = this.istHour();
    if (hour < 11) return MealSlot.BREAKFAST;
    if (hour < 16) return MealSlot.LUNCH;
    if (hour < 19) return MealSlot.SNACKS;
    return MealSlot.DINNER;
  }

  private istHour(): number {
    const now = new Date();
    const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
    return ist.getHours();
  }

  /** Exported for reuse; keeps the enum import honest. */
  static readonly ALL_GOALS = Object.values(GoalTag);
}
