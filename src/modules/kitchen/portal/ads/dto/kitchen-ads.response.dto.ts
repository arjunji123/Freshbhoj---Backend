import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReelCampaignStatus } from '@prisma/client';

export class CampaignReelDto {
  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty()
  videoUrl: string;

  @ApiPropertyOptional({ nullable: true })
  caption: string | null;
}

export class EstimatedReachDto {
  @ApiProperty({ example: 1280 })
  min: number;

  @ApiProperty({ example: 1920 })
  max: number;
}

export class CampaignDailyStatDto {
  @ApiProperty()
  date: Date;

  @ApiProperty({ example: 340 })
  impressions: number;

  @ApiProperty({ example: 22 })
  clicks: number;
}

/**
 * `spendRs`/`impressions`/`clicks`/`ordersCount`/`revenueRs`/`ctr`/`roi` are
 * all computed fresh on every read — nothing here is a stored running total.
 */
export class CampaignDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reelId: string;

  @ApiPropertyOptional({ type: CampaignReelDto, nullable: true })
  reel: CampaignReelDto | null;

  @ApiProperty({ example: 200 })
  dailyBudgetRs: number;

  @ApiPropertyOptional({ nullable: true, example: 7, description: 'Null only for a pre-Round-5 legacy indefinite campaign' })
  durationDays: number | null;

  @ApiPropertyOptional({ nullable: true })
  endDate: Date | null;

  @ApiProperty({ enum: ReelCampaignStatus, example: ReelCampaignStatus.ACTIVE })
  status: ReelCampaignStatus;

  @ApiProperty({ example: 1400, description: 'Total spend so far — accrues once per IST calendar day, not by the second' })
  spendRs: number;

  @ApiProperty({ example: 6200 })
  impressions: number;

  @ApiProperty({ example: 310 })
  clicks: number;

  @ApiProperty({ example: 5, description: 'Click-through rate, percent, 2dp' })
  ctr: number;

  @ApiProperty({ example: 18 })
  ordersCount: number;

  @ApiProperty({ example: 3600 })
  revenueRs: number;

  @ApiProperty({ example: 2.57, description: 'revenueRs / spendRs' })
  roi: number;

  @ApiProperty({ type: EstimatedReachDto, description: 'Placeholder approximation from dailyBudgetRs — not real audience sizing' })
  estimatedReach: EstimatedReachDto;

  @ApiProperty({ example: 4650, description: 'Placeholder unique-viewer approximation (impressions × 0.75) — not real dedup' })
  actualReach: number;

  @ApiPropertyOptional({ type: [CampaignDailyStatDto], description: 'Only present on GET :id and the analytics endpoint' })
  dailyStats?: CampaignDailyStatDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  pausedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  endedAt: Date | null;
}
