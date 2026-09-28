import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class SendKitchenOrderMessageDto {
  @ApiProperty({ example: 'Your order is out for delivery!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.OUT_FOR_DELIVERY,
    description: 'Only ACCEPTED, PREPARING, OUT_FOR_DELIVERY or CANCELLED are valid — applied as a real status transition alongside the message',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  advanceToStatus?: OrderStatus;
}
