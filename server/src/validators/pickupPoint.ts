export type PickupPointInput = {
  code: string;
  name: string;
  network?: string;
  line1?: string;
  postalCode: string;
  city: string;
  country: string;
};

type PickupPointValidation =
  | { ok: true; pickupPoint: PickupPointInput }
  | { ok: false; error: string };

const readString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

/**
 * Valide et normalise le point relais envoyé par le frontend au checkout.
 * Validation de format uniquement : le code est revérifié par Boxtal au
 * moment de la création de l'expédition (une valeur forgée fait échouer
 * l'étiquette, pas le paiement).
 */
export function normalizePickupPointInput(input: unknown): PickupPointValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Point relais invalide.' };
  }

  const value = input as Record<string, unknown>;
  const address =
    value.address && typeof value.address === 'object' && !Array.isArray(value.address)
      ? (value.address as Record<string, unknown>)
      : {};

  const code = readString(value.code, 100);
  const name = readString(value.name, 200);
  const network = readString(value.network, 80);
  const line1 = readString(address.line1 ?? address.street, 250);
  const postalCode = readString(address.postalCode ?? address.zipCode, 30);
  const city = readString(address.city, 100);
  const country = (readString(address.country, 10) || 'FR').toUpperCase();

  if (!code || !/^[A-Za-z0-9_.:-]{2,100}$/.test(code)) {
    return { ok: false, error: 'Code du point relais invalide.' };
  }
  if (!name) {
    return { ok: false, error: 'Nom du point relais requis.' };
  }
  if (!postalCode || !/^[A-Za-z0-9 -]{2,30}$/.test(postalCode)) {
    return { ok: false, error: 'Code postal du point relais requis.' };
  }
  if (!city) {
    return { ok: false, error: 'Ville du point relais requise.' };
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    return { ok: false, error: 'Pays du point relais invalide.' };
  }
  if (network && !/^[A-Za-z0-9_.:-]{2,80}$/.test(network)) {
    return { ok: false, error: 'Réseau du point relais invalide.' };
  }

  return {
    ok: true,
    pickupPoint: { code, name, network, line1, postalCode, city, country },
  };
}
