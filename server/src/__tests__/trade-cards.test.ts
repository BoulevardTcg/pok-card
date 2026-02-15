import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fetch from 'node-fetch';
import { app } from '../index.js';

vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock('../pricing/snapshotTcgdexPricing.js', () => ({
  upsertTcgdexSnapshots: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/prisma.js', () => ({
  default: {
    saleTransaction: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    cardPriceSnapshot: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import prisma from '../lib/prisma.js';

describe('GET /api/trade/cards/search', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('retourne 400 si q a moins de 2 caractères', async () => {
    const res = await request(app).get('/api/trade/cards/search?q=a');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(res.body.error?.message).toMatch(/q.*2/);
  });

  it('retourne 400 si q est absent', async () => {
    const res = await request(app).get('/api/trade/cards/search');
    expect(res.status).toBe(400);
  });

  it('accepte limit entre 1 et 100 et retourne un tableau', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: 'basep-4', name: 'Pikachu', image: 'https://example.com/img', localId: '4' },
        ]),
    } as any);
    const res = await request(app).get('/api/trade/cards/search?q=pi&limit=50');
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(50);
    if (data.length > 0) {
      expect(data[0]).toMatchObject({ id: 'basep-4', name: 'Pikachu' });
      expect(data[0]).toHaveProperty('image');
      expect(data[0].set).toEqual({ id: 'basep' });
    }
  });

  it('forme de réponse : id, name, image, set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: 'sv4-120', name: 'Dracolosse', image: 'https://x/y', localId: '120' },
        ]),
    } as any);
    const res = await request(app).get('/api/trade/cards/search?q=dracolosse&limit=10');
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe('sv4-120');
    expect(data[0].name).toBe('Dracolosse');
    expect(data[0].image).toMatch(/low\.webp$/);
    expect(data[0].set).toEqual({ id: 'sv4' });
  });

  it('retourne 502 quand TCGdex échoue', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    const res = await request(app).get('/api/trade/cards/search?q=pikachu');
    expect(res.status).toBe(502);
    expect(res.body.error?.code).toBe('TCGDEX_UNAVAILABLE');
    expect(res.body.error?.message).toMatch(/indisponible/);
  });

  it('retourne 502 quand TCGdex renvoie une réponse invalide (non-tableau)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ not: 'an array' }),
    } as any);
    const res = await request(app).get('/api/trade/cards/search?q=pikachu');
    expect(res.status).toBe(502);
    expect(res.body.error?.code).toBe('TCGDEX_UNAVAILABLE');
  });

  it('normalise la requête (mega → méga) avant d’appeler TCGdex', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);
    await request(app).get('/api/trade/cards/search?q=mega%20charizard');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('méga charizard'))
    );
  });
});

describe('GET /api/trade/cards/:id', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('retourne 404 pour une carte inconnue (TCGdex 404)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as any);
    const res = await request(app).get('/api/trade/cards/carte-inexistante-999');
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('CARD_NOT_FOUND');
    expect(res.body.error?.message).toMatch(/introuvable/);
  });

  it('retourne 200 avec détail et pricing quand la carte existe', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'basep-4',
          name: 'Pikachu',
          localId: '4',
          image: 'https://assets.tcgdex.net/fr/sv/sv1/4',
          set: { id: 'basep', name: 'Base' },
          serie: { id: 'sv1', name: 'Scarlet & Violet' },
          rarity: 'Common',
          pricing: {
            cardmarket: {
              unit: 'EUR',
              avg: 1.5,
              low: 1,
              avg7: 1.2,
              avg30: 1.4,
              updated: '2024-01-01',
            },
            tcgplayer: {},
          },
        }),
    } as any);
    const res = await request(app).get('/api/trade/cards/basep-4');
    expect(res.status).toBe(200);
    const { card, marketPricing } = res.body.data;
    expect(card).toBeDefined();
    expect(marketPricing).toBeDefined();
    expect(card.id).toBe('basep-4');
    expect(card.name).toBe('Pikachu');
    expect(card.set).toEqual({ id: 'basep', name: 'Base' });
    expect(card.localId).toBe('4');
    expect(card.rarity).toBe('Common');
    expect(card.pricing?.cardmarket?.avg).toBe(1.5);
    expect(card.pricing?.cardmarket?.low).toBe(1);
    expect(card.pricing?.cardmarket?.unit).toBe('EUR');
    expect(marketPricing.sources.cardmarket?.normal.avg).toBe(1.5);
    expect(marketPricing.sources.cardmarket?.normal.low).toBe(1);
  });

  it('utilise lang=fr par défaut et accepte lang=en', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'basep-4',
          name: 'Pikachu',
          localId: '4',
          set: { id: 'basep', name: 'Base' },
          pricing: { cardmarket: { unit: 'EUR', trend: 1.2 } },
        }),
    } as any);
    const res = await request(app).get('/api/trade/cards/basep-4?lang=en');
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v2/en/cards/basep-4'));
    expect(res.body.data.marketPricing.sources.cardmarket?.normal.trend).toBe(1.2);
  });

  it('retourne 502 quand TCGdex renvoie 5xx', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as any);
    const res = await request(app).get('/api/trade/cards/card-5xx-test');
    expect(res.status).toBe(502);
    expect(res.body.error?.code).toBe('TCGDEX_UNAVAILABLE');
  });

  it('retourne 502 quand TCGdex lance une erreur', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Timeout'));
    const res = await request(app).get('/api/trade/cards/card-timeout-test');
    expect(res.status).toBe(502);
    expect(res.body.error?.code).toBe('TCGDEX_UNAVAILABLE');
  });
});

