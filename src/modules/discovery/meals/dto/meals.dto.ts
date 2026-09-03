import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodType, GoalTag, MealSlot } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export enum MealSortBy {
  RECOMMENDED = 'recommended',
  RATING = 'rating',
  PRICE_LOW = 'price_low',
  PRICE_HIGH = 'price_high',
  CALORIES_LOW = 'calories_low',
  PROTEIN_HIGH = 'protein_high',
  NEWEST = 'newest',
}

/** Accepts both `?goalTags=A&goalTags=B` and `?goalTags=A,B`. */
const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

export class MealQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search over meal name/description' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: GoalTag, isArray: true, description: 'Goal chips: HIGH_PROTEIN, LOW_CALORIE, …' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(GoalTag, { each: true })
  goalTags?: GoalTag[];

  @ApiPropertyOptional({ enum: MealSlot, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(MealSlot, { each: true })
  slots?: MealSlot[];

  @ApiPropertyOptional({ enum: FoodType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(FoodType, { each: true })
  foodTypes?: FoodType[];

  @ApiPropertyOptional({ description: 'Category slug (time slot), e.g. "lunch"' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Cuisine slug (style of food), e.g. "thali"' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ description: 'Restrict to one kitchen' })
  @IsOptional()
  @IsUUID()
  kitchenId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 600, description: 'Upper bound on calories per serving' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCalories?: number;

  @ApiPropertyOptional({ example: 25, description: 'Lower bound on protein (g) per serving' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minProtein?: number;

  @ApiPropertyOptional({ description: 'Hide meals whose kitchen is currently closed' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openOnly?: boolean;

  @ApiPropertyOptional({ enum: MealSortBy, default: MealSortBy.RECOMMENDED })
  @IsOptional()
  @IsEnum(MealSortBy)
  sortBy?: MealSortBy = MealSortBy.RECOMMENDED;
}

/**
 * "Trending Near You" — ranked by real demand within a radius of the customer.
 * Latitude and longitude are required: without them there is no "near you", and
 * silently falling back to a city-wide list would be a different feature wearing
 * the same label.
 */
export class TrendingNearbyQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 26.8505, description: 'Customer latitude' })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 75.8065, description: 'Customer longitude' })
  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: 8, minimum: 0.5, maximum: 50, default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  radiusKm?: number = 8;

  @ApiPropertyOptional({ enum: GoalTag, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(GoalTag, { each: true })
  goalTags?: GoalTag[];

  @ApiPropertyOptional({ description: 'Cuisine slug to narrow the rail' })
  @IsOptional()
  @IsString()
  cuisine?: string;
}
