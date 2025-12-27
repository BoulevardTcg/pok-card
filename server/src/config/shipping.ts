export type ShippingMethod = {
  code: string;
  label: string;
  priceCents: number;
  carrier: string;
  enabled: boolean;
  description?: string;
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    code: 'MONDIAL_RELAY',
    label: 'Mondial Relay - Point relais',
    priceCents: 490,
    carrier: 'MONDIAL_RELAY',
    enabled: true,
    description: 'Livraison en point relais (3 à 5 jours)',
  },
  {
    code: 'COLISSIMO_HOME',
    label: 'Colissimo - Domicile',
    priceCents: 790,
    carrier: 'COLISSIMO',
    enabled: true,
    description: 'Livraison à domicile (48h)',
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
