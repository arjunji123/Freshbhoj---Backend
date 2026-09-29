import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WalletTransactionReason } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getIstCalendarDate } from '../../../../common/utils/kitchen';
import { paginate, toSkip } from '../../../../common/dto/pagination.dto';

type CreditDebitOpts = {
  referenceId?: string;
  description: string;
  /** Pass the caller's own `$transaction` client so a debit and whatever it's paying for commit-or-rollback together. */
  tx?: Prisma.TransactionClient;
};

/**
 * Single unified ledger backing every kitchen-partner spend in this app —
 * ad-boost charges and premium-plan charges both land here (matches the
 * mockup's merged "Recent Transactions" list). No payment gateway is wired;
 * top-up completes synchronously, same placeholder philosophy already used
 * for FssaiAssistanceRequest.paymentStatus / Payout.transferRef.
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert, not create-then-catch — survives concurrent first-access races. */
  async getOrCreateWallet(kitchenId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    return db.kitchenWallet.upsert({
      where: { kitchenId },
      create: { kitchenId },
      update: {},
    });
  }

  async credit(kitchenId: string, amountRs: number, reason: WalletTransactionReason, opts: CreditDebitOpts) {
    const db = opts.tx ?? this.prisma;
    await this.getOrCreateWallet(kitchenId, db);
    const wallet = await db.kitchenWallet.update({
      where: { kitchenId },
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

  async debit(kitchenId: string, amountRs: number, reason: WalletTransactionReason, opts: CreditDebitOpts) {
    const db = opts.tx ?? this.prisma;
    const wallet = await this.getOrCreateWallet(kitchenId, db);
    if (wallet.balanceRs < amountRs) {
      throw new BadRequestException('Insufficient wallet balance — add money to your wallet and try again');
    }
    const updated = await db.kitchenWallet.update({
      where: { kitchenId },
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

  async getSummary(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const wallet = await this.getOrCreateWallet(kitchen.id);

    const startOfMonth = this.getIstStartOfMonth();
    const [creditsAgg, monthDebitsAgg, premium] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'CREDIT' },
        _sum: { amountRs: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'DEBIT', createdAt: { gte: startOfMonth } },
        _sum: { amountRs: true },
      }),
      // Direct read, not through PremiumModule — keeps WalletModule a leaf
      // with no new imports and no risk of a circular dependency.
      this.prisma.kitchenPremiumSubscription.findUnique({
        where: { kitchenId: kitchen.id },
        select: { currentPeriodEnd: true, autoRenew: true, status: true },
      }),
    ]);

    return {
      balanceRs: wallet.balanceRs,
      totalCreditsRs: creditsAgg._sum.amountRs ?? 0,
      thisMonthSpentRs: monthDebitsAgg._sum.amountRs ?? 0,
      nextBillingAt: premium?.status === 'ACTIVE' && premium.autoRenew ? premium.currentPeriodEnd : null,
    };
  }

  async listTransactions(accountId: string, page = 1, limit = 20) {
    const kitchen = await this.requireKitchen(accountId);
    const wallet = await this.getOrCreateWallet(kitchen.id);

    const where = { walletId: wallet.id };
    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return paginate(rows, page, limit, total);
  }

  async topUp(accountId: string, amountRs: number) {
    const kitchen = await this.requireKitchen(accountId);
    const { transaction } = await this.credit(kitchen.id, amountRs, 'TOPUP', {
      description: 'Money added to wallet',
    });
    return { wallet: await this.getSummary(accountId), transaction };
  }

  private getIstStartOfMonth(): Date {
    const today = getIstCalendarDate();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }
}
