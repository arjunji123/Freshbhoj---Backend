import { ApiProperty } from '@nestjs/swagger';

export class ReferralSummaryDto {
  @ApiProperty({ example: 'AB3XQZ' })
  code: string;

  @ApiProperty({ example: 250, description: 'FreshBhoj Coins balance' })
  coinsBalance: number;

  @ApiProperty({ example: 3, description: 'Number of people who redeemed this code' })
  invitesCount: number;

  @ApiProperty({ example: false, description: 'Whether this account has already redeemed a code' })
  hasRedeemed: boolean;

  @ApiProperty({ example: 100, description: 'Coins the code owner earns when someone redeems their code' })
  referrerBonusCoins: number;

  @ApiProperty({ example: 50, description: 'Coins a new user earns for redeeming a code' })
  refereeBonusCoins: number;
}

export class RedeemReferralResponseDto extends ReferralSummaryDto {
  @ApiProperty({ example: 50, description: 'Coins just credited for this redemption' })
  coinsEarned: number;
}
