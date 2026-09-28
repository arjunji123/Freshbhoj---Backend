import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { ReelCampaignStatus } from '@prisma/client';

const STATUS_VALUES = Object.values(ReelCampaignStatus);

export class CreateCampaignDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f', description: 'Must be one of your own PUBLISHED, unpaused reels' })
  @IsUUID()
  reelId: string;

  @ApiProperty({ example: 200, description: 'Daily budget in whole rupees' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dailyBudgetRs: number;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Omit for an indefinite campaign' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ListCampaignsQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: ReelCampaignStatus;
}
