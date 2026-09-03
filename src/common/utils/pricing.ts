/**
 * Single source of truth for how a FreshBhoj bill is assembled.
 * Cart preview and order placement both call these so the number the customer
 * sees on the cart screen is exactly the number they are charged.
 * All amounts are whole rupees (no paise) — matches the UI, which never shows decimals.
 */

export const PRICING = {
  /** Flat delivery fee below the free-delivery threshold. */
  DELIVERY_FEE: 45,
  /** Order value at or above which delivery is free. */
  FREE_DELIVERY_ABOVE: 499,
  /** GST on prepared food, as a fraction. */
  TAX_RATE: 0.05,
  /** Minimum order value we accept. */
  MIN_ORDER_VALUE: 99,
} as const;

export interface PriceBreakdown {
  itemsTotal: number;
  deliveryFee: number;
  taxes: number;
  discount: number;
  totalAmount: number;
  freeDeliveryApplied: boolean;
  /** Rupees still needed to unlock free delivery; 0 once unlocked. */
  amountToFreeDelivery: number;
}

export function calculateDeliveryFee(itemsTotal: number): number {
  return itemsTotal >= PRICING.FREE_DELIVERY_ABOVE ? 0 : PRICING.DELIVERY_FEE;
}

export function calculateTaxes(taxableAmount: number): number {
  return Math.round(Math.max(taxableAmount, 0) * PRICING.TAX_RATE);
}

/**
 * Discount applies to the items subtotal only (not to delivery or tax),
 * and tax is charged on the post-discount subtotal.
 */
export function buildPriceBreakdown(itemsTotal: number, discount = 0): PriceBreakdown {
  const safeItems = Math.max(Math.round(itemsTotal), 0);
  const safeDiscount = Math.min(Math.max(Math.round(discount), 0), safeItems);
  const deliveryFee = calculateDeliveryFee(safeItems);
  const taxes = calculateTaxes(safeItems - safeDiscount);
  const totalAmount = safeItems - safeDiscount + deliveryFee + taxes;

  return {
    itemsTotal: safeItems,
    deliveryFee,
    taxes,
    discount: safeDiscount,
    totalAmount,
    freeDeliveryApplied: deliveryFee === 0,
    amountToFreeDelivery: Math.max(PRICING.FREE_DELIVERY_ABOVE - safeItems, 0),
  };
}

/** Human-facing order number, e.g. `FB-40213`. */
export function generateOrderNumber(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `FB-${n}`;
}
