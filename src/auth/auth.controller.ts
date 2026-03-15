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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '@prisma/client';

@ApiTags('Auth')
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
  @ApiOperation({ summary: 'Send OTP to mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully', schema: { example: { success: true, message: 'OTP sent successfully', data: { expiresInMinutes: 10 } } } })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBody({ type: SendOtpDto })
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
  @ApiOperation({ summary: 'Verify OTP and retrieve access tokens' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully (includes isNewUser flag)', schema: { example: { success: true, message: 'Login successful. Welcome back!', data: { isNewUser: false, user: { id: 'uuid', phone: '+919876543210' }, tokens: { accessToken: 'eyJ...', refreshToken: 'eyJ...', expiresIn: 900, tokenType: 'Bearer' } } } } })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @ApiBody({ type: VerifyOtpDto })
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
  @ApiOperation({ summary: 'Refresh JWT Access Token using Refresh Token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiBody({ type: RefreshTokenDto })
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
  @ApiOperation({ summary: 'Logout and revoke refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
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
  @ApiResponse({ status: 200, description: 'Authenticated user details' })
  async me(@CurrentUser() user: User) {
    return {
      message: 'Authenticated user',
      data: user,
    };
  }
}
