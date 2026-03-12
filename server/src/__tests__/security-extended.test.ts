import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  injectionProtection,
  validateInput,
  dynamicUserRateLimit,
  corsOptions,
  helmetConfig,
  authLimiter,
  strictAuthLimiter,
  apiLimiter,
  authenticatedApiLimiter,
  adminLimiter,
  uploadLimiter,
  checkoutLimiter,
  cardSearchLimiter,
} from '../middleware/security.js';

function makeReq(overrides: Partial<any> = {}): any {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    path: '/api/test',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    user: undefined,
    ...overrides,
  };
}

function makeRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  return res;
}

describe('middleware/security.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── injectionProtection ──────────────────────────────────────────────────

  describe('injectionProtection', () => {
    it('calls next() for clean body', () => {
      const req = makeReq({ body: { name: 'Alice', email: 'alice@test.com' } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 400 for body with <script> tag', () => {
      const req = makeReq({ body: { input: '<script>alert("xss")</script>' } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SUSPICIOUS_CONTENT' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for body with "union select" SQL injection', () => {
      const req = makeReq({ body: { search: 'test union select * from users' } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for body with "drop table"', () => {
      const req = makeReq({ body: { data: 'drop table users' } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for body with "javascript:" protocol', () => {
      const req = makeReq({ body: { url: 'javascript:alert(1)' } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for query params with injection', () => {
      const req = makeReq({ query: { search: '<script>xss</script>' } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('detects injection in nested object', () => {
      const req = makeReq({ body: { user: { name: '<script>hack</script>' } } });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('calls next() for empty body', () => {
      const req = makeReq({ body: {} });
      const res = makeRes();
      const next = vi.fn();
      injectionProtection(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── validateInput ────────────────────────────────────────────────────────

  describe('validateInput', () => {
    it('calls next() when no content-type header', () => {
      const req = makeReq({ headers: {} });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next() for application/json content-type', () => {
      const req = makeReq({ headers: { 'content-type': 'application/json' } });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 413 when content-length exceeds 1MB', () => {
      const req = makeReq({
        headers: { 'content-length': String(1024 * 1024 + 1) },
      });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYLOAD_TOO_LARGE' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 413 for exactly 1MB + 1 byte', () => {
      const req = makeReq({ headers: { 'content-length': String(1048577) } });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('returns 415 for non-JSON content-type', () => {
      const req = makeReq({
        headers: { 'content-type': 'text/html', 'content-length': '100' },
      });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(res.status).toHaveBeenCalledWith(415);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNSUPPORTED_MEDIA_TYPE' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 415 for multipart/form-data', () => {
      const req = makeReq({
        headers: { 'content-type': 'multipart/form-data', 'content-length': '100' },
      });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(res.status).toHaveBeenCalledWith(415);
    });

    it('calls next() for small JSON payload', () => {
      const req = makeReq({
        headers: { 'content-type': 'application/json', 'content-length': '200' },
      });
      const res = makeRes();
      const next = vi.fn();
      validateInput(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── dynamicUserRateLimit ─────────────────────────────────────────────────

  describe('dynamicUserRateLimit', () => {
    it('calls next() on first request', () => {
      const limiter = dynamicUserRateLimit(5, 60000);
      const req = makeReq({ ip: '10.0.0.100' });
      const res = makeRes();
      const next = vi.fn();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next() within the limit', () => {
      const limiter = dynamicUserRateLimit(5, 60000);
      const req = makeReq({ ip: '10.0.0.101' });
      const res = makeRes();
      for (let i = 0; i < 4; i++) {
        const next = vi.fn();
        limiter(req, res, next);
        expect(next).toHaveBeenCalledOnce();
      }
    });

    it('returns 429 when rate limit is exceeded', () => {
      const limiter = dynamicUserRateLimit(2, 60000);
      const req = makeReq({ ip: '10.0.0.200' });
      const res = makeRes();

      const next1 = vi.fn();
      limiter(req, res, next1);
      expect(next1).toHaveBeenCalledOnce();

      const next2 = vi.fn();
      limiter(req, res, next2);
      expect(next2).toHaveBeenCalledOnce();

      // 3rd request exceeds limit of 2
      const next3 = vi.fn();
      limiter(req, res, next3);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' })
      );
      expect(next3).not.toHaveBeenCalled();
    });

    it('sets Retry-After header when limit exceeded', () => {
      const limiter = dynamicUserRateLimit(1, 60000);
      const req = makeReq({ ip: '10.0.0.201' });
      const res = makeRes();

      const next1 = vi.fn();
      limiter(req, res, next1);

      const next2 = vi.fn();
      limiter(req, res, next2);
      expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('uses userId as key when user is authenticated', () => {
      const limiter = dynamicUserRateLimit(1, 60000);
      const req = makeReq({
        ip: '10.0.0.202',
        user: { userId: 'user-rate-test', email: 'r@test.com', username: 'rt', isAdmin: false },
      });
      const res = makeRes();
      const next1 = vi.fn();
      limiter(req, res, next1);
      expect(next1).toHaveBeenCalledOnce();
    });
  });

  // ─── corsOptions ──────────────────────────────────────────────────────────

  describe('corsOptions', () => {
    it('corsOptions is defined with expected properties', () => {
      expect(corsOptions).toBeDefined();
      expect(corsOptions.credentials).toBe(true);
      expect(corsOptions.methods).toContain('GET');
      expect(corsOptions.methods).toContain('POST');
      expect(corsOptions.methods).toContain('PUT');
      expect(corsOptions.methods).toContain('DELETE');
    });

    it('includes localhost origins by default', () => {
      const origins = corsOptions.origin as string[];
      expect(origins.some((o) => o.includes('localhost'))).toBe(true);
    });
  });

  // ─── helmetConfig ─────────────────────────────────────────────────────────

  describe('helmetConfig', () => {
    it('helmetConfig is defined', () => {
      expect(helmetConfig).toBeDefined();
    });

    it('helmetConfig is a function (middleware)', () => {
      expect(typeof helmetConfig).toBe('function');
    });
  });

  // ─── rate limiter exports ─────────────────────────────────────────────────

  describe('rate limiter exports', () => {
    it('authLimiter is defined', () => {
      expect(authLimiter).toBeDefined();
    });

    it('strictAuthLimiter is defined', () => {
      expect(strictAuthLimiter).toBeDefined();
    });

    it('apiLimiter is defined', () => {
      expect(apiLimiter).toBeDefined();
    });

    it('authenticatedApiLimiter is defined', () => {
      expect(authenticatedApiLimiter).toBeDefined();
    });

    it('adminLimiter is defined', () => {
      expect(adminLimiter).toBeDefined();
    });

    it('uploadLimiter is defined', () => {
      expect(uploadLimiter).toBeDefined();
    });

    it('checkoutLimiter is defined', () => {
      expect(checkoutLimiter).toBeDefined();
    });

    it('cardSearchLimiter is defined', () => {
      expect(cardSearchLimiter).toBeDefined();
    });
  });
});
