import { Prisma } from '@prisma/client';
import { isKitchenOpenNow } from '../../../common/utils/kitchen';

/**
 * The exact shape every meal *card* in the app needs (Home feed, kitchen menu,
 * search results). Defined once so all three lists render identically.
 */
export const MEAL_CARD_SELECT = Prisma.validator<Prisma.MealSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  images: true,
  price: true,
  mrp: true,
  foodType: true,
  goalTags: true,
  slots: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  isAvailable: true,
  isBestseller: true,
  rating: true,
  ratingCount: true,
  prepTimeMins: true,
  kitchen: {
    select: {
      id: true,
      name: true,
      slug: true,
      isVerified: true,
      rating: true,
      locality: true,
      opensAt: true,
      closesAt: true,
      isAcceptingOrders: true,
    },
  },
  category: { select: { id: true, slug: true, name: true } },
});

export type MealCardRow = Prisma.MealGetPayload<{ select: typeof MEAL_CARD_SELECT }>;

/**
 * The kitchen fields a meal card needs *plus* coordinates, for the distance
 * maths behind "Trending Near You".
 */
export const NEARBY_KITCHEN_SELECT = Prisma.validator<Prisma.KitchenSelect>()({
  id: true,
  name: true,
  slug: true,
  isVerified: true,
  rating: true,
  locality: true,
  opensAt: true,
  closesAt: true,
  isAcceptingOrders: true,
  latitude: true,
  longitude: true,
});

export const MEAL_DETAIL_SELECT = Prisma.validator<Prisma.MealSelect>()({
  ...MEAL_CARD_SELECT,
  fiberG: true,
  servingSize: true,
  ingredients: true,
  allergens: true,
  orderCount: true,
  createdAt: true,
  customizationGroups: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      isRequired: true,
      minSelect: true,
      maxSelect: true,
      options: {
        where: { isAvailable: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, priceDelta: true, isDefault: true },
      },
    },
  },
});

export type MealDetailRow = Prisma.MealGetPayload<{ select: typeof MEAL_DETAIL_SELECT }>;

/**
 * Flattens the Prisma row into the response the app consumes, and folds in the
 * derived bits the client should never have to compute (open-now, discount %,
 * whether the meal can actually be added to the cart right now).
 */
export function toMealCard(meal: MealCardRow, favouriteMealIds: Set<string> = new Set()) {
  const kitchenOpen =
    meal.kitchen.isAcceptingOrders &&
    isKitchenOpenNow(meal.kitchen.opensAt, meal.kitchen.closesAt);

  return {
    id: meal.id,
    name: meal.name,
    slug: meal.slug,
    description: meal.description,
    image: meal.images[0] ?? null,
    images: meal.images,
    price: meal.price,
    mrp: meal.mrp,
    discountPercent:
      meal.mrp && meal.mrp > meal.price
        ? Math.round(((meal.mrp - meal.price) / meal.mrp) * 100)
        : 0,
    foodType: meal.foodType,
    goalTags: meal.goalTags,
    slots: meal.slots,
    nutrition: {
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    },
    rating: meal.rating,
    ratingCount: meal.ratingCount,
    prepTimeMins: meal.prepTimeMins,
    isBestseller: meal.isBestseller,
    isAvailable: meal.isAvailable,
    /** False when the meal is off, or its kitchen is shut — the card greys out. */
    isOrderable: meal.isAvailable && kitchenOpen,
    isFavorite: favouriteMealIds.has(meal.id),
    category: meal.category,
    kitchen: {
      id: meal.kitchen.id,
      name: meal.kitchen.name,
      slug: meal.kitchen.slug,
      isVerified: meal.kitchen.isVerified,
      rating: meal.kitchen.rating,
      locality: meal.kitchen.locality,
      isOpenNow: kitchenOpen,
    },
  };
}

export function toMealDetail(meal: MealDetailRow, isFavorite = false) {
  const card = toMealCard(meal as unknown as MealCardRow, isFavorite ? new Set([meal.id]) : new Set());

  return {
    ...card,
    nutrition: {
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
      fiberG: meal.fiberG,
      /**
       * Macro split as percentages of calories (4/4/9 kcal per gram).
       * Sent pre-computed so the macro ring on the detail page is a pure render.
       */
      macroSplit: buildMacroSplit(meal.proteinG, meal.carbsG, meal.fatG),
    },
    servingSize: meal.servingSize,
    ingredients: meal.ingredients,
    allergens: meal.allergens,
    orderCount: meal.orderCount,
    customizationGroups: meal.customizationGroups,
  };
}

function buildMacroSplit(
  proteinG?: number | null,
  carbsG?: number | null,
  fatG?: number | null,
) {
  const p = (proteinG ?? 0) * 4;
  const c = (carbsG ?? 0) * 4;
  const f = (fatG ?? 0) * 9;
  const total = p + c + f;

  if (total <= 0) return { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 };

  const proteinPercent = Math.round((p / total) * 100);
  const carbsPercent = Math.round((c / total) * 100);
  // Absorb rounding drift into fat so the three always sum to 100.
  return {
    proteinPercent,
    carbsPercent,
    fatPercent: 100 - proteinPercent - carbsPercent,
  };
}
