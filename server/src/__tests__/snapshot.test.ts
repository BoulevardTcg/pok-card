import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCardPriceSnapshot } = vi.hoisted(() => ({
  mockCardPriceSnapshot: {
    upsert: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  default: {
    cardPriceSnapshot: mockCardPriceSnapshot,
  },
}));

vi.mock('../utils/logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock PriceMarket enum from @prisma/client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
  PriceMarket: {
    CARDMARKET: 'CARDMARKET',
    TCGPLAYER: 'TCGPLAYER',
  },
}));

import { upsertTcgdexSnapshots } from '../pricing/snapshotTcgdexPricing.js';
import type { MarketPricing } from '../pricing/normalizeTcgdexPricing.js';

describe('pricing/snapshotTcgdexPricing.ts - upsertTcgdexSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCardPriceSnapshot.upsert.mockResolvedValue({});
  });

  function makeFullMarketPricing(): MarketPricing {
    return {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: '2024-01-15',
          normal: {
            low: 1.5,
            avg: 2.0,
            trend: 1.8,
            avg1: 1.9,
            avg7: 2.1,
            avg30: 2.05,
          },
          holo: {
            low: 3.0,
            avg: 4.0,
            trend: 3.5,
            avg1: 3.8,
            avg7: 4.2,
            avg30: 4.0,
          },
        },
        tcgplayer: {
          currency: 'USD',
          updatedAt: '2024-01-15',
          variants: {
            normal: {
              lowPrice: 1.0,
              midPrice: 1.5,
              highPrice: 2.0,
              marketPrice: 1.4,
              directLowPrice: 0.9,
            },
            holofoil: {
              lowPrice: 3.0,
              midPrice: 4.0,
              highPrice: 5.0,
              marketPrice: 3.8,
              directLowPrice: 2.8,
            },
          },
        },
      },
    };
  }

  it('calls upsert multiple times with full marketPricing (CM normal + CM holo + TCGplayer variants)', async () => {
    await upsertTcgdexSnapshots('pikachu-1', 'en', makeFullMarketPricing());
    // CM normal + CM holo + 2 TCGplayer variants = 4 upserts
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(4);
  });

  it('calls upsert once with only CARDMARKET normal price (no holo)', async () => {
    const pricing: MarketPricing = {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: null,
          normal: { low: 1.0, avg: 1.5, trend: 1.2 },
          // no holo
        },
      },
    };
    await upsertTcgdexSnapshots('pikachu-1', 'en', pricing);
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(1);
  });

  it('calls upsert for holo variant when holo data exists', async () => {
    const pricing: MarketPricing = {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: '2024-01-15',
          normal: { low: 1.0, avg: 1.5, trend: 1.2 },
          holo: { low: 3.0, avg: 4.0, trend: 3.5 },
        },
      },
    };
    await upsertTcgdexSnapshots('pikachu-1', 'en', pricing);
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(2);
    // Second call should be for holo
    const calls = mockCardPriceSnapshot.upsert.mock.calls;
    const holoCall = calls.find(
      (call: any) => call[0].where?.tcgdexCardId_lang_market_variant_capturedDay?.variant === 'holo'
    );
    expect(holoCall).toBeDefined();
  });

  it('calls upsert with correct data for normal variant', async () => {
    const pricing: MarketPricing = {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: '2024-01-15',
          normal: { low: 1.5, avg: 2.0, trend: 1.8, avg1: 1.9, avg7: 2.1, avg30: 2.05 },
        },
      },
    };
    await upsertTcgdexSnapshots('charizard-4', 'fr', pricing);
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(1);
    const call = mockCardPriceSnapshot.upsert.mock.calls[0][0];
    expect(call.where.tcgdexCardId_lang_market_variant_capturedDay.tcgdexCardId).toBe(
      'charizard-4'
    );
    expect(call.where.tcgdexCardId_lang_market_variant_capturedDay.lang).toBe('fr');
    expect(call.create.currency).toBe('EUR');
    expect(call.create.low).toBe(1.5);
    expect(call.create.avg).toBe(2.0);
  });

  it('does not call upsert when cardmarket is absent and tcgplayer variants have no data', async () => {
    const pricing: MarketPricing = {
      sources: {
        tcgplayer: {
          currency: 'USD',
          updatedAt: null,
          variants: {
            normal: { lowPrice: undefined, midPrice: undefined, marketPrice: undefined },
          },
        },
      },
    };
    await upsertTcgdexSnapshots('mewtwo-1', 'en', pricing);
    expect(mockCardPriceSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('skips holo upsert when all holo values are null/undefined', async () => {
    const pricing: MarketPricing = {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: null,
          normal: { low: 1.0, avg: 1.5 },
          holo: {}, // no values
        },
      },
    };
    await upsertTcgdexSnapshots('pikachu-2', 'en', pricing);
    // Only normal upsert, holo has no data
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(1);
  });

  it('catches upsert errors silently without throwing', async () => {
    mockCardPriceSnapshot.upsert.mockRejectedValue(new Error('DB connection failed'));
    const pricing: MarketPricing = {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: null,
          normal: { low: 1.0, avg: 1.5 },
        },
      },
    };
    await expect(upsertTcgdexSnapshots('pikachu-3', 'en', pricing)).resolves.not.toThrow();
  });

  it('handles updatedAt: null gracefully', async () => {
    const pricing: MarketPricing = {
      sources: {
        cardmarket: {
          currency: 'EUR',
          updatedAt: null,
          normal: { low: 1.0 },
        },
      },
    };
    await upsertTcgdexSnapshots('eevee-1', 'en', pricing);
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(1);
    const call = mockCardPriceSnapshot.upsert.mock.calls[0][0];
    expect(call.create.sourceUpdatedAt).toBeNull();
  });

  it('handles TCGplayer with valid variant data', async () => {
    const pricing: MarketPricing = {
      sources: {
        tcgplayer: {
          currency: 'USD',
          updatedAt: '2024-01-15',
          variants: {
            holofoil: {
              lowPrice: 5.0,
              midPrice: 7.0,
              highPrice: 10.0,
              marketPrice: 6.5,
            },
          },
        },
      },
    };
    await upsertTcgdexSnapshots('raichu-1', 'en', pricing);
    expect(mockCardPriceSnapshot.upsert).toHaveBeenCalledTimes(1);
    const call = mockCardPriceSnapshot.upsert.mock.calls[0][0];
    expect(call.create.currency).toBe('USD');
    expect(call.where.tcgdexCardId_lang_market_variant_capturedDay.variant).toBe('holofoil');
  });
});
