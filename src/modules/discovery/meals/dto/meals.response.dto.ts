import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodType, GoalTag, MealSlot } from '@prisma/client';

export class MealNutritionDto {
  @ApiPropertyOptional({ nullable: true, example: 720, description: 'kcal per serving' })
  calories: number | null;

  @ApiPropertyOptional({ nullable: true, example: 28 })
  proteinG: number | null;

  @ApiPropertyOptional({ nullable: true, example: 88 })
  carbsG: number | null;

  @ApiPropertyOptional({ nullable: true, example: 24 })
  fatG: number | null;
}

export class MacroSplitDto {
  @ApiProperty({ example: 20, description: 'Share of calories from protein' })
  proteinPercent: number;

  @ApiProperty({ example: 62 })
  carbsPercent: number;

  @ApiProperty({ example: 18 })
  fatPercent: number;
}

export class MealDetailNutritionDto extends MealNutritionDto {
  @ApiPropertyOptional({ nullable: true, example: 11 })
  fiberG: number | null;

  @ApiProperty({
    type: MacroSplitDto,
    description: 'Pre-computed so the macro ring on the detail page is a pure render',
  })
  macroSplit: MacroSplitDto;
}

export class MealKitchenRefDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiProperty({ example: 'annapurna-kitchen' })
  slug: string;

  @ApiProperty({ example: true, description: 'Curated-kitchen trust badge' })
  isVerified: boolean;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;

  @ApiProperty({ example: true, description: 'Derived from opening hours + isAcceptingOrders' })
  isOpenNow: boolean;
}

export class MealCategoryRefDto {
  @ApiProperty({ example: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiProperty({ example: 'lunch' })
  slug: string;

  @ApiProperty({ example: 'Lunch' })
  name: string;
}

export class MealCardDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiProperty({ example: 'special-north-indian-thali' })
  slug: string;

  @ApiPropertyOptional({ nullable: true, example: 'Dal Makhani, Paneer, Raita, 4 Butter Rotis, Rice and Salad.' })
  description: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'First image — what the card renders' })
  image: string | null;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty({ example: 249, description: 'Whole rupees — the app never shows paise' })
  price: number;

  @ApiPropertyOptional({ nullable: true, example: 299, description: 'Strike-through price' })
  mrp: number | null;

  @ApiProperty({ example: 17 })
  discountPercent: number;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  foodType: FoodType;

  @ApiProperty({ enum: GoalTag, isArray: true, example: [GoalTag.HIGH_PROTEIN] })
  goalTags: GoalTag[];

  @ApiProperty({ enum: MealSlot, isArray: true, example: [MealSlot.LUNCH, MealSlot.DINNER] })
  slots: MealSlot[];

  @ApiProperty({ type: MealNutritionDto })
  nutrition: MealNutritionDto;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 1243 })
  ratingCount: number;

  @ApiProperty({ example: 25 })
  prepTimeMins: number;

  @ApiProperty({ example: true })
  isBestseller: boolean;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({
    example: true,
    description: 'False when the meal is off OR its kitchen is shut — the card greys out',
  })
  isOrderable: boolean;

  @ApiProperty({ example: false, description: 'Personalised; always false when signed out' })
  isFavorite: boolean;

  @ApiPropertyOptional({ type: MealCategoryRefDto, nullable: true })
  category: MealCategoryRefDto | null;

  @ApiProperty({ type: MealKitchenRefDto })
  kitchen: MealKitchenRefDto;
}

export class CustomizationOptionDto {
  @ApiProperty({ example: '7a8b9c0d-1e2f-4a3b-8c7d-6e5f4a3b2c1d' })
  id: string;

  @ApiProperty({ example: 'Extra Butter' })
  name: string;

  @ApiProperty({ example: 30, description: 'Added to the unit price when selected' })
  priceDelta: number;

  @ApiProperty({ example: false })
  isDefault: boolean;
}

export class CustomizationGroupDto {
  @ApiProperty({ example: '9c0d1e2f-3a4b-4c5d-8e7f-6a5b4c3d2e1f' })
  id: string;

  @ApiProperty({ example: 'Add-ons' })
  name: string;

  @ApiProperty({ example: false })
  isRequired: boolean;

  @ApiProperty({ example: 0 })
  minSelect: number;

  @ApiProperty({ example: 5, description: '1 makes the group single-select' })
  maxSelect: number;

  @ApiProperty({ type: [CustomizationOptionDto] })
  options: CustomizationOptionDto[];
}

export class MealDetailDto extends MealCardDto {
  @ApiProperty({ type: MealDetailNutritionDto })
  declare nutrition: MealDetailNutritionDto;

  @ApiPropertyOptional({ nullable: true, example: '1 full thali (approx. 650 g)' })
  servingSize: string | null;

  @ApiProperty({ type: [String], example: ['Whole urad dal', 'Paneer', 'Basmati rice'] })
  ingredients: string[];

  @ApiProperty({ type: [String], example: ['Dairy', 'Gluten'] })
  allergens: string[];

  @ApiProperty({ example: 412 })
  orderCount: number;

  @ApiProperty({ type: [CustomizationGroupDto] })
  customizationGroups: CustomizationGroupDto[];
}

export class FavoriteToggleDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  mealId: string;

  @ApiProperty({ example: true, description: 'State after the toggle' })
  isFavorite: boolean;
}

/** A meal card with the distance from the customer, used by Trending Near You. */
export class NearbyMealCardDto extends MealCardDto {
  @ApiProperty({ example: 1.2, description: 'Straight-line distance in km' })
  distanceKm: number;

  @ApiProperty({ example: '1.2 km', description: 'Pre-formatted for the card' })
  distanceLabel: string;
}
