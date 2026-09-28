import { FssaiAssistanceStatus } from '@prisma/client';
import { FssaiAssistanceService } from '../fssai-assistance/fssai-assistance.service';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { KitchenProfileService } from '../profile/kitchen-profile.service';
import { KitchenDashboardService } from '../dashboard/kitchen-dashboard.service';
import { KitchenOrdersService } from '../orders/kitchen-orders.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GeminiFunctionDeclaration } from './bhojai-gemini.client';

export interface ToolResult {
  /** Sent back to Gemini as the function's return value — facts only. */
  data: unknown;
  /** Attached directly to the final message by our own code — Gemini never sees or authors this. */
  card?: Record<string, unknown>;
}

export type ToolExecutor = (accountId: string, args: Record<string, unknown>) => Promise<ToolResult>;

export interface ToolDeps {
  fssaiAssistanceService: FssaiAssistanceService;
  onboardingService: OnboardingService;
  kitchenProfileService: KitchenProfileService;
  kitchenDashboardService: KitchenDashboardService;
  kitchenOrdersService: KitchenOrdersService;
  prisma: PrismaService;
}

const FSSAI_STAGE_ORDER: FssaiAssistanceStatus[] = [
  FssaiAssistanceStatus.PENDING_PAYMENT,
  FssaiAssistanceStatus.DOCUMENTS_SUBMITTED,
  FssaiAssistanceStatus.APPLICATION_FILED,
  FssaiAssistanceStatus.GOVT_REVIEW_IN_PROGRESS,
  FssaiAssistanceStatus.APPROVED,
];

/** A rough estimate for the status-tracker copy — not an SLA. */
const FSSAI_ESTIMATED_DAYS_LEFT: Partial<Record<FssaiAssistanceStatus, number>> = {
  PENDING_PAYMENT: 7,
  DOCUMENTS_SUBMITTED: 5,
  APPLICATION_FILED: 3,
  GOVT_REVIEW_IN_PROGRESS: 2,
  APPROVED: 0,
};

export const BHOJAI_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'getFssaiAssistanceStatus',
    description:
      "The partner's current (or most recent) FSSAI licence assistance request — status, progress, documents, and rejection reasons if any. Use this whenever the partner asks about their FSSAI/licence application.",
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'getOnboardingStatus',
    description:
      "The partner's kitchen-registration onboarding progress — which steps are done, what's still pending, and whether they can submit for review.",
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'getKitchenProfile',
    description: "The partner's kitchen profile — name, status, hours, location, verification state.",
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'getFeeBreakdown',
    description:
      'The FSSAI assistance fee breakdown (government fee + FreshBhoj service fee), from the current request if one exists, else the standard pricing.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'getEarningsSummary',
    description: "The partner's revenue summary — today's and all-time earnings.",
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'listRecentOrders',
    description: "The partner's most recent orders, newest first.",
    parameters: {
      type: 'OBJECT',
      properties: { limit: { type: 'NUMBER', description: 'How many orders to return, default 5, max 10' } },
      required: [],
    },
  },
  {
    name: 'requestHumanEscalation',
    description:
      'Hand this conversation off to a human FreshBhoj specialist. Only call this when the partner explicitly asks to talk to a person, or after you have genuinely been unable to help with their question.',
    parameters: {
      type: 'OBJECT',
      properties: { reason: { type: 'STRING', description: 'One sentence summarizing what the partner needs help with' } },
      required: ['reason'],
    },
  },
];

export function buildBhojAiToolExecutors(deps: ToolDeps): Record<string, ToolExecutor> {
  return {
    async getFssaiAssistanceStatus(accountId) {
      const status = await deps.fssaiAssistanceService.getStatus(accountId);
      const request = status.request;
      if (!request) return { data: { started: false } };

      const rejectedDocs = status.documents.filter((d) => d.status === 'REJECTED');
      if (request.status === FssaiAssistanceStatus.REJECTED || rejectedDocs.length > 0) {
        return {
          data: status,
          card: {
            type: 'DOCUMENT_REJECTED',
            rejectionReason: request.rejectionReason,
            rejectedDocuments: rejectedDocs.map((d) => ({ type: d.type, remarks: d.remarks })),
            nextSteps: rejectedDocs.length
              ? rejectedDocs.map((d) => `Re-upload your ${d.type.replace(/_/g, ' ').toLowerCase()}`)
              : ['Start a new FSSAI assistance request'],
          },
        };
      }

      const stageIndex = FSSAI_STAGE_ORDER.indexOf(request.status);
      return {
        data: status,
        card: {
          type: 'FSSAI_STATUS',
          status: request.status,
          progressPercent: stageIndex >= 0 ? Math.round((stageIndex / (FSSAI_STAGE_ORDER.length - 1)) * 100) : 0,
          timeline: FSSAI_STAGE_ORDER.map((stage, i) => ({ stage, isComplete: i < stageIndex, isCurrent: i === stageIndex })),
          estimatedDaysLeft: FSSAI_ESTIMATED_DAYS_LEFT[request.status] ?? null,
        },
      };
    },

    async getOnboardingStatus(accountId) {
      const status = await deps.onboardingService.getStatus(accountId);
      return { data: status };
    },

    async getKitchenProfile(accountId) {
      const profile = await deps.kitchenProfileService.getOwn(accountId);
      return { data: profile };
    },

    async getFeeBreakdown(accountId) {
      const status = await deps.fssaiAssistanceService.getStatus(accountId);
      if (status.request) {
        return {
          data: {
            govtFee: status.request.govtFee,
            serviceFee: status.request.serviceFee,
            totalFee: status.request.totalFee,
          },
        };
      }
      return { data: { govtFee: 1000, serviceFee: 500, totalFee: 1500 } };
    },

    async getEarningsSummary(accountId) {
      const summary = await deps.kitchenDashboardService.getSummary(accountId);
      return {
        data: {
          todayRevenue: summary.today.revenue,
          todayOrderCount: summary.today.orderCount,
          allTimeRevenue: summary.allTime.revenue,
          allTimeOrderCount: summary.allTime.orderCount,
        },
      };
    },

    async listRecentOrders(accountId, args) {
      const requested = Number(args.limit) || 5;
      const limit = Math.min(Math.max(requested, 1), 10);
      const page = await deps.kitchenOrdersService.findAll(accountId, { page: 1, limit } as never);
      return { data: page.items };
    },

    async requestHumanEscalation(accountId, args) {
      const reason = typeof args.reason === 'string' && args.reason.trim() ? args.reason.trim() : 'The partner asked to speak with a specialist.';
      const escalation = await deps.prisma.bhojAiEscalation.create({
        data: { accountId, reason },
      });
      return {
        data: { escalationId: escalation.id, status: escalation.status },
        card: { type: 'ESCALATION_CREATED', reason },
      };
    },
  };
}
