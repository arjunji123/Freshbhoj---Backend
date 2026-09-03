import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '@prisma/client';
import {
  SendOtpResultDto,
  TokenPairDto,
  UserDto,
  VerifyOtpResultDto,
} from './dto/auth.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeError,
  ApiEnvelopeNull,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Identity · Customer Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // POST /auth/otp/send
  // Public: Send OTP to mobile number
  // ──────────────────────────────────────────────────────────────────────────
  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP to mobile number',
    description:
      'Rate limited to 5 SMS per number per hour. With OTP_DEV_MODE=true the code is always 123456 and is echoed back as `devOtp` so you can log in from this page.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiEnvelope(SendOtpResultDto, { description: 'OTP sent' })
  @ApiEnvelopeError(400, 'Not a valid Indian mobile number')
  @ApiEnvelopeError(429, 'Too many OTP requests — wait before retrying')
  async sendOtp(@Body() dto: SendOtpDto) {
    const result = await this.authService.sendOtp(dto.phone);
    return {
      message: result.message,
      data: {
        expiresInMinutes: result.expiresInMinutes,
        ...(result.devOtp && { devOtp: result.devOtp }),
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /auth/otp/verify
  // Public: Verify OTP → returns tokens + isNewUser flag
  // ──────────────────────────────────────────────────────────────────────────
  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and retrieve access tokens',
    description:
      'Creates the user on first login and returns `isNewUser: true`, which is the app’s signal to run the profile and location onboarding steps. Copy `accessToken` into the Authorize dialog to try protected endpoints here.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiEnvelope(VerifyOtpResultDto, { description: 'Logged in' })
  @ApiEnvelopeError(400, 'OTP expired or never requested')
  @ApiEnvelopeError(401, 'Incorrect OTP — the message says how many attempts remain')
  @ApiEnvelopeError(429, 'Too many incorrect attempts — request a new OTP')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto.phone, dto.otp);
    return {
      message: result.message,
      data: {
        isNewUser: result.isNewUser,
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
          tokenType: 'Bearer',
        },
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /auth/token/refresh
  // Public: Rotate refresh token → new access token
  // ──────────────────────────────────────────────────────────────────────────
  @Public()
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token for a new access token',
    description: 'The old refresh token is revoked, so each token is single-use.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiEnvelope(TokenPairDto, { description: 'A fresh token pair' })
  @ApiEnvelopeError(401, 'Refresh token invalid, expired or already revoked')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(dto.refreshToken);
    return {
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /auth/logout
  // Protected: Revoke tokens
  // ──────────────────────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout and revoke refresh tokens',
    description: 'Omit the body to sign out of every device.',
  })
  @ApiEnvelopeNull({ description: 'Refresh tokens revoked' })
  @ApiEnvelopeError(401, 'Missing, expired or invalid access token')
  @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string', description: 'Pass refresh token to logout from current device only. Omit to logout from all devices.' } } }, required: false })
  async logout(
    @CurrentUser() user: User,
    @Body() body: { refreshToken?: string },
  ) {
    await this.authService.logout(user.id, body.refreshToken);
    return { message: 'Logged out successfully', data: null };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /auth/me
  // Protected: Get current user (sanity check)
  // ──────────────────────────────────────────────────────────────────────────
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get details of the currently authenticated user' })
  @ApiEnvelope(UserDto)
  @ApiEnvelopeError(401, 'Missing, expired or invalid access token')
  async me(@CurrentUser() user: User) {
    return {
      message: 'Authenticated user',
      data: user,
    };
  }
}
