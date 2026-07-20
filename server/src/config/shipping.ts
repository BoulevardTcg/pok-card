export type BoxtalOfferType = 'RELAY' | 'HOME';

export type ShippingMethod = {
  code: string;
  label: string;
  priceCents: number;
  carrier: string;
  enabled: boolean;
  description?: string;
  // Livraison via Boxtal : type d'offre (mappe vers BOXTAL_SHIPPING_OFFER_CODE_RELAY / _HOME)
  boxtalOfferType: BoxtalOfferType;
  // true si le client doit choisir un point relais au checkout
  requiresPickupPoint: boolean;
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    code: 'MONDIAL_RELAY',
    label: 'Livraison en point relais',
    priceCents: 490,
    carrier: 'MONDIAL_RELAY',
    enabled: true,
    description: 'Livraison en point relais (3 à 5 jours)',
    boxtalOfferType: 'RELAY',
    requiresPickupPoint: true,
  },
  {
    code: 'COLISSIMO_HOME',
    label: 'Livraison à domicile',
    priceCents: 790,
    carrier: 'COLISSIMO',
    enabled: true,
    description: 'Livraison à domicile (48h)',
    boxtalOfferType: 'HOME',
    requiresPickupPoint: false,
  },
];

export function getEnabledShippingMethods() {
  return SHIPPING_METHODS.filter((m) => m.enabled);
}

export function findShippingMethod(code: string | null | undefined) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return SHIPPING_METHODS.find((m) => m.code === normalized && m.enabled) || null;
}
