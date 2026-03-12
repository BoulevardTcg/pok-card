import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Instance partagée entre lib/prisma.js singleton et new PrismaClient() des routes
const { mockPrismaInstance } = vi.hoisted(() => ({
  mockPrismaInstance: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    userProfile: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), create: vi.fn() },
    favorite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    order: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    refreshToken: { deleteMany: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({ default: mockPrismaInstance }));

// users.ts uses new PrismaClient() — retourner la même instance partagée
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    PrismaClient: vi.fn().mockImplementation(function () {
      return mockPrismaInstance;
    }),
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
  compare: vi.fn().mockResolvedValue(true),
}));

import { createApp } from '../app.js';
import { generateAccessToken } from '../utils/auth.js';

const mockPrisma = mockPrismaInstance;
const mockFavorite = mockPrismaInstance.favorite;
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

const sampleUser = {
  id: 'user-1',
  email: 'user@test.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  bio: null,
  isAdmin: false,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: null,
  _count: { favorites: 0, orders: 0, tradeOffers: 0, tradeOffersReceived: 0 },
};

const sampleOrder = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  status: 'CONFIRMED',
  totalCents: 5000,
  currency: 'EUR',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
};

describe('GET /api/users/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user profile when authenticated', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('user-1');
  });

  it('returns 404 when user is not found', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/users/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).put('/api/users/profile').send({ firstName: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with updated user', async () => {
    const token = makeUserToken();
    mockPrisma.user.update.mockResolvedValue({ ...sampleUser, firstName: 'NewName' });

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'NewName' });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.message).toBeDefined();
  });
});

describe('PUT /api/users/profile/extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).put('/api/users/profile/extended').send({ phone: '0612345678' });
    expect(res.status).toBe(401);
  });

  it('returns 200 when creating new profile', async () => {
    const token = makeUserToken();
    mockPrisma.userProfile.findUnique.mockResolvedValue(null);
    mockPrisma.userProfile.create.mockResolvedValue({
      userId: 'user-1',
      phone: '0612345678',
      address: null,
      city: null,
      postalCode: null,
      country: null,
      birthDate: null,
    });

    const res = await request(app)
      .put('/api/users/profile/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0612345678' });
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
  });

  it('returns 200 when updating existing profile', async () => {
    const token = makeUserToken();
    const existingProfile = { userId: 'user-1', phone: '0600000000' };
    mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);
    mockPrisma.userProfile.update.mockResolvedValue({ ...existingProfile, phone: '0612345678' });

    const res = await request(app)
      .put('/api/users/profile/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0612345678' });
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/users/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .put('/api/users/change-password')
      .send({ currentPassword: 'old', newPassword: 'New1234!' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when new password too short', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .put('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPassword1!', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when current password is incorrect', async () => {
    const bcryptjs = await import('bcryptjs');
    vi.mocked(bcryptjs.default.compare).mockResolvedValueOnce(false as any);
    vi.mocked(bcryptjs.compare).mockResolvedValueOnce(false as any);

    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue({ ...sampleUser, password: '$2b$12$hashed' });

    const res = await request(app)
      .put('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPass1!', newPassword: 'NewPassword1!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('returns 200 when password change succeeds', async () => {
    const bcryptjs = await import('bcryptjs');
    vi.mocked(bcryptjs.default.compare).mockResolvedValue(true as any);
    vi.mocked(bcryptjs.compare).mockResolvedValue(true as any);

    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue({ ...sampleUser, password: '$2b$12$hashed' });
    mockPrisma.user.update.mockResolvedValue(sampleUser);
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .put('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPassword1!', newPassword: 'NewPassword1!' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});

describe('GET /api/users/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/users/favorites');
    expect(res.status).toBe(401);
  });

  it('returns 200 with favorites array', async () => {
    const token = makeUserToken();
    mockFavorite.findMany.mockResolvedValue([]);
    mockFavorite.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/users/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.favorites).toBeDefined();
    expect(Array.isArray(res.body.favorites)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('POST /api/users/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/users/favorites')
      .send({ cardId: 'card-1', cardName: 'Pikachu', cardImage: 'img.jpg', cardSet: 'Base Set' });
    expect(res.status).toBe(401);
  });

  it('returns 201 when favorite is created', async () => {
    const token = makeUserToken();
    mockFavorite.findUnique.mockResolvedValue(null);
    mockFavorite.create.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      cardId: 'card-1',
      cardName: 'Pikachu',
      cardImage: 'img.jpg',
      cardSet: 'Base Set',
    });

    const res = await request(app)
      .post('/api/users/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ cardId: 'card-1', cardName: 'Pikachu', cardImage: 'img.jpg', cardSet: 'Base Set' });
    expect(res.status).toBe(201);
    expect(res.body.favorite).toBeDefined();
  });

  it('returns 409 when card is already in favorites', async () => {
    const token = makeUserToken();
    mockFavorite.findUnique.mockResolvedValue({ id: 'fav-1', userId: 'user-1', cardId: 'card-1' });

    const res = await request(app)
      .post('/api/users/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ cardId: 'card-1', cardName: 'Pikachu', cardImage: 'img.jpg', cardSet: 'Base Set' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CARD_ALREADY_FAVORITE');
  });
});

describe('DELETE /api/users/favorites/:cardId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/users/favorites/card-1');
    expect(res.status).toBe(401);
  });

  it('returns 200 when favorite is deleted', async () => {
    const token = makeUserToken();
    mockFavorite.findUnique.mockResolvedValue({ id: 'fav-1', userId: 'user-1', cardId: 'card-1' });
    mockFavorite.delete.mockResolvedValue({ id: 'fav-1' });

    const res = await request(app)
      .delete('/api/users/favorites/card-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('returns 404 when favorite does not exist', async () => {
    const token = makeUserToken();
    mockFavorite.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/users/favorites/card-404')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/users/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/users/orders');
    expect(res.status).toBe(401);
  });

  it('returns 200 with paginated orders', async () => {
    const token = makeUserToken();
    mockPrisma.order.findMany.mockResolvedValue([sampleOrder]);
    mockPrisma.order.count.mockResolvedValue(1);

    const res = await request(app).get('/api/users/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toBeDefined();
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('GET /api/users/orders/:orderId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/users/orders/order-1');
    expect(res.status).toBe(401);
  });

  it('returns 200 with owned order', async () => {
    const token = makeUserToken({ userId: 'user-1' });
    mockPrisma.order.findFirst.mockResolvedValue(sampleOrder);

    const res = await request(app)
      .get('/api/users/orders/order-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
  });

  it('returns 404 when order belongs to another user', async () => {
    const token = makeUserToken({ userId: 'user-2' });
    mockPrisma.order.findFirst.mockResolvedValue(null); // no order with userId=user-2 and orderId=order-1

    const res = await request(app)
      .get('/api/users/orders/order-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
