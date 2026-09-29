import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignSuggestion, NotificationCategory, Prisma, ReelCampaignStatus, SuggestionStatus, SuggestionType } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getIstCalendarDate } from '../../../../common/utils/kitchen';
import { paginate, toSkip } from '../../../../common/dto/pagination.dto';
import { KitchenAdsService } from '../ads/kitchen-ads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdsSuggestionAiClient } from './ads-suggestion-ai.client';

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 40;

/**
 * Proactive, non-chat AI suggestions over a kitchen's real ad-campaign
 * performance — distinct from BhojAI (a chat with the assistant). Generation
 * is capped to once per kitchen per IST calendar day (the `batchDate` check
 * below) since no rate-limit/cache infra exists anywhere in this codebase for
 * Gemini calls — this check IS the cost control.
 */
@Injectable()
export class AdsSuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchenAdsService: KitchenAdsService,
    private readonly notificationsService: NotificationsService,
    private readonly aiClient: AdsSuggestionAiClient,
  ) {}

  async generate(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const today = getIstCalendarDate();

    const existingBatch = await this.prisma.campaignSuggestion.findMany({
      where: { kitchenId: kitchen.id, batchDate: today },
      orderBy: { createdAt: 'asc' },
    });
    if (existingBatch.length > 0) {
      return existingBatch.map((s) => this.toDto(s));
    }

    const activeCampaigns = await this.kitchenAdsService.list(accountId, ReelCampaignStatus.ACTIVE);
    if (activeCampaigns.length === 0) {
      throw new BadRequestException('Run at least one active ad campaign before generating suggestions');
    }

    const results = await this.aiClient.generate({
      kitchenSpecialities: kitchen.specialities,
      serviceRadiusKm: kitchen.serviceRadiusKm,
      campaigns: activeCampaigns.map((c) => ({
        id: c.id,
        reelCaption: c.reel?.caption ?? null,
        dailyBudgetRs: c.dailyBudgetRs,
        spendRs: c.spendRs,
        ctr: c.ctr,
        roi: c.roi,
        ordersCount: c.ordersCount,
        revenueRs: c.revenueRs,
        impressions: c.impressions,
        clicks: c.clicks,
      })),
    });

    if (results.length === 0) {
      return [];
    }

    await this.prisma.campaignSuggestion.createMany({
      data: results.map((r) => ({
        kitchenId: kitchen.id,
        campaignId: r.targetCampaignId,
        type: r.type,
        title: r.title,
        description: r.description,
        impact: {
          reachDeltaPct: r.reachDeltaPct,
          ordersDeltaPct: r.ordersDeltaPct,
          roiDeltaPct: r.roiDeltaPct,
          expectedOrders: r.expectedOrders,
          suggestedDailyBudgetRs: r.suggestedDailyBudgetRs,
          suggestedRadiusKm: r.suggestedRadiusKm,
          costRs: r.costRs,
          effort: r.effort,
        } as Prisma.InputJsonValue,
        reasoning: r.reasoning,
        batchDate: today,
      })),
    });

    await this.notificationsService.create(
      accountId,
      NotificationCategory.GENERAL,
      'New optimization suggestions ready',
      `${results.length} new suggestion(s) for your ad campaigns — take a look.`,
      { type: 'SUGGESTIONS_READY' },
    );

    const created = await this.prisma.campaignSuggestion.findMany({
      where: { kitchenId: kitchen.id, batchDate: today },
      orderBy: { createdAt: 'asc' },
    });
    return created.map((s) => this.toDto(s));
  }

  async list(accountId: string, status?: SuggestionStatus, q?: string, page = 1, limit = 20) {
    const kitchen = await this.requireKitchen(accountId);
    const where: Prisma.CampaignSuggestionWhereInput = {
      kitchenId: kitchen.id,
      ...(status ? { status } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.campaignSuggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.campaignSuggestion.count({ where }),
    ]);

    return paginate(rows.map((s) => this.toDto(s)), page, limit, total);
  }

  async findOne(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const suggestion = await this.requireOwned(kitchen.id, id);
    return this.toDto(suggestion);
  }

  async apply(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const suggestion = await this.requireOwned(kitchen.id, id);
    if (suggestion.status !== SuggestionStatus.NEW) {
      throw new BadRequestException(`Cannot apply a suggestion that is already ${suggestion.status}`);
    }

    const impact = suggestion.impact as { suggestedDailyBudgetRs?: number | null; suggestedRadiusKm?: number | null };
    let appliedChanges: Prisma.InputJsonValue | undefined;

    switch (suggestion.type) {
      case SuggestionType.BUDGET_INCREASE: {
        if (!suggestion.campaignId || !impact.suggestedDailyBudgetRs) {
          throw new BadRequestException('This suggestion is missing the data needed to apply it');
        }
        const before = await this.prisma.reelCampaign.findUnique({
          where: { id: suggestion.campaignId },
          select: { dailyBudgetRs: true },
        });
        await this.kitchenAdsService.updateBudget(kitchen.id, suggestion.campaignId, impact.suggestedDailyBudgetRs);
        appliedChanges = { field: 'dailyBudgetRs', before: before?.dailyBudgetRs ?? null, after: impact.suggestedDailyBudgetRs };
        break;
      }
      case SuggestionType.DELIVERY_RADIUS: {
        if (!impact.suggestedRadiusKm) {
          throw new BadRequestException('This suggestion is missing the data needed to apply it');
        }
        const before = kitchen.serviceRadiusKm;
        const after = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, impact.suggestedRadiusKm));
        await this.prisma.kitchen.update({ where: { id: kitchen.id }, data: { serviceRadiusKm: after } });
        appliedChanges = { field: 'serviceRadiusKm', before: before ?? null, after };
        break;
      }
      case SuggestionType.TARGET_CUISINE:
      case SuggestionType.CREATIVE_REFRESH:
        // Acknowledge-only — a one-tap AI-driven edit to a kitchen's public
        // cuisine identity or creative is too high-stakes for this round; the
        // kitchen reads the suggestion and acts on it themselves elsewhere.
        appliedChanges = undefined;
        break;
    }

    const updated = await this.prisma.campaignSuggestion.update({
      where: { id },
      data: { status: SuggestionStatus.APPLIED, appliedAt: new Date(), ...(appliedChanges ? { appliedChanges } : {}) },
    });
    return this.toDto(updated);
  }

  async dismiss(accountId: string, id: string) {
    const kitchen = await this.requireKitchen(accountId);
    const suggestion = await this.requireOwned(kitchen.id, id);
    if (suggestion.status !== SuggestionStatus.NEW) {
      throw new BadRequestException(`Cannot dismiss a suggestion that is already ${suggestion.status}`);
    }
    const updated = await this.prisma.campaignSuggestion.update({
      where: { id },
      data: { status: SuggestionStatus.DISMISSED, dismissedAt: new Date() },
    });
    return this.toDto(updated);
  }

  private async requireOwned(kitchenId: string, id: string) {
    const suggestion = await this.prisma.campaignSuggestion.findUnique({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    if (suggestion.kitchenId !== kitchenId) {
      throw new ForbiddenException('This suggestion does not belong to your kitchen');
    }
    return suggestion;
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { accountId },
      select: { id: true, specialities: true, serviceRadiusKm: true },
    });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }

  private toDto(suggestion: CampaignSuggestion) {
    return {
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      campaignId: suggestion.campaignId,
      impact: suggestion.impact,
      reasoning: suggestion.reasoning,
      status: suggestion.status,
      appliedChanges: suggestion.appliedChanges,
      batchDate: suggestion.batchDate,
      appliedAt: suggestion.appliedAt,
      dismissedAt: suggestion.dismissedAt,
      createdAt: suggestion.createdAt,
    };
  }
}
