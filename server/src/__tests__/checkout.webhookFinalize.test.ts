import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { cleanupDatabase, createTestUser, createTestProduct, prisma } from './setup.js';
import { processCompletedCheckoutSession } from '../routes/checkout.js';
import Stripe from 'stripe';
import { asStripeSession } from './vitest.setup.js';

describe('Webhook finalisation (processCompletedCheckoutSession)', () => {
  let testUser: any;
  let testProduct: any;
  let testVariant: any;

  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupDatabase();

    testUser = await createTestUser({
      email: 'webhook@example.com',
      username: 'webhookuser',
    });

    testProduct = await createTestProduct({
      name: 'Test Product for Webhook',
      priceCents: 3000,
      stock: 5,
    });
    testVariant = testProduct.variants[0];
  });

  describe('Cas 1: Finalise et décrémente stock', () => {
    it('devrait décrémenter le stock, créer la commande et supprimer les réservations', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Créer une réservation HOLD pour qty=2
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 2,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Mock session Stripe
      const mockSession = asStripeSession({
        id: 'cs_test_finalize',
        currency: 'eur',
        payment_method_types: ['card'],
        payment_status: 'paid',
        customer_details: {
          email: 'customer@example.com',
        } as any,
        metadata: {
          ownerKey,
          cartId,
          userId: testUser.id,
          items: JSON.stringify([
            {
              variantId: testVariant.id,
              quantity: 2,
            },
          ]),
          shippingMethodCode: 'MONDIAL_RELAY',
          shippingPriceCents: '490',
        },
      });

      // Appeler processCompletedCheckoutSession
      await processCompletedCheckoutSession(mockSession);

      // Vérifier que le stock a été décrémenté (5 - 2 = 3)
      const variant = await prisma.productVariant.findUnique({
        where: { id: testVariant.id },
      });
      expect(variant?.stock).toBe(3);

      // Vérifier qu'une commande a été créée
      const order = await prisma.order.findFirst({
        where: {
          paymentMethod: 'cs_test_finalize',
        },
        include: {
          items: true,
        },
      });

      expect(order).toBeTruthy();
      expect(order?.userId).toBe(testUser.id);
      expect(order?.items).toHaveLength(1);
      expect(order?.items[0].quantity).toBe(2);
      expect(order?.items[0].productVariantId).toBe(testVariant.id);

      // Vérifier que les réservations ont été supprimées
      const reservations = await prisma.cartReservation.findMany({
        where: {
          variantId: testVariant.id,
          ownerKey,
        },
      });
      expect(reservations).toHaveLength(0);
    });
  });

  describe('Cas 2: Idempotence', () => {
    it('ne devrait pas créer de commande en double si appelé deux fois avec la même session', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;
      const sessionId = 'cs_test_idempotent';

      // Créer une réservation HOLD
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 1,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const mockSession = asStripeSession({
        id: sessionId,
        currency: 'eur',
        payment_method_types: ['card'],
        payment_status: 'paid',
        customer_details: {
          email: 'customer@example.com',
        } as any,
        metadata: {
          ownerKey,
          cartId,
          userId: testUser.id,
          items: JSON.stringify([
            {
              variantId: testVariant.id,
              quantity: 1,
            },
          ]),
          shippingMethodCode: 'MONDIAL_RELAY',
          shippingPriceCents: '490',
        },
      });

      // Premier appel : devrait créer la commande
      await processCompletedCheckoutSession(mockSession);

      const order1 = await prisma.order.findFirst({
        where: { paymentMethod: sessionId },
      });
      expect(order1).toBeTruthy();
      const stockAfterFirst = (
        await prisma.productVariant.findUnique({
          where: { id: testVariant.id },
        })
      )?.stock;

      // Vérifier que la réservation n'existe plus (supprimée au premier appel)
      const reservationsAfterFirst = await prisma.cartReservation.findMany({
        where: { variantId: testVariant.id, ownerKey },
      });
      expect(reservationsAfterFirst).toHaveLength(0);

      // Deuxième appel : devrait échouer car pas de réservation
      // (la fonction devrait throw car réservation insuffisante)
      await expect(processCompletedCheckoutSession(mockSession)).rejects.toThrow(
        'Réservation insuffisante'
      );

      // Vérifier qu'une seule commande existe toujours
      const orders = await prisma.order.findMany({
        where: { paymentMethod: sessionId },
      });
      expect(orders).toHaveLength(1);

      // Vérifier que le stock n'a pas été décrémenté deux fois
      const variant = await prisma.productVariant.findUnique({
        where: { id: testVariant.id },
      });
      expect(variant?.stock).toBe(stockAfterFirst); // Stock inchangé après le 2e appel
    });

    it('devrait gérer correctement les commandes avec même sessionId via contrainte unique sur paymentMethod', async () => {
      // Note: Si le schema Prisma avait une contrainte unique sur paymentMethod,
      // on pourrait tester l'idempotence via cette contrainte.
      // Pour l'instant, on teste via l'absence de réservation après le premier appel.
      const cartId = `test-cart-unique-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;
      const sessionId = 'cs_test_unique_constraint';

      // Créer réservation
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 1,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const mockSession = asStripeSession({
        id: sessionId,
        currency: 'eur',
        payment_method_types: ['card'],
        payment_status: 'paid',
        customer_details: { email: 'customer@example.com' } as any,
        metadata: {
          ownerKey,
          cartId,
          userId: testUser.id,
          items: JSON.stringify([{ variantId: testVariant.id, quantity: 1 }]),
          shippingMethodCode: 'MONDIAL_RELAY',
          shippingPriceCents: '490',
        },
      });

      // Premier appel : crée la commande
      await processCompletedCheckoutSession(mockSession);

      // Essayer de créer manuellement une autre commande avec le même paymentMethod
      // (simuler un deuxième appel qui réussirait autrement)
      // Cela devrait être géré par la logique métier (pas de contrainte unique actuellement)
      // Pour l'instant, on vérifie juste que le 2e appel échoue sur la réservation
      await expect(processCompletedCheckoutSession(mockSession)).rejects.toThrow();
    });
  });

  describe('Cas 3: Rollback si stock insuffisant au moment final', () => {
    it('devrait rollback la transaction si stock réel < quantité demandée', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Créer une réservation HOLD pour qty=3
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 3,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Modifier manuellement le stock pour simuler une vente entre-temps
      // (stock initial = 5, on met à 1, donc 1 < 3 => échec)
      await prisma.productVariant.update({
        where: { id: testVariant.id },
        data: { stock: 1 },
      });

      const mockSession = asStripeSession({
        id: 'cs_test_rollback',
        currency: 'eur',
        payment_method_types: ['card'],
        payment_status: 'paid',
        customer_details: { email: 'customer@example.com' } as any,
        metadata: {
          ownerKey,
          cartId,
          userId: testUser.id,
          items: JSON.stringify([
            {
              variantId: testVariant.id,
              quantity: 3, // Plus que le stock réel (1)
            },
          ]),
          shippingMethodCode: 'MONDIAL_RELAY',
          shippingPriceCents: '490',
        },
      });

      // Appeler processCompletedCheckoutSession : devrait throw
      await expect(processCompletedCheckoutSession(mockSession)).rejects.toThrow(
        'Stock insuffisant'
      );

      // Vérifier qu'aucune commande n'a été créée (rollback)
      const order = await prisma.order.findFirst({
        where: { paymentMethod: 'cs_test_rollback' },
      });
      expect(order).toBeNull();

      // Vérifier que le stock n'a pas été décrémenté (rollback)
      const variant = await prisma.productVariant.findUnique({
        where: { id: testVariant.id },
      });
      expect(variant?.stock).toBe(1); // Inchangé

      // Vérifier que les réservations n'ont pas été supprimées (rollback)
      const reservations = await prisma.cartReservation.findMany({
        where: { variantId: testVariant.id, ownerKey },
      });
      expect(reservations).toHaveLength(1);
      expect(reservations[0].quantity).toBe(3);
    });
  });
});
