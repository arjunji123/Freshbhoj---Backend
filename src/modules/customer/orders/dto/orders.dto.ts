import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliverySlotType, OrderStatus, PaymentMethod } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class PlaceOrderDto {
  @ApiProperty({ description: 'Delivery address id from /addresses' })
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.UPI })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: DeliverySlotType, default: DeliverySlotType.NOW })
  @IsOptional()
  @IsEnum(DeliverySlotType)
  slotType?: DeliverySlotType;

  @ApiPropertyOptional({ example: '2026-09-03T13:30:00.000Z', description: 'Required when slotType is SCHEDULED' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({ example: 'Any instructions for the chef? (e.g. less spicy, no onions)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  orderNotes?: string;
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional({ example: 'pay_MkT91xQ', description: 'Gateway payment reference' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentRef?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'Ordered by mistake' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/** Accepts `?status=PLACED,PREPARING` as well as repeated params. */
const toStatusArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',').map((v) => v.trim()).filter(Boolean);
};

export class OrderHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus, isArray: true })
  @IsOptional()
  @Transform(toStatusArray)
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];
}
