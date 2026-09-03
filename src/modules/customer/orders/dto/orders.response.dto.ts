import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliverySlotType, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { CartDto } from '../../cart/dto/cart.response.dto';

export class OrderKitchenDto {
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

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiPropertyOptional({ nullable: true, example: '+919876500011' })
  contactPhone: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;

  @ApiPropertyOptional({ nullable: true, example: 26.8505 })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 75.8065 })
  longitude: number | null;
}

export class OrderItemDto {
  @ApiProperty({ example: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null if the meal has since been deleted — the snapshot fields still render',
  })
  mealId: string | null;

  @ApiProperty({ example: 'Special North Indian Thali', description: 'Snapshot at order time' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;

  @ApiProperty({ example: 279 })
  unitPrice: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 558 })
  lineTotal: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    example: [{ id: '7a8b…', name: 'Extra Butter', priceDelta: 30 }],
  })
  customizations: unknown;

  @ApiPropertyOptional({ nullable: true, example: 'Make it less spicy' })
  specialInstructions: string | null;
}

export class OrderPricingDto {
  @ApiProperty({ example: 558 })
  itemsTotal: number;

  @ApiProperty({ example: 0 })
  deliveryFee: number;

  @ApiProperty({ example: 20 })
  taxes: number;

  @ApiProperty({ example: 150 })
  discount: number;

  @ApiProperty({ example: 428 })
  totalAmount: number;

  @ApiPropertyOptional({ nullable: true, example: 'FRESH150' })
  couponCode: string | null;
}

export class TrackingStepDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PREPARING })
  status: OrderStatus;

  @ApiProperty({ example: 'Preparing' })
  label: string;

  @ApiProperty({ example: 'Your meal is being freshly prepared' })
  description: string;

  @ApiProperty({ example: true, description: 'Renders in accent green' })
  isDone: boolean;

  @ApiProperty({ example: false, description: 'Renders in brand red' })
  isCurrent: boolean;

  @ApiPropertyOptional({ nullable: true, example: '2026-09-03T12:32:00.000Z' })
  at: string | null;
}

export class OrderTrackingStateDto {
  @ApiProperty({ example: false })
  isCancelled: boolean;

  @ApiProperty({ example: 2, description: 'Index into steps; -1 when cancelled' })
  currentIndex: number;

  @ApiProperty({ type: [TrackingStepDto] })
  steps: TrackingStepDto[];
}

export class OrderEtaDto {
  @ApiProperty({ example: 40 })
  etaMinutes: number;

  @ApiProperty({ example: '2026-09-03T13:10:00.000Z' })
  expectedAt: string;

  @ApiProperty({ example: 15 })
  minutesRemaining: number;

  @ApiProperty({ example: '12–18 mins', description: 'A range, not a number the kitchen can miss' })
  rangeLabel: string;
}

export class DeliveryPartnerDto {
  @ApiProperty({ example: '4d5e6f7a-8b9c-4d0e-8f1a-2b3c4d5e6f7a' })
  id: string;

  @ApiProperty({ example: 'Ravi Kumar' })
  name: string;

  @ApiProperty({ example: '+919876511111' })
  phone: string;

  @ApiPropertyOptional({ nullable: true })
  photoUrl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'RJ14 AB 4521' })
  vehicleNumber: string | null;
}

export class OrderSupportDto {
  @ApiProperty({ example: '+919876543210' })
  whatsapp: string;

  @ApiPropertyOptional({ nullable: true, example: '+919876500011' })
  kitchenPhone: string | null;
}

export class OrderSlotDto {
  @ApiProperty({ enum: DeliverySlotType, example: DeliverySlotType.NOW })
  type: DeliverySlotType;

  @ApiPropertyOptional({ nullable: true, example: '2026-09-03T13:30:00.000Z' })
  scheduledFor: string | null;
}

export class OrderCardDto {
  @ApiProperty({ example: '6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c' })
  id: string;

  @ApiProperty({ example: 'FB-40213' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PREPARING })
  status: OrderStatus;

  @ApiProperty({ example: 'Preparing' })
  statusLabel: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.UPI })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 428 })
  totalAmount: number;

  @ApiProperty({ example: 2 })
  itemCount: number;

  @ApiProperty({ type: [String], description: 'Up to 3 item images for the history card' })
  thumbnails: string[];

  @ApiProperty({ example: '2× Special North Indian Thali' })
  itemSummary: string;

  @ApiProperty({ type: OrderKitchenDto })
  kitchen: OrderKitchenDto;

  @ApiProperty({ example: '2026-09-03T12:30:00.000Z' })
  placedAt: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-09-03T13:15:00.000Z' })
  deliveredAt: string | null;

  @ApiProperty({ example: true, description: 'Still in flight' })
  isActive: boolean;

  @ApiProperty({ example: false })
  canReorder: boolean;

  @ApiProperty({ example: false, description: 'Drives the rating prompt' })
  isRated: boolean;

  @ApiProperty({ example: '2026-09-03T12:29:41.000Z' })
  createdAt: string;
}

export class OrderDetailDto extends OrderCardDto {
  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];

  @ApiProperty({ type: OrderPricingDto })
  pricing: OrderPricingDto;

  @ApiProperty({
    type: 'object',
    description: 'Address frozen at placement time — editing the saved address never rewrites history',
    example: {
      label: 'HOME',
      line1: 'Flat 402, Green Valley Apartments',
      locality: 'Malviya Nagar',
      city: 'Jaipur',
      pincode: '302017',
    },
  })
  address: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true, example: 'Ring the bell twice' })
  orderNotes: string | null;

  @ApiProperty({ type: OrderSlotDto })
  slot: OrderSlotDto;

  @ApiProperty({ type: OrderEtaDto })
  eta: OrderEtaDto;

  @ApiProperty({ type: OrderTrackingStateDto })
  tracking: OrderTrackingStateDto;

  @ApiPropertyOptional({ type: DeliveryPartnerDto, nullable: true })
  deliveryPartner: DeliveryPartnerDto | null;

  @ApiPropertyOptional({ nullable: true, example: 'Cancelled by customer' })
  cancelReason: string | null;

  @ApiProperty({ example: true, description: 'False once the kitchen starts preparing' })
  canCancel: boolean;

  @ApiProperty({ type: OrderSupportDto })
  support: OrderSupportDto;
}

/** Slim payload for the tracking screen's ~15s poll. */
export class OrderTrackingDto {
  @ApiProperty({ example: '6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c' })
  id: string;

  @ApiProperty({ example: 'FB-40213' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.OUT_FOR_DELIVERY })
  status: OrderStatus;

  @ApiProperty({ example: 'Out for delivery' })
  statusLabel: string;

  @ApiProperty({ example: false })
  canCancel: boolean;

  @ApiProperty({ type: OrderTrackingStateDto })
  tracking: OrderTrackingStateDto;

  @ApiProperty({ type: OrderEtaDto })
  eta: OrderEtaDto;

  @ApiProperty({ type: OrderKitchenDto })
  kitchen: OrderKitchenDto;

  @ApiPropertyOptional({ type: DeliveryPartnerDto, nullable: true })
  deliveryPartner: DeliveryPartnerDto | null;

  @ApiProperty({ type: OrderSupportDto })
  support: OrderSupportDto;
}

export class ReorderResultDto {
  @ApiProperty({ type: CartDto, description: 'The rebuilt cart' })
  cart: CartDto;

  @ApiProperty({ example: 2 })
  addedCount: number;

  @ApiProperty({
    type: [String],
    example: ['Moong Dal Khichdi'],
    description: 'Items no longer available, reported rather than silently dropped',
  })
  skippedItems: string[];
}
