import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../../common/dto/pagination.dto';

const STATUS_VALUES = Object.values(SubscriptionStatus);

export class ListSubscriptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: 'Meena', description: 'Matches against the subscriber name or phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class RejectSubscriptionDto {
  @ApiProperty({ example: 'Outside our delivery radius' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}

export class SkipDeliveryDto {
  @ApiPropertyOptional({ example: 'Kitchen closed for a family event' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
