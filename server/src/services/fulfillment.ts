import { FulfillmentStatus, OrderStatus, OrderEventType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { fulfillmentStatusFromTracking, type BoxtalTracking } from './boxtal.js';
import { sendShippingNotificationEmail, sendDeliveryConfirmationEmail } from './email.js';
import { buildOrderTrackingLink } from '../utils/tracking.js';

const orderInclude = {
  items: true,
  user: { select: { email: true } },
} satisfies Prisma.OrderInclude;

type OrderForFulfillment = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const customerEmailOf = (order: OrderForFulfillment): string | null =>
  ((order.billingAddress as { email?: string } | null)?.email || order.user?.email) ?? null;

const orderEmailData = (order: OrderForFulfillment) => ({
  orderNumber: order.orderNumber,
  totalCents: order.totalCents,
  currency: order.currency,
  items: order.items.map((item) => ({
    productName: item.productName,
    variantName: item.variantName,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    totalPriceCents: item.totalPriceCents,
  })),
  shippingAddress: order.shippingAddress as any,
  billingAddress: order.billingAddress as any,
  pickupPoint: (order.pickupPoint as any) ?? undefined,
});

/**
 * Applique un état de suivi Boxtal à une commande : met à jour le numéro et
 * l'URL de suivi, et fait progresser le statut selon la réalité transporteur.
 *
 * Cycle : étiquette créée = PREPARING (géré côté admin) → premier scan
 * transporteur (SHIPPED/IN_TRANSIT/...) = SHIPPED + email d'expédition →
 * DELIVERED = livrée + email de livraison. Idempotent : rejouable sans
 * double transition ni double email.
 */
export async function applyBoxtalTrackingUpdate(
  order: OrderForFulfillment,
  tracking: BoxtalTracking | null | undefined
): Promise<OrderForFulfillment> {
  if (!tracking) return order;

  const data: Prisma.OrderUpdateInput = {};

  if (tracking.trackingNumber && tracking.trackingNumber !== order.trackingNumber) {
    data.trackingNumber = tracking.trackingNumber;
  }
  if (tracking.trackingUrl && tracking.trackingUrl !== order.trackingUrl) {
    data.trackingUrl = tracking.trackingUrl;
  }

  const nextFulfillment = fulfillmentStatusFromTracking(tracking.status);
  const alreadyDelivered = order.fulfillmentStatus === FulfillmentStatus.DELIVERED;
  const alreadyShipped = order.fulfillmentStatus === FulfillmentStatus.SHIPPED || alreadyDelivered;

  let transition: 'SHIPPED' | 'DELIVERED' | null = null;

  if (nextFulfillment === FulfillmentStatus.SHIPPED && !alreadyShipped) {
    transition = 'SHIPPED';
    data.fulfillmentStatus = FulfillmentStatus.SHIPPED;
    data.status = OrderStatus.SHIPPED;
    data.shippedAt = order.shippedAt ?? new Date();
    data.events = {
      create: {
        type: OrderEventType.SHIPPED,
        message: `Colis pris en charge par le transporteur (suivi Boxtal : ${tracking.status})`,
      },
    };
  } else if (nextFulfillment === FulfillmentStatus.DELIVERED && !alreadyDelivered) {
    transition = 'DELIVERED';
    data.fulfillmentStatus = FulfillmentStatus.DELIVERED;
    data.status = OrderStatus.DELIVERED;
    data.deliveredAt = order.deliveredAt ?? new Date();
    if (!order.shippedAt) data.shippedAt = new Date();
    data.events = {
      create: {
        type: OrderEventType.DELIVERED,
        message: 'Colis livré (suivi Boxtal)',
      },
    };
  }

  if (Object.keys(data).length === 0) return order;

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data,
    include: orderInclude,
  });

  const customerEmail = customerEmailOf(updatedOrder);
  if (customerEmail && transition === 'SHIPPED') {
    const orderTrackingUrl = buildOrderTrackingLink(updatedOrder.id, customerEmail);
    sendShippingNotificationEmail(
      {
        ...orderEmailData(updatedOrder),
        trackingNumber: updatedOrder.trackingNumber ?? undefined,
        trackingUrl: updatedOrder.trackingUrl ?? undefined,
        orderTrackingUrl: orderTrackingUrl ?? undefined,
        carrier: updatedOrder.carrier ?? undefined,
      },
      customerEmail
    ).catch(() => {});
  } else if (customerEmail && transition === 'DELIVERED') {
    sendDeliveryConfirmationEmail(orderEmailData(updatedOrder), customerEmail).catch(() => {});
  }

  return updatedOrder;
}
