import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../app.js';
import {
  cleanupDatabase,
  createTestUser,
  createTestProduct,
  createProductVariant,
  prisma,
} from './setup.js';
import { generateAccessToken } from '../utils/auth.js';

const app = createApp();

describe('POST /api/checkout/hold', () => {
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
      email: 'hold@example.com',
      username: 'holduser',
    });
    testUserToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      username: testUser.username,
      isAdmin: false,
    });

    testProduct = await createTestProduct({
      name: 'Test Product for HOLD',
      priceCents: 3000,
      stock: 10,
    });
    testVariant = testProduct.variants[0];
  });

  describe('Cas 1: HOLD OK', () => {
    it('devrait créer une réservation avec succès', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const response = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 2,
            },
          ],
          ttlMinutes: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('holdTtlMinutes', 10);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        variantId: testVariant.id,
        quantityHeld: 2,
      });

      // Vérifier en DB qu'une réservation existe
      const reservation = await prisma.cartReservation.findUnique({
        where: {
          variantId_ownerKey: {
            variantId: testVariant.id,
            ownerKey: `cart:${cartId}`,
          },
        },
      });

      expect(reservation).toBeTruthy();
      expect(reservation?.quantity).toBe(2);
      expect(reservation?.ownerKey).toBe(`cart:${cartId}`);
      expect(new Date(reservation!.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Cas 2: OUT_OF_STOCK 409', () => {
    it('devrait retourner 409 si stock insuffisant', async () => {
      // Créer une variante avec stock=1
      const lowStockVariant = await createProductVariant(testProduct.id, {
        stock: 1,
        priceCents: 1000,
      });

      const cartId = `test-cart-${Date.now()}`;
      const response = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId)
        .send({
          items: [
            {
              variantId: lowStockVariant.id,
              quantity: 2, // Plus que le stock disponible (1)
            },
          ],
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('code', 'OUT_OF_STOCK');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details[0]).toMatchObject({
        variantId: lowStockVariant.id,
        available: 1,
        requested: 2,
      });

      // Vérifier qu'aucune réservation n'a été créée
      const reservation = await prisma.cartReservation.findUnique({
        where: {
          variantId_ownerKey: {
            variantId: lowStockVariant.id,
            ownerKey: `cart:${cartId}`,
          },
        },
      });
      expect(reservation).toBeNull();
    });
  });

  describe('Cas 3: Upsert (pas double réservation)', () => {
    it('devrait mettre à jour la réservation existante au lieu de créer une nouvelle', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Premier HOLD : qty=2
      const response1 = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 2,
            },
          ],
        });

      expect(response1.status).toBe(200);
      expect(response1.body.items[0].quantityHeld).toBe(2);

      // Vérifier qu'une seule réservation existe
      const reservations1 = await prisma.cartReservation.findMany({
        where: {
          variantId: testVariant.id,
          ownerKey,
        },
      });
      expect(reservations1).toHaveLength(1);
      expect(reservations1[0].quantity).toBe(2);

      // Deuxième HOLD pour le même cartId : qty=3 (devrait mettre à jour, pas créer)
      const response2 = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId)
        .send({
          items: [
            {
              variantId: testVariant.id,
              quantity: 3,
            },
          ],
        });

      expect(response2.status).toBe(200);
      expect(response2.body.items[0].quantityHeld).toBe(3);

      // Vérifier qu'il n'y a toujours qu'une seule réservation avec qty=3
      const reservations2 = await prisma.cartReservation.findMany({
        where: {
          variantId: testVariant.id,
          ownerKey,
        },
      });
      expect(reservations2).toHaveLength(1);
      expect(reservations2[0].quantity).toBe(3);
    });
  });

  describe('Cas 4: Exclusion ownerKey dans le calcul global', () => {
    it('devrait exclure ses propres réservations du calcul de stock disponible', async () => {
      const cartId = `test-cart-${Date.now()}`;
      const ownerKey = `cart:${cartId}`;

      // Créer une variante avec stock=5
      const variant = await createProductVariant(testProduct.id, {
        stock: 5,
        priceCents: 1000,
      });

      // Premier HOLD : qty=3 (il reste 2 disponibles globalement)
      const response1 = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId)
        .send({
          items: [
            {
              variantId: variant.id,
              quantity: 3,
            },
          ],
        });

      expect(response1.status).toBe(200);

      // Deuxième HOLD pour le MÊME cartId : qty=4 (devrait passer car on exclut ses propres réservations)
      // available = 5 - 0 (autres owners) = 5, donc 5 >= 4 => OK
      const response2 = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId)
        .send({
          items: [
            {
              variantId: variant.id,
              quantity: 4,
            },
          ],
        });

      expect(response2.status).toBe(200);
      expect(response2.body.items[0].quantityHeld).toBe(4);

      // Vérifier que la réservation a été mise à jour (pas doublée)
      const reservations = await prisma.cartReservation.findMany({
        where: {
          variantId: variant.id,
          ownerKey,
        },
      });
      expect(reservations).toHaveLength(1);
      expect(reservations[0].quantity).toBe(4);
    });

    it('devrait bloquer si un autre ownerKey a déjà réservé le stock', async () => {
      const cartId1 = `test-cart-1-${Date.now()}`;
      const cartId2 = `test-cart-2-${Date.now()}`;

      // Créer une variante avec stock=3
      const variant = await createProductVariant(testProduct.id, {
        stock: 3,
        priceCents: 1000,
      });

      // Premier HOLD : cartId1 réserve qty=2
      const response1 = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId1)
        .send({
          items: [
            {
              variantId: variant.id,
              quantity: 2,
            },
          ],
        });

      expect(response1.status).toBe(200);

      // Deuxième HOLD : cartId2 essaie de réserver qty=2
      // available = 3 - 2 (réservations de cartId1) = 1, donc 1 < 2 => 409
      const response2 = await request(app)
        .post('/api/checkout/hold')
        .set('X-Cart-Id', cartId2)
        .send({
          items: [
            {
              variantId: variant.id,
              quantity: 2,
            },
          ],
        });

      expect(response2.status).toBe(409);
      expect(response2.body.code).toBe('OUT_OF_STOCK');
      expect(response2.body.details[0]).toMatchObject({
        variantId: variant.id,
        available: 1, // 3 - 2 (réservations de cartId1)
        requested: 2,
      });
    });
  });

  describe('Cas 5: Concurrence (2 holds en parallèle)', () => {
    it('devrait permettre une seule réservation quand stock=1 et 2 requêtes simultanées', async () => {
      const variant = await createProductVariant(testProduct.id, {
        stock: 1,
        priceCents: 1000,
      });

      const cartId1 = `test-cart-1-${Date.now()}`;
      const cartId2 = `test-cart-2-${Date.now()}`;

      // Deux requêtes simultanées
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/checkout/hold')
          .set('X-Cart-Id', cartId1)
          .send({
            items: [
              {
                variantId: variant.id,
                quantity: 1,
              },
            ],
          }),
        request(app)
          .post('/api/checkout/hold')
          .set('X-Cart-Id', cartId2)
          .send({
            items: [
              {
                variantId: variant.id,
                quantity: 1,
              },
            ],
          }),
      ]);

      // Une des deux doit réussir (200), l'autre doit échouer (409)
      const statusCodes = [response1.status, response2.status].sort();
      expect(statusCodes).toEqual([200, 409]);

      // Vérifier qu'une seule réservation a été créée
      const reservations = await prisma.cartReservation.findMany({
        where: {
          variantId: variant.id,
        },
      });
      expect(reservations).toHaveLength(1);
      expect(reservations[0].quantity).toBe(1);
    });
  });
});
