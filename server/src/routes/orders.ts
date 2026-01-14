import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { optionalAuth } from '../middleware/auth.js';
import { verifyOrderTrackingToken } from '../utils/tracking.js';

const router = Router();

const toPublicTrackingOrderDto = (order: any) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  fulfillmentStatus: order.fulfillmentStatus ?? null,
  carrier: order.carrier ?? null,
  trackingNumber: order.trackingNumber ?? null,
  trackingUrl: order.trackingUrl ?? null,
  shippedAt: order.shippedAt ?? null,
  deliveredAt: order.deliveredAt ?? null,
  items: (order.items || []).map((it: any) => ({
    id: it.id,
    productName: it.productName,
    variantName: it.variantName ?? null,
    imageUrl: it.imageUrl ?? null,
    quantity: it.quantity,
    unitPriceCents: it.unitPriceCents,
    totalPriceCents: it.totalPriceCents,
  })),
  events: (order.events || []).map((ev: any) => ({
    id: ev.id,
    type: ev.type,
    message: ev.message ?? null,
    createdAt: ev.createdAt,
  })),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  currency: order.currency,
  totalCents: order.totalCents,
});

router.get('/:orderId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;

    let tokenOrderId: string | null = null;
    try {
      if (token) {
        const payload = verifyOrderTrackingToken(token);
        tokenOrderId = payload.orderId;
      }
    } catch {
      return res
        .status(401)
        .json({ error: 'Token de suivi invalide', code: 'INVALID_TRACKING_TOKEN' });
    }

    const isOwner = !!req.user?.userId;
    const canUseToken = !!token && tokenOrderId === orderId;

    if (!isOwner && !canUseToken) {
      return res.status(401).json({ error: 'Accès non autorisé', code: 'ORDER_ACCESS_DENIED' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(isOwner ? { userId: req.user!.userId } : {}),
      },
      include: {
        items: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' });
    }

    res.json({
      order: canUseToken ? toPublicTrackingOrderDto(order) : order,
      access: canUseToken ? 'token' : 'owner',
    });
  } catch {
    res.status(500).json({ error: 'Erreur interne du serveur', code: 'INTERNAL_SERVER_ERROR' });
  }
});

export default router;
