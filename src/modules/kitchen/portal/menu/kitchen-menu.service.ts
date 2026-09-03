import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MEAL_DETAIL_SELECT, toMealDetail } from '../../../discovery/meals/meals.selectors';
import { UpdateMealDto, UpsertMealDto } from './dto/kitchen-menu.dto';
import { OnboardingService } from '../../onboarding/onboarding.service';

/**
 * The partner's own menu — full CRUD scoped to their kitchen.
 *
 * Every read and write is preceded by an ownership check, and publishing a
 * dish (`isAvailable: true`) is refused without calories and protein: the
 * platform's whole "nutrition transparency" trust promise collapses the moment
 * one kitchen is allowed to skip it.
 */
@Injectable()
export class KitchenMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboardingService: OnboardingService,
  ) {}

  async list(accountId: string, includeUnavailable = true) {
    const kitchen = await this.requireKitchen(accountId);

    const meals = await this.prisma.meal.findMany({
      where: { kitchenId: kitchen.id, ...(includeUnavailable ? {} : { isAvailable: true }) },
      orderBy: [{ isAvailable: 'desc' }, { createdAt: 'desc' }],
      select: MEAL_DETAIL_SELECT,
    });

    return meals.map((meal) => toMealDetail(meal));
  }

  async findOne(accountId: string, mealId: string) {
    await this.getOwnedMeal(accountId, mealId);
    const meal = await this.prisma.meal.findUniqueOrThrow({
      where: { id: mealId },
      select: MEAL_DETAIL_SELECT,
    });
    return toMealDetail(meal as any);
  }

  async create(accountId: string, dto: UpsertMealDto) {
    const kitchen = await this.requireKitchen(accountId);

    const wantsPublished = dto.isAvailable ?? false;
    if (wantsPublished) this.assertPublishable(dto.calories, dto.proteinG);

    const [categoryId, cuisineId] = await Promise.all([
      this.resolveCategoryId(dto.categorySlug),
      this.resolveCuisineId(dto.cuisineSlug),
    ]);

    const meal = await this.prisma.meal.create({
      data: {
        kitchenId: kitchen.id,
        name: dto.name,
        slug: await this.buildUniqueSlug(kitchen.id, dto.name),
        description: dto.description,
        images: dto.images,
        price: dto.price,
        mrp: dto.mrp,
        foodType: dto.foodType,
        categoryId,
        cuisineId,
        slots: dto.slots ?? [],
        goalTags: dto.goalTags ?? [],
        calories: dto.calories,
        proteinG: dto.proteinG,
        carbsG: dto.carbsG,
        fatG: dto.fatG,
        fiberG: dto.fiberG,
        servingSize: dto.servingSize,
        ingredients: dto.ingredients ?? [],
        allergens: dto.allergens ?? [],
        prepTimeMins: dto.prepTimeMins ?? 25,
        isAvailable: wantsPublished,
        ...(dto.customizationGroups?.length && {
          customizationGroups: {
            create: dto.customizationGroups.map((group, groupIndex) => ({
              name: group.name,
              isRequired: group.isRequired ?? false,
              minSelect: group.minSelect ?? 0,
              maxSelect: group.maxSelect ?? 1,
              sortOrder: groupIndex,
              options: {
                create: group.options.map((option, optionIndex) => ({
                  name: option.name,
                  priceDelta: option.priceDelta ?? 0,
                  isDefault: option.isDefault ?? false,
                  sortOrder: optionIndex,
                })),
              },
            })),
          },
        }),
      },
      select: MEAL_DETAIL_SELECT,
    });

    // First dish ever added moves the onboarding funnel forward.
    await this.onboardingService.markMenuStarted(accountId);

    return toMealDetail(meal as any);
  }

  async update(accountId: string, mealId: string, dto: UpdateMealDto) {
    const existing = await this.getOwnedMeal(accountId, mealId);

    const nextCalories = dto.calories ?? existing.calories ?? undefined;
    const nextProtein = dto.proteinG ?? existing.proteinG ?? undefined;
    if (dto.isAvailable === true) this.assertPublishable(nextCalories, nextProtein);

    const [categoryId, cuisineId] = await Promise.all([
      dto.categorySlug !== undefined ? this.resolveCategoryId(dto.categorySlug) : undefined,
      dto.cuisineSlug !== undefined ? this.resolveCuisineId(dto.cuisineSlug) : undefined,
    ]);

    const updated = await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.mrp !== undefined && { mrp: dto.mrp }),
        ...(dto.foodType !== undefined && { foodType: dto.foodType }),
        ...(categoryId !== undefined && { categoryId }),
        ...(cuisineId !== undefined && { cuisineId }),
        ...(dto.slots !== undefined && { slots: dto.slots }),
        ...(dto.goalTags !== undefined && { goalTags: dto.goalTags }),
        ...(dto.calories !== undefined && { calories: dto.calories }),
        ...(dto.proteinG !== undefined && { proteinG: dto.proteinG }),
        ...(dto.carbsG !== undefined && { carbsG: dto.carbsG }),
        ...(dto.fatG !== undefined && { fatG: dto.fatG }),
        ...(dto.fiberG !== undefined && { fiberG: dto.fiberG }),
        ...(dto.servingSize !== undefined && { servingSize: dto.servingSize }),
        ...(dto.ingredients !== undefined && { ingredients: dto.ingredients }),
        ...(dto.allergens !== undefined && { allergens: dto.allergens }),
        ...(dto.prepTimeMins !== undefined && { prepTimeMins: dto.prepTimeMins }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.isBestseller !== undefined && { isBestseller: dto.isBestseller }),
      },
      select: MEAL_DETAIL_SELECT,
    });

    return toMealDetail(updated as any);
  }

  async setAvailability(accountId: string, mealId: string, isAvailable: boolean) {
    const existing = await this.getOwnedMeal(accountId, mealId);
    if (isAvailable) this.assertPublishable(existing.calories ?? undefined, existing.proteinG ?? undefined);

    const updated = await this.prisma.meal.update({
      where: { id: mealId },
      data: { isAvailable },
      select: { id: true, isAvailable: true },
    });
    return updated;
  }

  async remove(accountId: string, mealId: string) {
    await this.getOwnedMeal(accountId, mealId);
    await this.prisma.meal.delete({ where: { id: mealId } });
    return { id: mealId };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private assertPublishable(calories?: number | null, proteinG?: number | null) {
    if (calories === null || calories === undefined || proteinG === null || proteinG === undefined) {
      throw new BadRequestException(
        'Calories and protein must be set before this dish can be made available — nutrition transparency is the core FreshBhoj promise.',
      );
    }
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId } });
    if (!kitchen) {
      throw new BadRequestException('Complete onboarding to create your kitchen first');
    }
    return kitchen;
  }

  /**
   * Always pulls `id`, `kitchenId`, `calories` and `proteinG` alongside
   * whatever the caller asks for — every call site here only ever needs a
   * subset of that fixed set, so one shape avoids fighting Prisma's generic
   * `select` inference for what would be a single-use type parameter.
   */
  private async getOwnedMeal(accountId: string, mealId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');

    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      select: { id: true, kitchenId: true, calories: true, proteinG: true },
    });
    if (!meal) throw new NotFoundException('Meal not found');
    if (meal.kitchenId !== kitchen.id) {
      throw new ForbiddenException('This dish does not belong to your kitchen');
    }

    return meal;
  }

  private async resolveCategoryId(slug?: string): Promise<string | null> {
    if (!slug) return null;
    const category = await this.prisma.mealCategory.findUnique({ where: { slug }, select: { id: true } });
    return category?.id ?? null;
  }

  private async resolveCuisineId(slug?: string): Promise<string | null> {
    if (!slug) return null;
    const cuisine = await this.prisma.cuisine.findUnique({ where: { slug }, select: { id: true } });
    return cuisine?.id ?? null;
  }

  private async buildUniqueSlug(kitchenId: string, name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'dish';
    let slug = base;
    let suffix = 1;
    while (
      await this.prisma.meal.findUnique({
        where: { kitchenId_slug: { kitchenId, slug } },
        select: { id: true },
      })
    ) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }
}
