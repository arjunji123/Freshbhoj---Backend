import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatSenderType, NotificationCategory, OrderMessage } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../kitchen/portal/notifications/notifications.service';
import { SendOrderMessageDto } from './dto/order-messages.dto';

/**
 * The customer half of per-order messaging. Deliberately thin — no polished
 * customer-app chat UI is built this round, but the API is real end-to-end.
 * `hasUnreadKitchenMessages` is called from `OrdersService.getTracking` so
 * the already-polled tracking screen can surface a "new message" badge
 * without a dedicated customer-notification model.
 */
@Injectable()
export class OrderMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(userId: string, orderId: string) {
    const order = await this.requireOwnedOrder(userId, orderId);

    await this.prisma.orderMessage.updateMany({
      where: { orderId: order.id, sender: ChatSenderType.KITCHEN, isRead: false },
      data: { isRead: true },
    });

    const messages = await this.prisma.orderMessage.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    return messages.map((m) => this.toDto(m));
  }

  async send(userId: string, orderId: string, dto: SendOrderMessageDto) {
    const order = await this.requireOwnedOrder(userId, orderId);

    const message = await this.prisma.orderMessage.create({
      data: { orderId: order.id, sender: ChatSenderType.CUSTOMER, body: dto.body },
    });

    const kitchen = await this.prisma.kitchen.findUnique({ where: { id: order.kitchenId }, select: { accountId: true } });
    if (kitchen?.accountId) {
      await this.notificationsService.create(
        kitchen.accountId,
        NotificationCategory.ORDER,
        `New message — Order #${order.orderNumber}`,
        dto.body,
        { orderId: order.id },
      );
    }
    return this.toDto(message);
  }

  async markRead(userId: string, orderId: string) {
    const order = await this.requireOwnedOrder(userId, orderId);
    await this.prisma.orderMessage.updateMany({
      where: { orderId: order.id, sender: ChatSenderType.KITCHEN, isRead: false },
      data: { isRead: true },
    });
    return { orderId: order.id, marked: true };
  }

  /** Used by `OrdersService.getTracking` — trusts the caller to have already checked ownership. */
  async hasUnreadKitchenMessages(orderId: string): Promise<boolean> {
    const count = await this.prisma.orderMessage.count({
      where: { orderId, sender: ChatSenderType.KITCHEN, isRead: false },
    });
    return count > 0;
  }

  private async requireOwnedOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, kitchenId: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('This order does not belong to you');
    return order;
  }

  private toDto(m: OrderMessage) {
    return {
      id: m.id,
      sender: m.sender,
      body: m.body,
      triggeredStatus: m.triggeredStatus,
      isRead: m.isRead,
      createdAt: m.createdAt,
    };
  }
}
