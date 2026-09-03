import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cart, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CouponsService } from '../../platform/coupons/coupons.service';
import { buildPriceBreakdown, PRICING } from '../../../common/utils/pricing';
import { isKitchenOpenNow } from '../../../common/utils/kitchen';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

const CART_ITEM_INCLUDE = Prisma.validator<Prisma.CartItemInclude>()({
  meal: {
    select: {
      id: true,
      name: true,
      images: true,
      price: true,
      mrp: true,
      foodType: true,
      calories: true,
      proteinG: true,
      isAvailable: true,
      kitchen: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          isVerified: true,
          prepTimeMins: true,
          opensAt: true,
          closesAt: true,
          isAcceptingOrders: true,
        },
      },
      customizationGroups: {
        select: {
          id: true,
          name: true,
          options: { select: { id: true, name: true, priceDelta: true } },
        },
      },
    },
  },
});

type CartItemRow = Prisma.CartItemGetPayload<{ include: typeof CART_ITEM_INCLUDE }>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────────────────────────────

  /** Full cart with live pricing. Safe to call on an empty cart. */
  async getCart(userId: string) {
    const cart = await this.ensureCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: CART_ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    return this.buildCartResponse(cart, items, userId);
  }

  /** Cheap badge count for the bottom nav / floating cart bar. */
  async getCount(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { items: { select: { quantity: true } } },
    });
    const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
    return { itemCount, lineCount: cart?.items.length ?? 0 };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WRITE
  // ──────────────────────────────────────────────────────────────────────────

  async addItem(userId: string, dto: AddCartItemDto) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: dto.mealId },
      select: {
        id: true,
        kitchenId: true,
        isAvailable: true,
        customizationGroups: {
          select: { id: true, options: { select: { id: true, isAvailable: true } } },
        },
      },
    });

    if (!meal) throw new NotFoundException('Meal not found');
    if (!meal.isAvailable) throw new BadRequestException('This meal is not available right now');

    this.assertValidCustomizations(meal, dto.customizationIds ?? []);

    const cart = await this.ensureCart(userId);

    // One kitchen per cart, the standard Indian food-app rule. The app catches
    // the 409 and offers "Replace cart?" rather than silently dropping items.
    const existingKitchenId = await this.getCartKitchenId(cart.id);
    if (existingKitchenId && existingKitchenId !== meal.kitchenId) {
      if (!dto.replaceCart) {
        const existingKitchen = await this.prisma.kitchen.findUnique({
          where: { id: existingKitchenId },
          select: { id: true, name: true },
        });
        throw new ConflictException({
          message: `Your cart has items from ${existingKitchen?.name ?? 'another kitchen'}. Clear it to order from a new kitchen?`,
          code: 'CART_KITCHEN_CONFLICT',
          existingKitchen,
        });
      }
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    }

    const customizationIds = [...(dto.customizationIds ?? [])].sort();
    const quantity = dto.quantity ?? 1;

    // Same meal + same options + same note = one line with a bumped quantity.
    const duplicate = (
      await this.prisma.cartItem.findMany({
        where: { cartId: cart.id, mealId: meal.id },
      })
    ).find(
      (item) =>
        this.sameCustomizations(item.customizationIds, customizationIds) &&
        (item.specialInstructions ?? '') === (dto.specialInstructions ?? ''),
    );

    if (duplicate) {
      await this.prisma.cartItem.update({
        where: { id: duplicate.id },
        data: { quantity: Math.min(duplicate.quantity + quantity, 20) },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          mealId: meal.id,
          quantity,
          customizationIds,
          specialInstructions: dto.specialInstructions,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.ensureCart(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });

    if (!item || item.cartId !== cart.id) throw new NotFoundException('Cart item not found');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity: dto.quantity,
          ...(dto.specialInstructions !== undefined && {
            specialInstructions: dto.specialInstructions,
          }),
        },
      });
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    return this.updateItem(userId, itemId, { quantity: 0 });
  }

  async clear(userId: string) {
    const cart = await this.ensureCart(userId);
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } }),
    ]);
    return this.getCart(userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COUPONS
  // ──────────────────────────────────────────────────────────────────────────

  async applyCoupon(userId: string, code: string) {
    const { itemsTotal } = await this.computeItemsTotal(userId);
    // Throws with a human reason the app shows inline under the coupon field.
    await this.couponsService.apply(code.toUpperCase(), itemsTotal, userId);

    const cart = await this.ensureCart(userId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: code.toUpperCase() },
    });

    return this.getCart(userId);
  }

  async removeCoupon(userId: string) {
    const cart = await this.ensureCart(userId);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    return this.getCart(userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SHARED WITH ORDERS
  // ──────────────────────────────────────────────────────────────────────────

  async ensureCart(userId: string): Promise<Cart> {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { userId } });
  }

  async getDetailedItems(userId: string): Promise<CartItemRow[]> {
    const cart = await this.ensureCart(userId);
    return this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: CART_ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Resolves each line's unit price including the options the user picked. */
  priceLine(item: CartItemRow) {
    const selected = item.meal.customizationGroups
      .flatMap((g) => g.options)
      .filter((o) => item.customizationIds.includes(o.id));

    const addOnTotal = selected.reduce((sum, o) => sum + o.priceDelta, 0);
    const unitPrice = item.meal.price + addOnTotal;

    return {
      selected,
      addOnTotal,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  private async computeItemsTotal(userId: string) {
    const items = await this.getDetailedItems(userId);
    const itemsTotal = items.reduce((sum, item) => sum + this.priceLine(item).lineTotal, 0);
    return { items, itemsTotal };
  }

  private async buildCartResponse(cart: Cart, items: CartItemRow[], userId: string) {
    const lines = items.map((item) => {
      const priced = this.priceLine(item);
      return {
        id: item.id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        unitPrice: priced.unitPrice,
        lineTotal: priced.lineTotal,
        customizations: priced.selected.map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: o.priceDelta,
        })),
        meal: {
          id: item.meal.id,
          name: item.meal.name,
          image: item.meal.images[0] ?? null,
          basePrice: item.meal.price,
          mrp: item.meal.mrp,
          foodType: item.meal.foodType,
          calories: item.meal.calories,
          proteinG: item.meal.proteinG,
          isAvailable: item.meal.isAvailable,
        },
      };
    });

    const itemsTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const coupon = await this.couponsService.evaluate(cart.couponCode, itemsTotal, userId);
    const pricing = buildPriceBreakdown(itemsTotal, coupon.discount);

    const kitchenRow = items[0]?.meal.kitchen ?? null;
    const kitchen = kitchenRow
      ? {
          id: kitchenRow.id,
          name: kitchenRow.name,
          slug: kitchenRow.slug,
          logoUrl: kitchenRow.logoUrl,
          isVerified: kitchenRow.isVerified,
          prepTimeMins: kitchenRow.prepTimeMins,
          isOpenNow:
            kitchenRow.isAcceptingOrders &&
            isKitchenOpenNow(kitchenRow.opensAt, kitchenRow.closesAt),
        }
      : null;

    const unavailableItems = lines.filter((l) => !l.meal.isAvailable).map((l) => l.meal.name);

    return {
      id: cart.id,
      isEmpty: lines.length === 0,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      kitchen,
      items: lines,
      coupon: {
        code: coupon.valid ? coupon.code : null,
        title: coupon.title ?? null,
        discount: coupon.discount,
        /** Set when a previously-applied coupon stopped qualifying. */
        invalidReason: cart.couponCode && !coupon.valid ? coupon.reason : null,
      },
      pricing: {
        ...pricing,
        minOrderValue: PRICING.MIN_ORDER_VALUE,
        freeDeliveryAbove: PRICING.FREE_DELIVERY_ABOVE,
      },
      /** Everything blocking checkout, so the button state is a pure read. */
      checkout: {
        canCheckout:
          lines.length > 0 &&
          unavailableItems.length === 0 &&
          itemsTotal >= PRICING.MIN_ORDER_VALUE &&
          (kitchen?.isOpenNow ?? false),
        blockers: [
          ...(lines.length === 0 ? ['Your cart is empty'] : []),
          ...(unavailableItems.length
            ? [`${unavailableItems.join(', ')} is no longer available`]
            : []),
          ...(lines.length > 0 && itemsTotal < PRICING.MIN_ORDER_VALUE
            ? [`Minimum order value is ₹${PRICING.MIN_ORDER_VALUE}`]
            : []),
          ...(kitchen && !kitchen.isOpenNow ? [`${kitchen.name} is closed right now`] : []),
        ],
      },
      updatedAt: cart.updatedAt,
    };
  }

  private async getCartKitchenId(cartId: string): Promise<string | null> {
    const first = await this.prisma.cartItem.findFirst({
      where: { cartId },
      select: { meal: { select: { kitchenId: true } } },
    });
    return first?.meal.kitchenId ?? null;
  }

  private assertValidCustomizations(
    meal: { customizationGroups: { options: { id: string; isAvailable: boolean }[] }[] },
    customizationIds: string[],
  ) {
    if (!customizationIds.length) return;

    const available = new Set(
      meal.customizationGroups.flatMap((g) => g.options.filter((o) => o.isAvailable).map((o) => o.id)),
    );
    const invalid = customizationIds.filter((id) => !available.has(id));
    if (invalid.length) {
      throw new BadRequestException('One or more selected add-ons are not available for this meal');
    }
  }

  private sameCustomizations(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    return sortedA.every((id, i) => id === b[i]);
  }
}
