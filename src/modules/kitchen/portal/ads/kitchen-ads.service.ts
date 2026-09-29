import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ReelCampaign, ReelCampaignStatus, ReelStatus, WalletTransactionReason } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getIstCalendarDate } from '../../../../common/utils/kitchen';
import { WalletService } from '../wallet/wallet.service';
import { CreateCampaignDto } from './dto/kitchen-ads.dto';

const DAY_MS = 86_400_000;

/** Placeholder reach-per-rupee ratio — no real audience-size model exists yet. */
const AD_REACH_PER_RUPEE = 8;
/** Placeholder unique-viewer ratio applied to raw impressions — not real per-viewer dedup. */
const REACH_PER_IMPRESSION = 0.75;

/**
 * Self-serve reel promotion — independent of `Reel.isSponsored` (an
 * ops-only, no-spend flag from an earlier round).
 *
 * No background-job infra exists in this codebase, so spend is never accrued
 * by a cron. `accrualAnchor` marks the first IST calendar day not yet folded
 * into `accruedSpendRs`; every read settles all *fully elapsed* days (up to
 * yesterday, or `endDate`) into that running total via one UPDATE, then the
 * live total adds today's full daily budget on top while the campaign is
 * ACTIVE — a campaign is billed per whole day it was live, not by the second,
 * so one started at 11:58pm still "spends" its first full day immediately.
 */
@Injectable()
export class KitchenAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async create(accountId: string, dto: CreateCampaignDto) {
    const kitchen = await this.requireKitchen(accountId);
    const reel = await this.prisma.reel.findUnique({
      where: { id: dto.reelId },
      select: { id: true, kitchenId: true, status: true, isPaused: true },
    });
    if (!reel || reel.kitchenId !== kitchen.id) {
      throw new BadRequestException('That reel does not belong to your kitchen');
    }
    if (reel.status !== ReelStatus.PUBLISHED || reel.isPaused) {
      throw new BadRequestException('Only a published, unpaused reel can be promoted');
    }
    const existingActive = await this.prisma.reelCampaign.findFirst({
      where: { reelId: dto.reelId, status: ReelCampaignStatus.ACTIVE },
      select: { id: true },
    });
    if (existingActive) {
      throw new BadRequestException('This reel already has an active campaign');
    }

    const today = getIstCalendarDate();
    const endDate = new Date(today.getTime() + (dto.durationDays - 1) * DAY_MS);
    const totalCostRs = dto.dailyBudgetRs * dto.durationDays;

