import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, createTestProduct, prisma } from './setup.js';
import { generateAccessToken } from '../utils/auth.js';
import { OrderStatus, FulfillmentStatus } from '@prisma/client';
import { generateOrderTrackingToken } from '../utils/tracking.js';

const app = createApp();

describe('Orders Routes - Public Tracking', () => {
  let testUser: any;
  let testUserToken: string;
  let otherUser: any;
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

    testUser = await createTestUser({
      email: 'orderuser@test.com',
      username: 'orderuser',
    });
    testUserToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      username: testUser.username,
      isAdmin: false,
    });

    otherUser = await createTestUser({
      email: 'other@test.com',
      username: 'otheruser',
    });

    testProduct = await createTestProduct({
      name: 'Test Product',
      priceCents: 1500,
      stock: 5,
    });
    testVariant = testProduct.variants[0];

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        orderNumber: `ORDER-${Date.now()}`,
        status: OrderStatus.CONFIRMED,
        fulfillmentStatus: FulfillmentStatus.PAID,
        totalCents: 1500,
        currency: 'EUR',
        paymentMethod: 'card',
        shippingMethod: 'COLISSIMO_HOME',
        shippingCost: 790,
        items: {
          create: {
            productId: testProduct.id,
            productVariantId: testVariant.id,
            productName: testProduct.name,
            variantName: testVariant.name,
            quantity: 1,
            unitPriceCents: 1500,
            totalPriceCents: 1500,
          },
        },
        events: {
          create: {
            type: 'PAID',
            message: 'Paiement confirmé',
          },
        },
      },
      include: {
        items: true,
        events: true,
      },
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('devrait permettre au propriétaire de voir sa commande', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.id).toBe(testOrder.id);
      expect(response.body.order.items).toHaveLength(1);
      expect(response.body.order.events).toBeDefined();
      expect(response.body.access).toBe('owner');
    });

    it("devrait permettre l'accès avec un token de suivi valide", async () => {
      const trackingToken = generateOrderTrackingToken(testOrder.id, testUser.email);

      const response = await request(app).get(`/api/orders/${testOrder.id}?token=${trackingToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.id).toBe(testOrder.id);
      expect(response.body.access).toBe('token');
      // Minimisation PII: pas d'adresses/billing en accès token
      expect(response.body.order.shippingAddress).toBeUndefined();
      expect(response.body.order.billingAddress).toBeUndefined();
    });

    it('devrait rejeter un token de suivi invalide', async () => {
      const response = await request(app).get(`/api/orders/${testOrder.id}?token=invalid-token`);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_TRACKING_TOKEN');
    });

    it("devrait rejeter l'accès d'un autre utilisateur", async () => {
      const otherUserToken = generateAccessToken({
        userId: otherUser.id,
        email: otherUser.email,
        username: otherUser.username,
        isAdmin: false,
      });

      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      // Anti-enumération: on renvoie 404 si la commande n'appartient pas à l'utilisateur
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('ORDER_NOT_FOUND');
    });

    it("devrait rejeter l'accès sans authentification ni token", async () => {
      const response = await request(app).get(`/api/orders/${testOrder.id}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('ORDER_ACCESS_DENIED');
    });

    it('devrait inclure les événements de la commande', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.events).toBeDefined();
      expect(Array.isArray(response.body.order.events)).toBe(true);
      expect(response.body.order.events.length).toBeGreaterThan(0);
    });
  });
});
