import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationCategory, OrderStatus, Payout, PayoutStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { paginate, toSkip } from '../../../../common/dto/pagination.dto';

/** Placeholder flat commission rate — no real rate-card/tiering exists yet. */
const PLATFORM_COMMISSION_PERCENT = 10;

/** Caps how far back "Recent Transactions" reaches into each source before merging. */
const TRANSACTION_SOURCE_CAP = 200;

type MergedTransaction = {
  id: string;
  type: 'ORDER' | 'PAYOUT';
  amount: number;
  sign: 1 | -1;
  status: string;
  label: string;
  occurredAt: Date;
};

/**
 * Kitchen-partner payouts. Like `FssaiAssistanceRequest.paymentStatus`, this is
 * a placeholder for a real integration — `Payout.transferRef` is set by hand
 * via the ops tool below, no bank-transfer/payment-gateway API is ever called.
 */
@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PARTNER-FACING
  // ──────────────────────────────────────────────────────────────────────────

  async getSummary(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const { netEarnings, availableForPayout } = await this.computeEarnings(kitchen.id, accountId);

    const [lastPayout, bankAccount] = await Promise.all([
      this.prisma.payout.findFirst({ where: { accountId, status: PayoutStatus.PAID }, orderBy: { paidAt: 'desc' } }),
      this.prisma.kitchenBankAccount.findUnique({ where: { accountId } }),
    ]);

    return {
      totalEarnings: netEarnings,
      availableForPayout,
      lastPayout: lastPayout ? this.toPayoutDto(lastPayout) : null,
      // Deliberate scope reduction — no payout cadence/scheduling feature exists yet.
      nextScheduledAt: null,
      bankAccount: bankAccount ? this.maskBankAccount(bankAccount) : null,
    };
  }

  async request(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const { availableForPayout } = await this.computeEarnings(kitchen.id, accountId);
    if (availableForPayout <= 0) {
      throw new BadRequestException('Nothing available to pay out right now');
    }

    const bankAccount = await this.prisma.kitchenBankAccount.findUnique({ where: { accountId } });
    if (!bankAccount) {
      throw new BadRequestException('Add your bank details before requesting a payout');
    }

    const payout = await this.prisma.payout.create({
      data: {
        accountId,
        amount: availableForPayout,
        status: PayoutStatus.REQUESTED,
        bankAccountSnapshot: {
          accountHolderName: bankAccount.accountHolderName,
          accountNumberLast4: bankAccount.accountNumberLast4,
          ifsc: bankAccount.ifsc,
          bankName: bankAccount.bankName,
        } as Prisma.InputJsonValue,
      },
    });
    return this.toPayoutDto(payout);
  }

  /** "Recent Transactions" — DELIVERED orders (credits) and payouts (debits), merge-sorted in JS. */
  async listTransactions(accountId: string, page = 1, limit = 20) {
    const kitchen = await this.requireKitchen(accountId);

    const [orders, payouts] = await Promise.all([
      this.prisma.order.findMany({
        where: { kitchenId: kitchen.id, status: OrderStatus.DELIVERED },
        select: { id: true, orderNumber: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: TRANSACTION_SOURCE_CAP,
      }),
      this.prisma.payout.findMany({
        where: { accountId },
        select: { id: true, amount: true, status: true, requestedAt: true, paidAt: true },
        orderBy: { requestedAt: 'desc' },
        take: TRANSACTION_SOURCE_CAP,
      }),
    ]);

    const merged: MergedTransaction[] = [
      ...orders.map((o) => ({
        id: o.id,
        type: 'ORDER' as const,
        amount: o.totalAmount,
        sign: 1 as const,
        status: OrderStatus.DELIVERED as string,
        label: `Order #${o.orderNumber}`,
        occurredAt: o.createdAt,
      })),
      ...payouts.map((p) => ({
        id: p.id,
        type: 'PAYOUT' as const,
        amount: p.amount,
        sign: -1 as const,
        status: p.status as string,
        label: 'Payout',
        occurredAt: p.paidAt ?? p.requestedAt,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const start = toSkip(page, limit);
    const items = merged.slice(start, start + limit);
    return paginate(items, page, limit, merged.length);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OPS-FACING (V0 admin tool)
  // ──────────────────────────────────────────────────────────────────────────

  async adminList(status?: PayoutStatus) {
    const payouts = await this.prisma.payout.findMany({
      where: status ? { status } : { status: { in: [PayoutStatus.REQUESTED, PayoutStatus.PROCESSING] } },
      orderBy: { requestedAt: 'asc' },
      include: {
        account: { select: { id: true, phone: true, ownerName: true, kitchen: { select: { id: true, name: true } } } },
      },
    });

    return payouts.map((p) => ({
      ...this.toPayoutDto(p),
      account: { id: p.account.id, phone: p.account.phone, ownerName: p.account.ownerName },
      kitchen: p.account.kitchen ? { id: p.account.kitchen.id, name: p.account.kitchen.name } : null,
    }));
  }

  async adminProcess(id: string) {
    const payout = await this.requirePayout(id);
    if (payout.status !== PayoutStatus.REQUESTED) {
      throw new BadRequestException(`Cannot process a payout that is ${payout.status}`);
    }
    const updated = await this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.PROCESSING, processedAt: new Date() },
    });
    await this.notifyAccount(updated.accountId, 'Payout processing', `Your payout of ₹${updated.amount} is now being processed.`);
    return this.toPayoutDto(updated);
  }

  async adminComplete(id: string, transferRef: string) {
    const payout = await this.requirePayout(id);
    if (payout.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestException(`Cannot complete a payout that is ${payout.status}`);
    }
    const updated = await this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.PAID, paidAt: new Date(), transferRef },
    });
    await this.notifyAccount(updated.accountId, 'Payout completed', `₹${updated.amount} has been transferred to your bank account.`);
    return this.toPayoutDto(updated);
  }

  async adminFail(id: string, reason: string) {
    const payout = await this.requirePayout(id);
    const updated = await this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.FAILED, failureReason: reason },
    });
    await this.notifyAccount(updated.accountId, 'Payout failed', reason);
    return this.toPayoutDto(updated);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * netEarnings = sum(DELIVERED order totalAmount) × (1 − commission), floored to whole rupees.
   * availableForPayout = max(0, netEarnings − totalPaidOut − pendingRequests).
   */
  private async computeEarnings(kitchenId: string, accountId: string) {
    const [deliveredAgg, paidAgg, pendingAgg] = await Promise.all([
      this.prisma.order.aggregate({
        where: { kitchenId, status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),
      this.prisma.payout.aggregate({
        where: { accountId, status: PayoutStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: { accountId, status: { in: [PayoutStatus.REQUESTED, PayoutStatus.PROCESSING] } },
        _sum: { amount: true },
      }),
    ]);

    const grossRevenue = deliveredAgg._sum.totalAmount ?? 0;
    const netEarnings = Math.floor(grossRevenue * (1 - PLATFORM_COMMISSION_PERCENT / 100));
    const totalPaidOut = paidAgg._sum.amount ?? 0;
    const pendingRequests = pendingAgg._sum.amount ?? 0;
    const availableForPayout = Math.max(0, netEarnings - totalPaidOut - pendingRequests);

    return { netEarnings, totalPaidOut, pendingRequests, availableForPayout };
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }

  private async requirePayout(id: string): Promise<Payout> {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  /** Never allowed to fail the action it's attached to — logged and swallowed. */
  private async notifyAccount(accountId: string, title: string, body: string) {
    try {
      await this.notificationsService.create(accountId, NotificationCategory.GENERAL, title, body);
    } catch (err) {
      this.logger.error(`Failed to notify account ${accountId}: ${err}`);
    }
  }

  private maskBankAccount(bankAccount: { accountHolderName: string; accountNumberLast4: string; ifsc: string; bankName: string | null; isVerified: boolean }) {
    return {
      accountHolderName: bankAccount.accountHolderName,
      accountNumberMasked: `••••••${bankAccount.accountNumberLast4}`,
      ifsc: bankAccount.ifsc,
      bankName: bankAccount.bankName,
      isVerified: bankAccount.isVerified,
    };
  }

  private toPayoutDto(payout: Payout) {
    return {
      id: payout.id,
      amount: payout.amount,
      status: payout.status,
      transferRef: payout.transferRef,
      failureReason: payout.failureReason,
      requestedAt: payout.requestedAt,
      processedAt: payout.processedAt,
      paidAt: payout.paidAt,
    };
  }
}
