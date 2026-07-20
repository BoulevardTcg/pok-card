import request from 'supertest';
import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, prisma } from './setup.js';
import { generateAccessToken } from '../utils/auth.js';

const app = createApp();

// Mock email service pour éviter d'envoyer de vrais emails
vi.mock('../services/email.js', () => ({
  sendShippingNotificationEmail: vi.fn(() => Promise.resolve(true)),
  sendDeliveryConfirmationEmail: vi.fn(() => Promise.resolve(true)),
  sendOrderConfirmationEmail: vi.fn(() => Promise.resolve(true)),
}));

const WEBHOOK_SECRET = 'test-boxtal-webhook-secret';

const BOXTAL_TEST_ENV: Record<string, string> = {
  BOXTAL_ACCESS_KEY: 'test-access-key',
  BOXTAL_SECRET_KEY: 'test-secret-key',
  BOXTAL_API_BASE_URL: 'https://api.boxtal.test',
  BOXTAL_SHIPPING_OFFER_CODE_RELAY: 'MONR-CpourToi',
  BOXTAL_SHIPPING_OFFER_CODE_HOME: 'POFR-ColissimoAccess',
  BOXTAL_SHIPPER_COMPANY: 'BoulevardTCG',
  BOXTAL_SHIPPER_FIRST_NAME: 'Vincent',
  BOXTAL_SHIPPER_LAST_NAME: 'Morais',
  BOXTAL_SHIPPER_EMAIL: 'contact@boulevardtcg.com',
  BOXTAL_SHIPPER_PHONE: '0612345678',
  BOXTAL_SHIPPER_ADDRESS: '10 rue des Cartes',
  BOXTAL_SHIPPER_POSTAL_CODE: '75001',
  BOXTAL_SHIPPER_CITY: 'Paris',
  BOXTAL_WEBHOOK_SECRET: WEBHOOK_SECRET,
};

function setBoxtalEnv() {
  Object.assign(process.env, BOXTAL_TEST_ENV);
}

function clearBoxtalEnv() {
  for (const key of Object.keys(BOXTAL_TEST_ENV)) {
    delete process.env[key];
  }
}

const boxtalResponse = (status: number, payload: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );

/**
 * Stub de l'API Boxtal pour l'endpoint admin : création d'expédition OK,
 * suivi paramétrable (null = pas encore disponible), étiquette disponible.
 */
function stubBoxtalApi(options: { trackingStatus?: string | null } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/tracking')) {
        return options.trackingStatus
          ? boxtalResponse(200, {
              content: [
                {
                  status: options.trackingStatus,
                  trackingNumber: 'TN-99',
                  packageTrackingUrl: 'https://tracking.example/TN-99',
                },
              ],
            })
          : boxtalResponse(422, {});
      }
      if (url.includes('/shipping-document')) {
        return boxtalResponse(200, {
          content: [{ url: 'https://document.boxtal.test/admin-label.pdf', type: 'LABEL' }],
        });
      }
      if (url.includes('/shipping-order')) {
        return boxtalResponse(200, { content: { id: 'BOXTAL-ADMIN-1', status: 'PENDING' } });
      }
      return boxtalResponse(404, {});
    })
  );
}

function signBody(body: string) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

async function createTestOrder(overrides: Record<string, unknown> = {}) {
  return prisma.order.create({
    data: {
      orderNumber: `BLVD-TEST-${Math.floor(Math.random() * 1_000_000)}`,
      totalCents: 5000,
      currency: 'EUR',
      status: 'CONFIRMED',
      fulfillmentStatus: 'PAID',
      ...overrides,
    },
  });
}

