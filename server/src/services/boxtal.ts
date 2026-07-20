import { Carrier, FulfillmentStatus } from '@prisma/client';
import { getBoxtalConfig, splitStreetLine, type BoxtalConfig } from '../config/boxtal.js';
import type { BoxtalOfferType } from '../config/shipping.js';
import logger from '../utils/logger.js';

const REQUEST_TIMEOUT_MS = 15_000;

export class BoxtalApiError extends Error {
  status: number;
  code: string;
  detail?: unknown;

  constructor(message: string, status: number, code = 'BOXTAL_ERROR', detail?: unknown) {
    super(message);
    this.name = 'BoxtalApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const asNumber = (value: unknown): number | undefined => {
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && Number.isFinite(num) ? num : undefined;
};

function requireConfig(): BoxtalConfig {
  const config = getBoxtalConfig();
  if (!config) {
    throw new BoxtalApiError(
      'Boxtal non configuré (BOXTAL_ACCESS_KEY / BOXTAL_SECRET_KEY manquants)',
      503,
      'BOXTAL_NOT_CONFIGURED'
    );
  }
  return config;
}

/**
 * Appel HTTP vers l'API Boxtal v3, authentifié en Basic (officiellement
 * supporté sur tous les endpoints — pas de gestion de token à maintenir).
 */
async function boxtalFetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
  config = requireConfig()
): Promise<unknown> {
  const basic = Buffer.from(`${config.accessKey}:${config.secretKey}`).toString('base64');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: init.method || 'GET',
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new BoxtalApiError(
      'Boxtal injoignable',
      503,
      'BOXTAL_UNREACHABLE',
      err instanceof Error ? err.message : err
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = isRecord(payload)
      ? asString((payload.messages as any)?.[0]?.text) || `Erreur Boxtal (${response.status})`
      : `Erreur Boxtal (${response.status})`;
    throw new BoxtalApiError(message, response.status, 'BOXTAL_API_ERROR', payload);
  }

  return payload;
}

// ============================================================================
// POINTS RELAIS
// ============================================================================

export type ParcelPointOpeningPeriod = { open: string; close: string };

