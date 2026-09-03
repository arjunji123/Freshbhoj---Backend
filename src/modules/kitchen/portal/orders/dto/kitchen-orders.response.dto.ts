import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export class KitchenOrderItemDto {
  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    example: [{ name: 'Extra Butter', priceDelta: 30 }],
  })
  customizations: unknown;

  @ApiPropertyOptional({ nullable: true, example: 'Less spicy' })
  specialInstructions: string | null;
}

export class KitchenOrderCustomerDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  name: string;

  @ApiProperty({ example: '+919876543210' })
  phone: string;
}

export class KitchenOrderCardDto {
  @ApiProperty({ example: '6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c' })
  id: string;

  @ApiProperty({ example: 'FB-40213' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PLACED })
  status: OrderStatus;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.UPI })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 428, description: 'What the customer paid — the kitchen’s payout is computed separately' })
  totalAmount: number;

  @ApiProperty({ type: KitchenOrderCustomerDto })
  customer: KitchenOrderCustomerDto;

  @ApiProperty({ type: [KitchenOrderItemDto] })
  items: KitchenOrderItemDto[];

  @ApiPropertyOptional({ nullable: true, example: 'Ring the bell twice' })
  orderNotes: string | null;

  @ApiProperty({ example: '2026-09-03T12:30:00.000Z' })
  placedAt: string;

  @ApiProperty({ example: 40 })
  etaMinutes: number;

  @ApiProperty({
    type: [String],
    example: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
    description: 'What this order can legally move to next',
  })
  allowedNextStatuses: OrderStatus[];
}
