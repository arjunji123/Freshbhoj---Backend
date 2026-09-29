import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek, FoodType, MealSlot, SubscriptionBillingCycle } from '@prisma/client';

export class SubscriptionPlanDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: SubscriptionBillingCycle }) billingCycle: SubscriptionBillingCycle;
  @ApiProperty({ enum: DayOfWeek, isArray: true }) deliveryDays: DayOfWeek[];
  @ApiProperty() mealsPerDay: number;
  @ApiProperty() priceRs: number;
  @ApiPropertyOptional() originalPriceRs: number | null;
  @ApiProperty({ description: '0 when no discount' }) discountPercent: number;
  @ApiProperty({ enum: FoodType, isArray: true }) dietOptions: FoodType[];
  @ApiProperty() jainAvailable: boolean;
  @ApiProperty({ enum: MealSlot, isArray: true }) slotOptions: MealSlot[];
  @ApiProperty() includesDescription: string;
  @ApiProperty() isPopular: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() subscriberCount: number;
  @ApiProperty() createdAt: Date;
}
