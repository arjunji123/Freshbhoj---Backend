import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FssaiAssistanceDocumentType, FssaiAssistanceRequest, FssaiAssistanceStatus, NotificationCategory } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const NON_TERMINAL: FssaiAssistanceStatus[] = Object.values(FssaiAssistanceStatus).filter(
  (s) => s !== FssaiAssistanceStatus.REJECTED && s !== FssaiAssistanceStatus.CANCELLED,
);

const ADVANCE_SEQUENCE: Partial<Record<FssaiAssistanceStatus, FssaiAssistanceStatus>> = {
  [FssaiAssistanceStatus.DOCUMENTS_SUBMITTED]: FssaiAssistanceStatus.APPLICATION_FILED,
  [FssaiAssistanceStatus.APPLICATION_FILED]: FssaiAssistanceStatus.GOVT_REVIEW_IN_PROGRESS,
  [FssaiAssistanceStatus.GOVT_REVIEW_IN_PROGRESS]: FssaiAssistanceStatus.APPROVED,
};

@Injectable()
export class FssaiAssistanceService {
  private readonly logger = new Logger(FssaiAssistanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PARTNER-FACING
  // ──────────────────────────────────────────────────────────────────────────

  async getStatus(accountId: string) {
    const request = await this.findLatest(accountId);
    return this.serialize(request);
  }

  /** Idempotent — returns the existing non-terminal request rather than duplicating it. */
  async start(accountId: string) {
    const existing = await this.prisma.fssaiAssistanceRequest.findFirst({
      where: { accountId, status: { in: NON_TERMINAL } },
    });
    if (!existing) {
      await this.prisma.fssaiAssistanceRequest.create({ data: { accountId } });
    }
    return this.getStatus(accountId);
  }

  async uploadDocument(accountId: string, dto: { type: FssaiAssistanceDocumentType; fileUrl: string }) {
    const request = await this.requireActiveRequest(accountId);
    await this.prisma.fssaiAssistanceDocument.upsert({
      where: { requestId_type: { requestId: request.id, type: dto.type } },
      update: { fileUrl: dto.fileUrl, status: 'PENDING', remarks: null },
      create: { requestId: request.id, type: dto.type, fileUrl: dto.fileUrl },
    });
    return this.getStatus(accountId);
  }

  /**
   * Placeholder for this phase — no payment gateway is wired yet. Just
   * confirms every required document is in and moves the request forward as
   * if payment succeeded.
   */
  async confirmPayment(accountId: string) {
    const request = await this.requireActiveRequest(accountId);
    const documents = await this.prisma.fssaiAssistanceDocument.findMany({
      where: { requestId: request.id },
      select: { type: true },
    });
    const uploadedTypes = new Set(documents.map((d) => d.type));
    const missing = Object.values(FssaiAssistanceDocumentType).filter((t) => !uploadedTypes.has(t));
    if (missing.length) {
      throw new BadRequestException(`Upload every required document first: ${missing.join(', ')}`);
    }

    await this.prisma.fssaiAssistanceRequest.update({
      where: { id: request.id },
      data: { paymentStatus: 'PAID', status: FssaiAssistanceStatus.DOCUMENTS_SUBMITTED, submittedAt: new Date() },
    });
    return this.getStatus(accountId);
  }

  async cancel(accountId: string) {
    const request = await this.requireActiveRequest(accountId);
    await this.prisma.fssaiAssistanceRequest.update({
      where: { id: request.id },
      data: { status: FssaiAssistanceStatus.CANCELLED },
    });
    return this.getStatus(accountId);
  }

  /** [dev] Walks the current request forward one stage — see the controller's production guard. */
  async simulateAdvance(accountId: string) {
    const request = await this.requireActiveRequest(accountId);
    const next = ADVANCE_SEQUENCE[request.status];
    if (!next) {
      throw new BadRequestException(`Cannot advance a request that is ${request.status}`);
    }

    const data: Record<string, unknown> = { status: next };
    if (next === FssaiAssistanceStatus.APPLICATION_FILED) data.filedAt = new Date();
    if (next === FssaiAssistanceStatus.APPROVED) {
      const validFrom = new Date();
      const validTill = new Date(validFrom);
      validTill.setFullYear(validTill.getFullYear() + 1);
      Object.assign(data, {
        approvedAt: new Date(),
        licenseNumber: `FSSAI-DEV-${Date.now()}`,
        validFrom,
        validTill,
        certificateUrl: 'https://cdn.freshbhoj.com/certs/dev-placeholder.pdf',
      });
    }

    await this.prisma.fssaiAssistanceRequest.update({ where: { id: request.id }, data });
    return this.getStatus(accountId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OPS-FACING (V0 admin tool)
  // ──────────────────────────────────────────────────────────────────────────

  async adminList(status?: FssaiAssistanceStatus) {
    const requests = await this.prisma.fssaiAssistanceRequest.findMany({
      where: status
        ? { status }
        : {
            status: {
              in: [
                FssaiAssistanceStatus.DOCUMENTS_SUBMITTED,
                FssaiAssistanceStatus.APPLICATION_FILED,
                FssaiAssistanceStatus.GOVT_REVIEW_IN_PROGRESS,
              ],
            },
          },
      orderBy: { submittedAt: 'asc' },
      include: {
        documents: true,
        account: { select: { id: true, phone: true, ownerName: true, kitchen: { select: { id: true, name: true } } } },
      },
    });

    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      submittedAt: r.submittedAt,
      account: { id: r.account.id, phone: r.account.phone, ownerName: r.account.ownerName },
      kitchen: r.account.kitchen ? { id: r.account.kitchen.id, name: r.account.kitchen.name } : null,
      documents: r.documents.map((d) => this.serializeDocument(d)),
    }));
  }