describe('POST /api/trade/cards/:id/sales', () => {
  beforeEach(() => {
    vi.mocked(prisma.saleTransaction.create).mockResolvedValue({} as any);
  });

  it('retourne 400 si id manquant', async () => {
    const res = await request(app).post('/api/trade/cards/  /sales').send({});
    expect(res.status).toBe(400);
  });

  it('crée une vente et retourne { data: { ok: true } }', async () => {
    const res = await request(app).post('/api/trade/cards/swsh1-25/sales').send({
      lang: 'fr',
      price: 12.5,
      currency: 'EUR',
      qty: 1,
      soldAt: '2026-02-15T10:00:00.000Z',
      condition: 'NM',
      finish: 'normal',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ok: true });
    expect(prisma.saleTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tcgdexCardId: 'swsh1-25',
          lang: 'fr',
          price: 12.5,
          currency: 'EUR',
          qty: 1,
          condition: 'NM',
          finish: 'normal',
        }),
      })
    );
  });

  it('normalise jp en ja', async () => {
    await request(app)
      .post('/api/trade/cards/basep-4/sales')
      .send({ lang: 'jp', price: 5, soldAt: '2026-02-10T12:00:00.000Z' });
    expect(prisma.saleTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lang: 'ja' }),
      })
    );
  });

  it('retourne 400 si price invalide', async () => {
    const res = await request(app)
      .post('/api/trade/cards/swsh1-25/sales')
      .send({ lang: 'fr', price: -1, soldAt: '2026-02-15T10:00:00.000Z' });
    expect(res.status).toBe(400);
    expect(res.body.error?.message).toMatch(/price/);
  });
});

describe('GET /api/trade/cards/:id/boulevard-history', () => {
  beforeEach(() => {
    vi.mocked(prisma.saleTransaction.findMany).mockResolvedValue([]);
  });

  it('retourne 400 si id manquant', async () => {
    const res = await request(app).get('/api/trade/cards/  /boulevard-history');
    expect(res.status).toBe(400);
  });

  it('retourne 3 séries vides si aucune vente', async () => {
    const res = await request(app).get(
      '/api/trade/cards/swsh1-25/boulevard-history?langs=fr,en,ja&days=365'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.metadata).toEqual({ bucket: 'day', metric: 'median' });
    expect(res.body.data.hasAnyData).toBe(false);
    expect(Array.isArray(res.body.data.series)).toBe(true);
    expect(res.body.data.series.length).toBe(3);
    expect(res.body.data.series.map((s: any) => s.lang).sort()).toEqual(['en', 'fr', 'ja']);
    res.body.data.series.forEach((s: any) => {
      expect(s.points).toBeDefined();
      expect(Array.isArray(s.points)).toBe(true);
    });
  });

  it('placeholderZero=1 renvoie des points à 0 quand pas de data', async () => {
    const res = await request(app).get(
      '/api/trade/cards/swsh1-25/boulevard-history?langs=fr&days=7&placeholderZero=1'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.hasAnyData).toBe(false);
    expect(res.body.data.series.length).toBe(1);
    const points = res.body.data.series[0].points;
    expect(points.length).toBeGreaterThan(0);
    points.forEach((p: any) => {
      expect(p.value).toBe(0);
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('agrège median sur un dataset simple', async () => {
    const soldAt = new Date('2026-02-10T12:00:00.000Z');
    vi.mocked(prisma.saleTransaction.findMany).mockResolvedValue([
      {
        id: '1',
        tcgdexCardId: 'swsh1-25',
        lang: 'fr',
        condition: null,
        finish: null,
        qty: 1,
        price: 10,
        currency: 'EUR',
        soldAt,
        createdAt: soldAt,
      },
      {
        id: '2',
        tcgdexCardId: 'swsh1-25',
        lang: 'fr',
        condition: null,
        finish: null,
        qty: 1,
        price: 20,
        currency: 'EUR',
        soldAt,
        createdAt: soldAt,
      },
    ] as any);
    const res = await request(app).get(
      '/api/trade/cards/swsh1-25/boulevard-history?langs=fr&days=365&metric=median'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.hasAnyData).toBe(true);
    const frSeries = res.body.data.series.find((s: any) => s.lang === 'fr');
    expect(frSeries).toBeDefined();
    const point = frSeries.points.find((p: any) => p.date === '2026-02-10');
    expect(point).toBeDefined();
    expect(point.value).toBe(15); // median(10, 20)
  });

  it('valide bucket et metric', async () => {
    const res = await request(app).get(
      '/api/trade/cards/swsh1-25/boulevard-history?bucket=week&metric=avg'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.metadata.bucket).toBe('week');
    expect(res.body.data.metadata.metric).toBe('avg');
  });
});
