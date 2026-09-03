import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodType, GoalTag, MealSlot } from '@prisma/client';

export class CreateMealCustomizationOptionDto {
  @ApiProperty({ example: 'Extra Butter' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 30, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceDelta?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateMealCustomizationGroupDto {
  @ApiProperty({ example: 'Add-ons' })
  @IsString()
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelect?: number;

  @ApiPropertyOptional({ example: 5, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSelect?: number;

  @ApiProperty({ type: [CreateMealCustomizationOptionDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateMealCustomizationOptionDto)
  options: CreateMealCustomizationOptionDto[];
}

/**
 * Create/replace shape for a dish. Nutrition fields are optional on the DTO
 * but the service refuses to publish (`isAvailable: true`) without calories
 * and protein set — the whole product's trust promise depends on that data
 * being real, not a gap the kitchen forgot to fill.
 */
export class UpsertMealDto {
  @ApiProperty({ example: 'Special North Indian Thali' })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Dal Makhani, Paneer, Raita, 4 Butter Rotis, Rice and Salad.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: [String], description: 'Upload via POST /upload first, then send the URLs' })
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ example: 249 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  price: number;

  @ApiPropertyOptional({ example: 299, description: 'Strike-through price' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mrp?: number;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  @IsEnum(FoodType)
  foodType: FoodType;

  @ApiPropertyOptional({ description: 'Time-slot category slug, e.g. "lunch"' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'Cuisine slug, e.g. "thali"' })
  @IsOptional()
  @IsString()
  cuisineSlug?: string;

  @ApiPropertyOptional({ enum: MealSlot, isArray: true, example: [MealSlot.LUNCH, MealSlot.DINNER] })
  @IsOptional()
  @IsArray()
  @IsEnum(MealSlot, { each: true })
  slots?: MealSlot[];

  @ApiPropertyOptional({ enum: GoalTag, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(GoalTag, { each: true })
  goalTags?: GoalTag[];

  @ApiProperty({ example: 720, description: 'kcal per serving — required to publish' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  calories: number;

  @ApiProperty({ example: 28, description: 'grams per serving — required to publish' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proteinG: number;

  @ApiPropertyOptional({ example: 88 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbsG?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fatG?: number;

  @ApiPropertyOptional({ example: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fiberG?: number;

  @ApiPropertyOptional({ example: '1 full thali (approx. 650 g)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  servingSize?: string;

  @ApiPropertyOptional({ type: [String], example: ['Whole urad dal', 'Paneer', 'Basmati rice'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  ingredients?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Dairy', 'Gluten'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ example: 25, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  prepTimeMins?: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Off by default for a brand-new dish so the kitchen can preview it first',
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ type: [CreateMealCustomizationGroupDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateMealCustomizationGroupDto)
  customizationGroups?: CreateMealCustomizationGroupDto[];
}

/** Same shape, every field optional — used for PATCH. */
export class UpdateMealDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(80) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) images?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) price?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) mrp?: number;
  @ApiPropertyOptional({ enum: FoodType }) @IsOptional() @IsEnum(FoodType) foodType?: FoodType;
  @ApiPropertyOptional() @IsOptional() @IsString() categorySlug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cuisineSlug?: string;
  @ApiPropertyOptional({ enum: MealSlot, isArray: true }) @IsOptional() @IsArray() @IsEnum(MealSlot, { each: true }) slots?: MealSlot[];
  @ApiPropertyOptional({ enum: GoalTag, isArray: true }) @IsOptional() @IsArray() @IsEnum(GoalTag, { each: true }) goalTags?: GoalTag[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) calories?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) proteinG?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) carbsG?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fatG?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fiberG?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) servingSize?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) ingredients?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) allergens?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(180) prepTimeMins?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestseller?: boolean;
}

export class MenuQueryDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Include unavailable/draft dishes too — defaults on, since this is the partner’s own view.',
  })
  @IsOptional()
  @Transform(({ value }) => value === undefined || value === true || value === 'true')
  @IsBoolean()
  includeUnavailable?: boolean = true;
}

export class SetMealAvailabilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable: boolean;
}
