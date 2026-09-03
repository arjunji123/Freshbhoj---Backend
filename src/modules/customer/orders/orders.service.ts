import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliverySlotType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../../platform/coupons/coupons.service';
import { AddressesService } from '../addresses/addresses.service';
import { buildPriceBreakdown, generateOrderNumber, PRICING } from '../../../common/utils/pricing';
import { isKitchenOpenNow } from '../../../common/utils/kitchen';
import { Paginated, paginate, toSkip } from '../../../common/dto/pagination.dto';
import {
  ACTIVE_STATUSES,
  ALLOWED_TRANSITIONS,
  CUSTOMER_CANCELLABLE,
  SUPPORT_WHATSAPP,
  TRACKING_STEPS,
} from './orders.constants';
import { CancelOrderDto, ConfirmPaymentDto, PlaceOrderDto } from './dto/orders.dto';

const ORDER_INCLUDE = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  events: { orderBy: { createdAt: 'asc' } },
  kitchen: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isVerified: true,
      rating: true,
      contactPhone: true,
      locality: true,
      latitude: true,
      longitude: true,
    },
  },
  deliveryPartner: {
    select: { id: true, name: true, phone: true, photoUrl: true, vehicleNumber: true },
  },
  reviews: { select: { id: true, rating: true } },
});

