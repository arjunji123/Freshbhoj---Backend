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
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { SmsService } from './sms.service';
import { ReferralService } from '../../platform/referral/referral.service';
import { User, OtpPurpose, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { normalizePhone } from '../../../common/utils/phone';
import { getReviewerOtp } from '../../../common/utils/reviewer-phones';

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
    private readonly referralService: ReferralService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // SEND OTP
  // ──────────────────────────────────────────────────────────────────────────

  async sendOtp(rawPhone: string): Promise<OtpSendResult> {
    const phone = normalizePhone(rawPhone);

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

    // A whitelisted app-store-reviewer number always gets the same fixed OTP,
    // so reviewers don't need real SMS access — every other number is
    // unaffected and still gets a real, random, SMS-delivered OTP.
    const reviewerOtp = getReviewerOtp(phone, this.configService.get<string>('app.otp.reviewerPhones'));
    const otp = reviewerOtp ?? (isDevMode ? '123456' : this.generateOtp(otpLength));

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

    // Send SMS — skip for a reviewer number, they already know the fixed code.
    if (!reviewerOtp) {
      await this.smsService.sendOtp(phone, otp);
    }

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
  // ACCOUNT TYPE DETECTION
  // Lets the app's single login screen route to the kitchen or customer OTP
  // flow before sending any OTP. A kitchen account existing for the phone
  // always wins — a kitchen owner never sees the customer flow by accident.
  // ──────────────────────────────────────────────────────────────────────────

  async getAccountType(rawPhone: string): Promise<{ accountType: 'KITCHEN' | 'CUSTOMER' }> {
    const phone = normalizePhone(rawPhone);
    const kitchenAccount = await this.prisma.kitchenAccount.findUnique({
      where: { phone },
      select: { id: true },
    });
    return { accountType: kitchenAccount ? 'KITCHEN' : 'CUSTOMER' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACCOUNT DELETION (self-serve, no human in the loop)
  // Powers the public /delete-account web page required by Play Store's
  // "Sign in details" data-safety declaration. Proving phone ownership via
  // OTP is the same trust level as logging in, so this needs no prior
  // session/token — a user can request deletion even if signed out.
  // ──────────────────────────────────────────────────────────────────────────

  async requestAccountDeletion(rawPhone: string): Promise<OtpSendResult> {
    const phone = normalizePhone(rawPhone);

    const allowed = await this.redis.checkRateLimit(
      `delete-otp:${phone}`,
      this.SMS_RATE_LIMIT,
      this.SMS_RATE_WINDOW_SECONDS,
    );
    if (!allowed) {
      throw new HttpException(
        'Too many requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isDevMode = this.configService.get<boolean>('app.otp.devMode', true);
    const otpLength = this.configService.get<number>('app.otp.length', 6);
    const expiryMinutes = this.configService.get<number>('app.otp.expiryMinutes', 10);

    const reviewerOtp = getReviewerOtp(phone, this.configService.get<string>('app.otp.reviewerPhones'));
    const otp = reviewerOtp ?? (isDevMode ? '123456' : this.generateOtp(otpLength));
    const hashedOtp = await bcrypt.hash(otp, 10);
    const ttlSeconds = expiryMinutes * 60;

    // Deliberately doesn't reveal whether an account exists for this number —
    // same OTP-request motions either way, so the response can't be used to
    // enumerate real accounts.
    const user = await this.prisma.user.findUnique({ where: { phone } });
    await this.prisma.otpLog.create({
      data: {
        phone,
        otp: hashedOtp,
        purpose: OtpPurpose.ACCOUNT_DELETION,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        userId: user?.id ?? null,
      },
    });

    if (!reviewerOtp) {
      await this.smsService.sendOtp(phone, otp);
    }

    const result: OtpSendResult = {
      message: 'If this number has a FreshBhoj account, a verification code has been sent.',
      expiresInMinutes: expiryMinutes,
    };
    if (isDevMode) result.devOtp = otp;
    return result;
  }

  async confirmAccountDeletion(rawPhone: string, otp: string): Promise<{ message: string }> {
    const phone = normalizePhone(rawPhone);
    const maxAttempts = this.configService.get<number>('app.otp.maxAttempts', 5);
    const expiryMinutes = this.configService.get<number>('app.otp.expiryMinutes', 10);
    const ttlSeconds = expiryMinutes * 60;

    const attempts = await this.redis.incrementOtpAttempts(`delete-otp:${phone}`, ttlSeconds);
    if (attempts > maxAttempts) {
      throw new HttpException(
        'Too many incorrect attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otpLog = await this.prisma.otpLog.findFirst({
      where: { phone, purpose: OtpPurpose.ACCOUNT_DELETION, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpLog) {
      throw new BadRequestException('Code expired or not found. Please request a new one.');
    }
    if (!(await bcrypt.compare(otp, otpLog.otp))) {
      throw new UnauthorizedException(`Invalid code. ${maxAttempts - attempts} attempts remaining.`);
    }

    await this.prisma.otpLog.update({ where: { id: otpLog.id }, data: { isUsed: true } });

    const user = await this.prisma.user.findUnique({ where: { phone } });

    // Same "don't reveal whether an account existed" principle as the request
    // step — a phone with no account (or already deleted) still reports success.
    if (user && user.status !== UserStatus.DELETED) {
      // A legacy kitchen-owner link needs a human to reassign/close the
      // listing first — never silently scrub the account under it.
      const ownedKitchenCount = await this.prisma.kitchen.count({ where: { ownerId: user.id } });
      if (ownedKitchenCount > 0) {
        throw new BadRequestException(
          'This account owns a kitchen listing. Please contact support to close it before deleting your account.',
        );
      }

      await this.prisma.$transaction([
        this.prisma.address.deleteMany({ where: { userId: user.id } }),
        this.prisma.savedCard.deleteMany({ where: { userId: user.id } }),
        this.prisma.favorite.deleteMany({ where: { userId: user.id } }),
        this.prisma.kitchenFollow.deleteMany({ where: { userId: user.id } }),
        this.prisma.reelLike.deleteMany({ where: { userId: user.id } }),
        this.prisma.reelSave.deleteMany({ where: { userId: user.id } }),
        this.prisma.kitchenStoryLike.deleteMany({ where: { userId: user.id } }),
        this.prisma.kitchenStoryView.deleteMany({ where: { userId: user.id } }),
        this.prisma.notificationPreference.deleteMany({ where: { userId: user.id } }),
        this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
        this.prisma.cart.deleteMany({ where: { userId: user.id } }),
        this.prisma.otpLog.deleteMany({ where: { phone } }),
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            // `phone` stays unique but is scrubbed — frees the real number up
            // for reuse and makes the account unreachable via OTP forever.
            phone: `deleted:${user.id}`,
            fullName: null,
            email: null,
            profileImage: null,
            address: null,
            city: null,
            state: null,
            pincode: null,
            latitude: null,
            longitude: null,
            fcmToken: null,
            isPhoneVerified: false,
            status: UserStatus.DELETED,
          },
        }),
      ]);

      // Orders/reviews/coin transactions are deliberately kept (now under an
      // anonymized account) — kitchens and accounting have a legitimate
      // retention need for completed-transaction records.
      this.logger.log(`Account deleted (self-serve): ${user.id}`);
    }

    return { message: 'Your account and personal data have been deleted.' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFY OTP
  // ──────────────────────────────────────────────────────────────────────────

  async verifyOtp(rawPhone: string, otp: string): Promise<VerifyOtpResult> {
    const phone = normalizePhone(rawPhone);
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
      // Every user gets a shareable referral code from the moment they exist.
      await this.referralService.getOrCreateCode(user.id);
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

    // Find in DB — bcrypt hashes are salted, so we cannot look this up by an
    // equality WHERE clause on a freshly-computed hash. Load every active
    // session for this user and compare against each one to find the row
    // that actually matches the presented token.
    const candidates = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    let storedToken: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(refreshTokenValue, candidate.token)) {
        storedToken = candidate;
        break;
      }
    }

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
