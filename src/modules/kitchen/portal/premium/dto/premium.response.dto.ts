import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PremiumSubscriptionStatus, PremiumTier } from '@prisma/client';

export class PremiumFeaturesDto {
  @ApiPropertyOptional({ nullable: true, example: 2, description: 'Max PUBLISHED reels per billing period — null means unlimited' })
  reelsPerMonth: number | null;

  @ApiProperty({ example: false })
  advancedAnalytics: boolean;

  @ApiProperty({ example: 1, description: 'Multiplier applied to... reserved for a future boosted-visibility feature; currently informational only' })
  priorityBoostMultiplier: number;

  @ApiProperty({ example: false })
  aiVideoEditing: boolean;

  @ApiProperty({ example: false })
  sponsoredProfile: boolean;

  @ApiProperty({ example: false })
  aiMenuInsights: boolean;

  @ApiProperty({ example: false })
  prioritySupport: boolean;

  @ApiProperty({ example: false })
  verifiedBadge: boolean;

  @ApiProperty({ example: false })
  dedicatedGrowthManager: boolean;
}

export class PremiumTierCatalogDto {
  @ApiProperty({ enum: PremiumTier })
  tier: PremiumTier;

  @ApiProperty({ example: 1299, description: 'Whole rupees per billing period (28 days) — placeholder pricing, not business-finalized' })
  priceRs: number;

  @ApiProperty({ example: false })
  isMostPopular: boolean;

  @ApiProperty({ type: PremiumFeaturesDto })
  features: PremiumFeaturesDto;
}

export class PremiumSubscriptionDto {
  @ApiPropertyOptional({ enum: PremiumTier, nullable: true })
  tier: PremiumTier | null;

  @ApiProperty({ enum: [...Object.values(PremiumSubscriptionStatus), 'NONE'], example: 'ACTIVE' })
  status: PremiumSubscriptionStatus | 'NONE';

  @ApiPropertyOptional({ nullable: true })
  priceRs: number | null;

  @ApiPropertyOptional({ nullable: true })
  currentPeriodEnd: Date | null;

  @ApiProperty({ example: true })
  autoRenew: boolean;

  @ApiProperty({ type: PremiumFeaturesDto })
  features: PremiumFeaturesDto;
}
