import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
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
  ValidateIf,
} from 'class-validator';
import { DayOfWeek, FoodType, MealSlot, PaymentMethod, SubscriptionBillingCycle } from '@prisma/client';

const PAYMENT_METHOD_VALUES = Object.values(PaymentMethod);

const DELIVERY_DAY_VALUES = Object.values(DayOfWeek);
const BILLING_CYCLE_VALUES = Object.values(SubscriptionBillingCycle);

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  @IsUUID()
  kitchenId: string;

  @ApiPropertyOptional({
    example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c',
    description: 'Subscribing from a kitchen-authored plan — planName/mealsPerDay/deliveryDays/billingCycle are then taken from the plan, not from this body',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ default: false, description: "Only meaningful with planId, and only when that plan's jainAvailable is true" })
  @IsOptional()
  @IsBoolean()
  jainRequested?: boolean;

  @ApiPropertyOptional({ example: 'Weekday Lunch Thali', description: 'Required for a bespoke (non-plan) request' })
  @ValidateIf((o) => !o.planId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  planName?: string;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  @IsEnum(FoodType)
  foodType: FoodType;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 3, description: 'Required for a bespoke (non-plan) request' })
  @ValidateIf((o) => !o.planId)
  @IsInt()
  @Min(1)
  @Max(3)
  mealsPerDay?: number;

  @ApiPropertyOptional({
    enum: DELIVERY_DAY_VALUES,
    isArray: true,
    example: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    description: 'Required for a bespoke (non-plan) request',
  })
  @ValidateIf((o) => !o.planId)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DELIVERY_DAY_VALUES, { each: true })
  deliveryDays?: DayOfWeek[];

  @ApiProperty({ enum: MealSlot, example: MealSlot.LUNCH })
  @IsEnum(MealSlot)
  deliveryTime: MealSlot;

  @ApiPropertyOptional({ enum: BILLING_CYCLE_VALUES, example: SubscriptionBillingCycle.WEEKLY, description: 'Required for a bespoke (non-plan) request' })
  @ValidateIf((o) => !o.planId)
  @IsIn(BILLING_CYCLE_VALUES)
  billingCycle?: SubscriptionBillingCycle;

  @ApiPropertyOptional({ example: 'Leave at the security desk' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialInstructions?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Defaults to today (IST)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-1234-4321-8888-1234567890ab', description: 'A saved delivery address — bespoke wizard only' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHOD_VALUES, example: PaymentMethod.WALLET })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 50, description: 'Only applied when paymentMethod is WALLET — a real charge is required for a coin discount to make sense' })
  @IsOptional()
  @IsInt()
  @Min(0)
  requestedCoins?: number;
}

export class PauseSubscriptionDto {
  @ApiPropertyOptional({ example: 7, description: 'Auto-resumes after this many days — omit for an indefinite pause you resume yourself' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}

export class BulkPauseSubscriptionsDto {
  @ApiProperty({ example: 7, description: '"Vacation mode" — every active subscription auto-resumes after this many days' })
  @IsInt()
  @Min(1)
  @Max(90)
  days: number;
}

export class SwapDeliveryMealDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  @IsUUID()
  mealId: string;
}

export class QuoteSubscriptionDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  @IsUUID()
  kitchenId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 3 })
  @ValidateIf((o) => !o.planId)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  mealsPerDay?: number;

  @ApiPropertyOptional({ enum: DELIVERY_DAY_VALUES, isArray: true })
  @ValidateIf((o) => !o.planId)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DELIVERY_DAY_VALUES, { each: true })
  deliveryDays?: DayOfWeek[];

  @ApiPropertyOptional({ enum: BILLING_CYCLE_VALUES })
  @ValidateIf((o) => !o.planId)
  @IsIn(BILLING_CYCLE_VALUES)
  billingCycle?: SubscriptionBillingCycle;

  @ApiPropertyOptional({ enum: PAYMENT_METHOD_VALUES })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requestedCoins?: number;
}
