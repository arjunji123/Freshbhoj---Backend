import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GOAL_TAGS } from './catalog.constants';
import { AreaSearchQueryDto, ServiceabilityQueryDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Meal categories for the Home grid (Breakfast / Lunch / Dinner / Snacks). */
  async getCategories() {
    return this.prisma.mealCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, iconUrl: true, slot: true },
    });
  }

  getGoalTags() {
    return GOAL_TAGS;
  }

  /** Localities we deliver to — powers the "select your area" onboarding step. */
  async getServiceableAreas(query: AreaSearchQueryDto) {
    const areas = await this.prisma.serviceableArea.findMany({
      where: {
        isActive: true,
        ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
        ...(query.q && { locality: { contains: query.q, mode: 'insensitive' } }),
      },
      orderBy: [{ sortOrder: 'asc' }, { locality: 'asc' }],
      select: {
        id: true,
        city: true,
        state: true,
        locality: true,
        pincode: true,
        latitude: true,
        longitude: true,
      },
    });

    return areas;
  }

  /**
   * Answers "do we deliver here?" for the onboarding location step.
   * A miss is not an error — the app shows a warm "not in your area yet" state,
   * so this always resolves with `serviceable: false` plus something to suggest.
   */
  async checkServiceability(query: ServiceabilityQueryDto) {
    const area = await this.prisma.serviceableArea.findFirst({
      where: {
        isActive: true,
        OR: [
          ...(query.pincode ? [{ pincode: query.pincode }] : []),
          ...(query.locality
            ? [{ locality: { equals: query.locality, mode: 'insensitive' as const } }]
            : []),
        ],
      },
    });

    if (area) {
      return {
        serviceable: true,
        area: {
          id: area.id,
          locality: area.locality,
          city: area.city,
          state: area.state,
          pincode: area.pincode,
        },
        nearbyAreas: [],
      };
    }

    // Nothing matched — offer the closest thing we do serve.
    const nearbyAreas = await this.prisma.serviceableArea.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 5,
      select: { id: true, locality: true, city: true, pincode: true },
    });

    return {
      serviceable: false,
      area: null,
      nearbyAreas,
      message: 'We are not live in your area yet — but we are expanding fast across Jaipur.',
    };
  }
}