    // The campaign is created first, inside the transaction, so the wallet
    // debit's `referenceId` points at a real campaign id — if the debit
    // throws (insufficient balance), the whole transaction rolls back and no
    // orphaned campaign is left behind.
    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reelCampaign.create({
        data: {
          kitchenId: kitchen.id,
          reelId: dto.reelId,
          dailyBudgetRs: dto.dailyBudgetRs,
          durationDays: dto.durationDays,
          endDate,
          accrualAnchor: today,
        },
      });
      await this.walletService.debit(kitchen.id, totalCostRs, WalletTransactionReason.AD_BOOST, {
        referenceId: created.id,
        description: `Boost — ₹${dto.dailyBudgetRs}/day × ${dto.durationDays} day(s)`,
        tx,
      });
      return created;
    });

    return this.toDto(campaign, { includeDailyStats: false });
  }

  /**
   * Used only by the AI Suggestions "Apply" flow (no controller route of its
   * own) — bumps a campaign's daily budget and charges the wallet the
   * delta for however many days are left, following the same "campaign is
   * billed per whole day" idiom the rest of this service uses.
   */
  async updateBudget(kitchenId: string, campaignId: string, newDailyBudgetRs: number) {
    const campaign = await this.requireOwned(kitchenId, campaignId);
    if (campaign.status !== ReelCampaignStatus.ACTIVE) {
      throw new BadRequestException(`Cannot change the budget of a campaign that is ${campaign.status}`);
    }
    if (newDailyBudgetRs <= campaign.dailyBudgetRs) {
      throw new BadRequestException('New budget must be higher than the current budget');
    }
    const settled = await this.settleIfNeeded(campaign);
    const today = getIstCalendarDate();
    const remainingDays = settled.endDate
      ? Math.round((settled.endDate.getTime() - today.getTime()) / DAY_MS) + 1
      : 1; // defensive fallback — every post-Round-5 campaign has an endDate
    if (remainingDays <= 0) {
      throw new BadRequestException('This campaign has no days left to increase the budget for');
    }
    const deltaRs = (newDailyBudgetRs - settled.dailyBudgetRs) * remainingDays;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.walletService.debit(kitchenId, deltaRs, WalletTransactionReason.AD_BOOST, {
        referenceId: campaignId,
        description: `Budget increase (AI suggestion) — +₹${newDailyBudgetRs - settled.dailyBudgetRs}/day × ${remainingDays} day(s) left`,
        tx,
      });
      return tx.reelCampaign.update({ where: { id: campaignId }, data: { dailyBudgetRs: newDailyBudgetRs } });
    });
    return this.toDto(updated, { includeDailyStats: false });
  }

  async list(accountId: string, status?: ReelCampaignStatus) {
    const kitchen = await this.requireKitchen(accountId);
    const campaigns = await this.prisma.reelCampaign.findMany({
      where: { kitchenId: kitchen.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    const settled = await Promise.all(campaigns.map((c) => this.settleIfNeeded(c)));
    return Promise.all(settled.map((c) => this.toDto(c, { includeDailyStats: false })));
  }

  async findOne(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const campaign = await this.requireOwned(kitchen.id, id);
    const settled = await this.settleIfNeeded(campaign);
    return this.toDto(settled, { includeDailyStats: true });
  }

  /** Batch fetch for the multi-campaign comparison view. */
  async analytics(accountId: string, ids: string[]) {
    const kitchen = await this.requireKitchen(accountId);
    const campaigns = await this.prisma.reelCampaign.findMany({
      where: { id: { in: ids }, kitchenId: kitchen.id },
    });
    const settled = await Promise.all(campaigns.map((c) => this.settleIfNeeded(c)));
    return Promise.all(settled.map((c) => this.toDto(c, { includeDailyStats: true })));
  }

  async pause(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const campaign = await this.requireOwned(kitchen.id, id);
    if (campaign.status !== ReelCampaignStatus.ACTIVE) {
      throw new BadRequestException(`Cannot pause a campaign that is ${campaign.status}`);
    }
    // Fold in today too — the campaign was live earlier today, so today's spend is real.
    const { accruedSpendRs, accrualAnchor } = this.foldSpend(campaign, getIstCalendarDate());
    const updated = await this.prisma.reelCampaign.update({
      where: { id },
      data: { status: ReelCampaignStatus.PAUSED, pausedAt: new Date(), accruedSpendRs, accrualAnchor },
    });
    return this.toDto(updated, { includeDailyStats: false });
  }

  async resume(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const campaign = await this.requireOwned(kitchen.id, id);
    if (campaign.status !== ReelCampaignStatus.PAUSED) {
      throw new BadRequestException(`Cannot resume a campaign that is ${campaign.status}`);
    }
    // No spend accrues while paused — jump the anchor to today, UNLESS pause
    // already folded today's spend in (same-day pause→resume: `accrualAnchor`
    // was pushed to tomorrow). Resetting to today unconditionally would bill
    // today's budget twice in that case.
    const today = getIstCalendarDate();
    const accrualAnchor = campaign.accrualAnchor > today ? campaign.accrualAnchor : today;
    const updated = await this.prisma.reelCampaign.update({
      where: { id },
      data: { status: ReelCampaignStatus.ACTIVE, pausedAt: null, accrualAnchor },
    });
    return this.toDto(updated, { includeDailyStats: false });
  }

  async stop(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const campaign = await this.requireOwned(kitchen.id, id);
    if (campaign.status === ReelCampaignStatus.ENDED) {
      return this.toDto(campaign, { includeDailyStats: false });
    }
    const wasActive = campaign.status === ReelCampaignStatus.ACTIVE;
    const { accruedSpendRs, accrualAnchor } = wasActive
      ? this.foldSpend(campaign, getIstCalendarDate())
      : { accruedSpendRs: campaign.accruedSpendRs, accrualAnchor: campaign.accrualAnchor };
    const updated = await this.prisma.reelCampaign.update({
      where: { id },
      data: { status: ReelCampaignStatus.ENDED, endedAt: new Date(), accruedSpendRs, accrualAnchor },
    });
    return this.toDto(updated, { includeDailyStats: false });
  }

  estimateReach(dailyBudgetRs: number) {
    const mid = dailyBudgetRs * AD_REACH_PER_RUPEE;
    return { min: Math.round(mid * 0.8), max: Math.round(mid * 1.2) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /** Folds every fully-elapsed day from `accrualAnchor` through `uptoInclusive` into `accruedSpendRs`. */
  private foldSpend(campaign: ReelCampaign, uptoInclusive: Date): { accruedSpendRs: number; accrualAnchor: Date } {
    const days = Math.round((uptoInclusive.getTime() - campaign.accrualAnchor.getTime()) / DAY_MS) + 1;
    if (days <= 0) return { accruedSpendRs: campaign.accruedSpendRs, accrualAnchor: campaign.accrualAnchor };
    return {
      accruedSpendRs: campaign.accruedSpendRs + days * campaign.dailyBudgetRs,
      accrualAnchor: new Date(uptoInclusive.getTime() + DAY_MS),
    };
  }

  /**
   * Called on every read of an ACTIVE campaign. Folds in every day strictly
   * before today (or up to `endDate`, if that's earlier), leaving today's
   * spend to be added live by `displaySpend`. Ends the campaign in the same
   * write if `endDate` has now fully elapsed.
   */
  private async settleIfNeeded(campaign: ReelCampaign): Promise<ReelCampaign> {
    if (campaign.status !== ReelCampaignStatus.ACTIVE) return campaign;

    const today = getIstCalendarDate();
    const yesterday = new Date(today.getTime() - DAY_MS);
    const uptoInclusive = campaign.endDate && campaign.endDate < today ? campaign.endDate : yesterday;
    if (uptoInclusive < campaign.accrualAnchor) return campaign;

    const { accruedSpendRs, accrualAnchor } = this.foldSpend(campaign, uptoInclusive);
    const hasEnded = campaign.endDate ? accrualAnchor > campaign.endDate : false;

    return this.prisma.reelCampaign.update({
      where: { id: campaign.id },
      data: {
        accruedSpendRs,
        accrualAnchor,
        ...(hasEnded ? { status: ReelCampaignStatus.ENDED, endedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Call only after `settleIfNeeded` — assumes `accruedSpendRs` is already
   * fresh. Only adds today's budget live if today isn't already folded into
   * `accruedSpendRs` — `accrualAnchor` can already be past today right after
   * a same-day pause (which folds today in early), so this must not add it twice.
   */
  private displaySpend(campaign: ReelCampaign): number {
    const today = getIstCalendarDate();
    const todayIsUnsettled = campaign.status === ReelCampaignStatus.ACTIVE && campaign.accrualAnchor <= today;
    return campaign.accruedSpendRs + (todayIsUnsettled ? campaign.dailyBudgetRs : 0);
  }

  private async toDto(campaign: ReelCampaign, opts: { includeDailyStats: boolean }) {
    const [reel, orderAgg, statsAgg, dailyStats] = await Promise.all([
      this.prisma.reel.findUnique({
        where: { id: campaign.reelId },
        select: { thumbnailUrl: true, videoUrl: true, caption: true },
      }),
      this.prisma.order.aggregate({
        where: {
          sourceReelId: campaign.reelId,
          createdAt: { gte: campaign.createdAt, ...(campaign.endedAt ? { lt: campaign.endedAt } : {}) },
        },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.reelCampaignDailyStat.aggregate({
        where: { campaignId: campaign.id },
        _sum: { impressions: true, clicks: true },
      }),
      opts.includeDailyStats
        ? this.prisma.reelCampaignDailyStat.findMany({ where: { campaignId: campaign.id }, orderBy: { date: 'asc' } })
        : Promise.resolve(null),
    ]);

    const spendRs = this.displaySpend(campaign);
    const impressions = statsAgg._sum.impressions ?? 0;
    const clicks = statsAgg._sum.clicks ?? 0;
    const ordersCount = orderAgg._count._all;
    const revenueRs = orderAgg._sum.totalAmount ?? 0;

    return {
      id: campaign.id,
      reelId: campaign.reelId,
      reel: reel ?? null,
      dailyBudgetRs: campaign.dailyBudgetRs,
      durationDays: campaign.durationDays,
      endDate: campaign.endDate,
      status: campaign.status,
      spendRs,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      ordersCount,
      revenueRs,
      roi: spendRs > 0 ? Math.round((revenueRs / spendRs) * 100) / 100 : 0,
      estimatedReach: this.estimateReach(campaign.dailyBudgetRs),
      actualReach: Math.round(impressions * REACH_PER_IMPRESSION),
      ...(opts.includeDailyStats
        ? { dailyStats: (dailyStats ?? []).map((s) => ({ date: s.date, impressions: s.impressions, clicks: s.clicks })) }
        : {}),
      createdAt: campaign.createdAt,
      pausedAt: campaign.pausedAt,
      endedAt: campaign.endedAt,
    };
  }

  private async requireOwned(kitchenId: string, id: string) {
    const campaign = await this.prisma.reelCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.kitchenId !== kitchenId) {
      throw new ForbiddenException('This campaign does not belong to your kitchen');
    }
    return campaign;
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }
}