export type ParcelPoint = {
  code: string;
  name: string;
  networks: string[];
  address: {
    number?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  distanceMeters?: number;
  latitude?: number;
  longitude?: number;
  openingDays?: Record<string, ParcelPointOpeningPeriod[]>;
};

function normalizeParcelPoint(candidate: unknown): ParcelPoint | null {
  if (!isRecord(candidate)) return null;
  // L'API renvoie « parcelPoint » (constaté en test) ; « parcelpoint » figure
  // dans certaines intégrations — les deux graphies sont acceptées.
  const nested = candidate.parcelPoint ?? candidate.parcelpoint;
  const record = isRecord(nested) ? nested : candidate;
  const code = asString(record.code);
  const name = asString(record.name);
  if (!code || !name) return null;

  const location = isRecord(record.location) ? record.location : {};
  const position = isRecord(location.position) ? location.position : {};

  const openingDays: Record<string, ParcelPointOpeningPeriod[]> = {};
  if (isRecord(record.openingDays)) {
    for (const [day, periods] of Object.entries(record.openingDays)) {
      if (!Array.isArray(periods)) continue;
      openingDays[day] = periods
        .map((p) =>
          isRecord(p)
            ? { open: asString(p.openingTime) || '', close: asString(p.closingTime) || '' }
            : null
        )
        .filter(
          (p): p is ParcelPointOpeningPeriod => p !== null && p.open !== '' && p.close !== ''
        );
    }
  }

  return {
    code,
    name,
    networks: Array.isArray(record.compatibleNetworks)
      ? record.compatibleNetworks.map((n) => asString(n)).filter((n): n is string => Boolean(n))
      : [],
    address: {
      number: asString(location.number),
      street: asString(location.street),
      postalCode: asString(location.postalCode),
      city: asString(location.city),
      country: asString(location.countryIsoCode),
    },
    distanceMeters: asNumber((candidate as Record<string, unknown>).distanceFromSearchLocation),
    latitude: asNumber(position.latitude),
    longitude: asNumber(position.longitude),
    openingDays: Object.keys(openingDays).length > 0 ? openingDays : undefined,
  };
}

export type ParcelPointSearchParams = {
  postalCode: string;
  city?: string;
  countryIsoCode?: string;
  street?: string;
};

/**
 * Recherche les points relais proches d'une adresse pour l'offre relais
 * configurée (GET /shipping/v3.2/parcel-point-by-shipping-offer).
 */
export async function searchParcelPoints(params: ParcelPointSearchParams): Promise<ParcelPoint[]> {
  const config = requireConfig();
  const offerCode = config.offerCodes.RELAY;
  if (!offerCode) {
    throw new BoxtalApiError(
      'Offre relais non configurée (BOXTAL_SHIPPING_OFFER_CODE_RELAY manquant)',
      503,
      'BOXTAL_NOT_CONFIGURED'
    );
  }

  const query = new URLSearchParams({
    operationType: 'ARRIVAL',
    shippingOfferCode: offerCode,
    countryIsoCode: (params.countryIsoCode || 'FR').toUpperCase(),
    postalCode: params.postalCode,
  });
  if (params.city) query.set('city', params.city);
  if (params.street) {
    const { number, street } = splitStreetLine(params.street);
    query.set('street', street);
    if (number) query.set('number', number);
  }

  const payload = await boxtalFetch(
    `/shipping/v3.2/parcel-point-by-shipping-offer?${query.toString()}`,
    {},
    config
  );

  const content = isRecord(payload) && Array.isArray(payload.content) ? payload.content : [];
  return content
    .map((candidate) => normalizeParcelPoint(candidate))
    .filter((point): point is ParcelPoint => point !== null);
}

// ============================================================================
// COMMANDES D'EXPÉDITION
// ============================================================================

export type ShipmentRecipient = {
  name: string;
  email: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  country?: string | null;
};

export type CreateShipmentParams = {
  externalId: string;
  offerType: BoxtalOfferType;
  recipient: ShipmentRecipient;
  pickupPointCode?: string | null;
  itemsCount: number;
  valueCents: number;
};

export type BoxtalShipmentResult = {
  boxtalShippingOrderId: string;
  status?: string;
  offerCode: string;
};

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || 'Client', lastName: 'BoulevardTCG' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/** Normalise un téléphone au format international attendu par Boxtal (+33...). */
export function normalizePhone(phone: string, country = 'FR'): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return phone;
  if (phone.trim().startsWith('+')) return `+${digits}`;
  if (country === 'FR') {
    if (digits.startsWith('33')) return `+${digits}`;
    if (digits.startsWith('0')) return `+33${digits.slice(1)}`;
    return `+33${digits}`;
  }
  return `+${digits}`;
}

const COUNTRY_ALIASES: Record<string, string> = {
  FRANCE: 'FR',
  BELGIQUE: 'BE',
  BELGIUM: 'BE',
  LUXEMBOURG: 'LU',
  SUISSE: 'CH',
  SWITZERLAND: 'CH',
  ALLEMAGNE: 'DE',
  GERMANY: 'DE',
  ESPAGNE: 'ES',
  SPAIN: 'ES',
  ITALIE: 'IT',
  ITALY: 'IT',
  NETHERLANDS: 'NL',
  'PAYS-BAS': 'NL',
};

export function normalizeCountryIso2(country: string | null | undefined): string {
  const upper = (country || '').trim().toUpperCase();
  if (!upper) return 'FR';
  if (COUNTRY_ALIASES[upper]) return COUNTRY_ALIASES[upper];
  return upper.length === 2 ? upper : upper.slice(0, 2);
}

/**
 * Crée une commande d'expédition Boxtal (POST /shipping/v3.1/shipping-order).
 * Le poids est estimé depuis les valeurs par défaut (base + poids par article).
 */
