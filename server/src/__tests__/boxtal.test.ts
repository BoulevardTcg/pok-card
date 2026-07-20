import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Carrier, FulfillmentStatus } from '@prisma/client';
import {
  searchParcelPoints,
  createShippingOrder,
  getShippingOrderTracking,
  getShippingLabelUrl,
  carrierFromOfferCode,
  fulfillmentStatusFromTracking,
  normalizePhone,
  normalizeCountryIso2,
  BoxtalApiError,
} from '../services/boxtal.js';
import { getBoxtalConfig, splitStreetLine } from '../config/boxtal.js';
import { verifyBoxtalSignature } from '../routes/shipping.js';
import crypto from 'crypto';

const BOXTAL_ENV_KEYS = [
  'BOXTAL_ACCESS_KEY',
  'BOXTAL_SECRET_KEY',
  'BOXTAL_API_BASE_URL',
  'BOXTAL_SHIPPING_OFFER_CODE_RELAY',
  'BOXTAL_SHIPPING_OFFER_CODE_HOME',
  'BOXTAL_SHIPPER_COMPANY',
  'BOXTAL_SHIPPER_FIRST_NAME',
  'BOXTAL_SHIPPER_LAST_NAME',
  'BOXTAL_SHIPPER_EMAIL',
  'BOXTAL_SHIPPER_PHONE',
  'BOXTAL_SHIPPER_ADDRESS',
  'BOXTAL_SHIPPER_POSTAL_CODE',
  'BOXTAL_SHIPPER_CITY',
  'BOXTAL_WEBHOOK_SECRET',
];

function setBoxtalEnv() {
  process.env.BOXTAL_ACCESS_KEY = 'test-access-key';
  process.env.BOXTAL_SECRET_KEY = 'test-secret-key';
  process.env.BOXTAL_API_BASE_URL = 'https://api.boxtal.test';
  process.env.BOXTAL_SHIPPING_OFFER_CODE_RELAY = 'MONR-CpourToi';
  process.env.BOXTAL_SHIPPING_OFFER_CODE_HOME = 'POFR-ColissimoAccess';
  process.env.BOXTAL_SHIPPER_COMPANY = 'BoulevardTCG';
  process.env.BOXTAL_SHIPPER_FIRST_NAME = 'Vincent';
  process.env.BOXTAL_SHIPPER_LAST_NAME = 'Morais';
  process.env.BOXTAL_SHIPPER_EMAIL = 'contact@boulevardtcg.com';
  process.env.BOXTAL_SHIPPER_PHONE = '0612345678';
  process.env.BOXTAL_SHIPPER_ADDRESS = '10 rue des Cartes';
  process.env.BOXTAL_SHIPPER_POSTAL_CODE = '75001';
  process.env.BOXTAL_SHIPPER_CITY = 'Paris';
}

function clearBoxtalEnv() {
  for (const key of BOXTAL_ENV_KEYS) {
    delete process.env[key];
  }
}

function mockFetchOnce(status: number, payload: unknown) {
  const fn = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('Boxtal config', () => {
  beforeEach(() => clearBoxtalEnv());
  afterEach(() => {
    clearBoxtalEnv();
    vi.unstubAllGlobals();
  });

  it('retourne null sans clés API', () => {
    expect(getBoxtalConfig()).toBeNull();
  });

  it('retourne la config avec les clés définies', () => {
    setBoxtalEnv();
    const config = getBoxtalConfig();
    expect(config).not.toBeNull();
    expect(config!.baseUrl).toBe('https://api.boxtal.test');
    expect(config!.offerCodes.RELAY).toBe('MONR-CpourToi');
    expect(config!.shipper?.company).toBe('BoulevardTCG');
    expect(config!.shipper?.street).toBe('rue des Cartes');
    expect(config!.shipper?.number).toBe('10');
  });

  it('splitStreetLine sépare le numéro de voie', () => {
    expect(splitStreetLine('12 bis rue de la Paix')).toEqual({
      number: '12',
      street: 'bis rue de la Paix',
    });
    expect(splitStreetLine('Chemin des Vignes')).toEqual({ street: 'Chemin des Vignes' });
  });
});

describe('searchParcelPoints', () => {
  beforeEach(() => {
    clearBoxtalEnv();
    setBoxtalEnv();
  });
  afterEach(() => {
    clearBoxtalEnv();
    vi.unstubAllGlobals();
  });

  it('normalise la réponse Boxtal (clé parcelPoint, constatée sur l’API de test)', async () => {
    const fetchMock = mockFetchOnce(200, {
      content: [
        {
          parcelPoint: {
            code: '12345',
            name: 'Tabac de la Gare',
            location: {
              street: 'rue de la Gare',
              number: '3',
              city: 'Paris',
              postalCode: '75001',
              countryIsoCode: 'FR',
              position: { latitude: '48.8592', longitude: '2.3467' },
            },
            openingDays: {
              MONDAY: [{ openingTime: '09:00', closingTime: '19:00' }],
            },
            compatibleNetworks: ['MONR_NETWORK'],
          },
          distanceFromSearchLocation: 250,
        },
      ],
    });

    const points = await searchParcelPoints({ postalCode: '75001', city: 'Paris' });

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      code: '12345',
      name: 'Tabac de la Gare',
      networks: ['MONR_NETWORK'],
      distanceMeters: 250,
      latitude: 48.8592,
      longitude: 2.3467,
    });
    expect(points[0].address).toMatchObject({
      street: 'rue de la Gare',
      number: '3',
      postalCode: '75001',
      city: 'Paris',
      country: 'FR',
    });
    expect(points[0].openingDays?.MONDAY).toEqual([{ open: '09:00', close: '19:00' }]);

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/shipping/v3.2/parcel-point-by-shipping-offer');
    expect(calledUrl).toContain('shippingOfferCode=MONR-CpourToi');
    expect(calledUrl).toContain('operationType=ARRIVAL');
  });

  it("échoue si l'offre relais n'est pas configurée", async () => {
    delete process.env.BOXTAL_SHIPPING_OFFER_CODE_RELAY;
    await expect(searchParcelPoints({ postalCode: '75001' })).rejects.toMatchObject({
      code: 'BOXTAL_NOT_CONFIGURED',
    });
  });

  it('propage les erreurs API Boxtal', async () => {
    mockFetchOnce(401, { messages: [{ text: 'Unauthorized', severity: 'ERROR' }] });
    await expect(searchParcelPoints({ postalCode: '75001' })).rejects.toBeInstanceOf(
      BoxtalApiError
    );
  });
});

