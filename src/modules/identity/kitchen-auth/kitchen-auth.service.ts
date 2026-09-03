import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  KitchenAccount,
  KitchenAccountStatus,
  KitchenOnboardingStep,
  OtpPurpose,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { SmsService } from '../customer-auth/sms.service';

export interface KitchenTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Kitchen partner authentication.
 *
 * Deliberately a separate identity from the customer `User`: the same phone
 * number can be a customer *and* run a kitchen, and one `role` column on one
 * table cannot express that. Tokens carry `aud: 'kitchen'` so a customer token
 * can never open a partner endpoint, and vice versa.
 */
@Injectable()
export class KitchenAuthService {
  private readonly logger = new Logger(KitchenAuthService.name);

  private readonly SMS_RATE_LIMIT = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // OTP
  // ──────────────────────────────────────────────────────────────────────────

  async sendOtp(phone: string) {
    const isDevMode = this.configService.get<boolean>('app.otp.devMode', true);
    const expiryMinutes = this.configService.get<number>('app.otp.expiryMinutes', 10);

    const recentCount = await this.prisma.otpLog.count({
      where: {
        phone,
        purpose: OtpPurpose.VERIFY_PHONE,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCount >= this.SMS_RATE_LIMIT) {
      throw new HttpException(
        'Too many OTP requests. Please wait before requesting again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = isDevMode ? '123456' : this.generateOtp(6);
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Partner OTPs are logged under VERIFY_PHONE so they cannot be replayed
    // against the customer LOGIN flow, which reads the newest unused row.
    await this.prisma.otpLog.create({
      data: {
        phone,
        otp: hashedOtp,
        purpose: OtpPurpose.VERIFY_PHONE,
        expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
      },
    });

    await this.smsService.sendOtp(phone, otp);

    return {
      message: 'OTP sent successfully',
      expiresInMinutes: expiryMinutes,
      ...(isDevMode && { devOtp: otp }),
    };
  }

  /** Verifies the OTP, creating the partner account on first use. */
  async verifyOtp(phone: string, otp: string) {
    const otpLog = await this.prisma.otpLog.findFirst({
      where: {
        phone,
        purpose: OtpPurpose.VERIFY_PHONE,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpLog) {
      throw new BadRequestException('OTP expired or not found. Please request a new OTP.');
    }
    if (!(await bcrypt.compare(otp, otpLog.otp))) {
      throw new UnauthorizedException('Invalid OTP. Please try again.');
    }

    await this.prisma.otpLog.update({ where: { id: otpLog.id }, data: { isUsed: true } });

    let account = await this.prisma.kitchenAccount.findUnique({ where: { phone } });
    let isNewAccount = false;

    if (!account) {
      account = await this.prisma.kitchenAccount.create({
        data: {
          phone,
          isPhoneVerified: true,
          status: KitchenAccountStatus.ONBOARDING,
          onboardingStep: KitchenOnboardingStep.PHONE_VERIFIED,
        },
      });
      isNewAccount = true;
      this.logger.log(`New kitchen partner registered: ${account.id} (${phone})`);
    } else {
      account = await this.prisma.kitchenAccount.update({
        where: { id: account.id },
        data: { isPhoneVerified: true, lastLoginAt: new Date() },
      });
    }

    const tokens = await this.generateTokenPair(account);
    return { isNewAccount, account: this.sanitize(account), tokens };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TOKENS
  // ──────────────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<KitchenTokenPair> {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.aud !== 'kitchen') {
      throw new UnauthorizedException('This refresh token is not for a partner session');
    }

    const stored = await this.prisma.kitchenRefreshToken.findFirst({
      where: { accountId: payload.sub, isRevoked: false, expiresAt: { gt: new Date() } },
      include: { account: true },
    });
    if (!stored) throw new UnauthorizedException('Refresh token not found or revoked');

    // Rotate: the presented token is single-use.
    await this.prisma.kitchenRefreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    return this.generateTokenPair(stored.account);
  }

  async logout(accountId: string) {
    await this.prisma.kitchenRefreshToken.updateMany({
      where: { accountId },
      data: { isRevoked: true },
    });
  }

  /** Used by `KitchenJwtStrategy` on every request. */
  async validateAccount(accountId: string): Promise<KitchenAccount | null> {
    return this.prisma.kitchenAccount.findUnique({ where: { id: accountId } });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private async generateTokenPair(account: KitchenAccount): Promise<KitchenTokenPair> {
    // `aud` is what keeps the two identity systems apart — the customer
    // strategy rejects anything with this audience and vice versa.
    const payload = { sub: account.id, phone: account.phone, aud: 'kitchen' };

    const accessExpiry = this.configService.get<string>('jwt.accessExpiry', '15m');
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: accessExpiry,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiry', '30d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.kitchenRefreshToken.create({
      data: { token: await bcrypt.hash(refreshToken, 10), accountId: account.id, expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: this.parseExpiry(accessExpiry) };
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const seconds: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return seconds[unit] ? value * seconds[unit] : 900;
  }

  private generateOtp(length: number): string {
    let otp = '';
    for (let i = 0; i < length; i += 1) otp += Math.floor(Math.random() * 10);
    return otp;
  }

  sanitize(account: KitchenAccount) {
    return {
      id: account.id,
      phone: account.phone,
      email: account.email,
      ownerName: account.ownerName,
      status: account.status,
      onboardingStep: account.onboardingStep,
      rejectionReason: account.rejectionReason,
      submittedAt: account.submittedAt,
      approvedAt: account.approvedAt,
    };
  }
}
