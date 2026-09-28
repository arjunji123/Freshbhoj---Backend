import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PayoutStatus } from '@prisma/client';

const STATUS_VALUES = Object.values(PayoutStatus);

export class ListPayoutsAdminQueryDto {
  @ApiPropertyOptional({
    enum: STATUS_VALUES,
    description: 'Defaults to the actionable queue (REQUESTED, PROCESSING)',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: PayoutStatus;
}

export class CompletePayoutDto {
  @ApiProperty({ example: 'UTR-2026092912345', description: 'Placeholder reference — no real transfer/gateway API is wired' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  transferRef: string;
}

export class FailPayoutDto {
  @ApiProperty({ example: 'Bank rejected the transfer — IFSC no longer valid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}
