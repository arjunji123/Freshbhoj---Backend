import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KitchenAccountStatus } from '@prisma/client';

const STATUS_VALUES = Object.values(KitchenAccountStatus);

export class ListKitchenAccountsQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES, description: 'Defaults to UNDER_REVIEW — the approval queue.' })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: KitchenAccountStatus;
}

export class RejectKitchenAccountDto {
  @ApiProperty({ example: 'FSSAI licence photo is unreadable — please re-upload.' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
