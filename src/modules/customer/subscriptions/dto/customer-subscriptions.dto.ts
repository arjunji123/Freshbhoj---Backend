import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DayOfWeek, FoodType, MealSlot, SubscriptionBillingCycle } from '@prisma/client';

const DELIVERY_DAY_VALUES = Object.values(DayOfWeek);
const BILLING_CYCLE_VALUES = Object.values(SubscriptionBillingCycle);

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  @IsUUID()
  kitchenId: string;

  @ApiProperty({ example: 'Weekday Lunch Thali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  planName: string;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  @IsEnum(FoodType)
  foodType: FoodType;

  @ApiProperty({ example: 1, minimum: 1, maximum: 3 })
  @IsInt()
  @Min(1)
  @Max(3)
  mealsPerDay: number;

  @ApiProperty({ enum: DELIVERY_DAY_VALUES, isArray: true, example: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DELIVERY_DAY_VALUES, { each: true })
  deliveryDays: DayOfWeek[];

  @ApiProperty({ enum: MealSlot, example: MealSlot.LUNCH })
  @IsEnum(MealSlot)
  deliveryTime: MealSlot;

  @ApiProperty({ enum: BILLING_CYCLE_VALUES, example: SubscriptionBillingCycle.WEEKLY })
  @IsIn(BILLING_CYCLE_VALUES)
  billingCycle: SubscriptionBillingCycle;

  @ApiPropertyOptional({ example: 'Leave at the security desk' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialInstructions?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Defaults to today (IST)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
