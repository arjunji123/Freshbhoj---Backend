import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenAuthService } from './kitchen-auth.service';
import {
  KitchenRefreshTokenDto,
  KitchenSendOtpDto,
  KitchenVerifyOtpDto,
} from './dto/kitchen-auth.dto';
import {
  KitchenSendOtpResultDto,
  KitchenTokenPairDto,
  KitchenVerifyOtpResultDto,
} from './dto/kitchen-auth.response.dto';
import { KitchenAuthGuard } from './guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from './decorators/current-kitchen.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeError,
  ApiEnvelopeNull,
} from '../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Identity · Kitchen Auth')
@KitchenScope()
@Controller('partner/auth')
export class KitchenAuthController {
  constructor(private readonly kitchenAuthService: KitchenAuthService) {}

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP to a kitchen partner’s phone',
    description:
      'Same endpoint for sign-up and sign-in — the account is created on first successful verification. Rate limited to 5 per hour.',
  })
  @ApiEnvelope(KitchenSendOtpResultDto)
  @ApiEnvelopeError(429, 'Too many OTP requests')
  async sendOtp(@Body() dto: KitchenSendOtpDto) {
    const result = await this.kitchenAuthService.sendOtp(dto.phone);
    return {
      message: result.message,
      data: { expiresInMinutes: result.expiresInMinutes, ...(result.devOtp && { devOtp: result.devOtp }) },
    };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and start (or resume) a partner session',
    description:
      'Returns `isNewAccount` and the current `onboardingStep`, so the partner app can drop the user exactly where they left off.',
  })
  @ApiEnvelope(KitchenVerifyOtpResultDto)
  @ApiEnvelopeError(401, 'Incorrect OTP')
  async verifyOtp(@Body() dto: KitchenVerifyOtpDto) {
    const result = await this.kitchenAuthService.verifyOtp(dto.phone, dto.otp);
    return {
      message: result.isNewAccount
        ? 'Welcome to FreshBhoj Partner! Let’s set up your kitchen.'
        : 'Welcome back!',
      data: result,
    };
  }

  @Public()
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a partner refresh token' })
  @ApiEnvelope(KitchenTokenPairDto)
  @ApiEnvelopeError(401, 'Refresh token invalid, expired, revoked, or not a partner token')
  async refresh(@Body() dto: KitchenRefreshTokenDto) {
    return {
      message: 'Token refreshed successfully',
      data: await this.kitchenAuthService.refresh(dto.refreshToken),
    };
  }

  @Public()
  @Post('account-deletion/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request Kitchen Partner account deletion — sends an OTP to confirm',
    description:
      'Powers the public account-deletion page and the app\'s in-account delete flow. No prior login required — OTP ownership proof is enough.',
  })
  @ApiEnvelope(KitchenSendOtpResultDto)
  @ApiEnvelopeError(429, 'Too many requests — wait before retrying')
  async requestAccountDeletion(@Body() dto: KitchenSendOtpDto) {
    const result = await this.kitchenAuthService.requestAccountDeletion(dto.phone);
    return {
      message: result.message,
      data: { expiresInMinutes: result.expiresInMinutes, ...(result.devOtp && { devOtp: result.devOtp }) },
    };
  }

  @Public()
  @Post('account-deletion/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm Kitchen Partner account deletion with the OTP',
    description:
      'Scrubs the account\'s personal data (name, email, verification documents, bank details) and revokes every session. If the partner has a live storefront, it is paused (not erased) since past orders, reviews and payouts need it to stay resolvable.',
  })
  @ApiEnvelopeNull({ description: 'Account deleted (or no account existed for this number)' })
  @ApiEnvelopeError(400, 'Code expired or not found')
  @ApiEnvelopeError(401, 'Incorrect code')
  async confirmAccountDeletion(@Body() dto: KitchenVerifyOtpDto) {
    const result = await this.kitchenAuthService.confirmAccountDeletion(dto.phone, dto.otp);
    return { message: result.message, data: null };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KitchenAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Sign out of the partner portal on every device' })
  @ApiEnvelopeNull({ description: 'Refresh tokens revoked' })
  async logout(@CurrentKitchenAccount() account: KitchenAccount) {
    await this.kitchenAuthService.logout(account.id);
    return { message: 'Logged out successfully', data: null };
  }
}
