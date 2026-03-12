import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

// twoFactor.ts uses new PrismaClient() directly
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    PrismaClient: vi.fn().mockImplementation(function () {
      return { user: mockUser };
    }),
  };
});

vi.mock('../lib/prisma.js', () => ({
  default: {
    user: mockUser,
  },
}));

// Mock otpauth TOTP — utiliser des fonctions régulières car appelées avec new
vi.mock('otpauth', () => {
  const fromBase32 = vi.fn().mockReturnValue({ base32: 'JBSWY3DPEHPK3PXP' });

  function MockSecret() {
    return { base32: 'JBSWY3DPEHPK3PXP' };
  }
  (MockSecret as any).fromBase32 = fromBase32;

  function MockTOTP(this: any, { secret }: any) {
    this.secret = secret || { base32: 'JBSWY3DPEHPK3PXP' };
    this.toString = vi
      .fn()
      .mockReturnValue('otpauth://totp/BoulevardTCG:test@test.com?secret=JBSWY3DPEHPK3PXP');
    this.validate = vi.fn().mockReturnValue(0); // 0 = valid (null = invalid)
  }

  return {
    TOTP: MockTOTP,
    Secret: MockSecret,
  };
});

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
  },
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

const { mockBcryptCompare, mockBcryptHash } = vi.hoisted(() => ({
  mockBcryptCompare: vi.fn().mockResolvedValue(true),
  mockBcryptHash: vi.fn().mockResolvedValue('$2b$12$hashed'),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: mockBcryptCompare, hash: mockBcryptHash },
  compare: mockBcryptCompare,
  hash: mockBcryptHash,
}));

import { createApp } from '../app.js';
import { generateAccessToken } from '../utils/auth.js';

const app = createApp();

function makeUserToken(userId = 'user-1', isAdmin = false) {
  return generateAccessToken({
    userId,
    email: 'user@test.com',
    username: 'testuser',
    isAdmin,
  });
}

const sampleUserNoTwoFa = {
  id: 'user-1',
  email: 'user@test.com',
  username: 'testuser',
  password: '$2b$12$hashed',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  isAdmin: false,
};

const sampleUserWith2Fa = {
  ...sampleUserNoTwoFa,
  twoFactorEnabled: true,
  twoFactorSecret: 'JBSWY3DPEHPK3PXP',
};

describe('GET /api/2fa/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/2fa/status');
    expect(res.status).toBe(401);
  });

  it('returns 200 with twoFactorEnabled: false', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue({ twoFactorEnabled: false });

    const res = await request(app).get('/api/2fa/status').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.twoFactorEnabled).toBe(false);
  });

  it('returns 200 with twoFactorEnabled: true', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue({ twoFactorEnabled: true });

    const res = await request(app).get('/api/2fa/status').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.twoFactorEnabled).toBe(true);
  });

  it('returns 404 when user not found', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/2fa/status').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/2fa/setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/2fa/setup');
    expect(res.status).toBe(401);
  });

  it('returns 200 with secret and qrCode', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserNoTwoFa);
    mockUser.update.mockResolvedValue({
      ...sampleUserNoTwoFa,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    });

    const res = await request(app).post('/api/2fa/setup').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.secret).toBeDefined();
    expect(res.body.qrCode).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 when 2FA is already enabled', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserWith2Fa);

    const res = await request(app).post('/api/2fa/setup').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('2FA_ALREADY_ENABLED');
  });

  it('returns 404 when user not found', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/2fa/setup').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/2fa/enable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/2fa/enable').send({ code: '123456' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when code is missing', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .post('/api/2fa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_REQUIRED');
  });

  it('returns 400 when 2FA not configured (no secret)', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue({ ...sampleUserNoTwoFa, twoFactorSecret: null });

    const res = await request(app)
      .post('/api/2fa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('2FA_NOT_CONFIGURED');
  });

  it('returns 200 when valid code provided', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue({
      ...sampleUserNoTwoFa,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    });
    mockUser.update.mockResolvedValue({ ...sampleUserNoTwoFa, twoFactorEnabled: true });

    const res = await request(app)
      .post('/api/2fa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.twoFactorEnabled).toBe(true);
  });
});

describe('POST /api/2fa/disable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/2fa/disable')
      .send({ code: '123456', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when code and password are missing', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .post('/api/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CREDENTIALS_REQUIRED');
  });

  it('returns 400 when 2FA is not enabled', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserNoTwoFa);

    const res = await request(app)
      .post('/api/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '123456', password: 'Password1!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('2FA_NOT_ENABLED');
  });

  it('returns 401 when password is incorrect', async () => {
    mockBcryptCompare.mockResolvedValueOnce(false as any);

    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserWith2Fa);

    const res = await request(app)
      .post('/api/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '123456', password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  it('returns 200 when 2FA disabled successfully', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserWith2Fa);
    mockUser.update.mockResolvedValue({
      ...sampleUserWith2Fa,
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    const res = await request(app)
      .post('/api/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '123456', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.twoFactorEnabled).toBe(false);
  });
});

describe('POST /api/2fa/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when email and code are missing', async () => {
    const token = makeUserToken();
    const res = await request(app)
      .post('/api/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CREDENTIALS_REQUIRED');
  });

  it('returns 400 when user 2FA is not enabled', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserNoTwoFa);

    const res = await request(app)
      .post('/api/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'user@test.com', code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('2FA_NOT_ENABLED');
  });

  it('returns 200 when valid code is provided', async () => {
    const token = makeUserToken();
    mockUser.findUnique.mockResolvedValue(sampleUserWith2Fa);

    const res = await request(app)
      .post('/api/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'user@test.com', code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });
});
