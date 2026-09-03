import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Paginated, paginate, toSkip } from '../../../common/dto/pagination.dto';
import { MEAL_CARD_SELECT, toMealCard } from '../../discovery/meals/meals.selectors';

/**
 * One place for everything a customer has said "keep this" about — saved meals,
 * saved reels and followed kitchens.
 *
 * The app shows these as one "Saved" area, so serving them from one service
 * keeps the counts consistent; the underlying join tables stay separate because
 * each carries different metadata.
 */
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Meals ────────────────────────────────────────────────────────────────

  async listMeals(userId: string, page = 1, limit = 20): Promise<Paginated<any>> {
    const where: Prisma.FavoriteWhereInput = { userId };

    const [rows, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
        select: { meal: { select: MEAL_CARD_SELECT } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    const ids = new Set(rows.map((r) => r.meal.id));
    return paginate(rows.map((r) => toMealCard(r.meal, ids)), page, limit, total);
  }

  async toggleMeal(userId: string, mealId: string) {
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

  // ── Counts for the Saved tab header ──────────────────────────────────────

  async getCounts(userId: string) {
    const [meals, reels, kitchens] = await Promise.all([
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.reelSave.count({ where: { userId } }),
      this.prisma.kitchenFollow.count({ where: { userId } }),
    ]);
    return { meals, reels, kitchens, total: meals + reels + kitchens };
  }
}
