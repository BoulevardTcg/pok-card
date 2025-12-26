import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, createTestProduct, prisma } from './setup.js';
import { generateAccessToken } from '../utils/auth.js';
import { OrderStatus, FulfillmentStatus, Carrier } from '@prisma/client';
import Stripe from 'stripe';

const app = createApp();

// Mock Stripe pour les tests
jest.mock('../config/stripe.js', () => ({
  ensureStripeConfigured: () => {
    return {
      checkout: {
        sessions: {
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/test',
              metadata: {},
            })
          ) as any,
        },
        webhooks: {
          constructEvent: jest.fn(),
        },
      },
    } as unknown as Stripe;
  },
}));

// Mock email service pour éviter d'envoyer de vrais emails
jest.mock('../services/email.js', () => ({
  sendShippingNotificationEmail: jest.fn(() => Promise.resolve(true)),
  sendDeliveryConfirmationEmail: jest.fn(() => Promise.resolve(true)),
  sendOrderConfirmationEmail: jest.fn(() => Promise.resolve(true)),
}));

describe('Admin Orders Routes - Shipping', () => {
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let testProduct: any;
  let testVariant: any;
  let testOrder: any;

  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupDatabase();

    adminUser = await createTestUser({
      email: 'admin@test.com',
      username: 'admin',
      isAdmin: true,
    });
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      username: adminUser.username,
      isAdmin: true,
    });

    regularUser = await createTestUser({
      email: 'user@test.com',
      username: 'user',
      isAdmin: false,
    });

    testProduct = await createTestProduct({
      name: 'Test Product',
      priceCents: 2000,
      stock: 10,
    });
    testVariant = testProduct.variants[0];

    // Créer une commande de test
    testOrder = await prisma.order.create({
      data: {
        userId: regularUser.id,
        orderNumber: `TEST-${Date.now()}`,
        status: OrderStatus.CONFIRMED,
        fulfillmentStatus: FulfillmentStatus.PAID,
        totalCents: 2000,
        currency: 'EUR',
        paymentMethod: 'card',
        shippingMethod: 'MONDIAL_RELAY',
        shippingCost: 490,
        items: {
          create: {
            productId: testProduct.id,
            productVariantId: testVariant.id,
            productName: testProduct.name,
            variantName: testVariant.name,
            quantity: 1,
            unitPriceCents: 2000,
            totalPriceCents: 2000,
          },
        },
      },
    });
  });

  describe('POST /api/admin/orders/:orderId/ship', () => {
    it('devrait marquer une commande comme expédiée', async () => {
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: Carrier.MONDIAL_RELAY,
          trackingNumber: 'MR123456789',
          note: 'Expédié via Mondial Relay',
        });

      expect(response.status).toBe(200);
      expect(response.body.order.fulfillmentStatus).toBe('SHIPPED');
      expect(response.body.order.carrier).toBe('MONDIAL_RELAY');
      expect(response.body.order.trackingNumber).toBe('MR123456789');
      expect(response.body.order.trackingUrl).toContain('17track.net');
    });

    it('devrait rejeter si le transporteur est invalide', async () => {
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: 'INVALID_CARRIER',
          trackingNumber: 'TRACK123',
        });

      expect(response.status).toBe(400);
    });

    it('devrait rejeter si le numéro de suivi est vide', async () => {
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: Carrier.COLISSIMO,
          trackingNumber: '',
        });

      expect(response.status).toBe(400);
    });

    it('devrait être idempotent si déjà expédiée', async () => {
      // Marquer comme expédiée une première fois
      await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: Carrier.COLISSIMO,
          trackingNumber: 'TRACK1',
        });

      // Essayer de nouveau
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: Carrier.MONDIAL_RELAY,
          trackingNumber: 'TRACK2',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('déjà expédiée');
    });

    it("devrait rejeter si l'utilisateur n'est pas admin", async () => {
      const userToken = generateAccessToken({
        userId: regularUser.id,
        email: regularUser.email,
        username: regularUser.username,
        isAdmin: false,
      });

      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          carrier: Carrier.COLISSIMO,
          trackingNumber: 'TRACK123',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/orders/:orderId/deliver', () => {
    it('devrait marquer une commande comme livrée', async () => {
      // D'abord expédier
      await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: Carrier.COLISSIMO,
          trackingNumber: 'TRACK123',
        });

      // Puis marquer comme livrée
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          note: 'Livré avec succès',
        });

      expect(response.status).toBe(200);
      expect(response.body.order.fulfillmentStatus).toBe('DELIVERED');
      expect(response.body.order.deliveredAt).toBeTruthy();
    });

    it('devrait être idempotent si déjà livrée', async () => {
      // Expédier puis livrer
      await request(app)
        .post(`/api/admin/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carrier: Carrier.COLISSIMO,
          trackingNumber: 'TRACK123',
        });

      await request(app)
        .post(`/api/admin/orders/${testOrder.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Essayer de nouveau
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('déjà livrée');
    });
  });
});
