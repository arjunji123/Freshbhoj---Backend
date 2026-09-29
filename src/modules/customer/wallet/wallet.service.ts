import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerWalletTransactionReason, CustomerWalletWithdrawal, CustomerWalletWithdrawalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { getIstCalendarDate } from '../../../common/utils/kitchen';
import { paginate, toSkip } from '../../../common/dto/pagination.dto';

type CreditDebitOpts = {
  referenceId?: string;
  description: string;
  /** Pass the caller's own `$transaction` client so a debit and whatever it's paying for commit-or-rollback together. */
  tx?: Prisma.TransactionClient;
};

/**
 * A real prepaid balance for the customer app — structurally identical to the
 * kitchen-partner WalletService, but a completely separate ledger (different
 * owner, different reasons) and deliberately NOT the same thing as
 * User.coinsBalance (coins are earned-only loyalty currency spent as an order
 * discount; this is real rupees the customer can add and withdraw). No
 * payment gateway is wired — top-up completes synchronously, same placeholder
 * philosophy used everywhere else in this codebase.
 */
@Injectable()
export class CustomerWalletService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert, not create-then-catch — survives concurrent first-access races. */
  async getOrCreateWallet(userId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    return db.customerWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async credit(userId: string, amountRs: number, reason: CustomerWalletTransactionReason, opts: CreditDebitOpts) {
    const db = opts.tx ?? this.prisma;
    await this.getOrCreateWallet(userId, db);
    const wallet = await db.customerWallet.update({
      where: { userId },
      data: {
        balanceRs: { increment: amountRs },
        transactions: {
          create: { type: 'CREDIT', reason, amountRs, description: opts.description, referenceId: opts.referenceId },
        },
      },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return { wallet, transaction: wallet.transactions[0] };
  }

  async debit(userId: string, amountRs: number, reason: CustomerWalletTransactionReason, opts: CreditDebitOpts) {
    const db = opts.tx ?? this.prisma;
    const wallet = await this.getOrCreateWallet(userId, db);
    if (wallet.balanceRs < amountRs) {
      throw new BadRequestException('Insufficient wallet balance — add money to your wallet and try again');
    }
    const updated = await db.customerWallet.update({
      where: { userId },
      data: {
        balanceRs: { decrement: amountRs },
        transactions: {
          create: { type: 'DEBIT', reason, amountRs, description: opts.description, referenceId: opts.referenceId },
        },
      },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return { wallet: updated, transaction: updated.transactions[0] };
  }

  async getSummary(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const startOfMonth = this.getIstStartOfMonth();
    const [creditsAgg, monthDebitsAgg] = await Promise.all([
      this.prisma.customerWalletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'CREDIT' },
        _sum: { amountRs: true },
      }),
      this.prisma.customerWalletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'DEBIT', createdAt: { gte: startOfMonth } },
        _sum: { amountRs: true },
      }),
    ]);

    return {
      balanceRs: wallet.balanceRs,
      totalCreditsRs: creditsAgg._sum.amountRs ?? 0,
      thisMonthSpentRs: monthDebitsAgg._sum.amountRs ?? 0,
    };
  }

  async listTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId);
    const where = { walletId: wallet.id };
    const [rows, total] = await Promise.all([
      this.prisma.customerWalletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.customerWalletTransaction.count({ where }),
    ]);
    return paginate(rows, page, limit, total);
  }

  async topUp(userId: string, amountRs: number) {
    const { transaction } = await this.credit(userId, amountRs, 'TOPUP', { description: 'Money added to wallet' });
    return { wallet: await this.getSummary(userId), transaction };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WITHDRAWALS — mirrors Payout: REQUESTED → PROCESSING → PAID/FAILED,
  // advanced by hand via the ops admin controller below, never a gateway.
  // Debited immediately at request time (reserves the funds), refunded on fail.
  // ──────────────────────────────────────────────────────────────────────────

  async requestWithdrawal(userId: string, amountRs: number, destination: Record<string, string>) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balanceRs < amountRs) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      await this.debit(userId, amountRs, 'WITHDRAWAL', { description: 'Withdrawal requested', tx });
      return tx.customerWalletWithdrawal.create({
        data: { walletId: wallet.id, amountRs, destination: destination as Prisma.InputJsonValue },
      });
    });
    return this.toWithdrawalDto(withdrawal);
  }

  async listWithdrawals(userId: string, page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId);
    const where = { walletId: wallet.id };
    const [rows, total] = await Promise.all([
      this.prisma.customerWalletWithdrawal.findMany({ where, orderBy: { requestedAt: 'desc' }, skip: toSkip(page, limit), take: limit }),
      this.prisma.customerWalletWithdrawal.count({ where }),
    ]);
    return paginate(rows.map((w) => this.toWithdrawalDto(w)), page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OPS-FACING (V0 admin tool) — same shared-secret idiom as PayoutsAdminController
  // ──────────────────────────────────────────────────────────────────────────

  async adminList(status?: CustomerWalletWithdrawalStatus) {
    const withdrawals = await this.prisma.customerWalletWithdrawal.findMany({
      where: status ? { status } : { status: { in: ['REQUESTED', 'PROCESSING'] } },
      orderBy: { requestedAt: 'asc' },
      include: { wallet: { select: { user: { select: { id: true, phone: true, fullName: true } } } } },
    });
    return withdrawals.map((w) => ({ ...this.toWithdrawalDto(w), user: w.wallet.user }));
  }

  async adminProcess(id: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== 'REQUESTED') {
      throw new BadRequestException(`Cannot process a withdrawal that is ${withdrawal.status}`);
    }
    const updated = await this.prisma.customerWalletWithdrawal.update({
      where: { id },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });
    return this.toWithdrawalDto(updated);
  }

  async adminComplete(id: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== 'PROCESSING') {
      throw new BadRequestException(`Cannot complete a withdrawal that is ${withdrawal.status}`);
    }
    const updated = await this.prisma.customerWalletWithdrawal.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    return this.toWithdrawalDto(updated);
  }

  async adminFail(id: string, reason: string) {
    const withdrawal = await this.requireWithdrawal(id, { include: { wallet: true } });
    const updated = await this.prisma.$transaction(async (tx) => {
      const failed = await tx.customerWalletWithdrawal.update({
        where: { id },
        data: { status: 'FAILED', failureReason: reason },
      });
      await this.credit(withdrawal.wallet.userId, withdrawal.amountRs, 'REFUND', {
        description: `Withdrawal failed — refunded: ${reason}`,
        referenceId: withdrawal.id,
        tx,
      });
      return failed;
    });
    return this.toWithdrawalDto(updated);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private getIstStartOfMonth(): Date {
    const today = getIstCalendarDate();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  }

  private async requireWithdrawal(id: string, opts?: { include?: Prisma.CustomerWalletWithdrawalInclude }) {
    const withdrawal = await this.prisma.customerWalletWithdrawal.findUnique({ where: { id }, ...(opts ?? {}) });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    return withdrawal as CustomerWalletWithdrawal & { wallet: { userId: string } };
  }

  private toWithdrawalDto(withdrawal: CustomerWalletWithdrawal) {
    return {
      id: withdrawal.id,
      amountRs: withdrawal.amountRs,
      status: withdrawal.status,
      destination: withdrawal.destination,
      failureReason: withdrawal.failureReason,
      requestedAt: withdrawal.requestedAt,
      processedAt: withdrawal.processedAt,
      paidAt: withdrawal.paidAt,
    };
  }
}
