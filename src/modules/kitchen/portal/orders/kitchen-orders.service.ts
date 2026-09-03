import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Paginated, paginate, toSkip } from '../../../../common/dto/pagination.dto';
import { ALLOWED_TRANSITIONS, ACTIVE_STATUSES } from '../../../customer/orders/orders.constants';
import { OrdersService } from '../../../customer/orders/orders.service';
import { KitchenOrderQueryDto } from './dto/kitchen-orders.dto';

const KITCHEN_ORDER_SELECT = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  totalAmount: true,
  orderNotes: true,
  placedAt: true,
  createdAt: true,
  etaMinutes: true,
  addressSnapshot: true,
  items: {
    select: { name: true, quantity: true, customizations: true, specialInstructions: true },
  },
  user: { select: { fullName: true, phone: true } },
});

type KitchenOrderRow = Prisma.OrderGetPayload<{ select: typeof KITCHEN_ORDER_SELECT }>;

/**
 * Orders as the kitchen sees them: only their own, and with a customer name +
 * phone instead of a full delivery address — a partner needs to call the
 * customer, not see their saved-address label.
 *
 * Status changes are delegated to the customer `OrdersService.advanceStatus`,
 * which already enforces `ALLOWED_TRANSITIONS` and writes the tracking event
 * both apps read — this file only adds the ownership check and the kitchen's
 * narrower list of statuses it may set.
 */
@Injectable()
export class KitchenOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async findAll(accountId: string, query: KitchenOrderQueryDto): Promise<Paginated<any>> {
    const kitchen = await this.requireKitchen(accountId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.OrderWhereInput = {
      kitchenId: kitchen.id,
      ...(query.status?.length && { status: { in: query.status } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: KITCHEN_ORDER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(rows.map((row) => this.toCard(row)), page, limit, total);
  }

  /** New/active orders — what the kitchen dashboard polls. */
  async findIncoming(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const rows = await this.prisma.order.findMany({
      where: { kitchenId: kitchen.id, status: { in: ACTIVE_STATUSES } },
      select: KITCHEN_ORDER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toCard(row));
  }

  async findOne(accountId: string, orderId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { ...KITCHEN_ORDER_SELECT, kitchenId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.kitchenId !== kitchen.id) {
      throw new ForbiddenException('This order does not belong to your kitchen');
    }

    return this.toCard(order);
  }

  /**
   * A kitchen may only move an order to ACCEPTED, PREPARING, OUT_FOR_DELIVERY
   * or CANCELLED — never PENDING_PAYMENT or DELIVERED, which are the payment
   * gateway's and the delivery partner's calls respectively.
   */
  async advanceStatus(accountId: string, orderId: string, next: string, note?: string) {
    const kitchen = await this.requireKitchen(accountId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { kitchenId: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.kitchenId !== kitchen.id) {
      throw new ForbiddenException('This order does not belong to your kitchen');
    }

    const KITCHEN_SETTABLE = ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'CANCELLED'];
    if (!KITCHEN_SETTABLE.includes(next)) {
      throw new BadRequestException('A kitchen cannot set that status');
    }

    return this.ordersService.advanceStatus(orderId, next as any, note);
  }

  private toCard(order: KitchenOrderRow) {
    const address = order.addressSnapshot as any;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      customer: {
        name: order.user.fullName ?? address?.receiverName ?? 'FreshBhoj customer',
        phone: address?.receiverPhone ?? order.user.phone,
      },
      items: order.items,
      orderNotes: order.orderNotes,
      placedAt: order.placedAt ?? order.createdAt,
      etaMinutes: order.etaMinutes,
      allowedNextStatuses: (ALLOWED_TRANSITIONS[order.status] ?? []).filter((s) =>
        ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'CANCELLED'].includes(s),
      ),
    };
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }
}