export async function createShippingOrder(
  params: CreateShipmentParams
): Promise<BoxtalShipmentResult> {
  const config = requireConfig();
  const offerCode = config.offerCodes[params.offerType];
  if (!offerCode) {
    throw new BoxtalApiError(
      `Offre ${params.offerType} non configurée (BOXTAL_SHIPPING_OFFER_CODE_${params.offerType} manquant)`,
      503,
      'BOXTAL_NOT_CONFIGURED'
    );
  }
  if (!config.shipper) {
    throw new BoxtalApiError(
      'Expéditeur non configuré (variables BOXTAL_SHIPPER_* manquantes)',
      503,
      'BOXTAL_NOT_CONFIGURED'
    );
  }
  if (params.offerType === 'RELAY' && !params.pickupPointCode) {
    throw new BoxtalApiError(
      'Point relais manquant pour une expédition en relais',
      400,
      'PICKUP_POINT_REQUIRED'
    );
  }

  const shipper = config.shipper;
  const recipientCountry = normalizeCountryIso2(params.recipient.country);
  const { firstName, lastName } = splitFullName(params.recipient.name);
  const { number, street } = splitStreetLine(params.recipient.line1);

  const { baseWeightGrams, perItemWeightGrams, lengthCm, widthCm, heightCm } =
    config.packageDefaults;
  const weightKg = (baseWeightGrams + Math.max(0, params.itemsCount) * perItemWeightGrams) / 1000;

  const fromAddress = {
    type: 'BUSINESS' as const,
    contact: {
      firstName: shipper.firstName,
      lastName: shipper.lastName,
      email: shipper.email,
      phone: normalizePhone(shipper.phone, shipper.countryIsoCode),
      company: shipper.company,
    },
    location: {
      street: shipper.street,
      number: shipper.number,
      postalCode: shipper.postalCode,
      city: shipper.city,
      countryIsoCode: shipper.countryIsoCode,
    },
    additionalInformation: shipper.additionalInformation,
  };

  const requestBody = {
    shippingOfferCode: offerCode,
    labelType: config.labelType,
    shipment: {
      externalId: params.externalId,
      content: config.content,
      fromAddress,
      returnAddress: fromAddress,
      toAddress: {
        type: 'RESIDENTIAL' as const,
        contact: {
          firstName,
          lastName,
          email: params.recipient.email,
          phone: normalizePhone(params.recipient.phone || shipper.phone, recipientCountry),
        },
        location: {
          street,
          number,
          postalCode: params.recipient.postalCode,
          city: params.recipient.city,
          countryIsoCode: recipientCountry,
        },
        additionalInformation: params.recipient.line2 || undefined,
      },
      packages: [
        {
          type: 'PARCEL' as const,
          weight: Number(weightKg.toFixed(3)),
          length: Math.round(lengthCm),
          width: Math.round(widthCm),
          height: Math.round(heightCm),
          value: {
            value: Number(Math.max(0.01, params.valueCents / 100).toFixed(2)),
            currency: 'EUR' as const,
          },
          content: config.content,
          externalId: params.externalId,
        },
      ],
      ...(params.pickupPointCode ? { pickupPointCode: params.pickupPointCode } : {}),
    },
  };

  const payload = await boxtalFetch('/shipping/v3.1/shipping-order', {
    method: 'POST',
    body: requestBody,
  });

  const content = isRecord(payload) && isRecord(payload.content) ? payload.content : {};
  const boxtalShippingOrderId = asString(content.id);
  if (!boxtalShippingOrderId) {
    logger.error('Boxtal: réponse de création sans id', { payload });
    throw new BoxtalApiError(
      "Réponse Boxtal invalide (id de commande d'expédition manquant)",
      502,
      'BOXTAL_INVALID_RESPONSE',
      payload
    );
  }

  return {
    boxtalShippingOrderId,
    status: asString(content.status),
    offerCode,
  };
}

