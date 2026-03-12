import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma.js', () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userProfile: { findUnique: vi.fn(), delete: vi.fn() },
    order: { findMany: vi.fn() },
    refreshToken: { deleteMany: vi.fn() },
    favorite: { findMany: vi.fn() },
    productReview: { findMany: vi.fn() },
    userCollection: { findMany: vi.fn() },
    tradeOffer: { findMany: vi.fn() },
  },
}));

vi.mock('../services/email.js', () => ({
  sendGdprExportEmail: vi.fn().mockResolvedValue(true),
  sendAccountDeletionEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
  },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
}));

// gdpr.ts uses the prisma singleton and utils/auth.js verifyPassword
// Also need to mock @prisma/client since auth.ts uses it
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    PrismaClient: vi.fn().mockImplementation(function () {
      return { refreshToken: { deleteMany: vi.fn() } };
    }),
  };
});

import { createApp } from '../app.js';
import { generateAccessToken } from '../utils/auth.js';
import prisma from '../lib/prisma.js';

const mockPrisma = prisma as any;
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
  bio: null,
  isVerified: true,
  isAdmin: false,
  password: '$2b$12$hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
  marketingConsent: false,
  marketingConsentAt: null,
  analyticsConsent: false,
  analyticsConsentAt: null,
  privacyPolicyVersion: null,
  privacyAcceptedAt: null,
  deletionRequestedAt: null,
  deletionScheduledAt: null,
};

describe('GET /api/gdpr/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/gdpr/export');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user data export', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);
    mockPrisma.userProfile.findUnique.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.favorite.findMany.mockResolvedValue([]);
    mockPrisma.productReview.findMany.mockResolvedValue([]);
    mockPrisma.userCollection.findMany.mockResolvedValue([]);
    mockPrisma.tradeOffer.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/gdpr/export').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.exportDate).toBeDefined();
    expect(res.body.exportVersion).toBe('1.0');
    expect(res.body.orders).toBeDefined();
  });

  it('returns 404 when user not found', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/gdpr/export').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/gdpr/delete-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/gdpr/delete-request')
      .send({ password: 'MyPassword1!' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when password is missing', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .post('/api/gdpr/delete-request')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when password is incorrect', async () => {
    const bcryptjs = await import('bcryptjs');
    vi.mocked(bcryptjs.default.compare).mockResolvedValueOnce(false as any);
    vi.mocked(bcryptjs.compare).mockResolvedValueOnce(false as any);

    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);

    const res = await request(app)
      .post('/api/gdpr/delete-request')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  it('returns 200 and schedules deletion for valid password', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);
    mockPrisma.user.update.mockResolvedValue({
      ...sampleUser,
      deletionRequestedAt: new Date(),
      deletionScheduledAt: new Date(Date.now() + 30 * 86400000),
    });

    const res = await request(app)
      .post('/api/gdpr/delete-request')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'MyPassword1!' });
    expect(res.status).toBe(200);
    expect(res.body.scheduledDeletionDate).toBeDefined();
    expect(res.body.message).toBeDefined();
  });
});

describe('POST /api/gdpr/cancel-delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/gdpr/cancel-delete');
    expect(res.status).toBe(401);
  });

  it('returns 400 when no delete request is pending', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue({
      ...sampleUser,
      deletionRequestedAt: null,
    });

    const res = await request(app)
      .post('/api/gdpr/cancel-delete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_DELETE_REQUEST');
  });

  it('returns 200 when cancel is successful', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue({
      ...sampleUser,
      deletionRequestedAt: new Date(),
      deletionScheduledAt: new Date(),
    });
    mockPrisma.user.update.mockResolvedValue({
      ...sampleUser,
      deletionRequestedAt: null,
      deletionScheduledAt: null,
    });

    const res = await request(app)
      .post('/api/gdpr/cancel-delete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});

describe('DELETE /api/gdpr/delete-now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .delete('/api/gdpr/delete-now')
      .send({ password: 'Pass', confirmation: 'SUPPRIMER MON COMPTE' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when confirmation text is missing', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .delete('/api/gdpr/delete-now')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Password1!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when confirmation text is wrong', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .delete('/api/gdpr/delete-now')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Password1!', confirmation: 'WRONG TEXT' });
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is admin', async () => {
    const token = makeUserToken({ isAdmin: true });
    mockPrisma.user.findUnique.mockResolvedValue({ ...sampleUser, isAdmin: true });

    const res = await request(app)
      .delete('/api/gdpr/delete-now')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Password1!', confirmation: 'SUPPRIMER MON COMPTE' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ADMIN_CANNOT_DELETE');
  });

  it('returns 401 when password is incorrect', async () => {
    const bcryptjs = await import('bcryptjs');
    vi.mocked(bcryptjs.default.compare).mockResolvedValueOnce(false as any);
    vi.mocked(bcryptjs.compare).mockResolvedValueOnce(false as any);

    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);

    const res = await request(app)
      .delete('/api/gdpr/delete-now')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'WrongPass', confirmation: 'SUPPRIMER MON COMPTE' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  it('returns 200 on successful deletion', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);
    mockPrisma.user.delete.mockResolvedValue(sampleUser);
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .delete('/api/gdpr/delete-now')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Password1!', confirmation: 'SUPPRIMER MON COMPTE' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});

describe('GET /api/gdpr/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/gdpr/consent');
    expect(res.status).toBe(401);
  });

  it('returns 200 with consent data', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue({
      marketingConsent: false,
      marketingConsentAt: null,
      analyticsConsent: true,
      analyticsConsentAt: new Date(),
      privacyPolicyVersion: '1.0',
      privacyAcceptedAt: new Date(),
    });

    const res = await request(app).get('/api/gdpr/consent').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.consent).toBeDefined();
    expect(res.body.consent.marketing).toBeDefined();
    expect(res.body.consent.analytics).toBeDefined();
  });
});

describe('PUT /api/gdpr/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).put('/api/gdpr/consent').send({ marketing: true });
    expect(res.status).toBe(401);
  });

  it('returns 200 when consent is updated', async () => {
    const token = makeUserToken();
    mockPrisma.user.update.mockResolvedValue({
      marketingConsent: true,
      marketingConsentAt: new Date(),
      analyticsConsent: false,
      analyticsConsentAt: null,
      privacyPolicyVersion: null,
      privacyAcceptedAt: null,
    });

    const res = await request(app)
      .put('/api/gdpr/consent')
      .set('Authorization', `Bearer ${token}`)
      .send({ marketing: true });
    expect(res.status).toBe(200);
    expect(res.body.consent).toBeDefined();
  });

  it('returns 400 when no data provided', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .put('/api/gdpr/consent')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_DATA');
  });
});

describe('GET /api/gdpr/deletion-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/gdpr/deletion-status');
    expect(res.status).toBe(401);
  });

  it('returns 200 with deletion status (no pending deletion)', async () => {
    const token = makeUserToken();
    mockPrisma.user.findUnique.mockResolvedValue({
      deletionRequestedAt: null,
      deletionScheduledAt: null,
    });

    const res = await request(app)
      .get('/api/gdpr/deletion-status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deletionPending).toBe(false);
  });

  it('returns 200 with deletionPending: true when deletion is scheduled', async () => {
    const token = makeUserToken();
    const scheduledDate = new Date(Date.now() + 30 * 86400000);
    mockPrisma.user.findUnique.mockResolvedValue({
      deletionRequestedAt: new Date(),
      deletionScheduledAt: scheduledDate,
    });

    const res = await request(app)
      .get('/api/gdpr/deletion-status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deletionPending).toBe(true);
    expect(res.body.scheduledAt).toBeDefined();
  });
});
