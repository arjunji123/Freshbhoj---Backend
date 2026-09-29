import { BadRequestException, Injectable } from '@nestjs/common';
import { PremiumSubscriptionStatus, PremiumTier, WalletTransactionReason } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getIstCalendarDate, istMidnightUtcOf } from '../../../../common/utils/kitchen';
import { WalletService } from '../wallet/wallet.service';
import { PurchasePremiumDto } from './dto/premium.dto';

const DAY_MS = 86_400_000;
const PREMIUM_CYCLE_DAYS = 28;
const REEL_CAP_BASIC = 2;

/** Placeholder pricing — no business-finalized price list exists yet, same idiom as PRICE_PER_MEAL_RS. */
const PRICE_PER_TIER_RS: Record<PremiumTier, number> = {
  BASIC: 499,
  PRO: 1299,
  ELITE: 2499,
};

export interface TierFeatures {
  reelsPerMonth: number | null;
  advancedAnalytics: boolean;
  priorityBoostMultiplier: number;
  aiVideoEditing: boolean;
  sponsoredProfile: boolean;
  aiMenuInsights: boolean;
  prioritySupport: boolean;
  verifiedBadge: boolean;
  dedicatedGrowthManager: boolean;
}

const TIER_FEATURES: Record<PremiumTier, TierFeatures> = {
  BASIC: {
    reelsPerMonth: REEL_CAP_BASIC,
    advancedAnalytics: false,
    priorityBoostMultiplier: 1,
    aiVideoEditing: false,
    sponsoredProfile: false,
    aiMenuInsights: false,
    prioritySupport: false,
    verifiedBadge: false,
    dedicatedGrowthManager: false,
  },
  PRO: {
    reelsPerMonth: null,
    advancedAnalytics: true,
    priorityBoostMultiplier: 1,
    aiVideoEditing: false,
    sponsoredProfile: false,
    aiMenuInsights: true,
    prioritySupport: true,
    verifiedBadge: true,
    dedicatedGrowthManager: false,
  },
  ELITE: {
    reelsPerMonth: null,
    advancedAnalytics: true,
    priorityBoostMultiplier: 3,
    aiVideoEditing: true,
    sponsoredProfile: true,
    aiMenuInsights: true,
    prioritySupport: true,
    verifiedBadge: true,
    dedicatedGrowthManager: true,
  },
};

/**
 * FreshBhoj selling its own SaaS-style tiers TO kitchen partners — a
 * different concept from `Subscription` (a customer's recurring meal plan
 * with a kitchen), hence the distinct `KitchenPremiumSubscription` naming.
 * Billed through the shared `KitchenWallet` ledger. No cron exists anywhere
 * in this codebase, so renewal is lazy/computed-on-read here, same idiom as
 * `ReelCampaign` settlement and the customer-Subscription billing backfill.
 */
