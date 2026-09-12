import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ReferralService } from './referral.service';
import { RedeemReferralDto } from './dto/referral.dto';
import { RedeemReferralResponseDto, ReferralSummaryDto } from './dto/referral.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Platform · Referral')
@ApiBearerAuth('JWT-auth')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('me')
  @ApiOperation({ summary: "The signed-in user's referral code, coins balance and invite count" })
  @ApiEnvelope(ReferralSummaryDto)
  async me(@CurrentUser() user: User) {
    return { message: 'Referral summary fetched', data: await this.referralService.getSummary(user.id) };
  }

  @Post('redeem')
  @ApiOperation({ summary: "Redeem someone else's referral code (one-time per account)" })
  @ApiEnvelope(RedeemReferralResponseDto)
  async redeem(@CurrentUser() user: User, @Body() dto: RedeemReferralDto) {
    return {
      message: 'Referral code applied',
      data: await this.referralService.redeem(user.id, dto.code),
    };
  }
}
