import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletSummaryDto {
  @ApiProperty() balanceRs: number;
  @ApiProperty() totalCreditsRs: number;
  @ApiProperty() thisMonthSpentRs: number;
}

export class WalletTransactionDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() reason: string;
  @ApiProperty() amountRs: number;
  @ApiProperty() description: string;
  @ApiProperty() createdAt: Date;
}

export class TopUpResultDto {
  @ApiProperty({ type: WalletSummaryDto }) wallet: WalletSummaryDto;
  @ApiProperty({ type: WalletTransactionDto }) transaction: WalletTransactionDto;
}

export class WithdrawalDto {
  @ApiProperty() id: string;
  @ApiProperty() amountRs: number;
  @ApiProperty() status: string;
  @ApiProperty() destination: unknown;
  @ApiPropertyOptional() failureReason: string | null;
  @ApiProperty() requestedAt: Date;
  @ApiPropertyOptional() processedAt: Date | null;
  @ApiPropertyOptional() paidAt: Date | null;
}