/**
 * Annule une commande d'expédition Boxtal (DELETE /shipping/v3.1/shipping-order/{id}).
 * Possible tant que le transporteur n'a pas pris en charge le colis.
 */
export async function cancelShippingOrder(boxtalShippingOrderId: string): Promise<void> {
  await boxtalFetch(`/shipping/v3.1/shipping-order/${encodeURIComponent(boxtalShippingOrderId)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// SUIVI ET DOCUMENTS
// ============================================================================

export type BoxtalTracking = {
  status?: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

/**
 * Récupère le suivi d'une commande d'expédition.
 * Retourne null si le suivi n'est pas encore disponible (422 côté Boxtal).
 */
export async function getShippingOrderTracking(
  boxtalShippingOrderId: string
): Promise<BoxtalTracking | null> {
  let payload: unknown;
  try {
    payload = await boxtalFetch(
      `/shipping/v3.1/shipping-order/${encodeURIComponent(boxtalShippingOrderId)}/tracking`
    );
  } catch (err) {
    if (err instanceof BoxtalApiError && err.status === 422) return null;
    throw err;
  }

  const content = isRecord(payload) && Array.isArray(payload.content) ? payload.content : [];
  const primary = content.find(
    (item) => isRecord(item) && (asString(item.trackingNumber) || asString(item.packageTrackingUrl))
  );
  if (!isRecord(primary)) return null;

  return {
    status: asString(primary.status),
    trackingNumber: asString(primary.trackingNumber),
    trackingUrl: asString(primary.packageTrackingUrl),
  };
}

/**
 * Récupère l'URL de l'étiquette PDF (document LABEL).
 * Retourne null si le document n'est pas encore généré (422 côté Boxtal).
 */
export async function getShippingLabelUrl(boxtalShippingOrderId: string): Promise<string | null> {
  let payload: unknown;
  try {
    payload = await boxtalFetch(
      `/shipping/v3.1/shipping-order/${encodeURIComponent(boxtalShippingOrderId)}/shipping-document`
    );
  } catch (err) {
    if (err instanceof BoxtalApiError && err.status === 422) return null;
    throw err;
  }

  const content = isRecord(payload) && Array.isArray(payload.content) ? payload.content : [];
  const documents = content.filter(isRecord);
  const label =
    documents.find((doc) => asString(doc.type) === 'LABEL' && asString(doc.url)) ||
    documents.find((doc) => asString(doc.url));
  return label ? (asString(label.url) ?? null) : null;
}

// ============================================================================
// MAPPINGS
// ============================================================================

// Préfixe opérateur des codes d'offre Boxtal (ex: "MONR-CpourToi" → MONR)
const OFFER_PREFIX_TO_CARRIER: Record<string, Carrier> = {
  MONR: Carrier.MONDIAL_RELAY,
  POFR: Carrier.COLISSIMO,
  CHRP: Carrier.CHRONOPOST,
  UPSE: Carrier.UPS,
  DHLE: Carrier.DHL,
  FEDX: Carrier.FEDEX,
};

export function carrierFromOfferCode(offerCode: string | null | undefined): Carrier {
  const prefix = (offerCode || '').split('-')[0]?.trim().toUpperCase();
  return (prefix && OFFER_PREFIX_TO_CARRIER[prefix]) || Carrier.OTHER;
}

/**
 * Mappe un statut de suivi Boxtal vers le statut de fulfillment interne.
 * Retourne null quand le statut n'implique aucune transition.
 */
export function fulfillmentStatusFromTracking(
  trackingStatus: string | null | undefined
): FulfillmentStatus | null {
  switch ((trackingStatus || '').toUpperCase()) {
    case 'SHIPPED':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
    case 'FAILED_ATTEMPT':
    case 'REACHED_DELIVERY_PICKUP_POINT':
      return FulfillmentStatus.SHIPPED;
    case 'DELIVERED':
      return FulfillmentStatus.DELIVERED;
    default:
      return null;
  }
}
