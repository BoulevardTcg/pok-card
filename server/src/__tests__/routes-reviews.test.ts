import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Instance partagée entre lib/prisma.js singleton et new PrismaClient() des routes
const { mockPrismaInstance } = vi.hoisted(() => ({
  mockPrismaInstance: {
    productReview: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    orderItem: { findFirst: vi.fn() },
    order: { findFirst: vi.fn() },
    product: { findUnique: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({ default: mockPrismaInstance }));

vi.mock('../services/email.js', () => ({
  default: vi.fn(),
  sendReviewEmail: vi.fn().mockResolvedValue(true),
}));

// reviews.ts also uses new PrismaClient() — retourner la même instance partagée
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    PrismaClient: vi.fn().mockImplementation(function () {
      return mockPrismaInstance;
    }),
  };
});

import { createApp } from '../app.js';
import { generateAccessToken } from '../utils/auth.js';

const mockPrisma = mockPrismaInstance;
const app = createApp();

function makeUserToken(overrides: Partial<any> = {}) {
  return generateAccessToken({
    userId: 'user-1',
    email: 'user@test.com',
    username: 'testuser',
    isAdmin: false,
    ...overrides,
  });
}

const sampleReview = {
  id: 'review-1',
  productId: 'prod-1',
  userId: 'user-1',
  rating: 4,
  title: 'Great product',
  comment: 'Really happy with it',
  isApproved: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-1', username: 'testuser', firstName: 'Test', avatar: null },
};

describe('GET /api/reviews/product/:productId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with reviews array and stats', async () => {
    mockPrisma.productReview.findMany.mockResolvedValue([sampleReview]);
    mockPrisma.productReview.count.mockResolvedValue(1);
    mockPrisma.productReview.aggregate.mockResolvedValue({
      _avg: { rating: 4 },
      _count: { rating: 1 },
    });

    const res = await request(app).get('/api/reviews/product/prod-1');
    expect(res.status).toBe(200);
    expect(res.body.reviews).toBeDefined();
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.averageRating).toBe(4);
    expect(res.body.pagination).toBeDefined();
  });

  it('returns 200 with empty array when no reviews', async () => {
    mockPrisma.productReview.findMany.mockResolvedValue([]);
    mockPrisma.productReview.count.mockResolvedValue(0);
    mockPrisma.productReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { rating: 0 },
    });

    const res = await request(app).get('/api/reviews/product/prod-2');
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(0);
    expect(res.body.stats.averageRating).toBe(0);
    expect(res.body.stats.totalReviews).toBe(0);
  });
});

describe('GET /api/reviews/can-review/:productId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/reviews/can-review/prod-1');
    expect(res.status).toBe(401);
  });

  it('returns canReview: false when user has no purchase', async () => {
    const token = makeUserToken();
    mockPrisma.productReview.findUnique.mockResolvedValue(null);
    mockPrisma.orderItem.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/reviews/can-review/prod-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.canReview).toBe(false);
    expect(res.body.reason).toBe('NOT_PURCHASED');
  });

  it('returns canReview: false when user already reviewed', async () => {
    const token = makeUserToken();
    mockPrisma.productReview.findUnique.mockResolvedValue(sampleReview);

    const res = await request(app)
      .get('/api/reviews/can-review/prod-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.canReview).toBe(false);
    expect(res.body.reason).toBe('ALREADY_REVIEWED');
  });

  it('returns canReview: true when user has a purchase', async () => {
    const token = makeUserToken();
    mockPrisma.productReview.findUnique.mockResolvedValue(null);
    mockPrisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1', productId: 'prod-1' });

    const res = await request(app)
      .get('/api/reviews/can-review/prod-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.canReview).toBe(true);
  });
});

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/reviews').send({ productId: 'prod-1', rating: 4 });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no purchase', async () => {
    const token = makeUserToken();
    mockPrisma.productReview.findUnique.mockResolvedValue(null);
    mockPrisma.orderItem.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'prod-1', rating: 4, title: 'Great', comment: 'Really good' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PURCHASE_REQUIRED');
  });

  it('returns 409 when user already reviewed the product', async () => {
    const token = makeUserToken();
    mockPrisma.productReview.findUnique.mockResolvedValue(sampleReview);

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'prod-1', rating: 4 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REVIEW_ALREADY_EXISTS');
  });

  it('returns 201 with created review when user has purchase', async () => {
    const token = makeUserToken();
    mockPrisma.productReview.findUnique.mockResolvedValue(null);
    mockPrisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1', productId: 'prod-1' });
    mockPrisma.productReview.create.mockResolvedValue({
      ...sampleReview,
      isApproved: false,
      isVerified: true,
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'prod-1', rating: 5, title: 'Excellent', comment: 'Best ever' });
    expect(res.status).toBe(201);
    expect(res.body.review).toBeDefined();
  });

  it('returns 400 for invalid rating (out of range)', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'prod-1', rating: 6 });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/reviews/:reviewId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).put('/api/reviews/review-1').send({ rating: 3 });
    expect(res.status).toBe(401);
  });

  it('returns 200 when owner updates their review', async () => {
    const token = makeUserToken({ userId: 'user-1' });
    mockPrisma.productReview.findUnique.mockResolvedValue({
      ...sampleReview,
      userId: 'user-1',
    });
    mockPrisma.productReview.update.mockResolvedValue({
      ...sampleReview,
      rating: 3,
      isApproved: false,
    });

    const res = await request(app)
      .put('/api/reviews/review-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 3 });
    expect(res.status).toBe(200);
    expect(res.body.review).toBeDefined();
  });

  it('returns 403 when a different user tries to update', async () => {
    const token = makeUserToken({ userId: 'user-2' });
    mockPrisma.productReview.findUnique.mockResolvedValue({
      ...sampleReview,
      userId: 'user-1', // owned by user-1
    });

    const res = await request(app)
      .put('/api/reviews/review-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 2 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 404 when review does not exist', async () => {
    const token = makeUserToken({ userId: 'user-1' });
    mockPrisma.productReview.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/reviews/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 3 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/reviews/:reviewId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/reviews/review-1');
    expect(res.status).toBe(401);
  });

  it('returns 200 when owner deletes their review', async () => {
    const token = makeUserToken({ userId: 'user-1' });
    mockPrisma.productReview.findUnique.mockResolvedValue({
      ...sampleReview,
      userId: 'user-1',
    });
    mockPrisma.productReview.delete.mockResolvedValue(sampleReview);

    const res = await request(app)
      .delete('/api/reviews/review-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('returns 403 when different user tries to delete', async () => {
    const token = makeUserToken({ userId: 'user-2' });
    mockPrisma.productReview.findUnique.mockResolvedValue({
      ...sampleReview,
      userId: 'user-1',
    });

    const res = await request(app)
      .delete('/api/reviews/review-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when review does not exist', async () => {
    const token = makeUserToken({ userId: 'user-1' });
    mockPrisma.productReview.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/reviews/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
