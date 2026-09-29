import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PremiumTier } from '@prisma/client';

const TIER_VALUES = Object.values(PremiumTier);

export class PurchasePremiumDto {
  @ApiProperty({ enum: TIER_VALUES, example: PremiumTier.PRO })
  @IsIn(TIER_VALUES)
  tier: PremiumTier;
}
