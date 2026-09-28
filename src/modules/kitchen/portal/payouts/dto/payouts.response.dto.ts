import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { PageMetaDto } from '../../../../../common/dto/api-response.dto';

export class MaskedBankAccountDto {
  @ApiProperty({ example: 'Meena Sharma' })
  accountHolderName: string;

  @ApiProperty({ example: '••••••3444' })
  accountNumberMasked: string;

  @ApiProperty({ example: 'HDFC0001234' })
  ifsc: string;

  @ApiPropertyOptional({ nullable: true })
  bankName: string | null;

  @ApiProperty({ example: false })
  isVerified: boolean;
}

export class PayoutDto {
  @ApiProperty({ example: 'c9d0e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e2f' })
  id: string;

  @ApiProperty({ example: 4500 })
  amount: number;

  @ApiProperty({ enum: PayoutStatus, example: PayoutStatus.REQUESTED })
  status: PayoutStatus;

  @ApiPropertyOptional({ nullable: true, description: 'Placeholder — no real transfer/gateway API wired' })
  transferRef: string | null;

  @ApiPropertyOptional({ nullable: true })
  failureReason: string | null;

  @ApiProperty()
  requestedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  processedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  paidAt: Date | null;
}

export class PayoutSummaryDto {
  @ApiProperty({ example: 40500, description: 'Net of the placeholder platform commission, lifetime, from DELIVERED orders' })
  totalEarnings: number;

  @ApiProperty({ example: 12000 })
  availableForPayout: number;

  @ApiPropertyOptional({ type: PayoutDto, nullable: true })
  lastPayout: PayoutDto | null;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
    description: 'Always null — no payout cadence/scheduling exists yet (deliberate scope reduction)',
  })
  nextScheduledAt: string | null;

  @ApiPropertyOptional({ type: MaskedBankAccountDto, nullable: true })
  bankAccount: MaskedBankAccountDto | null;
}

export class TransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['ORDER', 'PAYOUT'] })
  type: 'ORDER' | 'PAYOUT';

  @ApiProperty({ example: 349 })
  amount: number;

  @ApiProperty({ enum: [1, -1], example: 1 })
  sign: 1 | -1;

  @ApiProperty({ example: 'DELIVERED' })
  status: string;

  @ApiProperty({ example: 'Order payment' })
  label: string;

  @ApiProperty()
  occurredAt: Date;
}

export class TransactionListDto {
  @ApiProperty({ type: [TransactionDto] })
  items: TransactionDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}

export class PayoutAdminListItemDto extends PayoutDto {
  @ApiProperty()
  account: { id: string; phone: string; ownerName: string | null };

  @ApiPropertyOptional({ nullable: true })
  kitchen: { id: string; name: string } | null;
}
