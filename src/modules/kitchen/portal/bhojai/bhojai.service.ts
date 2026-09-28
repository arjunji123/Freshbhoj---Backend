import { Injectable, Logger } from '@nestjs/common';
import { BhojAiMessageRole, ConversationStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BhojAiGeminiClient, GeminiContent, GeminiPart } from './bhojai-gemini.client';
import { BHOJAI_TOOL_DECLARATIONS, buildBhojAiToolExecutors, ToolExecutor } from './bhojai-tools';
import { FssaiAssistanceService } from '../fssai-assistance/fssai-assistance.service';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { KitchenProfileService } from '../profile/kitchen-profile.service';
import { KitchenDashboardService } from '../dashboard/kitchen-dashboard.service';
import { KitchenOrdersService } from '../orders/kitchen-orders.service';

const MAX_TOOL_ITERATIONS = 4;

const SYSTEM_INSTRUCTION = [
  "You are BhojAI, FreshBhoj's assistant for kitchen partners. You help with FSSAI licence registration,",
  'onboarding progress, kitchen profile, fees, earnings, and recent orders.',
  '',
  'Rules:',
  '- Only state facts you got from a tool call. Never invent numbers, dates, statuses, or document names.',
  "- If you don't have a tool for what's being asked, say so plainly and offer to connect the partner with a specialist.",
  '- Keep answers short and specific — a partner is reading this on their phone between orders.',
  '- Only call requestHumanEscalation when the partner explicitly asks for a human, or after you have genuinely failed to help twice in this conversation.',
].join('\n');

@Injectable()
export class BhojAiService {
  private readonly logger = new Logger(BhojAiService.name);
  private readonly tools: Record<string, ToolExecutor>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: BhojAiGeminiClient,
    fssaiAssistanceService: FssaiAssistanceService,
    onboardingService: OnboardingService,
    kitchenProfileService: KitchenProfileService,
    kitchenDashboardService: KitchenDashboardService,
    kitchenOrdersService: KitchenOrdersService,
  ) {
    this.tools = buildBhojAiToolExecutors({
      fssaiAssistanceService,
      onboardingService,
      kitchenProfileService,
      kitchenDashboardService,
      kitchenOrdersService,
      prisma,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PARTNER-FACING
  // ──────────────────────────────────────────────────────────────────────────

  async sendMessage(accountId: string, message: string): Promise<{ message: string; card: Record<string, unknown> | null }> {
    const conversation = await this.findOrCreateActiveConversation(accountId);

    const priorMessages = await this.prisma.bhojAiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.bhojAiMessage.create({
      data: { conversationId: conversation.id, role: BhojAiMessageRole.USER, text: message },
    });

    // Clean history for context: only user turns and the model's final text
    // answers. Internal tool-calling bookkeeping from PAST messages doesn't
    // need to be replayed — only the resolved outcome does.
    const contents: GeminiContent[] = priorMessages
      .filter((m) => m.role === BhojAiMessageRole.USER || (m.role === BhojAiMessageRole.MODEL && m.text))
      .map((m) => ({
        role: m.role === BhojAiMessageRole.USER ? 'user' : 'model',
        parts: [{ text: m.text ?? '' }],
      }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    let lastCard: Record<string, unknown> | null = null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const result = await this.gemini.generate({
        systemInstruction: SYSTEM_INSTRUCTION,
        contents,
        tools: BHOJAI_TOOL_DECLARATIONS,
      });

      const functionCalls = result.parts.filter((p) => p.functionCall);
      if (functionCalls.length === 0) {
        const text = result.parts
          .map((p) => p.text)
          .filter((t): t is string => typeof t === 'string')
          .join('\n')
          .trim();
        const finalText = text || "Sorry, I couldn't work that out — try asking in a different way, or ask to talk to a specialist.";

        await this.prisma.bhojAiMessage.create({
          data: {
            conversationId: conversation.id,
            role: BhojAiMessageRole.MODEL,
            text: finalText,
            card: (lastCard as object) ?? undefined,
          },
        });
        return { message: finalText, card: lastCard };
      }

      // Persist the model's tool-requesting turn verbatim (incl. any
      // thoughtSignature) — Gemini requires it played back unchanged.
      await this.prisma.bhojAiMessage.create({
        data: { conversationId: conversation.id, role: BhojAiMessageRole.MODEL, functionCall: result.parts as object },
      });
      contents.push({ role: 'model', parts: result.parts });

      const responseParts: GeminiPart[] = [];
      for (const part of functionCalls) {
        const call = part.functionCall!;
        const executor = this.tools[call.name];
        let toolResult: { data: unknown; card?: Record<string, unknown> };
        if (!executor) {
          this.logger.warn(`BhojAI requested an unknown tool: ${call.name}`);
          toolResult = { data: { error: 'Unknown tool' } };
        } else {
          try {
            // Scoped strictly by the JWT's accountId — args from the model
            // are never trusted for identity, even if it hallucinates one.
            toolResult = await executor(accountId, call.args ?? {});
          } catch (error) {
            this.logger.error(`BhojAI tool "${call.name}" failed: ${error.message}`);
            toolResult = { data: { error: 'This lookup failed, please try again' } };
          }
        }
        if (toolResult.card) lastCard = toolResult.card;
        responseParts.push({ functionResponse: { name: call.name, response: toolResult.data as object } });
      }

      // Gemini's function-response turn uses role "user", not a "function"
      // role — confirmed against a live call; the API rejects "function".
      await this.prisma.bhojAiMessage.create({
        data: { conversationId: conversation.id, role: BhojAiMessageRole.FUNCTION, functionResult: responseParts as object },
      });
      contents.push({ role: 'user', parts: responseParts });
    }

    const fallback = "I'm having trouble finishing that — try rephrasing, or ask to talk to a specialist.";
    await this.prisma.bhojAiMessage.create({
      data: { conversationId: conversation.id, role: BhojAiMessageRole.MODEL, text: fallback },
    });
    return { message: fallback, card: lastCard };
  }

  async getHistory(accountId: string) {
    const conversation = await this.prisma.bhojAiConversation.findFirst({
      where: { accountId, status: ConversationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
    if (!conversation) return { messages: [] };

    const messages = await this.prisma.bhojAiMessage.findMany({
      where: {
        conversationId: conversation.id,
        OR: [{ role: BhojAiMessageRole.USER }, { role: BhojAiMessageRole.MODEL, text: { not: null } }],
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        card: m.card,
        createdAt: m.createdAt,
      })),
    };
  }

  async reset(accountId: string) {
    await this.prisma.bhojAiConversation.updateMany({
      where: { accountId, status: ConversationStatus.ACTIVE },
      data: { status: ConversationStatus.ARCHIVED },
    });
    return { reset: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private async findOrCreateActiveConversation(accountId: string) {
    const existing = await this.prisma.bhojAiConversation.findFirst({
      where: { accountId, status: ConversationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.bhojAiConversation.create({ data: { accountId } });
  }
}
