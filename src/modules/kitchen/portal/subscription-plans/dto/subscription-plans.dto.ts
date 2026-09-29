import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek, FoodType, MealSlot, SubscriptionBillingCycle } from '@prisma/client';

const DAY_VALUES = Object.values(DayOfWeek);
const FOOD_TYPE_VALUES = Object.values(FoodType);
const SLOT_VALUES = Object.values(MealSlot);
const BILLING_CYCLE_VALUES = Object.values(SubscriptionBillingCycle);

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Weekly Plan' })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: BILLING_CYCLE_VALUES, example: SubscriptionBillingCycle.WEEKLY })
  @IsIn(BILLING_CYCLE_VALUES)
  billingCycle: SubscriptionBillingCycle;

  @ApiProperty({ enum: DAY_VALUES, isArray: true, example: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DAY_VALUES, { each: true })
  deliveryDays: DayOfWeek[];

  @ApiProperty({ example: 1, minimum: 1, maximum: 3, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  mealsPerDay: number;

  @ApiProperty({ example: 999 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceRs: number;

  @ApiPropertyOptional({ example: 1299, description: 'Struck-through original price — omit for no discount badge' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originalPriceRs?: number;

  @ApiProperty({ enum: FOOD_TYPE_VALUES, isArray: true, example: [FoodType.VEG] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(FOOD_TYPE_VALUES, { each: true })
  dietOptions: FoodType[];

  @ApiPropertyOptional({ default: false, description: 'Offer a Jain-style option alongside the diet choices above' })
  @IsOptional()
  @IsBoolean()
  jainAvailable?: boolean;

  @ApiProperty({ enum: SLOT_VALUES, isArray: true, example: [MealSlot.LUNCH] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(SLOT_VALUES, { each: true })
  slotOptions: MealSlot[];

  @ApiProperty({ example: '1 Sabzi, 4 Roti, Dal, Rice, Salad & Sweet' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  includesDescription: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}

/** Same shape, every field optional — used for PATCH, plus the isActive toggle. */
export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(60) name?: string;
  @ApiPropertyOptional({ enum: BILLING_CYCLE_VALUES }) @IsOptional() @IsIn(BILLING_CYCLE_VALUES) billingCycle?: SubscriptionBillingCycle;
  @ApiPropertyOptional({ enum: DAY_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DAY_VALUES, { each: true })
  deliveryDays?: DayOfWeek[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3) mealsPerDay?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) priceRs?: number;
  @ApiPropertyOptional({ description: 'Send 0 to clear the discount badge' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  originalPriceRs?: number;
  @ApiPropertyOptional({ enum: FOOD_TYPE_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(FOOD_TYPE_VALUES, { each: true })
  dietOptions?: FoodType[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() jainAvailable?: boolean;
  @ApiPropertyOptional({ enum: SLOT_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(SLOT_VALUES, { each: true })
  slotOptions?: MealSlot[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(300) includesDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
