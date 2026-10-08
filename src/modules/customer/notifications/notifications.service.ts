import { Injectable } from '@nestjs/common';
import { OrderStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildPageMeta } from '../../../common/dto/pagination.dto';
import { CustomerNotificationCategory } from './dto/notifications.dto';

interface Entry {
  id: string;
  category: CustomerNotificationCategory;
  title: string;
  body: string;
  data: Record<string, string> | null;
  createdAt: Date;
}

/** Hard ceiling on how deep one request will look into each source. */
const MAX_WINDOW = 200;

/**
 * The customer notification inbox.
 *
 * Deliberately derived, not stored: every event a customer cares about already
 * has a durable record (order status events, kitchen chat messages, wallet
 * ledger, subscription lifecycle timestamps), written by whichever module
 * caused it — including the kitchen side. Reading those directly means no
 * producer can forget to notify, and nothing here needs to be kept in sync.
 * The only state of its own is `User.notificationsReadAt`: anything newer is
 * unread.
 */
@Injectable()
export class CustomerNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 20, category?: CustomerNotificationCategory) {
    const window = Math.min(page * limit, MAX_WINDOW);
    const wants = (c: CustomerNotificationCategory) => !category || category === c;

    const [orderEvents, messages, wallet, subscriptions, counts, readAt] = await Promise.all([
      wants('ORDER') ? this.orderEvents(userId, window) : [],
      wants('ORDER') ? this.kitchenMessages(userId, window) : [],
      wants('WALLET') ? this.walletCredits(userId, window) : [],
      wants('SUBSCRIPTION') ? this.subscriptionEvents(userId, window) : [],
      this.countsFor(userId, category),
      this.readMarker(userId),
    ]);

    const merged = [...orderEvents, ...messages, ...wallet, ...subscriptions].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const start = (page - 1) * limit;

