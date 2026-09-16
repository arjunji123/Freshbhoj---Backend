import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoalTag } from '@prisma/client';

export interface NutritionAnalysisInput {
  name: string;
  description?: string;
  ingredients?: string[];
}

export interface NutritionAnalysisResult {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  /** 0-100, higher means healthier. */
  healthScore: number;
  isJunkFood: boolean;
  /** One or two sentences the kitchen sees alongside the numbers. */
  reason: string;
  suggestedGoalTags: GoalTag[];
}

const GOAL_TAG_VALUES = Object.values(GoalTag);

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    calories: { type: 'NUMBER' },
    proteinG: { type: 'NUMBER' },
    carbsG: { type: 'NUMBER' },
    fatG: { type: 'NUMBER' },
    fiberG: { type: 'NUMBER' },
    healthScore: { type: 'NUMBER', description: '0-100, higher means healthier' },
    isJunkFood: { type: 'BOOLEAN' },
    reason: { type: 'STRING', description: 'One or two sentence explanation for the kitchen' },
    suggestedGoalTags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'calories',
    'proteinG',
    'carbsG',
    'fatG',
    'fiberG',
    'healthScore',
    'isJunkFood',
    'reason',
    'suggestedGoalTags',
  ],
};

/**
 * Estimates nutrition/health facts for a dish from whatever the kitchen has
 * typed so far — a one-shot assist, never persisted here. The kitchen sees
 * the numbers labeled as AI-estimated and still submits them (possibly
 * edited) through the normal create/update endpoints, so a bad estimate
 * never silently becomes the platform's claim.
 */
@Injectable()
export class NutritionAiService {
  private readonly logger = new Logger(NutritionAiService.name);

  constructor(private readonly configService: ConfigService) {}

  async analyze(input: NutritionAnalysisInput): Promise<NutritionAnalysisResult> {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI analysis is not configured yet — add GEMINI_API_KEY to enable it',
      );
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
      throw new ServiceUnavailableException('AI analysis is temporarily unavailable, please try again');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(`Gemini request failed (${response.status}): ${errorText}`);
      throw new ServiceUnavailableException('AI analysis is temporarily unavailable, please try again');
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      this.logger.error(`Gemini returned no content: ${JSON.stringify(payload)}`);
      throw new ServiceUnavailableException('AI analysis returned no result, please try again');
    }

    return this.parseResult(text);
  }

  private buildPrompt({ name, description, ingredients }: NutritionAnalysisInput): string {
    return [
      'You are a nutrition analyst for an Indian food-delivery platform. Estimate nutrition',
      'facts for ONE SERVING of the dish described below, as a home cook or restaurant kitchen',
      'would typically prepare it. Be realistic and specific to the dish — do not default to',
      'generic numbers. Judge honestly whether this counts as "junk food" (deep-fried, heavy',
      'refined sugar/maida, very low nutrient density, ultra-processed) versus a wholesome meal.',
      '',
      `Dish name: ${name}`,
      description ? `Description: ${description}` : '',
      ingredients?.length ? `Ingredients: ${ingredients.join(', ')}` : '',
      '',
      'Also suggest which of these goal tags genuinely fit this dish (empty array if none fit):',
      GOAL_TAG_VALUES.join(', '),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private parseResult(text: string): NutritionAnalysisResult {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.error(`Gemini returned unparseable JSON: ${text}`);
      throw new ServiceUnavailableException('AI analysis returned an unexpected result, please try again');
    }

    const suggestedGoalTags = (Array.isArray(parsed.suggestedGoalTags) ? parsed.suggestedGoalTags : []).filter(
      (tag: string): tag is GoalTag => GOAL_TAG_VALUES.includes(tag as GoalTag),
    );

    return {
      calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
      proteinG: Math.max(0, Math.round(Number(parsed.proteinG) || 0)),
      carbsG: Math.max(0, Math.round(Number(parsed.carbsG) || 0)),
      fatG: Math.max(0, Math.round(Number(parsed.fatG) || 0)),
      fiberG: Math.max(0, Math.round(Number(parsed.fiberG) || 0)),
      healthScore: Math.min(100, Math.max(0, Math.round(Number(parsed.healthScore) || 0))),
      isJunkFood: Boolean(parsed.isJunkFood),
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 500) : '',
      suggestedGoalTags,
    };
  }
}
