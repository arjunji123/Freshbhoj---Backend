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
  KitchenStatus,
  OtpPurpose,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { SmsService } from '../customer-auth/sms.service';
import { normalizePhone } from '../../../common/utils/phone';
import { getReviewerOtp } from '../../../common/utils/reviewer-phones';

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

  async sendOtp(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
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

    const reviewerOtp = getReviewerOtp(phone, this.configService.get<string>('app.otp.reviewerPhones'));
    const otp = reviewerOtp ?? (isDevMode ? '123456' : this.generateOtp(6));
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

    // Skip the real SMS for a whitelisted reviewer/demo number — they already
    // know the fixed code from the store-listing instructions.
    if (!reviewerOtp) {
      await this.smsService.sendOtp(phone, otp);
    }

    return {
      message: 'OTP sent successfully',
      expiresInMinutes: expiryMinutes,
      ...(isDevMode && { devOtp: otp }),
    };
  }

  /** Verifies the OTP, creating the partner account on first use. */
  async verifyOtp(rawPhone: string, otp: string) {
    const phone = normalizePhone(rawPhone);
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
  // ACCOUNT DELETION (self-serve, no human in the loop)
  // Same OTP-ownership-proof trust level as logging in — works from the app
  // (already-known phone) or from the public web page (typed fresh), and
  // needs no prior session.
  // ──────────────────────────────────────────────────────────────────────────

  async requestAccountDeletion(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    const isDevMode = this.configService.get<boolean>('app.otp.devMode', true);
    const expiryMinutes = this.configService.get<number>('app.otp.expiryMinutes', 10);

    const recentCount = await this.prisma.otpLog.count({
      where: {
        phone,
        purpose: OtpPurpose.ACCOUNT_DELETION,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCount >= this.SMS_RATE_LIMIT) {
      throw new HttpException(
        'Too many requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const reviewerOtp = getReviewerOtp(phone, this.configService.get<string>('app.otp.reviewerPhones'));
    const otp = reviewerOtp ?? (isDevMode ? '123456' : this.generateOtp(6));
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Deliberately doesn't reveal whether a kitchen account exists for this
    // number — same OTP-request motions either way.
    await this.prisma.otpLog.create({
      data: {
        phone,
        otp: hashedOtp,
        purpose: OtpPurpose.ACCOUNT_DELETION,
        expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
      },
    });

    if (!reviewerOtp) {
      await this.smsService.sendOtp(phone, otp);
    }

    return {
      message: 'If this number has a Kitchen Partner account, a verification code has been sent.',
      expiresInMinutes: expiryMinutes,
      ...(isDevMode && { devOtp: otp }),
    };
  }

  async confirmAccountDeletion(rawPhone: string, otp: string): Promise<{ message: string }> {
    const phone = normalizePhone(rawPhone);
    const otpLog = await this.prisma.otpLog.findFirst({
      where: { phone, purpose: OtpPurpose.ACCOUNT_DELETION, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpLog) {
      throw new BadRequestException('Code expired or not found. Please request a new one.');
    }
    if (!(await bcrypt.compare(otp, otpLog.otp))) {
      throw new UnauthorizedException('Invalid code. Please try again.');
    }

    await this.prisma.otpLog.update({ where: { id: otpLog.id }, data: { isUsed: true } });

    const account = await this.prisma.kitchenAccount.findUnique({
      where: { phone },
      include: { kitchen: true },
    });

    // Same "don't reveal whether an account existed" principle as the
    // request step — a phone with no account still reports success.
    if (account && account.status !== KitchenAccountStatus.DELETED) {
      await this.prisma.$transaction([
        // Sensitive verification documents and bank details are deleted
        // outright, not just unlinked.
        this.prisma.kitchenDocument.deleteMany({ where: { accountId: account.id } }),
        this.prisma.kitchenBankAccount.deleteMany({ where: { accountId: account.id } }),
        this.prisma.kitchenRefreshToken.deleteMany({ where: { accountId: account.id } }),
        this.prisma.kitchenAccount.update({
          where: { id: account.id },
          data: {
            // `phone`/`email` stay unique but are scrubbed — frees them up
            // and makes the account unreachable via OTP forever.
            phone: `deleted:${account.id}`,
            email: null,
            ownerName: null,
            fcmToken: null,
            isPhoneVerified: false,
            status: KitchenAccountStatus.DELETED,
          },
        }),
        // The storefront (if any) is paused, not erased — past orders,
        // reviews and payouts need it to stay resolvable. Its own contact
        // phone is scrubbed since that's the owner's personal number too.
        ...(account.kitchen
          ? [
              this.prisma.kitchen.update({
                where: { id: account.kitchen.id },
                data: { status: KitchenStatus.SUSPENDED, isAcceptingOrders: false, contactPhone: null },
              }),
            ]
          : []),
      ]);

      this.logger.log(`Kitchen partner account deleted (self-serve): ${account.id}`);
    }

    return { message: 'Your Kitchen Partner account and personal data have been deleted.' };
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

    // bcrypt hashes are salted, so we cannot look this up by an equality WHERE
    // clause on a freshly-computed hash. Load every active session for this
    // account and compare against each one to find the row that actually
    // matches the presented token.
    const candidates = await this.prisma.kitchenRefreshToken.findMany({
      where: { accountId: payload.sub, isRevoked: false, expiresAt: { gt: new Date() } },
      include: { account: true },
    });

    let stored: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(refreshToken, candidate.token)) {
        stored = candidate;
        break;
      }
    }
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
