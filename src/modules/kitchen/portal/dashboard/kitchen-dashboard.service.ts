import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../../../customer/orders/orders.constants';

@Injectable()
export class KitchenDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(accountId: string) {
    const account = await this.prisma.kitchenAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { status: true },
    });

    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');

    const { start: startOfDay } = this.getIstDayBounds(0);

    const weeklyRevenueDays = Array.from({ length: 7 }, (_, i) => 6 - i).map((daysAgo) =>
      this.getIstDayBounds(daysAgo),
    );

    const [
      todayOrders,
      activeOrderCount,
      allTimeAgg,
      activeMealCount,
      pendingDocument,
      ...weeklyRevenueAggs
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { kitchenId: kitchen.id, createdAt: { gte: startOfDay } },
        select: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { kitchenId: kitchen.id, status: { in: ACTIVE_STATUSES } },
      }),
      this.prisma.order.aggregate({
        where: { kitchenId: kitchen.id, status: OrderStatus.DELIVERED },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.meal.count({ where: { kitchenId: kitchen.id, isAvailable: true } }),
      this.prisma.kitchenDocument.findFirst({
        where: { accountId, status: 'REJECTED' },
        select: { type: true, remarks: true },
      }),
      ...weeklyRevenueDays.map(({ start, end }) =>
        this.prisma.order.aggregate({
          where: { kitchenId: kitchen.id, status: OrderStatus.DELIVERED, createdAt: { gte: start, lt: end } },
          _sum: { totalAmount: true },
        }),
      ),
    ]);

    const actionNeeded = pendingDocument
      ? `Your ${pendingDocument.type} document was rejected${pendingDocument.remarks ? `: ${pendingDocument.remarks}` : ''}. Please re-upload it.`
      : null;

    return {
      accountStatus: account.status,
      isAcceptingOrders: kitchen.isAcceptingOrders,
      today: {
        orderCount: todayOrders.length,
        activeOrderCount,
        revenue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      },
      allTime: {
        orderCount: allTimeAgg._count._all,
        revenue: allTimeAgg._sum.totalAmount ?? 0,
        rating: kitchen.rating,
        ratingCount: kitchen.ratingCount,
        followerCount: kitchen.followerCount,
        activeMealCount,
      },
      weeklyRevenue: weeklyRevenueDays.map(({ start }, i) => ({
        date: this.toIstDateString(start),
        revenue: weeklyRevenueAggs[i]._sum.totalAmount ?? 0,
      })),
      actionNeeded,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The IST calendar day `daysAgo` days back, as a UTC instant range —
   * correct regardless of the server process's own timezone (Vercel runs
   * UTC, so a naive `setHours(0,0,0,0)` would start "today" at 5:30am IST).
   * Same correction as `isKitchenOpenNow` in `common/utils/kitchen.ts`.
   */
  private getIstDayBounds(daysAgo: number): { start: Date; end: Date } {
    const now = new Date();
    const istNow = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
    const startOfDayIst = new Date(istNow);
    startOfDayIst.setHours(0, 0, 0, 0);
    startOfDayIst.setDate(startOfDayIst.getDate() - daysAgo);
    const start = new Date(startOfDayIst.getTime() - (330 + now.getTimezoneOffset()) * 60_000);
    const end = new Date(start.getTime() + 24 * 60 * 60_000);
    return { start, end };
  }

  private toIstDateString(startOfDayUtc: Date): string {
    const istInstant = new Date(startOfDayUtc.getTime() + 330 * 60_000);
    return istInstant.toISOString().slice(0, 10);
  }
}
