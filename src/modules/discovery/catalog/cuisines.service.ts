import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Cuisines are the *style* of food (Thali, Biryani, South Indian) and are
 * distinct from `MealCategory`, which is the time slot (Breakfast, Lunch).
 * Home surfaces both: pills and the cover-flow carousel are cuisines, the
 * four-tile grid is categories.
 */
@Injectable()
export class CuisinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const cuisines = await this.prisma.cuisine.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        iconUrl: true,
        imageUrl: true,
        _count: { select: { meals: { where: { isAvailable: true } } } },
      },
    });

    return cuisines.map((cuisine) => ({
      id: cuisine.id,
      slug: cuisine.slug,
      name: cuisine.name,
      iconUrl: cuisine.iconUrl,
      imageUrl: cuisine.imageUrl,
      mealCount: cuisine._count.meals,
    }));
  }
}
