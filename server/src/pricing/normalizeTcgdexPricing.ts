/**
 * Normalise le champ pricing de TCGdex en un objet MarketPricing prêt à afficher.
 * Cardmarket: low/avg/trend/avg1/avg7/avg30 + variantes foil (avg-holo, low-holo, etc.)
 * TCGplayer: variantes (normal, holofoil, reverseHolofoil, etc.) avec lowPrice/midPrice/highPrice/marketPrice/directLowPrice
 */

export type CardmarketNormal = {
  low?: number;
  avg?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
};

export type CardmarketHolo = CardmarketNormal;

export type TcgplayerVariant = {
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number;
};

export type MarketPricing = {
  sources: {
    cardmarket?: {
      currency: string;
      updatedAt: string | null;
      normal: CardmarketNormal;
      holo?: CardmarketHolo;
    };
    tcgplayer?: {
      currency: string;
      updatedAt: string | null;
      variants: Record<string, TcgplayerVariant>;
    };
  };
};

type TcgdexCardmarketRaw = Record<string, unknown> & {
  unit?: string;
  avg?: number;
  low?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  updated?: string | number;
};

type TcgdexTcgplayerRaw = Record<
  string,
  | {
      lowPrice?: number;
      midPrice?: number;
      highPrice?: number;
      marketPrice?: number;
      directLowPrice?: number;
    }
  | undefined
>;

function toIsoDate(value: string | number | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function pickCardmarketNormal(cm: TcgdexCardmarketRaw): CardmarketNormal {
  return {
    low: typeof cm.low === 'number' ? cm.low : undefined,
    avg: typeof cm.avg === 'number' ? cm.avg : undefined,
    trend: typeof cm.trend === 'number' ? cm.trend : undefined,
    avg1: typeof cm.avg1 === 'number' ? cm.avg1 : undefined,
    avg7: typeof cm.avg7 === 'number' ? cm.avg7 : undefined,
    avg30: typeof cm.avg30 === 'number' ? cm.avg30 : undefined,
  };
}

function pickCardmarketHolo(cm: TcgdexCardmarketRaw): CardmarketHolo | undefined {
  const avgHolo = cm['avg-holo'];
  const lowHolo = cm['low-holo'];
  const trendHolo = cm['trend-holo'];
  const avg7Holo = cm['avg7-holo'];
  const avg1Holo = cm['avg1-holo'];
  const avg30Holo = cm['avg30-holo'];
  if (
    typeof avgHolo !== 'number' &&
    typeof lowHolo !== 'number' &&
    typeof trendHolo !== 'number' &&
    typeof avg7Holo !== 'number' &&
    typeof avg1Holo !== 'number' &&
    typeof avg30Holo !== 'number'
  ) {
    return undefined;
  }
  return {
    low: typeof lowHolo === 'number' ? lowHolo : undefined,
    avg: typeof avgHolo === 'number' ? avgHolo : undefined,
    trend: typeof trendHolo === 'number' ? trendHolo : undefined,
    avg1: typeof avg1Holo === 'number' ? avg1Holo : undefined,
    avg7: typeof avg7Holo === 'number' ? avg7Holo : undefined,
    avg30: typeof avg30Holo === 'number' ? avg30Holo : undefined,
  };
}

/**
 * Transforme la carte TCGdex brute ou son champ pricing en MarketPricing.
 * Accepte soit la carte entière (card.pricing utilisé), soit le champ pricing seul.
 * Tolérant: pas de crash si pricing ou provider absent.
 */
export function normalizeTcgdexPricing(cardOrPricing: unknown): MarketPricing {
  const result: MarketPricing = { sources: {} };

  const pricing =
    cardOrPricing && typeof cardOrPricing === 'object' && 'pricing' in cardOrPricing
      ? (cardOrPricing as { pricing: unknown }).pricing
      : cardOrPricing;

  if (!pricing || typeof pricing !== 'object') return result;

  const p = pricing as Record<string, unknown>;
  const cm = p.cardmarket as TcgdexCardmarketRaw | undefined;
  if (cm && typeof cm === 'object') {
    result.sources.cardmarket = {
      currency: typeof cm.unit === 'string' ? cm.unit : 'EUR',
      updatedAt: toIsoDate(cm.updated),
      normal: pickCardmarketNormal(cm),
      holo: pickCardmarketHolo(cm),
    };
  }

  const tcp = p.tcgplayer as TcgdexTcgplayerRaw | undefined;
  if (tcp && typeof tcp === 'object') {
    const variants: Record<string, TcgplayerVariant> = {};
    for (const [key, val] of Object.entries(tcp)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const v = val as TcgplayerVariant;
        variants[key] = {
          lowPrice: typeof v.lowPrice === 'number' ? v.lowPrice : undefined,
          midPrice: typeof v.midPrice === 'number' ? v.midPrice : undefined,
          highPrice: typeof v.highPrice === 'number' ? v.highPrice : undefined,
          marketPrice: typeof v.marketPrice === 'number' ? v.marketPrice : undefined,
          directLowPrice: typeof v.directLowPrice === 'number' ? v.directLowPrice : undefined,
        };
      }
    }
    const updated = (tcp as { updated?: string | number }).updated;
    result.sources.tcgplayer = {
      currency: 'USD',
      updatedAt: toIsoDate(updated),
      variants,
    };
  }

  return result;
}
