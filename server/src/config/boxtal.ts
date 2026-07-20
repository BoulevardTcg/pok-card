import type { BoxtalOfferType } from './shipping.js';

// Environnements Boxtal API v3 : test = api.boxtal.build, production = api.boxtal.com
const DEFAULT_BASE_URL = 'https://api.boxtal.build';

export type BoxtalShipper = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  number?: string;
  additionalInformation?: string;
  postalCode: string;
  city: string;
  countryIsoCode: string;
};

export type BoxtalPackageDefaults = {
  baseWeightGrams: number;
  perItemWeightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type BoxtalConfig = {
  baseUrl: string;
  accessKey: string;
  secretKey: string;
  offerCodes: Partial<Record<BoxtalOfferType, string>>;
  shipper: BoxtalShipper | null;
  packageDefaults: BoxtalPackageDefaults;
  content: { id: string; description: string };
  labelType: 'PDF_A4' | 'PDF_10x15';
  webhookSecret: string | null;
};

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const readEnvNumber = (key: string, fallback: number): number => {
  const value = Number(readEnv(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/**
 * Sépare "12 rue de la Paix" en { number: "12", street: "rue de la Paix" }.
 * Boxtal attend le numéro de voie dans un champ dédié (optionnel).
 */
export function splitStreetLine(line: string): { number?: string; street: string } {
  const normalized = line.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d+[A-Za-z0-9/-]*)\s+(.+)$/);
  if (!match) {
    return { street: normalized };
  }
  return { number: match[1], street: match[2] };
}

function buildShipper(): BoxtalShipper | null {
  const company = readEnv('BOXTAL_SHIPPER_COMPANY');
  const firstName = readEnv('BOXTAL_SHIPPER_FIRST_NAME');
  const lastName = readEnv('BOXTAL_SHIPPER_LAST_NAME');
  const email = readEnv('BOXTAL_SHIPPER_EMAIL');
  const phone = readEnv('BOXTAL_SHIPPER_PHONE');
  const addressLine = readEnv('BOXTAL_SHIPPER_ADDRESS');
  const postalCode = readEnv('BOXTAL_SHIPPER_POSTAL_CODE');
  const city = readEnv('BOXTAL_SHIPPER_CITY');

  if (
    !company ||
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !addressLine ||
    !postalCode ||
    !city
  ) {
    return null;
  }

  const { number, street } = splitStreetLine(addressLine);

  return {
    company,
    firstName,
    lastName,
    email,
    phone,
    street,
    number,
    additionalInformation: readEnv('BOXTAL_SHIPPER_ADDRESS_2'),
    postalCode,
    city,
    countryIsoCode: (readEnv('BOXTAL_SHIPPER_COUNTRY') || 'FR').toUpperCase(),
  };
}

/**
 * Lit la configuration Boxtal depuis l'environnement.
 * Retourne null si les clés API ne sont pas définies (fonctionnalité désactivée).
 */
export function getBoxtalConfig(): BoxtalConfig | null {
  const accessKey = readEnv('BOXTAL_ACCESS_KEY');
  const secretKey = readEnv('BOXTAL_SECRET_KEY');
  if (!accessKey || !secretKey) {
    return null;
  }

  const labelType = readEnv('BOXTAL_LABEL_TYPE') === 'PDF_10x15' ? 'PDF_10x15' : 'PDF_A4';

  return {
    baseUrl: (readEnv('BOXTAL_API_BASE_URL') || DEFAULT_BASE_URL).replace(/\/$/, ''),
    accessKey,
    secretKey,
    offerCodes: {
      RELAY: readEnv('BOXTAL_SHIPPING_OFFER_CODE_RELAY'),
      HOME: readEnv('BOXTAL_SHIPPING_OFFER_CODE_HOME'),
    },
    shipper: buildShipper(),
    packageDefaults: {
      baseWeightGrams: readEnvNumber('BOXTAL_PACKAGE_BASE_WEIGHT_GRAMS', 150),
      perItemWeightGrams: readEnvNumber('BOXTAL_PACKAGE_ITEM_WEIGHT_GRAMS', 50),
      lengthCm: readEnvNumber('BOXTAL_PACKAGE_LENGTH_CM', 24),
      widthCm: readEnvNumber('BOXTAL_PACKAGE_WIDTH_CM', 18),
      heightCm: readEnvNumber('BOXTAL_PACKAGE_HEIGHT_CM', 8),
    },
    content: {
      // Catégorie de contenu Boxtal (GET /content-category) — cartes à collectionner
      id: readEnv('BOXTAL_CONTENT_CATEGORY_ID') || 'content:v1:80100',
      description:
        readEnv('BOXTAL_CONTENT_DESCRIPTION') || 'Cartes à collectionner et accessoires TCG',
    },
    labelType,
    webhookSecret: readEnv('BOXTAL_WEBHOOK_SECRET') || null,
  };
}

export function isBoxtalConfigured(): boolean {
  return getBoxtalConfig() !== null;
}
