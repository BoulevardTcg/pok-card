import { describe, it, expect } from 'vitest';
import { normalizeTcgdexPricing } from '../pricing/normalizeTcgdexPricing.js';

describe('normalizeTcgdexPricing', () => {
  it('retourne des sources vides si pricing absent', () => {
    const out = normalizeTcgdexPricing(undefined);
    expect(out.sources.cardmarket).toBeUndefined();
    expect(out.sources.tcgplayer).toBeUndefined();
  });

  it('accepte la carte brute (objet avec .pricing)', () => {
    const card = {
      id: 'basep-4',
      name: 'Pikachu',
      pricing: { cardmarket: { unit: 'EUR', trend: 5, low: 4 } },
    };
    const out = normalizeTcgdexPricing(card);
    expect(out.sources.cardmarket?.normal.trend).toBe(5);
    expect(out.sources.cardmarket?.normal.low).toBe(4);
  });

  it('retourne des sources vides si pricing non objet', () => {
    expect(normalizeTcgdexPricing(null).sources.cardmarket).toBeUndefined();
    expect(normalizeTcgdexPricing(42).sources.cardmarket).toBeUndefined();
  });

  it('normalise cardmarket avec normal et holo', () => {
    const pricing = {
      cardmarket: {
        unit: 'EUR',
        low: 10,
        avg: 12,
        trend: 11,
        avg7: 11.5,
        avg30: 10.8,
        updated: '2024-01-15T12:00:00Z',
        'avg-holo': 50,
        'low-holo': 45,
        'trend-holo': 48,
      },
    };
    const out = normalizeTcgdexPricing(pricing);
    expect(out.sources.cardmarket?.currency).toBe('EUR');
    expect(out.sources.cardmarket?.updatedAt).toBe('2024-01-15T12:00:00.000Z');
    expect(out.sources.cardmarket?.normal).toEqual({
      low: 10,
      avg: 12,
      trend: 11,
      avg7: 11.5,
      avg30: 10.8,
      avg1: undefined,
    });
    expect(out.sources.cardmarket?.holo).toEqual({
      avg: 50,
      low: 45,
      trend: 48,
      avg1: undefined,
      avg7: undefined,
      avg30: undefined,
    });
  });

  it('accepte updated en number (timestamp)', () => {
    const pricing = { cardmarket: { unit: 'EUR', trend: 5, updated: 1705312800000 } };
    const out = normalizeTcgdexPricing(pricing);
    expect(out.sources.cardmarket?.updatedAt).toBe(new Date(1705312800000).toISOString());
  });

  it('normalise tcgplayer variants', () => {
    const pricing = {
      tcgplayer: {
        normal: { lowPrice: 1, midPrice: 1.5, marketPrice: 1.4, highPrice: 2 },
        holofoil: { lowPrice: 5, directLowPrice: 4.5 },
      },
    };
    const out = normalizeTcgdexPricing(pricing);
    expect(out.sources.tcgplayer?.currency).toBe('USD');
    expect(out.sources.tcgplayer?.variants.normal).toEqual({
      lowPrice: 1,
      midPrice: 1.5,
      highPrice: 2,
      marketPrice: 1.4,
      directLowPrice: undefined,
    });
    expect(out.sources.tcgplayer?.variants.holofoil?.lowPrice).toBe(5);
    expect(out.sources.tcgplayer?.variants.holofoil?.directLowPrice).toBe(4.5);
  });
});
