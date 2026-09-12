import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemReferralDto {
  @ApiProperty({ example: 'AB3XQZ', description: "The inviter's referral code" })
  @IsString()
  @Length(4, 12)
  code: string;
}
