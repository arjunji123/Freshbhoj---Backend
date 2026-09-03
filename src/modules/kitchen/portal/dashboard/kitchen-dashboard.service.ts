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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      activeOrderCount,
      allTimeAgg,
      activeMealCount,
      pendingDocument,
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
      actionNeeded,
    };
  }
}
