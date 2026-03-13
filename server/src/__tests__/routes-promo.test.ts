import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// promo.ts uses new PrismaClient() directly — mock @prisma/client
const { mockPromoCode } = vi.hoisted(() => ({
  mockPromoCode: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    PrismaClient: vi.fn().mockImplementation(function () {
      return { promoCode: mockPromoCode };
    }),
  };
});

// Also mock lib/prisma.js in case any transitive dependency uses the singleton
vi.mock('../lib/prisma.js', () => ({
  default: {
    promoCode: mockPromoCode,
  },
}));

import { createApp } from '../app.js';

const app = createApp();

function makeValidPromo(overrides: Partial<any> = {}) {
  const now = new Date();
  const past = new Date(now.getTime() - 86400000); // yesterday
  const future = new Date(now.getTime() + 86400000 * 30); // 30 days from now
  return {
    id: 'promo-1',
    code: 'SAVE10',
    type: 'PERCENTAGE',
    value: 10,
    isActive: true,
    validFrom: past,
    validUntil: future,
    minPurchase: null,
    usageLimit: null,
    usedCount: 0,
    maxDiscount: null,
    ...overrides,
  };
}

describe('POST /api/promo/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when promo code is not found', async () => {
    mockPromoCode.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'NOTFOUND', totalCents: 5000 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PROMO_NOT_FOUND');
  });

  it('returns 400 when promo is inactive', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo({ isActive: false }));
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PROMO_INACTIVE');
  });

  it('returns 400 when promo is expired (validUntil in past)', async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000 * 2);
    const pastStart = new Date(now.getTime() - 86400000 * 10);
    mockPromoCode.findUnique.mockResolvedValue(
      makeValidPromo({ validFrom: pastStart, validUntil: pastDate })
    );
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PROMO_EXPIRED');
  });

  it('returns 400 when promo validFrom is in the future (not yet valid)', async () => {
    const now = new Date();
    const futureStart = new Date(now.getTime() + 86400000 * 5);
    const futureEnd = new Date(now.getTime() + 86400000 * 30);
    mockPromoCode.findUnique.mockResolvedValue(
      makeValidPromo({ validFrom: futureStart, validUntil: futureEnd })
    );
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PROMO_EXPIRED');
  });

  it('returns 400 when minimum purchase not met', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo({ minPurchase: 10000 }));
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MIN_PURCHASE_NOT_MET');
  });

  it('returns 400 when usage limit exceeded', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo({ usageLimit: 5, usedCount: 5 }));
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PROMO_LIMIT_REACHED');
  });

  it('returns 200 with PERCENTAGE discount calculation (10% of 5000 = 500)', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo({ type: 'PERCENTAGE', value: 10 }));
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discountCents).toBe(500);
    expect(res.body.finalAmountCents).toBe(4500);
    expect(res.body.type).toBe('PERCENTAGE');
  });

  it('returns 200 with FIXED discount (200 cents off)', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo({ type: 'FIXED', value: 200 }));
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discountCents).toBe(200);
    expect(res.body.finalAmountCents).toBe(4800);
  });

  it('caps PERCENTAGE discount at maxDiscount', async () => {
    mockPromoCode.findUnique.mockResolvedValue(
      makeValidPromo({ type: 'PERCENTAGE', value: 50, maxDiscount: 300 })
    );
    const res = await request(app)
      .post('/api/promo/validate')
      .send({ code: 'SAVE10', totalCents: 5000 });
    // 50% of 5000 = 2500, but capped at 300
    expect(res.status).toBe(200);
    expect(res.body.discountCents).toBe(300);
    expect(res.body.finalAmountCents).toBe(4700);
  });

  it('returns 400 for missing code field', async () => {
    const res = await request(app).post('/api/promo/validate').send({ totalCents: 5000 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing totalCents field', async () => {
    const res = await request(app).post('/api/promo/validate').send({ code: 'SAVE10' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/promo/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments usedCount and returns 200 for valid promo', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo());
    mockPromoCode.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app).post('/api/promo/apply').send({ code: 'SAVE10' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(mockPromoCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ code: 'SAVE10' }),
        data: expect.objectContaining({ usedCount: expect.objectContaining({ increment: 1 }) }),
      })
    );
  });

  it('returns 400 when atomic update fails (race condition hit usageLimit)', async () => {
    mockPromoCode.findUnique.mockResolvedValue(makeValidPromo({ usageLimit: 5, usedCount: 4 }));
    mockPromoCode.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app).post('/api/promo/apply').send({ code: 'SAVE10' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PROMO_LIMIT_REACHED');
  });

  it('returns 404 when promo code is not found', async () => {
    mockPromoCode.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/promo/apply').send({ code: 'BADCODE' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PROMO_NOT_FOUND');
  });

  it('returns 400 for missing code field', async () => {
    const res = await request(app).post('/api/promo/apply').send({});
    expect(res.status).toBe(400);
  });
});
