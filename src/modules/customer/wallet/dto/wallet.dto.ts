import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsPositive, IsString, MaxLength } from 'class-validator';

export class TopUpWalletDto {
  @ApiProperty({ example: 5000, description: 'Whole rupees, added to the wallet immediately — no payment gateway is wired' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountRs: number;
}

export class RequestWithdrawalDto {
  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountRs: number;

  @ApiProperty({
    example: { upiId: 'name@okhdfcbank' },
    description: 'Ad-hoc destination captured for this request only — no saved payout-destination feature exists for customers yet',
  })
  @IsObject()
  destination: Record<string, string>;
}

export class FailWithdrawalDto {
  @ApiProperty({ example: 'UPI ID could not be verified' })
  @IsString()
  @MaxLength(300)
  reason: string;
}