describe('createShippingOrder', () => {
  beforeEach(() => {
    clearBoxtalEnv();
    setBoxtalEnv();
  });
  afterEach(() => {
    clearBoxtalEnv();
    vi.unstubAllGlobals();
  });

  const recipient = {
    name: 'Jean Dupont',
    email: 'jean@example.com',
    phone: '0699887766',
    line1: '5 avenue des Champs',
    postalCode: '75008',
    city: 'Paris',
    country: 'FR',
  };

  it("crée l'expédition et retourne l'identifiant Boxtal", async () => {
    const fetchMock = mockFetchOnce(200, {
      content: { id: '2440000000MONR4IA8FR', status: 'PENDING' },
    });

    const result = await createShippingOrder({
      externalId: 'order-1',
      offerType: 'RELAY',
      pickupPointCode: '99439',
      recipient,
      itemsCount: 3,
      valueCents: 4500,
    });

    expect(result.boxtalShippingOrderId).toBe('2440000000MONR4IA8FR');
    expect(result.offerCode).toBe('MONR-CpourToi');

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.shippingOfferCode).toBe('MONR-CpourToi');
    expect(body.shipment.pickupPointCode).toBe('99439');
    expect(body.shipment.externalId).toBe('order-1');
    expect(body.shipment.toAddress.contact.phone).toBe('+33699887766');
    expect(body.shipment.toAddress.location).toMatchObject({
      street: 'avenue des Champs',
      number: '5',
      postalCode: '75008',
      city: 'Paris',
      countryIsoCode: 'FR',
    });
    // Valeur du colis en euros et poids estimé (base 150g + 3 × 50g)
    expect(body.shipment.packages[0].value.value).toBe(45);
    expect(body.shipment.packages[0].weight).toBe(0.3);
  });

  it('utilise le code HOME pour une livraison à domicile', async () => {
    const fetchMock = mockFetchOnce(200, { content: { id: 'ID-HOME', status: 'PENDING' } });

    const result = await createShippingOrder({
      externalId: 'order-2',
      offerType: 'HOME',
      recipient,
      itemsCount: 1,
      valueCents: 1000,
    });

    expect(result.offerCode).toBe('POFR-ColissimoAccess');
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.shipment.pickupPointCode).toBeUndefined();
  });

  it('refuse une expédition relais sans point relais', async () => {
    await expect(
      createShippingOrder({
        externalId: 'order-3',
        offerType: 'RELAY',
        recipient,
        itemsCount: 1,
        valueCents: 1000,
      })
    ).rejects.toMatchObject({ code: 'PICKUP_POINT_REQUIRED' });
  });

  it("échoue si l'expéditeur n'est pas configuré", async () => {
    delete process.env.BOXTAL_SHIPPER_EMAIL;
    await expect(
      createShippingOrder({
        externalId: 'order-4',
        offerType: 'HOME',
        recipient,
        itemsCount: 1,
        valueCents: 1000,
      })
    ).rejects.toMatchObject({ code: 'BOXTAL_NOT_CONFIGURED' });
  });
});