    return {
      items: merged.slice(start, start + limit).map((e) => ({ ...e, isRead: this.isRead(e.createdAt, readAt) })),
      meta: buildPageMeta(page, limit, counts.total),
      unreadCount: counts.unread,
    };
  }

  async unreadCount(userId: string) {
    const { unread } = await this.countsFor(userId);
    return { unreadCount: unread };
  }

  async markAllRead(userId: string) {
    const readAt = new Date();
    await this.prisma.user.update({ where: { id: userId }, data: { notificationsReadAt: readAt } });
    return { readAt };
  }

  // ── Sources ────────────────────────────────────────────────────────────────

  private async orderEvents(userId: string, take: number): Promise<Entry[]> {
    const rows = await this.prisma.orderStatusEvent.findMany({
      where: { order: { userId }, status: { not: OrderStatus.PENDING_PAYMENT } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        note: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, kitchen: { select: { name: true } } } },
      },
    });

    return rows.map((r) => {
      const copy = this.orderCopy(r.status, r.order.orderNumber, r.order.kitchen.name, r.note);
      return {
        id: `order-event:${r.id}`,
        category: 'ORDER' as const,
        title: copy.title,
        body: copy.body,
        data: { orderId: r.order.id, status: r.status },
        createdAt: r.createdAt,
      };
    });
  }

  private async kitchenMessages(userId: string, take: number): Promise<Entry[]> {
    const rows = await this.prisma.orderMessage.findMany({
      where: { sender: 'KITCHEN', order: { userId } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        body: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, kitchen: { select: { name: true } } } },
      },
    });

    return rows.map((r) => ({
      id: `order-message:${r.id}`,
      category: 'ORDER' as const,
      title: `${r.order.kitchen.name} sent you a message`,
      body: r.body,
      data: { orderId: r.order.id },
      createdAt: r.createdAt,
    }));
  }

  private async walletCredits(userId: string, take: number): Promise<Entry[]> {
    const rows = await this.prisma.customerWalletTransaction.findMany({
      where: { wallet: { userId }, type: 'CREDIT' },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, reason: true, amountRs: true, description: true, createdAt: true },
    });

    return rows.map((r) => ({
      id: `wallet-transaction:${r.id}`,
      category: 'WALLET' as const,
      title: r.reason === 'REFUND' ? `₹${r.amountRs} refunded to your wallet` : `₹${r.amountRs} added to your wallet`,
      body: r.description,
      data: { walletTransactionId: r.id },
      createdAt: r.createdAt,
    }));
  }

  private async subscriptionEvents(userId: string, take: number): Promise<Entry[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        planName: true,
        status: true,
        rejectionReason: true,
        approvedAt: true,
        pausedAt: true,
        cancelledAt: true,
        updatedAt: true,
        kitchen: { select: { name: true } },
      },
    });

    // One entry per subscription, describing where it stands now — a
    // subscription that went approved → paused should read "paused", not both.
    const out: Entry[] = [];
    for (const s of rows) {
      const data = { subscriptionId: s.id };
      const kitchen = s.kitchen.name;
      switch (s.status) {
        case SubscriptionStatus.ACTIVE:
          out.push({
            id: `subscription:${s.id}:active`,
            category: 'SUBSCRIPTION',
            title: 'Subscription approved',
            body: `${kitchen} approved your ${s.planName} plan.`,
            data,
            createdAt: s.approvedAt ?? s.updatedAt,
          });
          break;
        case SubscriptionStatus.PAUSED:
          out.push({
            id: `subscription:${s.id}:paused`,
            category: 'SUBSCRIPTION',
            title: 'Subscription paused',
            body: `Your ${s.planName} plan with ${kitchen} is on hold.`,
            data,
            createdAt: s.pausedAt ?? s.updatedAt,
          });
          break;
        case SubscriptionStatus.REJECTED:
          out.push({
            id: `subscription:${s.id}:rejected`,
            category: 'SUBSCRIPTION',
            title: 'Subscription request declined',
            body: s.rejectionReason ?? `${kitchen} could not take your ${s.planName} request.`,
            data,
            createdAt: s.updatedAt,
          });
          break;
        case SubscriptionStatus.CANCELLED:
          out.push({
            id: `subscription:${s.id}:cancelled`,
            category: 'SUBSCRIPTION',
            title: 'Subscription cancelled',
            body: `Your ${s.planName} plan with ${kitchen} has ended.`,
            data,
            createdAt: s.cancelledAt ?? s.updatedAt,
          });
          break;
        default:
          break; // PENDING: the customer just made this request themselves.
      }
    }
    return out;
  }

  // ── Counts / read state ────────────────────────────────────────────────────

  private async countsFor(userId: string, category?: CustomerNotificationCategory) {
    const readAt = await this.readMarker(userId);
    const unreadAfter = readAt ? { gt: readAt } : undefined;
    const wants = (c: CustomerNotificationCategory) => !category || category === c;

    const orderEventWhere = { order: { userId }, status: { not: OrderStatus.PENDING_PAYMENT } };
    const messageWhere = { sender: 'KITCHEN' as const, order: { userId } };
    const walletWhere = { wallet: { userId }, type: 'CREDIT' as const };
    const subWhere = { userId, status: { not: SubscriptionStatus.PENDING } };

    const totals = await Promise.all([
      wants('ORDER') ? this.prisma.orderStatusEvent.count({ where: orderEventWhere }) : 0,
      wants('ORDER') ? this.prisma.orderMessage.count({ where: messageWhere }) : 0,
      wants('WALLET') ? this.prisma.customerWalletTransaction.count({ where: walletWhere }) : 0,
      wants('SUBSCRIPTION') ? this.prisma.subscription.count({ where: subWhere }) : 0,
    ]);
    const unread = await Promise.all([
      this.prisma.orderStatusEvent.count({ where: { ...orderEventWhere, createdAt: unreadAfter } }),
      this.prisma.orderMessage.count({ where: { ...messageWhere, createdAt: unreadAfter } }),
      this.prisma.customerWalletTransaction.count({ where: { ...walletWhere, createdAt: unreadAfter } }),
      unreadAfter
        ? this.prisma.subscription.count({
            where: {
              userId,
              OR: [
                { status: SubscriptionStatus.ACTIVE, approvedAt: unreadAfter },
                { status: SubscriptionStatus.PAUSED, pausedAt: unreadAfter },
                { status: SubscriptionStatus.CANCELLED, cancelledAt: unreadAfter },
                { status: SubscriptionStatus.REJECTED, updatedAt: unreadAfter },
              ],
            },
          })
        : this.prisma.subscription.count({ where: subWhere }),
    ]);

    return {
      total: totals.reduce((a, b) => a + b, 0),
      unread: unread.reduce((a, b) => a + b, 0),
    };
  }

  private async readMarker(userId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationsReadAt: true } });
    return user?.notificationsReadAt ?? null;
  }

  private isRead(createdAt: Date, readAt: Date | null): boolean {
    return readAt !== null && createdAt.getTime() <= readAt.getTime();
  }

  private orderCopy(status: OrderStatus, orderNumber: string, kitchen: string, note: string | null) {
    switch (status) {
      case OrderStatus.PLACED:
        return { title: 'Order placed', body: `Your order #${orderNumber} was sent to ${kitchen}.` };
      case OrderStatus.ACCEPTED:
        return { title: 'Order accepted', body: `${kitchen} accepted order #${orderNumber}.` };
      case OrderStatus.PREPARING:
        return { title: 'Being prepared', body: `${kitchen} is cooking order #${orderNumber}.` };
      case OrderStatus.OUT_FOR_DELIVERY:
        return { title: 'Out for delivery', body: `Order #${orderNumber} is on its way to you.` };
      case OrderStatus.DELIVERED:
        return { title: 'Order delivered', body: `Order #${orderNumber} was delivered. Enjoy your meal!` };
      case OrderStatus.CANCELLED:
        return { title: 'Order cancelled', body: note ? `Order #${orderNumber}: ${note}` : `Order #${orderNumber} was cancelled.` };
      default:
        return { title: 'Order update', body: `Order #${orderNumber} was updated.` };
    }
  }
}
