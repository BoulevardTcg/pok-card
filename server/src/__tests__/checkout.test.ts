import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, createTestProduct, prisma } from './setup.js';
import { generateAccessToken } from '../utils/auth.js';
import Stripe from 'stripe';

const app = createApp();

// Mock Stripe pour les tests
vi.mock('../config/stripe.js', () => ({
  ensureStripeConfigured: () => {
    // Retourner un mock Stripe client
    return {
      checkout: {
        sessions: {
          create: vi.fn(() =>
            Promise.resolve({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/test',
              metadata: {},
            })
          ) as any,
        },
        webhooks: {
          constructEvent: vi.fn(),
        },
      },
    } as unknown as Stripe;
  },
}));

describe('Checkout Routes', () => {
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
    await cleanupDatabase();

    testUser = await createTestUser({
      email: 'checkout@example.com',
      username: 'checkoutuser',
    });
    testUserToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      username: testUser.username,
      isAdmin: false,
    });

    testProduct = await createTestProduct({
      name: 'Test Product for Checkout',
      priceCents: 3000,
      stock: 10,
    });
    testVariant = testProduct.variants[0];
  });

  describe('POST /api/checkout/create-session', () => {
    it('devrait créer une session Stripe avec succès', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 2,
            },
          ],
          successUrl: 'http://localhost:3000/checkout/success',
          cancelUrl: 'http://localhost:3000/panier',
          shippingMethodCode: 'MONDIAL_RELAY',
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      if (response.status !== 201) {
        console.log('Test failed - Response body:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
    });

    it('devrait créer une session même sans authentification (utilisateur anonyme)', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 1,
            },
          ],
          customerEmail: 'anonymous@example.com',
          successUrl: 'http://localhost:3000/checkout/success',
          cancelUrl: 'http://localhost:3000/panier',
          shippingMethodCode: 'MONDIAL_RELAY',
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      if (response.status !== 201) {
        console.log(
          'Test failed (anonymous) - Response body:',
          JSON.stringify(response.body, null, 2)
        );
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
    });

    it('devrait rejeter un panier vide', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [],
        });

      expect(response.status).toBe(400);
    });

    it('devrait rejeter un produit inexistant', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: 'non-existent-id',
              quantity: 1,
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

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VARIANT_NOT_FOUND');
    });

    it('devrait rejeter une quantité supérieure au stock', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 100, // Plus que le stock disponible (10)
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
      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
    });

    it("devrait inclure le userId dans les métadonnées si l'utilisateur est connecté", async () => {
      // Cette vérification nécessiterait de mocker Stripe plus en profondeur
      // Pour l'instant, on vérifie juste que la requête réussit
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 1,
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
    });

    it('devrait rejeter un mode de livraison invalide', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 1,
            },
          ],
          shippingMethodCode: 'INVALID_METHOD',
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_SHIPPING_METHOD');
    });

    it('devrait accepter un mode de livraison valide', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 1,
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
      expect(response.body).toHaveProperty('sessionId');
    });

    it('devrait exiger un mode de livraison', async () => {
      const response = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 1,
            },
          ],
          shipping: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            postalCode: '75001',
            city: 'Paris',
            country: 'France',
          },
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Webhook Stripe', () => {
    // Note: Les tests de webhook nécessitent une configuration Stripe plus complexe
    // avec des signatures valides. Pour l'instant, on teste la structure de base.

    it('devrait rejeter un webhook sans signature', async () => {
      const response = await request(app).post('/api/checkout/webhook').send({});

      // Le webhook devrait rejeter sans signature
      expect([400, 500]).toContain(response.status);
    });

    // Les tests complets de webhook nécessiteraient :
    // 1. Un secret Stripe valide
    // 2. La construction d'une signature valide
    // 3. Un mock de l'événement Stripe
    // Ceci est complexe et nécessite une configuration Stripe CLI ou des mocks avancés
  });
});
