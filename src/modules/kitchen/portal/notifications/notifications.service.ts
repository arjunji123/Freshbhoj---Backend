import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { paginate, toSkip } from '../../../../common/dto/pagination.dto';

/**
 * In-app notification feed for the kitchen-partner app. Purely a local table —
 * no push/FCM send happens anywhere (`firebase-admin` in this codebase is
 * configured for Cloud Storage only, `admin.messaging()` is never called).
 * Other modules (orders, FSSAI assistance) call `create`/`createOrderNotification`
 * to add to a partner's feed; this service never calls out to them.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(accountId: string, category?: NotificationCategory, page = 1, limit = 20) {
    const where: Prisma.NotificationWhereInput = { accountId, ...(category && { category }) };

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { accountId, isRead: false } }),
    ]);

    return { ...paginate(rows, page, limit, total), unreadCount };
  }

  async markRead(accountId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, accountId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
    return { id, isRead: true };
  }

  async markAllRead(accountId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { accountId, isRead: false },
      data: { isRead: true },
    });
    return { updatedCount: result.count };
  }

  /** General-purpose creator — other modules call this (or the more specific helpers below). */
  async create(accountId: string, category: NotificationCategory, title: string, body: string, data?: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { accountId, category, title, body, data: (data ?? undefined) as Prisma.InputJsonValue },
    });
  }

  /** Called from `OrdersService` the moment an order becomes PLACED. */
  async createOrderNotification(accountId: string, order: { id: string; orderNumber: string; totalAmount: number }) {
    return this.create(
      accountId,
      NotificationCategory.ORDER,
      'New order received',
      `Order #${order.orderNumber} — ₹${order.totalAmount}. Tap to accept.`,
      { orderId: order.id, action: 'ACCEPT_ORDER' },
    );
  }
}
