import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuggestionType } from '@prisma/client';

export interface SuggestionCampaignInput {
  id: string;
  reelCaption: string | null;
  dailyBudgetRs: number;
  spendRs: number;
  ctr: number;
  roi: number;
  ordersCount: number;
  revenueRs: number;
  impressions: number;
  clicks: number;
}

export interface SuggestionAiInput {
  kitchenSpecialities: string[];
  serviceRadiusKm: number | null;
  campaigns: SuggestionCampaignInput[];
}

export interface SuggestionAiResult {
  type: SuggestionType;
  title: string;
  description: string;
  /** Null for a kitchen-wide suggestion (DELIVERY_RADIUS, TARGET_CUISINE). */
  targetCampaignId: string | null;
  reachDeltaPct: number | null;
  ordersDeltaPct: number | null;
  roiDeltaPct: number | null;
  expectedOrders: number | null;
  /** Only meaningful for BUDGET_INCREASE — the exact new daily budget "Apply" will charge. */
  suggestedDailyBudgetRs: number | null;
  /** Only meaningful for DELIVERY_RADIUS — the exact new radius (km) "Apply" will set, clamped 1-40. */
  suggestedRadiusKm: number | null;
  costRs: number;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
}

const SUGGESTION_TYPE_VALUES = Object.values(SuggestionType);
const MAX_SUGGESTIONS = 4;

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      type: { type: 'STRING', description: `One of: ${SUGGESTION_TYPE_VALUES.join(', ')}` },
      title: { type: 'STRING', description: 'Short, e.g. "Increase weekend budget"' },
      description: { type: 'STRING', description: 'One sentence shown on the card' },
      targetCampaignId: { type: 'STRING', description: "The campaign id this applies to, or '' for a kitchen-wide suggestion" },
      reachDeltaPct: { type: 'NUMBER' },
      ordersDeltaPct: { type: 'NUMBER' },
      roiDeltaPct: { type: 'NUMBER' },
      expectedOrders: { type: 'NUMBER' },
      suggestedDailyBudgetRs: { type: 'NUMBER', description: 'Only for BUDGET_INCREASE — the new daily budget in rupees, higher than the current one' },
      suggestedRadiusKm: { type: 'NUMBER', description: 'Only for DELIVERY_RADIUS — the new radius in km, between 1 and 40' },
      costRs: { type: 'NUMBER', description: 'Estimated extra cost to the kitchen if applied' },
      effort: { type: 'STRING', description: 'LOW, MEDIUM, or HIGH' },
      reasoning: { type: 'STRING', description: 'One to two sentences explaining why, grounded in the numbers given' },
    },
    required: ['type', 'title', 'description', 'targetCampaignId', 'costRs', 'effort', 'reasoning'],
  },
};

/**
 * One-shot Gemini structured-output call — modeled directly on
 * `NutritionAiService` (same fetch/schema/temperature shape), not
 * `BhojAiGeminiClient` (that one's built for BhojAI's multi-turn chat and is
 * a worse fit for a single "analyze data, return JSON" call). No
 * conversation is persisted here; the caller persists the parsed results.
 */
