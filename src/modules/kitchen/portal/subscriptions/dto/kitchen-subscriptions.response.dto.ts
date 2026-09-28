import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek, DeliveryScheduleStatus, FoodType, MealSlot, PaymentStatus, SubscriptionBillingCycle, SubscriptionStatus } from '@prisma/client';
import { PageMetaDto } from '../../../../../common/dto/api-response.dto';

export class SubscriberDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  fullName: string | null;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional({ nullable: true })
  profileImage: string | null;
}

export class SubscriptionKitchenDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiProperty()
  slug: string;
}

export class SubscriptionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Weekday Lunch Thali' })
  planName: string;

  @ApiProperty({ enum: FoodType })
  foodType: FoodType;

  @ApiProperty({ example: 1 })
  mealsPerDay: number;

  @ApiProperty({ enum: DayOfWeek, isArray: true })
  deliveryDays: DayOfWeek[];

  @ApiProperty({ enum: MealSlot })
  deliveryTime: MealSlot;

  @ApiProperty({ enum: SubscriptionBillingCycle })
  billingCycle: SubscriptionBillingCycle;

  @ApiProperty({ example: 450, description: 'Frozen at creation — flat 4-week approximation for MONTHLY' })
  pricePerCycle: number;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional({ nullable: true })
  approvedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  pausedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ type: SubscriberDto, nullable: true, description: 'Present on kitchen-facing endpoints only' })
  customer?: SubscriberDto;

  @ApiPropertyOptional({ type: SubscriptionKitchenDto, nullable: true, description: 'Present on customer-facing endpoints only' })
  kitchen?: SubscriptionKitchenDto;
}

export class SubscriptionDeliveryDto {
  @ApiProperty()
  date: Date;

  @ApiProperty({ enum: DeliveryScheduleStatus })
  status: DeliveryScheduleStatus;

  @ApiPropertyOptional({ nullable: true })
  dispatchedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  skipReason: string | null;
}

export class SubscriptionBillingEventDto {
  @ApiProperty()
  cycleStart: Date;

  @ApiProperty({ example: 450 })
  amount: number;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus: PaymentStatus;
}

export class SubscriptionDetailDto extends SubscriptionDto {
  @ApiPropertyOptional({ nullable: true })
  specialInstructions: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason: string | null;

  @ApiProperty({ type: [SubscriptionDeliveryDto], description: 'Rolling today..+6 window, lazily backfilled while ACTIVE' })
  deliverySchedule: SubscriptionDeliveryDto[];

  @ApiProperty({ type: [SubscriptionBillingEventDto], description: 'Every cycle boundary already in the past, most recent first' })
  billingHistory: SubscriptionBillingEventDto[];
}

export class SubscriptionListDto {
  @ApiProperty({ type: [SubscriptionDto] })
  items: SubscriptionDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;

  @ApiProperty({ example: { PENDING: 2, ACTIVE: 14, PAUSED: 1, CANCELLED: 3, REJECTED: 0 } })
  counts: Record<SubscriptionStatus, number>;
}
