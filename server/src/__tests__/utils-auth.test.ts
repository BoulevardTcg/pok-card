import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Mock @prisma/client since utils/auth.ts creates its own new PrismaClient()
const { mockRefreshToken } = vi.hoisted(() => ({
  mockRefreshToken: {
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    create: vi.fn().mockResolvedValue({
      id: 'token-id-1',
      token: 'refresh-tok',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
    findFirst: vi.fn(),
  },
}));

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    PrismaClient: vi.fn().mockImplementation(function () {
      return { refreshToken: mockRefreshToken };
    }),
  };
});

vi.mock('../lib/prisma.js', () => ({
  default: {
    refreshToken: mockRefreshToken,
  },
}));

import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../utils/auth.js';

describe('utils/auth.ts', () => {
  beforeAll(() => {
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-min-64-chars-for-tests-only-do-not-use-in-production-1234';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshToken.findFirst.mockReset();
    mockRefreshToken.deleteMany.mockResolvedValue({ count: 1 });
    mockRefreshToken.create.mockResolvedValue({
      id: 'token-id-1',
      token: 'refresh-tok',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  });

  // ─── hashPassword / verifyPassword ─────────────────────────────────────────

  describe('hashPassword', () => {
    it('hashes a password and returns a bcrypt string', async () => {
      const hash = await hashPassword('MySecurePass1!');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('MySecurePass1!');
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('produces a different hash each call (salt)', async () => {
      const hash1 = await hashPassword('SamePassword1!');
      const hash2 = await hashPassword('SamePassword1!');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const hash = await hashPassword('CorrectPass1!');
      const result = await verifyPassword('CorrectPass1!', hash);
      expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await hashPassword('CorrectPass1!');
      const result = await verifyPassword('WrongPass99!', hash);
      expect(result).toBe(false);
    });
  });

  // ─── generateAccessToken / verifyAccessToken ───────────────────────────────

  describe('generateAccessToken', () => {
    it('returns a JWT string', () => {
      const token = generateAccessToken({
        userId: 'u1',
        email: 'a@b.com',
        username: 'alice',
        isAdmin: false,
      });
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('generates different tokens for different users', () => {
      const t1 = generateAccessToken({
        userId: 'u1',
        email: 'a@b.com',
        username: 'alice',
        isAdmin: false,
      });
      const t2 = generateAccessToken({
        userId: 'u2',
        email: 'b@b.com',
        username: 'bob',
        isAdmin: true,
      });
      expect(t1).not.toBe(t2);
    });
  });

  describe('verifyAccessToken', () => {
    it('decodes a valid access token with correct payload', () => {
      const payload = {
        userId: 'u42',
        email: 'test@example.com',
        username: 'testuser',
        isAdmin: false,
      };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('u42');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.username).toBe('testuser');
      expect(decoded.isAdmin).toBe(false);
    });

    it('throws on invalid token string', () => {
      expect(() => verifyAccessToken('not.a.valid.jwt')).toThrow();
    });

    it('throws on tampered token', () => {
      const token = generateAccessToken({
        userId: 'u1',
        email: 'a@b.com',
        username: 'alice',
        isAdmin: false,
      });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('includes isAdmin=true when set', () => {
      const token = generateAccessToken({
        userId: 'admin-1',
        email: 'admin@test.com',
        username: 'admin',
        isAdmin: true,
      });
      const decoded = verifyAccessToken(token);
      expect(decoded.isAdmin).toBe(true);
    });
  });

  // ─── generateRefreshToken ──────────────────────────────────────────────────

  describe('generateRefreshToken', () => {
    it('calls deleteMany (old tokens) then create, returns token string', async () => {
      const token = await generateRefreshToken('user-1');
      expect(typeof token).toBe('string');
      expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockRefreshToken.create).toHaveBeenCalledOnce();
      const createCall = mockRefreshToken.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe('user-1');
      expect(createCall.data.token).toBe(token);
    });

    it('throws if JWT_REFRESH_SECRET is not set', async () => {
      const saved = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      await expect(generateRefreshToken('user-1')).rejects.toThrow('JWT_REFRESH_SECRET');
      process.env.JWT_REFRESH_SECRET = saved;
    });
  });

  // ─── verifyRefreshToken ────────────────────────────────────────────────────

  describe('verifyRefreshToken', () => {
    it('returns payload when token is found in DB', async () => {
      const refreshToken = await generateRefreshToken('user-1');

      mockRefreshToken.findFirst.mockResolvedValue({
        id: 'db-token-1',
        userId: 'user-1',
        token: refreshToken,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const payload = await verifyRefreshToken(refreshToken);
      expect(payload.userId).toBe('user-1');
    });

    it('throws when token is not found in DB (revoked)', async () => {
      const refreshToken = await generateRefreshToken('user-1');
      mockRefreshToken.findFirst.mockResolvedValue(null);

      await expect(verifyRefreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('throws on an arbitrary invalid token string', async () => {
      await expect(verifyRefreshToken('totally-invalid-token')).rejects.toThrow();
    });

    it('throws if JWT_REFRESH_SECRET is not set during verification', async () => {
      const saved = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      await expect(verifyRefreshToken('any-token')).rejects.toThrow('JWT_REFRESH_SECRET');
      process.env.JWT_REFRESH_SECRET = saved;
    });
  });

  // ─── revokeRefreshToken ────────────────────────────────────────────────────

  describe('revokeRefreshToken', () => {
    it('calls prisma.refreshToken.deleteMany with the token', async () => {
      await revokeRefreshToken('some-refresh-token');
      expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
      });
    });
  });

  // ─── revokeAllUserTokens ───────────────────────────────────────────────────

  describe('revokeAllUserTokens', () => {
    it('calls prisma.refreshToken.deleteMany with the userId', async () => {
      await revokeAllUserTokens('user-99');
      expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-99' },
      });
    });
  });
});