describe('Shipping routes', () => {
  beforeEach(() => {
    clearBoxtalEnv();
  });
  afterEach(() => {
    clearBoxtalEnv();
    vi.unstubAllGlobals();
  });

  describe('GET /api/shipping/methods', () => {
    it('retourne les modes de livraison actifs', async () => {
      const response = await request(app).get('/api/shipping/methods');
      expect(response.status).toBe(200);
      const codes = response.body.data.map((m: { code: string }) => m.code);
      expect(codes).toContain('MONDIAL_RELAY');
      expect(codes).toContain('COLISSIMO_HOME');
      const relay = response.body.data.find((m: { code: string }) => m.code === 'MONDIAL_RELAY');
      expect(relay.requiresPickupPoint).toBe(true);
    });
  });

  describe('GET /api/shipping/parcel-points', () => {
    it('rejette une requête sans code postal', async () => {
      const response = await request(app).get('/api/shipping/parcel-points');
      expect(response.status).toBe(400);
    });

    it("retourne 503 quand Boxtal n'est pas configuré", async () => {
      const response = await request(app).get('/api/shipping/parcel-points?postalCode=75001');
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('BOXTAL_NOT_CONFIGURED');
    });

    it('retourne les points relais normalisés', async () => {
      setBoxtalEnv();
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                content: [
                  {
                    parcelpoint: {
                      code: '99439',
                      name: 'Relais des Lilas',
                      location: {
                        street: 'rue des Lilas',
                        number: '8',
                        city: 'Paris',
                        postalCode: '75019',
                        countryIsoCode: 'FR',
                      },
                    },
                    distanceFromSearchLocation: 120,
                  },
                ],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          )
        )
      );

      const response = await request(app).get(
        '/api/shipping/parcel-points?postalCode=75019&city=Paris'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        code: '99439',
        name: 'Relais des Lilas',
        distanceMeters: 120,
      });
    });
  });

  describe('POST /api/shipping/boxtal/webhook', () => {
    beforeAll(async () => {
      await cleanupDatabase();
    });

    afterAll(async () => {
      await cleanupDatabase();
      await prisma.$disconnect();
    });

    beforeEach(async () => {
      await cleanupDatabase();
      setBoxtalEnv();
    });

    it("retourne 503 quand le secret webhook n'est pas configuré", async () => {
      delete process.env.BOXTAL_WEBHOOK_SECRET;
      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .send('{}');
      expect(response.status).toBe(503);
    });

    it('rejette une signature invalide', async () => {
      const body = JSON.stringify({ type: 'TRACKING_CHANGED' });
      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .set('x-bxt-signature', 'forged-signature')
        .send(body);
      expect(response.status).toBe(401);
    });

    it('rejette une requête sans signature', async () => {
      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .send('{}');
      expect(response.status).toBe(401);
    });

    it('met à jour le suivi et passe la commande en SHIPPED (TRACKING_CHANGED)', async () => {
      const order = await createTestOrder({ boxtalShippingOrderId: 'BOXTAL-TRACK-1' });

      const body = JSON.stringify({
        id: 'evt-1',
        type: 'TRACKING_CHANGED',
        shippingOrderId: 'BOXTAL-TRACK-1',
        payload: {
          trackings: [
            {
              status: 'SHIPPED',
              trackingNumber: 'TN-42',
              packageTrackingUrl: 'https://tracking.example/TN-42',
            },
          ],
        },
      });

      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .set('x-bxt-signature', signBody(body))
        .send(body);

      expect(response.status).toBe(200);

      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updated?.trackingNumber).toBe('TN-42');
      expect(updated?.trackingUrl).toBe('https://tracking.example/TN-42');
      expect(updated?.fulfillmentStatus).toBe('SHIPPED');
      expect(updated?.shippedAt).not.toBeNull();
    });

    it('passe la commande en DELIVERED avec deliveredAt', async () => {
      const order = await createTestOrder({
        boxtalShippingOrderId: 'BOXTAL-TRACK-2',
        fulfillmentStatus: 'SHIPPED',
        status: 'SHIPPED',
        shippedAt: new Date(),
      });

      const body = JSON.stringify({
        type: 'TRACKING_CHANGED',
        shippingOrderId: 'BOXTAL-TRACK-2',
        payload: { trackings: [{ status: 'DELIVERED', trackingNumber: 'TN-43' }] },
      });

      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .set('x-bxt-signature', signBody(body))
        .send(body);

      expect(response.status).toBe(200);

      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updated?.fulfillmentStatus).toBe('DELIVERED');
      expect(updated?.deliveredAt).not.toBeNull();
    });

    it("enregistre l'étiquette (DOCUMENT_CREATED) via l'externalId", async () => {
      const order = await createTestOrder();

      const body = JSON.stringify({
        type: 'DOCUMENT_CREATED',
        shipmentExternalId: order.id,
        payload: {
          documents: [
            { url: 'https://document.boxtal.test/label.pdf', type: 'LABEL', format: 'PDF_A4' },
          ],
        },
      });

      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .set('x-bxt-signature', signBody(body))
        .send(body);

      expect(response.status).toBe(200);

      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updated?.labelUrl).toBe('https://document.boxtal.test/label.pdf');
    });

    it('répond 200 pour une commande inconnue (pas de rejeu Boxtal)', async () => {
      const body = JSON.stringify({
        type: 'TRACKING_CHANGED',
        shippingOrderId: 'BOXTAL-INCONNU',
        payload: { trackings: [{ status: 'SHIPPED', trackingNumber: 'TN-44' }] },
      });

      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .set('x-bxt-signature', signBody(body))
        .send(body);

      expect(response.status).toBe(200);
    });

    it('fait passer une commande PREPARING en SHIPPED au premier scan transporteur', async () => {
      const order = await createTestOrder({
        boxtalShippingOrderId: 'BOXTAL-TRACK-3',
        fulfillmentStatus: 'PREPARING',
      });

      const body = JSON.stringify({
        type: 'TRACKING_CHANGED',
        shippingOrderId: 'BOXTAL-TRACK-3',
        payload: { trackings: [{ status: 'IN_TRANSIT', trackingNumber: 'TN-45' }] },
      });

      const response = await request(app)
        .post('/api/shipping/boxtal/webhook')
        .set('Content-Type', 'application/json')
        .set('x-bxt-signature', signBody(body))
        .send(body);

      expect(response.status).toBe(200);

      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updated?.fulfillmentStatus).toBe('SHIPPED');
      expect(updated?.status).toBe('SHIPPED');
      expect(updated?.shippedAt).not.toBeNull();
    });
  });

  describe('POST /api/admin/orders/:orderId/boxtal-shipment', () => {
    let adminToken: string;

    beforeEach(async () => {
      await cleanupDatabase();
      setBoxtalEnv();

      const adminUser = await createTestUser({
        email: 'admin-boxtal@example.com',
        username: 'adminboxtal',
        isAdmin: true,
      });
      adminToken = generateAccessToken({
        userId: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        isAdmin: true,
      });
    });

    afterAll(async () => {
      await cleanupDatabase();
    });

    const orderAddresses = {
      shippingMethod: 'COLISSIMO_HOME',
      shippingAddress: {
        name: 'Jean Dupont',
        address: {
          line1: '5 avenue des Champs',
          city: 'Paris',
          postal_code: '75008',
          country: 'FR',
        },
      },
      billingAddress: { name: 'Jean Dupont', email: 'jean@example.com' },
    };

    it("crée l'étiquette et passe la commande en PREPARING (pas expédiée)", async () => {
      stubBoxtalApi({ trackingStatus: null });
      const order = await createTestOrder(orderAddresses);

      const response = await request(app)
        .post(`/api/admin/orders/${order.id}/boxtal-shipment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.order.boxtalShippingOrderId).toBe('BOXTAL-ADMIN-1');
      expect(response.body.order.fulfillmentStatus).toBe('PREPARING');
      expect(response.body.order.status).toBe('CONFIRMED');
      expect(response.body.order.shippedAt).toBeNull();
      expect(response.body.order.labelUrl).toBe('https://document.boxtal.test/admin-label.pdf');
      expect(response.body.order.carrier).toBe('COLISSIMO');
    });

    it('resynchronise et passe en SHIPPED quand le transporteur a scanné le colis', async () => {
      stubBoxtalApi({ trackingStatus: 'SHIPPED' });
      const order = await createTestOrder({
        ...orderAddresses,
        boxtalShippingOrderId: 'BOXTAL-ADMIN-1',
        fulfillmentStatus: 'PREPARING',
        labelUrl: 'https://document.boxtal.test/admin-label.pdf',
      });

      const response = await request(app)
        .post(`/api/admin/orders/${order.id}/boxtal-shipment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.order.fulfillmentStatus).toBe('SHIPPED');
      expect(response.body.order.trackingNumber).toBe('TN-99');
      expect(response.body.order.shippedAt).not.toBeNull();
    });

    it('refuse sans configuration Boxtal', async () => {
      clearBoxtalEnv();
      const order = await createTestOrder(orderAddresses);

      const response = await request(app)
        .post(`/api/admin/orders/${order.id}/boxtal-shipment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(502);
      expect(response.body.code).toBe('BOXTAL_NOT_CONFIGURED');
    });
  });
});
