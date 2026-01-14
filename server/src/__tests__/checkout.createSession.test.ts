import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, createTestProduct, prisma } from './setup.js';
import { generateAccessToken } from '../utils/auth.js';
import Stripe from 'stripe';
import { asStripeSession } from './vitest.setup.js';

const app = createApp();

// Mock Stripe pour les tests
const mockStripeCreateSession = vi.fn();
vi.mock('../config/stripe.js', () => ({
  ensureStripeConfigured: () => {
    return {
      checkout: {
        sessions: {
          create: mockStripeCreateSession,
        },
      },
    } as unknown as Stripe;
  },
}));

describe('POST /api/checkout/create-session avec vérification HOLD', () => {
  let testUser: any;
  let testUserToken: string;
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
    vi.clearAllMocks();
    await cleanupDatabase();

    testUser = await createTestUser({
      email: 'checkout-hold@example.com',
      username: 'checkoutholduser',
    });
    testUserToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      username: testUser.username,
      isAdmin: false,
    });

    testProduct = await createTestProduct({
      name: 'Test Product for Create Session',
      priceCents: 3000,
      stock: 10,
    });
    testVariant = testProduct.variants[0];

    // Mock par défaut pour createSession
    mockStripeCreateSession.mockResolvedValue(
      asStripeSession({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
        metadata: {},
      })
    );
  });

  describe('Cas 1: HOLD_EXPIRED 409', () => {
    it('devrait retourner 409 si aucune réservation HOLD existe', async () => {
      const cartId = `test-cart-${Date.now()}`;

      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('X-Cart-Id', cartId)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 2,
            },
          ],
          shippingMethodCode: 'MONDIAL_RELAY',
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('code', 'HOLD_EXPIRED');
      expect(response.body).toHaveProperty(
        'error',
        'Votre réservation a expiré, veuillez réessayer'
      );
      expect(response.body).toHaveProperty('details');

      // Vérifier que Stripe n'a pas été appelé
      expect(mockStripeCreateSession).not.toHaveBeenCalled();
    });

    it('devrait retourner 409 si la réservation HOLD ne couvre pas les quantités', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Créer une réservation HOLD pour qty=1
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 1,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // +10 minutes
        },
      });

      // Essayer de créer une session avec qty=2 (plus que la réservation)
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('X-Cart-Id', cartId)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 2, // Plus que la réservation (1)
            },
          ],
          shippingMethodCode: 'MONDIAL_RELAY',
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('HOLD_EXPIRED');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details[0]).toMatchObject({
        variantId: testVariant.id,
        requested: 2,
        held: 1,
      });

      // Vérifier que Stripe n'a pas été appelé
      expect(mockStripeCreateSession).not.toHaveBeenCalled();
    });
  });

  describe('Cas 2: OK si HOLD valide', () => {
    it('devrait créer une session Stripe si la réservation HOLD couvre les quantités', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Créer une réservation HOLD pour qty=2
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 2,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // +10 minutes
        },
      });

      mockStripeCreateSession.mockResolvedValue(
        asStripeSession({
          id: 'cs_test_456',
          url: 'https://checkout.stripe.com/test-success',
          metadata: {
            ownerKey,
            cartId,
            userId: testUser.id,
          },
        })
      );

      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('X-Cart-Id', cartId)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 2,
            },
          ],
          shippingMethodCode: 'MONDIAL_RELAY',
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId', 'cs_test_456');
      expect(response.body).toHaveProperty('url', 'https://checkout.stripe.com/test-success');

      // Vérifier que Stripe a été appelé avec les bonnes metadata
      expect(mockStripeCreateSession).toHaveBeenCalledTimes(1);
      const callArgs = mockStripeCreateSession.mock
        .calls[0][0] as Stripe.Checkout.SessionCreateParams;
      expect(callArgs.metadata?.ownerKey).toBe(ownerKey);
      expect(callArgs.metadata?.cartId).toBe(cartId);
      expect(callArgs.metadata?.userId).toBe(testUser.id);
    });

    it('devrait fonctionner pour un utilisateur non connecté (guest)', async () => {
      const cartId = `test-cart-guest-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Créer une réservation HOLD pour qty=1
      await prisma.cartReservation.create({
        data: {
          variantId: testVariant.id,
          ownerKey,
          quantity: 1,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      mockStripeCreateSession.mockResolvedValue(
        asStripeSession({
          id: 'cs_test_guest',
          url: 'https://checkout.stripe.com/test-guest',
          metadata: {
            ownerKey,
            cartId,
          },
        })
      );

      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('X-Cart-Id', cartId)
        // Pas d'Authorization header (guest)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 1,
            },
          ],
          customerEmail: 'guest@example.com',
          shippingMethodCode: 'MONDIAL_RELAY',
          shipping: {
            fullName: 'Guest User',
            addressLine1: '123 Guest St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId', 'cs_test_guest');

      // Vérifier que les metadata contiennent ownerKey et cartId (pas userId)
      const callArgs = mockStripeCreateSession.mock
        .calls[0][0] as Stripe.Checkout.SessionCreateParams;
      expect(callArgs.metadata?.ownerKey).toBe(ownerKey);
      expect(callArgs.metadata?.cartId).toBe(cartId);
      expect(callArgs.metadata?.userId).toBeUndefined();
    });
  });
});