describe('tracking et documents', () => {
  beforeEach(() => {
    clearBoxtalEnv();
    setBoxtalEnv();
  });
  afterEach(() => {
    clearBoxtalEnv();
    vi.unstubAllGlobals();
  });

  it('récupère le suivi', async () => {
    mockFetchOnce(200, {
      content: [
        {
          status: 'IN_TRANSIT',
          trackingNumber: 'TN123',
          packageTrackingUrl: 'https://tracking.example/TN123',
        },
      ],
    });

    const tracking = await getShippingOrderTracking('BOXTAL-1');
    expect(tracking).toEqual({
      status: 'IN_TRANSIT',
      trackingNumber: 'TN123',
      trackingUrl: 'https://tracking.example/TN123',
    });
  });

  it('retourne null quand le suivi est indisponible (422)', async () => {
    mockFetchOnce(422, { messages: [{ text: 'NoPackageTrackingFoundException' }] });
    expect(await getShippingOrderTracking('BOXTAL-1')).toBeNull();
  });

  it("récupère l'URL de l'étiquette LABEL", async () => {
    mockFetchOnce(200, {
      content: [
        { url: 'https://document.boxtal.test/proforma.pdf', type: 'PROFORMA', format: 'PDF_A4' },
        { url: 'https://document.boxtal.test/label.pdf', type: 'LABEL', format: 'PDF_A4' },
      ],
    });
    expect(await getShippingLabelUrl('BOXTAL-1')).toBe('https://document.boxtal.test/label.pdf');
  });

  it("retourne null quand l'étiquette n'est pas générée (422)", async () => {
    mockFetchOnce(422, { messages: [{ text: 'NoShippingDocumentException' }] });
    expect(await getShippingLabelUrl('BOXTAL-1')).toBeNull();
  });
});

describe('mappings Boxtal', () => {
  it('carrierFromOfferCode mappe les préfixes opérateur', () => {
    expect(carrierFromOfferCode('MONR-CpourToi')).toBe(Carrier.MONDIAL_RELAY);
    expect(carrierFromOfferCode('POFR-ColissimoAccess')).toBe(Carrier.COLISSIMO);
    expect(carrierFromOfferCode('CHRP-Chrono13')).toBe(Carrier.CHRONOPOST);
    expect(carrierFromOfferCode('UPSE-Standard')).toBe(Carrier.UPS);
    expect(carrierFromOfferCode('XXXX-Inconnu')).toBe(Carrier.OTHER);
    expect(carrierFromOfferCode(null)).toBe(Carrier.OTHER);
  });

  it('fulfillmentStatusFromTracking mappe les statuts de suivi', () => {
    expect(fulfillmentStatusFromTracking('SHIPPED')).toBe(FulfillmentStatus.SHIPPED);
    expect(fulfillmentStatusFromTracking('IN_TRANSIT')).toBe(FulfillmentStatus.SHIPPED);
    expect(fulfillmentStatusFromTracking('REACHED_DELIVERY_PICKUP_POINT')).toBe(
      FulfillmentStatus.SHIPPED
    );
    expect(fulfillmentStatusFromTracking('DELIVERED')).toBe(FulfillmentStatus.DELIVERED);
    expect(fulfillmentStatusFromTracking('ANNOUNCED')).toBeNull();
    expect(fulfillmentStatusFromTracking(undefined)).toBeNull();
  });

  it('normalizePhone convertit au format international', () => {
    expect(normalizePhone('0612345678')).toBe('+33612345678');
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(normalizePhone('33612345678')).toBe('+33612345678');
  });

  it('normalizeCountryIso2 gère les noms de pays français', () => {
    expect(normalizeCountryIso2('France')).toBe('FR');
    expect(normalizeCountryIso2('BELGIQUE')).toBe('BE');
    expect(normalizeCountryIso2('fr')).toBe('FR');
    expect(normalizeCountryIso2(undefined)).toBe('FR');
  });
});

describe('verifyBoxtalSignature', () => {
  const secret = 'webhook-secret';
  const body = JSON.stringify({ type: 'TRACKING_CHANGED' });

  it('accepte une signature hex valide', () => {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyBoxtalSignature(Buffer.from(body), signature, secret)).toBe(true);
  });

  it('accepte une signature base64 valide', () => {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('base64');
    expect(verifyBoxtalSignature(Buffer.from(body), signature, secret)).toBe(true);
  });

  it('rejette une signature invalide', () => {
    expect(verifyBoxtalSignature(Buffer.from(body), 'forged', secret)).toBe(false);
    expect(verifyBoxtalSignature(Buffer.from(body), undefined, secret)).toBe(false);
  });

  it('rejette un corps non brut (objet déjà parsé)', () => {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyBoxtalSignature({} as unknown as Buffer, signature, secret)).toBe(false);
  });
});