  async adminFile(id: string) {
    const request = await this.prisma.fssaiAssistanceRequest.findUniqueOrThrow({ where: { id } });
    if (request.status !== FssaiAssistanceStatus.DOCUMENTS_SUBMITTED) {
      throw new BadRequestException(`Cannot file a request that is ${request.status}`);
    }
    await this.prisma.fssaiAssistanceRequest.update({
      where: { id },
      data: { status: FssaiAssistanceStatus.APPLICATION_FILED, filedAt: new Date() },
    });
    await this.notifyAccount(
      request.accountId,
      'FSSAI application filed',
      'Your FSSAI assistance application has been filed with the government — we’ll update you as it moves through review.',
    );
    return this.serialize(await this.findById(id));
  }

  async adminApprove(id: string, dto: { licenseNumber: string; validFrom: string; validTill: string; certificateUrl?: string }) {
    const updated = await this.prisma.fssaiAssistanceRequest.update({
      where: { id },
      data: {
        status: FssaiAssistanceStatus.APPROVED,
        approvedAt: new Date(),
        licenseNumber: dto.licenseNumber,
        validFrom: new Date(dto.validFrom),
        validTill: new Date(dto.validTill),
        certificateUrl: dto.certificateUrl,
      },
    });
    await this.notifyAccount(
      updated.accountId,
      'FSSAI licence approved',
      `Your FSSAI licence ${dto.licenseNumber} has been issued.`,
    );
    return this.serialize(await this.findById(id));
  }

  async adminReject(id: string, reason: string) {
    const updated = await this.prisma.fssaiAssistanceRequest.update({
      where: { id },
      data: { status: FssaiAssistanceStatus.REJECTED, rejectionReason: reason },
    });
    await this.notifyAccount(updated.accountId, 'FSSAI assistance request rejected', reason);
    return this.serialize(await this.findById(id));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /** Never allowed to fail the admin action it's attached to — logged and swallowed. */
  private async notifyAccount(accountId: string, title: string, body: string) {
    try {
      await this.notificationsService.create(accountId, NotificationCategory.GENERAL, title, body);
    } catch (err) {
      this.logger.error(`Failed to notify account ${accountId}: ${err}`);
    }
  }

  private findLatest(accountId: string) {
    return this.prisma.fssaiAssistanceRequest.findFirst({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });
  }

  private findById(id: string) {
    return this.prisma.fssaiAssistanceRequest.findUniqueOrThrow({ where: { id }, include: { documents: true } });
  }

  private async requireActiveRequest(accountId: string): Promise<FssaiAssistanceRequest> {
    const request = await this.prisma.fssaiAssistanceRequest.findFirst({
      where: { accountId, status: { in: NON_TERMINAL } },
      orderBy: { createdAt: 'desc' },
    });
    if (!request) throw new BadRequestException('Start an FSSAI assistance request first');
    return request;
  }

  private serializeDocument(d: { id: string; type: FssaiAssistanceDocumentType; fileUrl: string; status: string; remarks: string | null }) {
    return { id: d.id, type: d.type, fileUrl: d.fileUrl, status: d.status, remarks: d.remarks };
  }

  private serialize(
    request: (FssaiAssistanceRequest & { documents: { id: string; type: FssaiAssistanceDocumentType; fileUrl: string; status: string; remarks: string | null }[] }) | null,
  ) {
    if (!request) return { request: null, documents: [] };
    const { documents, accountId: _accountId, ...rest } = request;
    return { request: rest, documents: documents.map((d) => this.serializeDocument(d)) };
  }
}
