import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatSenderType, OrderMessage } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { KitchenOrdersService } from '../orders/kitchen-orders.service';
import { SendKitchenOrderMessageDto } from './dto/order-chat.dto';

/**
 * Per-order kitchen↔customer messaging — distinct from BhojAI (the kitchen's
 * chat with the AI assistant, a different conversation entirely). Polling-based,
 * like the rest of this backend — no websocket infra exists.
 */
@Injectable()
export class KitchenOrderChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchenOrdersService: KitchenOrdersService,
  ) {}

  async list(accountId: string, orderId: string) {
    const kitchen = await this.requireKitchen(accountId);
    await this.requireOwnedOrder(kitchen.id, orderId);

    // Opening the thread IS the kitchen's "read" action.
    await this.prisma.orderMessage.updateMany({
      where: { orderId, sender: ChatSenderType.CUSTOMER, isRead: false },
      data: { isRead: true },
    });

    const messages = await this.prisma.orderMessage.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    return messages.map((m) => this.toDto(m));
  }

  async send(accountId: string, orderId: string, dto: SendKitchenOrderMessageDto) {
    const kitchen = await this.requireKitchen(accountId);
    await this.requireOwnedOrder(kitchen.id, orderId);

    // Reuses KitchenOrdersService.advanceStatus — its own KITCHEN_SETTABLE
    // validation and the customer-facing ALLOWED_TRANSITIONS check both apply,
    // so an illegal transition rejects the whole message, not just the status.
    if (dto.advanceToStatus) {
      await this.kitchenOrdersService.advanceStatus(accountId, orderId, dto.advanceToStatus, dto.body);
    }

    const message = await this.prisma.orderMessage.create({
      data: {
        orderId,
        sender: ChatSenderType.KITCHEN,
        body: dto.body,
        triggeredStatus: dto.advanceToStatus ?? null,
      },
    });
    return this.toDto(message);
  }

  /** Ops-only, read-only — for dispute lookup. No mark-read side effect. */
  async adminList(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new NotFoundException('Order not found');
    const messages = await this.prisma.orderMessage.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    return messages.map((m) => this.toDto(m));
  }

  private async requireOwnedOrder(kitchenId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, kitchenId: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.kitchenId !== kitchenId) {
      throw new ForbiddenException('This order does not belong to your kitchen');
    }
    return order;
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
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
