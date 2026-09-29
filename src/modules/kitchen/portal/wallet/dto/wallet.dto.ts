import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class TopUpWalletDto {
  @ApiProperty({ example: 5000, description: 'Whole rupees, added to the wallet immediately — no payment gateway is wired' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountRs: number;
}
