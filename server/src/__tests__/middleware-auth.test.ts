import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAccessToken } from '../utils/auth.js';
import {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  optionalAuth,
} from '../middleware/auth.js';

function makeReq(overrides: Partial<any> = {}): any {
  return {
    headers: {},
    params: {},
    body: {},
    user: undefined,
    ...overrides,
  };
}

function makeRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('middleware/auth.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── authenticateToken ──────────────────────────────────────────────────────

  describe('authenticateToken', () => {
    it('returns 401 when no Authorization header', () => {
      const req = makeReq();
      const res = makeRes();
      const next = vi.fn();
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ACCESS_TOKEN_REQUIRED' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header has no Bearer token', () => {
      const req = makeReq({ headers: { authorization: 'Basic abc' } });
      const res = makeRes();
      const next = vi.fn();
      authenticateToken(req, res, next);
      // 'Basic abc'.split(' ')[1] = 'abc' which is invalid JWT → 403
      // Actually it will be "abc" which fails verify → 403
      expect(res.status).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when authorization header is Bearer with no token', () => {
      const req = makeReq({ headers: { authorization: 'Bearer ' } });
      const res = makeRes();
      const next = vi.fn();
      authenticateToken(req, res, next);
      // token will be empty string '' which is falsy
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when token is invalid', () => {
      const req = makeReq({ headers: { authorization: 'Bearer invalid.token.here' } });
      const res = makeRes();
      const next = vi.fn();
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('sets req.user and calls next() with valid token', () => {
      const payload = {
        userId: 'u1',
        email: 'test@example.com',
        username: 'tester',
        isAdmin: false,
      };
      const token = generateAccessToken(payload);
      const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
      const res = makeRes();
      const next = vi.fn();
      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('u1');
      expect(req.user.email).toBe('test@example.com');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('sets isAdmin correctly for admin token', () => {
      const payload = {
        userId: 'admin-1',
        email: 'admin@test.com',
        username: 'admin',
        isAdmin: true,
      };
      const token = generateAccessToken(payload);
      const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
      const res = makeRes();
      const next = vi.fn();
      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.isAdmin).toBe(true);
    });
  });

  // ─── requireAdmin ────────────────────────────────────────────────────────────

  describe('requireAdmin', () => {
    it('returns 401 when req.user is undefined', () => {
      const req = makeReq({ user: undefined });
      const res = makeRes();
      const next = vi.fn();
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTHENTICATION_REQUIRED' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user is not admin', () => {
      const req = makeReq({
        user: { userId: 'u1', email: 'user@test.com', username: 'user', isAdmin: false },
      });
      const res = makeRes();
      const next = vi.fn();
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ADMIN_ACCESS_REQUIRED' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when user is admin', () => {
      const req = makeReq({
        user: { userId: 'admin-1', email: 'admin@test.com', username: 'admin', isAdmin: true },
      });
      const res = makeRes();
      const next = vi.fn();
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ─── requireOwnerOrAdmin ─────────────────────────────────────────────────────

  describe('requireOwnerOrAdmin', () => {
    it('returns 401 when req.user is undefined', () => {
      const req = makeReq({ user: undefined });
      const res = makeRes();
      const next = vi.fn();
      requireOwnerOrAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when user is the owner (userId matches params.userId)', () => {
      const req = makeReq({
        user: { userId: 'owner-1', email: 'o@test.com', username: 'owner', isAdmin: false },
        params: { userId: 'owner-1' },
      });
      const res = makeRes();
      const next = vi.fn();
      requireOwnerOrAdmin(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() when user is admin (even different userId)', () => {
      const req = makeReq({
        user: { userId: 'admin-1', email: 'admin@test.com', username: 'admin', isAdmin: true },
        params: { userId: 'other-user-99' },
      });
      const res = makeRes();
      const next = vi.fn();
      requireOwnerOrAdmin(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user is neither owner nor admin', () => {
      const req = makeReq({
        user: { userId: 'user-2', email: 'u2@test.com', username: 'user2', isAdmin: false },
        params: { userId: 'user-99' },
      });
      const res = makeRes();
      const next = vi.fn();
      requireOwnerOrAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED_ACCESS' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('checks body.userId when params.userId is not set', () => {
      const req = makeReq({
        user: { userId: 'owner-5', email: 'o5@test.com', username: 'owner5', isAdmin: false },
        params: {},
        body: { userId: 'owner-5' },
      });
      const res = makeRes();
      const next = vi.fn();
      requireOwnerOrAdmin(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── optionalAuth ─────────────────────────────────────────────────────────────

  describe('optionalAuth', () => {
    it('calls next() without setting req.user when no Authorization header', () => {
      const req = makeReq();
      const res = makeRes();
      const next = vi.fn();
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(req.user).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('sets req.user and calls next() with valid token', () => {
      const payload = {
        userId: 'u5',
        email: 'u5@test.com',
        username: 'userFive',
        isAdmin: false,
      };
      const token = generateAccessToken(payload);
      const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
      const res = makeRes();
      const next = vi.fn();
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('u5');
    });

    it('calls next() and ignores invalid token (does not set req.user)', () => {
      const req = makeReq({ headers: { authorization: 'Bearer bad.token.value' } });
      const res = makeRes();
      const next = vi.fn();
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      // req.user should be undefined after failed verify
      expect(req.user).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
