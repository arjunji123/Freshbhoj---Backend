import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletTransactionReason, WalletTransactionType } from '@prisma/client';
import { PageMetaDto } from '../../../../../common/dto/api-response.dto';

export class WalletSummaryDto {
  @ApiProperty({ example: 4250 })
  balanceRs: number;

  @ApiProperty({ example: 12400, description: 'Lifetime sum of all CREDIT transactions' })
  totalCreditsRs: number;

  @ApiProperty({ example: 1850, description: 'Sum of DEBIT transactions so far this IST calendar month' })
  thisMonthSpentRs: number;

  @ApiPropertyOptional({ nullable: true, description: 'The kitchen’s premium plan renewal date, if it has one' })
  nextBillingAt: Date | null;
}

export class WalletTransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WalletTransactionType })
  type: WalletTransactionType;

  @ApiProperty({ enum: WalletTransactionReason })
  reason: WalletTransactionReason;

  @ApiProperty({ example: 499 })
  amountRs: number;

  @ApiProperty({ example: 'Boost — ₹200/day × 5 day(s)' })
  description: string;

  @ApiPropertyOptional({ nullable: true, description: 'The campaign/premium-subscription id this charge is for, when applicable' })
  referenceId: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class WalletTransactionListDto {
  @ApiProperty({ type: [WalletTransactionDto] })
  items: WalletTransactionDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}

export class TopUpResultDto {
  @ApiProperty({ type: WalletSummaryDto })
  wallet: WalletSummaryDto;

  @ApiProperty({ type: WalletTransactionDto })
  transaction: WalletTransactionDto;
}