@Injectable()
export class PremiumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  listTiers() {
    return (Object.keys(PRICE_PER_TIER_RS) as PremiumTier[]).map((tier) => ({
      tier,
      priceRs: PRICE_PER_TIER_RS[tier],
      isMostPopular: tier === PremiumTier.PRO,
      features: TIER_FEATURES[tier],
    }));
  }

  async getMyPlan(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const settled = await this.settleIfNeeded(kitchen.id);

    if (!settled) {
      return { tier: null, status: 'NONE' as const, priceRs: null, currentPeriodEnd: null, autoRenew: false, features: this.noFeatures() };
    }
    return {
      tier: settled.tier,
      status: settled.status,
      priceRs: settled.priceRs,
      currentPeriodEnd: settled.currentPeriodEnd,
      autoRenew: settled.autoRenew,
      features: TIER_FEATURES[settled.tier],
    };
  }

  async purchase(accountId: string, dto: PurchasePremiumDto) {
    const kitchen = await this.requireKitchen(accountId);
    const priceRs = PRICE_PER_TIER_RS[dto.tier];
    const today = getIstCalendarDate();
    const currentPeriodEnd = new Date(today.getTime() + (PREMIUM_CYCLE_DAYS - 1) * DAY_MS);

    await this.prisma.$transaction(async (tx) => {
      await this.walletService.debit(kitchen.id, priceRs, WalletTransactionReason.PREMIUM_PLAN, {
        description: `${dto.tier} plan — purchase/upgrade`,
        tx,
      });
      await tx.kitchenPremiumSubscription.upsert({
        where: { kitchenId: kitchen.id },
        create: { kitchenId: kitchen.id, tier: dto.tier, priceRs, currentPeriodEnd, status: PremiumSubscriptionStatus.ACTIVE },
        update: { tier: dto.tier, priceRs, currentPeriodEnd, status: PremiumSubscriptionStatus.ACTIVE, autoRenew: true },
      });
    });

    return this.getMyPlan(accountId);
  }

  /**
   * Exported for `KitchenReelsService.publish()`. **Backward-compat
   * guarantee**: a kitchen with no premium row, or a non-BASIC/non-ACTIVE
   * one, is completely unrestricted — every kitchen that existed before this
   * round has zero premium rows and is therefore untouched by this check.
   */
  async checkReelPublishAllowed(kitchenId: string): Promise<void> {
    const sub = await this.prisma.kitchenPremiumSubscription.findUnique({
      where: { kitchenId },
      select: { tier: true, status: true, currentPeriodEnd: true },
    });
    if (!sub || sub.tier !== PremiumTier.BASIC || sub.status !== PremiumSubscriptionStatus.ACTIVE) return;

    const periodStartCalendar = new Date(sub.currentPeriodEnd.getTime() - (PREMIUM_CYCLE_DAYS - 1) * DAY_MS);
    // `createdAt` is a real-time `DateTime`, not `@db.Date` — the calendar
    // value must be converted to genuine IST midnight before comparing
    // against it (see `istMidnightUtcOf`'s doc comment).
    const periodStart = istMidnightUtcOf(periodStartCalendar);
    const publishedThisPeriod = await this.prisma.reel.count({
      where: { kitchenId, status: 'PUBLISHED', createdAt: { gte: periodStart } },
    });
    if (publishedThisPeriod >= REEL_CAP_BASIC) {
      throw new BadRequestException(
        `Your Basic plan allows ${REEL_CAP_BASIC} reels per billing period — upgrade to Pro for unlimited reels`,
      );
    }
  }

  private noFeatures(): TierFeatures {
    return {
      reelsPerMonth: null,
      advancedAnalytics: false,
      priorityBoostMultiplier: 1,
      aiVideoEditing: false,
      sponsoredProfile: false,
      aiMenuInsights: false,
      prioritySupport: false,
      verifiedBadge: false,
      dedicatedGrowthManager: false,
    };
  }

  /**
   * Lazy renewal, checked on every `getMyPlan` read. If the period has
   * passed: auto-renew charges the wallet for one more period and extends
   * it; on insufficient funds or `autoRenew=false`, the plan expires instead
   * (`checkReelPublishAllowed` only restricts an ACTIVE Basic plan, so an
   * EXPIRED one is already unrestricted with no separate handling needed).
   */
  private async settleIfNeeded(kitchenId: string) {
    const sub = await this.prisma.kitchenPremiumSubscription.findUnique({ where: { kitchenId } });
    if (!sub) return null;
    if (sub.status !== PremiumSubscriptionStatus.ACTIVE) return sub;

    const today = getIstCalendarDate();
    if (sub.currentPeriodEnd >= today) return sub;

    if (sub.autoRenew) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await this.walletService.debit(kitchenId, sub.priceRs, WalletTransactionReason.PREMIUM_PLAN, {
            referenceId: sub.id,
            description: `${sub.tier} plan — renewal`,
            tx,
          });
          const newPeriodEnd = new Date(today.getTime() + (PREMIUM_CYCLE_DAYS - 1) * DAY_MS);
          return tx.kitchenPremiumSubscription.update({ where: { kitchenId }, data: { currentPeriodEnd: newPeriodEnd } });
        });
      } catch {
        // Insufficient balance — fall through to expiry below.
      }
    }

    return this.prisma.kitchenPremiumSubscription.update({
      where: { kitchenId },
      data: { status: PremiumSubscriptionStatus.EXPIRED },
    });
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }
}
