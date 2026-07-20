export type ShippingMethod = {
  code: string;
  label: string;
  priceCents: number;
  carrier: string;
  enabled: boolean;
  description?: string;
  // true si le client doit choisir un point relais au checkout (Boxtal)
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
    requiresPickupPoint: true,
  },
  {
    code: 'COLISSIMO_HOME',
    label: 'Livraison à domicile',
    priceCents: 790,
    carrier: 'COLISSIMO',
    enabled: true,
    description: 'Livraison à domicile (3 à 5 jours ouvrés)',
    requiresPickupPoint: false,
  },
];

export function getEnabledShippingMethods() {
  return SHIPPING_METHODS.filter((m) => m.enabled);
}

export function findShippingMethod(code?: string | null) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return SHIPPING_METHODS.find((m) => m.code === normalized && m.enabled) || null;
}
