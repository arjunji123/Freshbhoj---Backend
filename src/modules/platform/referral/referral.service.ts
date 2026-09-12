import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CoinTransactionReason } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Coins credited to the person whose code was used. */
export const REFERRER_BONUS_COINS = 100;
/** Coins credited to the new user who redeemed a code. */
export const REFEREE_BONUS_COINS = 50;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud
const CODE_LENGTH = 6;

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every user gets a code — created the moment it's first needed (at signup,
   * or lazily here for accounts that existed before this feature shipped).
   * A user's code never changes once set, so sharing it always works.
   */
  async getOrCreateCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (user.referralCode) return user.referralCode;

    // Collisions are practically impossible at this alphabet/length, but a
    // short retry loop keeps the unique constraint from ever surfacing as a
    // 500 to the user.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode();
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
        return code;
      } catch {
        // Unique constraint hit — try again with a fresh code.
      }
    }
    throw new BadRequestException('Could not generate a referral code, please try again');
  }

  async getSummary(userId: string) {
    const code = await this.getOrCreateCode(userId);
    const [user, invitesCount] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { coinsBalance: true, referredById: true },
      }),
      this.prisma.user.count({ where: { referredById: userId } }),
    ]);

    return {
      code,
      coinsBalance: user.coinsBalance,
      invitesCount,
      hasRedeemed: Boolean(user.referredById),
    };
  }

  /** Redeems someone else's code — one-time per account, credits both sides. */
  async redeem(userId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { referredById: true, referralCode: true },
    });
    if (user.referredById) {
      throw new BadRequestException('You have already used a referral code');
    }

    const referrer = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!referrer) {
      throw new NotFoundException('That referral code does not exist');
    }
    if (referrer.id === userId) {
      throw new BadRequestException('You cannot use your own referral code');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          referredById: referrer.id,
          coinsBalance: { increment: REFEREE_BONUS_COINS },
        },
      }),
      this.prisma.user.update({
        where: { id: referrer.id },
        data: { coinsBalance: { increment: REFERRER_BONUS_COINS } },
      }),
      this.prisma.coinTransaction.create({
        data: {
          userId,
          amount: REFEREE_BONUS_COINS,
          reason: CoinTransactionReason.REFERRAL_REFEREE_BONUS,
        },
      }),
      this.prisma.coinTransaction.create({
        data: {
          userId: referrer.id,
          amount: REFERRER_BONUS_COINS,
          reason: CoinTransactionReason.REFERRAL_REFERRER_BONUS,
        },
      }),
    ]);

    const summary = await this.getSummary(userId);
    return { ...summary, coinsEarned: REFEREE_BONUS_COINS };
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }
}