@Injectable()
export class AdsSuggestionAiClient {
  private readonly logger = new Logger(AdsSuggestionAiClient.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(input: SuggestionAiInput): Promise<SuggestionAiResult[]> {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException('AI suggestions are not configured yet — add GEMINI_API_KEY to enable them');
    }

    const model = this.configService.get<string>('gemini.model', 'gemini-2.0-flash');
    const prompt = this.buildPrompt(input);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
              temperature: 0.2,
            },
          }),
        },
      );
    } catch (error) {
      this.logger.error(`Gemini request failed to send: ${error.message}`);
      throw new ServiceUnavailableException('AI suggestions are temporarily unavailable, please try again');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(`Gemini request failed (${response.status}): ${errorText}`);
      throw new ServiceUnavailableException('AI suggestions are temporarily unavailable, please try again');
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      this.logger.error(`Gemini returned no content: ${JSON.stringify(payload)}`);
      throw new ServiceUnavailableException('AI suggestions returned no result, please try again');
    }

    return this.parseResult(text, input.campaigns.map((c) => c.id));
  }

  private buildPrompt({ kitchenSpecialities, serviceRadiusKm, campaigns }: SuggestionAiInput): string {
    return [
      'You are an ads-optimization analyst for an Indian food-delivery platform. A kitchen partner is',
      'running the reel-promotion campaigns below. Suggest up to 4 concrete, data-grounded optimizations.',
      'Every suggestion MUST be one of these types and MUST follow its rule:',
      '- BUDGET_INCREASE: pick ONE campaign id from the list below as targetCampaignId, and set',
      '  suggestedDailyBudgetRs to a number strictly greater than that campaign’s current dailyBudgetRs.',
      '  Only suggest this for a campaign with a healthy roi (>= 1.5) and decent ctr — don’t suggest',
      '  spending more on a campaign that is already performing poorly.',
      '- DELIVERY_RADIUS: kitchen-wide, targetCampaignId must be \'\'. Set suggestedRadiusKm to a new value',
      '  between 1 and 40. Only suggest if the current radius plausibly limits reach.',
      '- TARGET_CUISINE: kitchen-wide, targetCampaignId must be \'\'.',
      '- CREATIVE_REFRESH: pick ONE campaign id as targetCampaignId if its ctr looks low/plateaued relative to its impressions.',
      '',
      `Kitchen specialities: ${kitchenSpecialities.length ? kitchenSpecialities.join(', ') : 'none set'}`,
      `Kitchen delivery radius: ${serviceRadiusKm ?? 'not set'} km`,
      '',
      'Active campaigns (real performance data):',
      JSON.stringify(campaigns, null, 2),
      '',
      'Ground every `reasoning` in the actual numbers above — do not invent data. If nothing genuinely',
      'warrants a suggestion of a given type, omit that type rather than forcing one.',
    ].join('\n');
  }

  private parseResult(text: string, validCampaignIds: string[]): SuggestionAiResult[] {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.error(`Gemini returned unparseable JSON: ${text}`);
      throw new ServiceUnavailableException('AI suggestions returned an unexpected result, please try again');
    }
    if (!Array.isArray(parsed)) return [];

    const results: SuggestionAiResult[] = [];
    for (const item of parsed) {
      if (results.length >= MAX_SUGGESTIONS) break;
      const type = item?.type;
      if (!SUGGESTION_TYPE_VALUES.includes(type)) continue;

      const rawTargetId = typeof item.targetCampaignId === 'string' ? item.targetCampaignId.trim() : '';
      const targetCampaignId = validCampaignIds.includes(rawTargetId) ? rawTargetId : null;
      // BUDGET_INCREASE/CREATIVE_REFRESH are campaign-scoped — without a
      // valid target there's nothing to apply this to, so drop it rather than
      // persist an unusable suggestion.
      if ((type === 'BUDGET_INCREASE' || type === 'CREATIVE_REFRESH') && !targetCampaignId) continue;

      const title = typeof item.title === 'string' ? item.title.slice(0, 120) : '';
      const description = typeof item.description === 'string' ? item.description.slice(0, 500) : '';
      const reasoning = typeof item.reasoning === 'string' ? item.reasoning.slice(0, 800) : '';
      if (!title || !reasoning) continue;

      let suggestedDailyBudgetRs: number | null = null;
      if (type === 'BUDGET_INCREASE') {
        const candidate = Math.round(Number(item.suggestedDailyBudgetRs));
        if (!Number.isFinite(candidate) || candidate <= 0) continue;
        suggestedDailyBudgetRs = candidate;
      }

      let suggestedRadiusKm: number | null = null;
      if (type === 'DELIVERY_RADIUS') {
        const candidate = Number(item.suggestedRadiusKm);
        if (!Number.isFinite(candidate)) continue;
        suggestedRadiusKm = Math.min(40, Math.max(1, Math.round(candidate)));
      }

      results.push({
        type,
        title,
        description,
        targetCampaignId,
        reachDeltaPct: this.toFiniteOrNull(item.reachDeltaPct),
        ordersDeltaPct: this.toFiniteOrNull(item.ordersDeltaPct),
        roiDeltaPct: this.toFiniteOrNull(item.roiDeltaPct),
        expectedOrders: this.toFiniteOrNull(item.expectedOrders),
        suggestedDailyBudgetRs,
        suggestedRadiusKm,
        costRs: Math.max(0, Math.round(Number(item.costRs) || 0)),
        effort: ['LOW', 'MEDIUM', 'HIGH'].includes(item.effort) ? item.effort : 'MEDIUM',
        reasoning,
      });
    }
    return results;
  }

  private toFiniteOrNull(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
  }
}
