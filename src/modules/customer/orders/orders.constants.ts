import { OrderStatus } from '@prisma/client';

/**
 * The four visible stages of the tracking stepper, in order.
 * PENDING_PAYMENT and CANCELLED are terminal/pre-stepper states and sit outside it.
 */
export const TRACKING_STEPS: Array<{
  status: OrderStatus;
  label: string;
  description: string;
}> = [
  { status: OrderStatus.PLACED, label: 'Order Placed', description: 'We have received your order' },
  { status: OrderStatus.ACCEPTED, label: 'Accepted', description: 'Kitchen has accepted your order' },
  { status: OrderStatus.PREPARING, label: 'Preparing', description: 'Your meal is being freshly prepared' },
  { status: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', description: 'On the way to you' },
  { status: OrderStatus.DELIVERED, label: 'Delivered', description: 'Enjoy your meal!' },
];

/** Legal forward transitions. Guards the status-update endpoint. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PLACED, OrderStatus.CANCELLED],
  [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** A customer can only pull the plug before the kitchen starts cooking. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
];

export const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
];

export const SUPPORT_WHATSAPP = '+919876543210';
