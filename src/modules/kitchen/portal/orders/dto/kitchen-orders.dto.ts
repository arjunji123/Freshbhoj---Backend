import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../../common/dto/pagination.dto';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',').map((v) => v.trim()).filter(Boolean);
};

export class KitchenOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];
}

/** The kitchen-facing subset of the customer's transition list — a partner
 * can move an order forward but never touches PENDING_PAYMENT or refunds. */
export class AdvanceOrderStatusDto {
  @ApiProperty({
    enum: [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
    example: OrderStatus.ACCEPTED,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Ran out of paneer, ask the customer to reorder' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
