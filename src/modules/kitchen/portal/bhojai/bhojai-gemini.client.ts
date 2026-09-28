import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** One Gemini `Content` — a turn in the conversation. */
export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * A part can carry any mix of these — Gemini's real responses often attach a
 * `thoughtSignature` alongside a `functionCall`, which we must play back
 * verbatim on the *next* request in the same loop or the API errors. Kept as
 * `Record<string, unknown>` rather than a strict union for exactly that
 * reason: we round-trip whatever Gemini sent us, we don't reconstruct it.
 */
export type GeminiPart = Record<string, unknown> & {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: unknown; id?: string };
};

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: { type: 'OBJECT'; properties: Record<string, unknown>; required: string[] };
}

export interface GeminiCallResult {
  parts: GeminiPart[];
}

/**
 * Raw-`fetch` Gemini client — no SDK, matching `NutritionAiService`'s existing
 * pattern in this codebase, extended here to multi-turn `contents` + function
 * calling (`tools`). `NutritionAiService`'s single-shot JSON-mode call is left
 * untouched; this is a separate, general-purpose client for BhojAI.
 */
@Injectable()
export class BhojAiGeminiClient {
  private readonly logger = new Logger(BhojAiGeminiClient.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(params: {
    systemInstruction: string;
    contents: GeminiContent[];
    tools: GeminiFunctionDeclaration[];
  }): Promise<GeminiCallResult> {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException('BhojAI is not configured yet — add GEMINI_API_KEY to enable it');
    }
    const model = this.configService.get<string>('gemini.model', 'gemini-2.0-flash');

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: params.systemInstruction }] },
            contents: params.contents,
            tools: params.tools.length ? [{ functionDeclarations: params.tools }] : undefined,
            generationConfig: { temperature: 0.3 },
          }),
        },
      );
    } catch (error) {
      this.logger.error(`Gemini request failed to send: ${error.message}`);
      throw new ServiceUnavailableException('BhojAI is temporarily unavailable, please try again');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(`Gemini request failed (${response.status}): ${errorText}`);
      throw new ServiceUnavailableException('BhojAI is temporarily unavailable, please try again');
    }

    const payload = await response.json();
    const parts = payload?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      this.logger.error(`Gemini returned no content: ${JSON.stringify(payload)}`);
      throw new ServiceUnavailableException('BhojAI had nothing to say, please try again');
    }

    return { parts };
  }
}