type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
    private readonly addressesService: AddressesService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PLACE ORDER — turns the live cart into an immutable order
  // ──────────────────────────────────────────────────────────────────────────

  async placeOrder(userId: string, dto: PlaceOrderDto) {
    const items = await this.cartService.getDetailedItems(userId);
    if (!items.length) throw new BadRequestException('Your cart is empty');

    const unavailable = items.filter((i) => !i.meal.isAvailable);
    if (unavailable.length) {
      throw new BadRequestException(
        `${unavailable.map((i) => i.meal.name).join(', ')} is no longer available. Please update your cart.`,
      );
    }

    const kitchen = items[0].meal.kitchen;
    if (!kitchen.isAcceptingOrders || !isKitchenOpenNow(kitchen.opensAt, kitchen.closesAt)) {
      throw new BadRequestException(`${kitchen.name} is not accepting orders right now`);
    }

    const address = await this.addressesService.findOne(userId, dto.addressId);

    if (dto.slotType === DeliverySlotType.SCHEDULED && !dto.scheduledFor) {
      throw new BadRequestException('Pick a delivery time for a scheduled order');
    }

    // Re-price server-side. Never trust totals computed on the device.
    const pricedLines = items.map((item) => ({ item, priced: this.cartService.priceLine(item) }));
    const itemsTotal = pricedLines.reduce((sum, l) => sum + l.priced.lineTotal, 0);

    if (itemsTotal < PRICING.MIN_ORDER_VALUE) {
      throw new BadRequestException(`Minimum order value is ₹${PRICING.MIN_ORDER_VALUE}`);
    }

    const cart = await this.cartService.ensureCart(userId);
    const coupon = await this.couponsService.evaluate(cart.couponCode, itemsTotal, userId);
    const pricing = buildPriceBreakdown(itemsTotal, coupon.discount);

    const paymentMethod = dto.paymentMethod ?? PaymentMethod.UPI;
    // COD skips the gateway and goes straight to PLACED; everything else waits
    // for /confirm-payment before the kitchen ever sees the order.
    const isCod = paymentMethod === PaymentMethod.COD;
    const status = isCod ? OrderStatus.PLACED : OrderStatus.PENDING_PAYMENT;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          kitchenId: kitchen.id,
          addressId: address.id,
          addressSnapshot: {
            label: address.label,
            customLabel: address.customLabel,
            receiverName: address.receiverName,
            receiverPhone: address.receiverPhone,
            line1: address.line1,
            line2: address.line2,
            landmark: address.landmark,
            locality: address.locality,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            latitude: address.latitude,
            longitude: address.longitude,
          } as Prisma.InputJsonValue,
          status,
          itemsTotal: pricing.itemsTotal,
          deliveryFee: pricing.deliveryFee,
          taxes: pricing.taxes,
          discount: pricing.discount,
          totalAmount: pricing.totalAmount,
          couponCode: coupon.valid ? coupon.code : null,
          paymentMethod,
          paymentStatus: isCod ? PaymentStatus.PENDING : PaymentStatus.PROCESSING,
          slotType: dto.slotType ?? DeliverySlotType.NOW,
          scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
          orderNotes: dto.orderNotes,
          etaMinutes: kitchen.prepTimeMins + 15,
          placedAt: isCod ? new Date() : null,
          items: {
            create: pricedLines.map(({ item, priced }) => ({
              mealId: item.meal.id,
              name: item.meal.name,
              imageUrl: item.meal.images[0] ?? null,
              unitPrice: priced.unitPrice,
              quantity: item.quantity,
              customizations: priced.selected.map((o) => ({
                id: o.id,
                name: o.name,
                priceDelta: o.priceDelta,
              })) as Prisma.InputJsonValue,
              lineTotal: priced.lineTotal,
              specialInstructions: item.specialInstructions,
            })),
          },
          ...(isCod && {
            events: {
              create: { status: OrderStatus.PLACED, note: 'Order placed (Cash on Delivery)' },
            },
          }),
        },
        include: ORDER_INCLUDE,
      });

      if (isCod) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
        if (coupon.valid && coupon.code) {
          await tx.coupon.updateMany({ where: { code: coupon.code }, data: { usedCount: { increment: 1 } } });
        }
        await Promise.all(
          pricedLines.map(({ item }) =>
            tx.meal.update({
              where: { id: item.meal.id },
              data: { orderCount: { increment: item.quantity } },
            }),
          ),
        );
      }

      return created;
    });

    this.logger.log(`Order ${order.orderNumber} created for user ${userId} (${status})`);
    return this.toOrderDetail(order);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIRM PAYMENT — gateway callback / client confirmation
  // ──────────────────────────────────────────────────────────────────────────

  async confirmPayment(userId: string, orderId: string, dto: ConfirmPaymentDto) {
    const order = await this.getOwnedOrder(userId, orderId);

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('This order is not awaiting payment');
    }

    const cart = await this.cartService.ensureCart(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PLACED,
          paymentStatus: PaymentStatus.PAID,
          paymentRef: dto.paymentRef,
          placedAt: new Date(),
          events: { create: { status: OrderStatus.PLACED, note: 'Payment successful' } },
        },
        include: ORDER_INCLUDE,
      });

      // The cart is only emptied once money has actually moved — a failed
      // payment leaves the customer's cart intact so they can retry.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

      if (result.couponCode) {
        await tx.coupon.updateMany({
          where: { code: result.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      await Promise.all(
        result.items
          .filter((i) => i.mealId)
          .map((i) =>
            tx.meal.update({
              where: { id: i.mealId as string },
              data: { orderCount: { increment: i.quantity } },
            }),
          ),
      );

      return result;
    });

    return this.toOrderDetail(updated);
  }

  async failPayment(userId: string, orderId: string) {
    const order = await this.getOwnedOrder(userId, orderId);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('This order is not awaiting payment');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.FAILED },
      include: ORDER_INCLUDE,
    });

    return this.toOrderDetail(updated);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(userId: string, page = 1, limit = 20, status?: OrderStatus[]): Promise<Paginated<any>> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status?.length && { status: { in: status } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(rows.map((r) => this.toOrderCard(r)), page, limit, total);
  }

  /** Drives the "Active order" strip on Home and the live tracking screen. */
  async findActive(userId: string) {
    const rows = await this.prisma.order.findMany({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toOrderDetail(r));
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.getOwnedOrder(userId, orderId);
    return this.toOrderDetail(order);
  }

  async getTracking(userId: string, orderId: string) {
    const order = await this.getOwnedOrder(userId, orderId);
    const detail = this.toOrderDetail(order);
    // A narrow slice of the order detail — this endpoint is polled every ~15s,
    // so it deliberately omits the items and bill the tracking screen already
    // holds from GET /orders/:id.
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: detail.statusLabel,
      canCancel: detail.canCancel,
      tracking: detail.tracking,
      eta: detail.eta,
      kitchen: detail.kitchen,
      deliveryPartner: detail.deliveryPartner,
      support: detail.support,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MUTATE
  // ──────────────────────────────────────────────────────────────────────────

  async cancel(userId: string, orderId: string, dto: CancelOrderDto) {
    const order = await this.getOwnedOrder(userId, orderId);

    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new BadRequestException(
        'This order can no longer be cancelled — the kitchen has already started preparing it. Please contact support.',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.reason ?? 'Cancelled by customer',
        ...(order.paymentStatus === PaymentStatus.PAID && { paymentStatus: PaymentStatus.REFUNDED }),
        events: {
          create: { status: OrderStatus.CANCELLED, note: dto.reason ?? 'Cancelled by customer' },
        },
      },
      include: ORDER_INCLUDE,
    });

    return this.toOrderDetail(updated);
  }

  /**
   * Advances an order along the pipeline. Today it backs the ops tooling and
   * the dev simulator; the vendor dashboard will call it in Phase 2.
   */
  async advanceStatus(orderId: string, next: OrderStatus, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
      throw new BadRequestException(`Cannot move an order from ${order.status} to ${next}`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: next,
        ...(next === OrderStatus.ACCEPTED && { acceptedAt: new Date() }),
        ...(next === OrderStatus.DELIVERED && {
          deliveredAt: new Date(),
          paymentStatus: PaymentStatus.PAID,
        }),
        events: { create: { status: next, note } },
      },
      include: ORDER_INCLUDE,
    });

    return this.toOrderDetail(updated);
  }

  /**
   * One-tap reorder: rebuilds the cart from a past order, skipping anything the
   * kitchen has since removed and reporting exactly what was dropped.
   */
  async reorder(userId: string, orderId: string) {
    const order = await this.getOwnedOrder(userId, orderId);

    const mealIds = order.items.map((i) => i.mealId).filter((id): id is string => Boolean(id));
    const meals = await this.prisma.meal.findMany({
      where: { id: { in: mealIds }, isAvailable: true },
      select: {
        id: true,
        kitchenId: true,
        customizationGroups: {
          select: { options: { where: { isAvailable: true }, select: { id: true } } },
        },
      },
    });
    const availableIds = new Set(meals.map((m) => m.id));

    // Add-ons the kitchen has since retired would fail validation and sink the
    // whole reorder, so each line is intersected with what the meal still offers.
    const validOptionsByMeal = new Map(
      meals.map((meal) => [
        meal.id,
        new Set(meal.customizationGroups.flatMap((group) => group.options.map((o) => o.id))),
      ]),
    );

    const addable = order.items.filter((i) => i.mealId && availableIds.has(i.mealId));
    const skipped = order.items.filter((i) => !i.mealId || !availableIds.has(i.mealId));

    if (!addable.length) {
      throw new BadRequestException('None of the items from this order are available right now');
    }

    // Reordering always starts a clean cart — mixing kitchens isn't allowed.
    await this.cartService.clear(userId);

    for (const item of addable) {
      const stillOffered = validOptionsByMeal.get(item.mealId as string) ?? new Set<string>();
      const customizationIds = Array.isArray(item.customizations)
        ? (item.customizations as any[])
            .map((c) => c?.id)
            .filter((id): id is string => Boolean(id) && stillOffered.has(id))
        : [];

      await this.cartService.addItem(userId, {
        mealId: item.mealId as string,
        quantity: item.quantity,
        customizationIds,
        specialInstructions: item.specialInstructions ?? undefined,
        replaceCart: true,
      });
    }

    const cart = await this.cartService.getCart(userId);

    return {
      cart,
      addedCount: addable.length,
      skippedItems: skipped.map((i) => i.name),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAPPERS
  // ──────────────────────────────────────────────────────────────────────────

  private toOrderCard(order: OrderRow) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: this.statusLabel(order.status),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
      thumbnails: order.items.map((i) => i.imageUrl).filter(Boolean).slice(0, 3),
      itemSummary: order.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
      kitchen: order.kitchen,
      placedAt: order.placedAt ?? order.createdAt,
      deliveredAt: order.deliveredAt,
      isActive: ACTIVE_STATUSES.includes(order.status),
      canReorder: order.status === OrderStatus.DELIVERED,
      isRated: order.reviews.length > 0,
      createdAt: order.createdAt,
    };
  }

  private toOrderDetail(order: OrderRow) {
    return {
      ...this.toOrderCard(order),
      items: order.items.map((i) => ({
        id: i.id,
        mealId: i.mealId,
        name: i.name,
        image: i.imageUrl,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
        customizations: i.customizations,
        specialInstructions: i.specialInstructions,
      })),
      pricing: {
        itemsTotal: order.itemsTotal,
        deliveryFee: order.deliveryFee,
        taxes: order.taxes,
        discount: order.discount,
        totalAmount: order.totalAmount,
        couponCode: order.couponCode,
      },
      address: order.addressSnapshot,
      orderNotes: order.orderNotes,
      slot: {
        type: order.slotType,
        scheduledFor: order.scheduledFor,
      },
      eta: this.buildEta(order),
      tracking: this.buildTracking(order),
      deliveryPartner: order.deliveryPartner,
      cancelReason: order.cancelReason,
      canCancel: CUSTOMER_CANCELLABLE.includes(order.status),
      support: {
        whatsapp: SUPPORT_WHATSAPP,
        kitchenPhone: order.kitchen.contactPhone,
      },
    };
  }

  /** Pre-computed stepper so the tracking screen is a pure render. */
  private buildTracking(order: OrderRow) {
    if (order.status === OrderStatus.CANCELLED) {
      return {
        isCancelled: true,
        currentIndex: -1,
        steps: TRACKING_STEPS.map((step) => ({ ...step, isDone: false, isCurrent: false, at: null })),
      };
    }

    const eventAt = new Map(order.events.map((e) => [e.status, e.createdAt]));
    const currentIndex = TRACKING_STEPS.findIndex((s) => s.status === order.status);

    return {
      isCancelled: false,
      currentIndex,
      steps: TRACKING_STEPS.map((step, index) => ({
        ...step,
        isDone: currentIndex >= 0 && index < currentIndex,
        isCurrent: index === currentIndex,
        at: eventAt.get(step.status) ?? null,
      })),
    };
  }

  private buildEta(order: OrderRow) {
    const from = order.placedAt ?? order.createdAt;
    const expectedAt = new Date(from.getTime() + order.etaMinutes * 60_000);
    const minutesRemaining = Math.max(
      Math.ceil((expectedAt.getTime() - Date.now()) / 60_000),
      0,
    );

    return {
      etaMinutes: order.etaMinutes,
      expectedAt,
      minutesRemaining: order.status === OrderStatus.DELIVERED ? 0 : minutesRemaining,
      // The app shows a range ("12–18 mins"), not a single number it can miss.
      rangeLabel:
        order.status === OrderStatus.DELIVERED
          ? 'Delivered'
          : `${Math.max(minutesRemaining - 3, 1)}–${minutesRemaining + 3} mins`,
    };
  }

  private statusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING_PAYMENT]: 'Awaiting payment',
      [OrderStatus.PLACED]: 'Order placed',
      [OrderStatus.ACCEPTED]: 'Accepted',
      [OrderStatus.PREPARING]: 'Preparing',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Out for delivery',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status];
  }

  private async getOwnedOrder(userId: string, orderId: string): Promise<OrderRow> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('This order does not belong to you');
    return order;
  }
}
