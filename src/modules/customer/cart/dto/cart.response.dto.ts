import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, FoodType } from '@prisma/client';

export class CartCustomizationDto {
  @ApiProperty({ example: '7a8b9c0d-1e2f-4a3b-8c7d-6e5f4a3b2c1d' })
  id: string;

  @ApiProperty({ example: 'Extra Butter' })
  name: string;

  @ApiProperty({ example: 30 })
  priceDelta: number;
}

export class CartLineMealDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;

  @ApiProperty({ example: 249, description: 'Before add-ons' })
  basePrice: number;

  @ApiPropertyOptional({ nullable: true, example: 299 })
  mrp: number | null;

  @ApiProperty({ enum: FoodType, example: FoodType.VEG })
  foodType: FoodType;

  @ApiPropertyOptional({ nullable: true, example: 720 })
  calories: number | null;

  @ApiPropertyOptional({ nullable: true, example: 28 })
  proteinG: number | null;

  @ApiProperty({ example: true, description: 'False blocks checkout until the line is removed' })
  isAvailable: boolean;
}

export class CartLineDto {
  @ApiProperty({ example: '5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a' })
  id: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiPropertyOptional({ nullable: true, example: 'Make it less spicy, no onions' })
  specialInstructions: string | null;

  @ApiProperty({ example: 279, description: 'Base price plus the selected add-ons' })
  unitPrice: number;

  @ApiProperty({ example: 558 })
  lineTotal: number;

  @ApiProperty({ type: [CartCustomizationDto] })
  customizations: CartCustomizationDto[];

  @ApiProperty({ type: CartLineMealDto })
  meal: CartLineMealDto;
}

export class CartKitchenDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiProperty({ example: 'annapurna-kitchen' })
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: 25 })
  prepTimeMins: number;

  @ApiProperty({ example: true })
  isOpenNow: boolean;
}

export class PriceBreakdownDto {
  @ApiProperty({ example: 558 })
  itemsTotal: number;

  @ApiProperty({ example: 0, description: 'Free at or above the threshold' })
  deliveryFee: number;

  @ApiProperty({ example: 20, description: '5% GST on the post-discount subtotal' })
  taxes: number;

  @ApiProperty({ example: 150 })
  discount: number;

  @ApiProperty({ example: 428 })
  totalAmount: number;

  @ApiProperty({ example: true })
  freeDeliveryApplied: boolean;

  @ApiProperty({ example: 0, description: 'Rupees still needed to unlock free delivery' })
  amountToFreeDelivery: number;

  @ApiProperty({ example: 99 })
  minOrderValue: number;

  @ApiProperty({ example: 499 })
  freeDeliveryAbove: number;
}

export class CartCouponDto {
  @ApiPropertyOptional({ nullable: true, example: 'FRESH150' })
  code: string | null;

  @ApiPropertyOptional({ nullable: true, example: '₹150 off your first order' })
  title: string | null;

  @ApiProperty({ example: 150 })
  discount: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Add ₹41 more to use this coupon',
    description: 'Set when a previously-applied coupon stopped qualifying',
  })
  invalidReason: string | null;
}

export class CartCheckoutStateDto {
  @ApiProperty({ example: true })
  canCheckout: boolean;

  @ApiProperty({
    type: [String],
    example: [],
    description: 'Human-readable reasons checkout is blocked; empty when ready',
  })
  blockers: string[];
}

export class CartDto {
  @ApiProperty({ example: '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: false })
  isEmpty: boolean;

  @ApiProperty({ example: 2, description: 'Sum of quantities, for the nav badge' })
  itemCount: number;

  @ApiPropertyOptional({
    type: CartKitchenDto,
    nullable: true,
    description: 'A cart holds meals from one kitchen only; null when empty',
  })
  kitchen: CartKitchenDto | null;

  @ApiProperty({ type: [CartLineDto] })
  items: CartLineDto[];

  @ApiProperty({ type: CartCouponDto })
  coupon: CartCouponDto;

  @ApiProperty({ type: PriceBreakdownDto })
  pricing: PriceBreakdownDto;

  @ApiProperty({ type: CartCheckoutStateDto })
  checkout: CartCheckoutStateDto;

  @ApiProperty({ example: '2026-09-03T09:24:11.482Z' })
  updatedAt: string;
}

export class CartCountDto {
  @ApiProperty({ example: 3, description: 'Sum of quantities' })
  itemCount: number;

  @ApiProperty({ example: 2, description: 'Number of distinct lines' })
  lineCount: number;
}

export class CouponDto {
  @ApiProperty({ example: 'FRESH150' })
  code: string;

  @ApiProperty({ example: '₹150 off your first order' })
  title: string;

  @ApiPropertyOptional({ nullable: true, example: 'Valid on orders above ₹399. New customers only.' })
  description: string | null;

  @ApiProperty({ enum: CouponType, example: CouponType.FLAT })
  type: CouponType;

  @ApiProperty({ example: 150, description: 'Rupees for FLAT, percent for PERCENT' })
  value: number;

  @ApiProperty({ example: 399 })
  minOrderValue: number;

  @ApiPropertyOptional({ nullable: true, example: 100, description: 'Caps PERCENT coupons' })
  maxDiscount: number | null;

  @ApiProperty({ example: '2027-03-03T00:00:00.000Z' })
  validTill: string;

  @ApiProperty({ example: true, description: 'Whether the current subtotal qualifies' })
  isApplicable: boolean;

  @ApiProperty({ example: 0, description: 'Rupees short of the minimum order value' })
  amountNeeded: number;
}
