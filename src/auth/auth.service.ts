import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SmsService } from './sms.service';
import { User, OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface OtpSendResult {
  message: string;
  expiresInMinutes: number;
  /** Only returned in dev mode */
  devOtp?: string;
}

export interface VerifyOtpResult {
  isNewUser: boolean;
  user: Partial<User>;
  tokens: TokenPair;
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // OTP rate limit: 5 SMS per phone per hour
  private readonly SMS_RATE_LIMIT = 5;
  private readonly SMS_RATE_WINDOW_SECONDS = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // SEND OTP
  // ──────────────────────────────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<OtpSendResult> {
    // Rate limit check
    const allowed = await this.redis.checkRateLimit(
      `sms:${phone}`,
      this.SMS_RATE_LIMIT,
      this.SMS_RATE_WINDOW_SECONDS,
    );

    if (!allowed) {
      throw new HttpException(
        'Too many OTP requests. Please wait before requesting again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isDevMode = this.configService.get<boolean>('app.otp.devMode', true);
    const otpLength = this.configService.get<number>('app.otp.length', 6);
    const expiryMinutes = this.configService.get<number>('app.otp.expiryMinutes', 10);

    // Generate OTP
    const otp = isDevMode ? '123456' : this.generateOtp(otpLength);

    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Store in Redis (TTL = expiry minutes * 60)
    const ttlSeconds = expiryMinutes * 60;
    await this.redis.setOtp(phone, hashedOtp, ttlSeconds);

    // Also log in DB for audit trail
    const existingUser = await this.prisma.user.findUnique({ where: { phone } });
    await this.prisma.otpLog.create({
      data: {
        phone,
        otp: hashedOtp,
        purpose: OtpPurpose.LOGIN,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        userId: existingUser?.id ?? null,
      },
    });

    // Send SMS
    await this.smsService.sendOtp(phone, otp);

    const result: OtpSendResult = {
      message: 'OTP sent successfully',
      expiresInMinutes: expiryMinutes,
    };

    if (isDevMode) {
      result.devOtp = otp;
    }

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFY OTP
  // ──────────────────────────────────────────────────────────────────────────

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
    const maxAttempts = this.configService.get<number>('app.otp.maxAttempts', 5);
    const expiryMinutes = this.configService.get<number>('app.otp.expiryMinutes', 10);
    const ttlSeconds = expiryMinutes * 60;

    // Check attempt count (anti-brute-force)
    const attempts = await this.redis.incrementOtpAttempts(phone, ttlSeconds);
    if (attempts > maxAttempts) {
      throw new HttpException(
        'Too many incorrect OTP attempts. Request a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Fallback to reading from Database OTP log (because Redis is disabled)
    const otpLog = await this.prisma.otpLog.findFirst({
      where: { phone, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const storedHash = otpLog?.otp;
    if (!storedHash) {
      throw new BadRequestException('OTP expired or not found. Please request a new OTP.');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, storedHash);
    if (!isValid) {
      throw new UnauthorizedException(
        `Invalid OTP. ${maxAttempts - attempts} attempts remaining.`,
      );
    }

    // Clear OTP from Redis
    await this.redis.deleteOtp(phone);

    // ── Find or create user ────────────────────────────────────────────────
    let user = await this.prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      // New user — create with PENDING_PROFILE status
      user = await this.prisma.user.create({
        data: {
          phone,
          isPhoneVerified: true,
        },
      });
      isNewUser = true;
      this.logger.log(`New user registered: ${user.id} (${phone})`);
    } else {
      // Existing user — update last login & mark phone verified
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    // Mark OTP as used in DB
    await this.prisma.otpLog.updateMany({
      where: { phone, isUsed: false },
      data: { isUsed: true },
    });

    // Generate token pair
    const tokens = await this.generateTokenPair(user);

    // Cache user in Redis
    await this.redis.cacheUser(user.id, this.sanitizeUser(user));

    return {
      isNewUser,
      user: this.sanitizeUser(user),
      tokens,
      message: isNewUser
        ? 'Welcome to FreshBhoj! Please complete your profile.'
        : 'Login successful. Welcome back!',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ──────────────────────────────────────────────────────────────────────────

  async refreshToken(refreshTokenValue: string): Promise<TokenPair> {
    // Verify signature
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshTokenValue, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find in DB
    const hashedToken = await bcrypt.hash(refreshTokenValue, 10);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found or revoked');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    return this.generateTokenPair(storedToken.user);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific token
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all tokens (logout from all devices)
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    // Invalidate Redis cache
    await this.redis.invalidateUser(userId);

    this.logger.log(`User ${userId} logged out`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDATE USER (used by JWT strategy)
  // ──────────────────────────────────────────────────────────────────────────

  async validateUser(userId: string): Promise<User | null> {
    // Check Redis cache first
    const cached = await this.redis.getCachedUser<User>(userId);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.redis.cacheUser(userId, this.sanitizeUser(user));
    }
    return user;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private generateOtp(length: number): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  private async generateTokenPair(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, phone: user.phone, role: user.role };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiry = this.configService.get<string>('jwt.accessExpiry', '15m');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry', '30d');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiry,
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiry,
    });

    // Hash & store refresh token in DB
    const hashedRefreshToken = await bcrypt.hash(refreshTokenValue, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Parse expiry to seconds
    const expiresIn = this.parseExpiryToSeconds(accessExpiry);

    return { accessToken, refreshToken: refreshTokenValue, expiresIn };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // 15 min default
    }
  }

  private sanitizeUser(user: User): Partial<User> {
    const { ...rest } = user;
    return rest;
  }
}
