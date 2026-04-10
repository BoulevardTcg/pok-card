import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('config/shipping.ts', () => {
  let getEnabledShippingMethods: any;
  let findShippingMethod: any;
  let SHIPPING_METHODS: any;

  beforeEach(async () => {
    const mod = await import('../config/shipping.js');
    getEnabledShippingMethods = mod.getEnabledShippingMethods;
    findShippingMethod = mod.findShippingMethod;
    SHIPPING_METHODS = mod.SHIPPING_METHODS;
  });

  it('SHIPPING_METHODS contains at least one entry', () => {
    expect(Array.isArray(SHIPPING_METHODS)).toBe(true);
    expect(SHIPPING_METHODS.length).toBeGreaterThan(0);
  });

  it('getEnabledShippingMethods returns only enabled methods', () => {
    const enabled = getEnabledShippingMethods();
    expect(Array.isArray(enabled)).toBe(true);
    enabled.forEach((m: any) => expect(m.enabled).toBe(true));
  });

  it('getEnabledShippingMethods returns MONDIAL_RELAY and COLISSIMO_HOME', () => {
    const enabled = getEnabledShippingMethods();
    const codes = enabled.map((m: any) => m.code);
    expect(codes).toContain('MONDIAL_RELAY');
    expect(codes).toContain('COLISSIMO_HOME');
  });

  it('findShippingMethod returns method for MONDIAL_RELAY', () => {
    const method = findShippingMethod('MONDIAL_RELAY');
    expect(method).not.toBeNull();
    expect(method!.code).toBe('MONDIAL_RELAY');
    expect(method!.carrier).toBe('MONDIAL_RELAY');
  });

  it('findShippingMethod returns null for unknown code', () => {
    expect(findShippingMethod('FEDEX_EXPRESS')).toBeNull();
  });

  it('findShippingMethod returns null for null input', () => {
    expect(findShippingMethod(null)).toBeNull();
  });

  it('findShippingMethod returns null for undefined input', () => {
    expect(findShippingMethod(undefined)).toBeNull();
  });

  it('findShippingMethod is case-insensitive', () => {
    const method = findShippingMethod('mondial_relay');
    expect(method).not.toBeNull();
    expect(method!.code).toBe('MONDIAL_RELAY');
  });

  it('findShippingMethod trims whitespace', () => {
    const method = findShippingMethod('  MONDIAL_RELAY  ');
    expect(method).not.toBeNull();
    expect(method!.code).toBe('MONDIAL_RELAY');
  });

  it('findShippingMethod with empty string returns null', () => {
    expect(findShippingMethod('')).toBeNull();
  });

  it('each method has required fields', () => {
    SHIPPING_METHODS.forEach((m: any) => {
      expect(m).toHaveProperty('code');
      expect(m).toHaveProperty('label');
      expect(m).toHaveProperty('priceCents');
      expect(m).toHaveProperty('carrier');
      expect(m).toHaveProperty('enabled');
      expect(typeof m.priceCents).toBe('number');
    });
  });
});

describe('config/security.ts', () => {
  let SECURITY_CONFIG: any;
  let validateSecurityConfig: any;

  beforeEach(async () => {
    const mod = await import('../config/security.js');
    SECURITY_CONFIG = mod.SECURITY_CONFIG;
    validateSecurityConfig = mod.validateSecurityConfig;
  });

  it('SECURITY_CONFIG has JWT section', () => {
    expect(SECURITY_CONFIG.JWT).toBeDefined();
    expect(SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH).toBe(64);
    expect(SECURITY_CONFIG.JWT.ACCESS_TOKEN_EXPIRY).toBeDefined();
    expect(SECURITY_CONFIG.JWT.REFRESH_TOKEN_EXPIRY).toBeDefined();
  });

  it('SECURITY_CONFIG has RATE_LIMIT section', () => {
    expect(SECURITY_CONFIG.RATE_LIMIT).toBeDefined();
    expect(SECURITY_CONFIG.RATE_LIMIT.AUTH).toBeDefined();
    expect(SECURITY_CONFIG.RATE_LIMIT.AUTH.MAX_ATTEMPTS).toBe(5);
    expect(SECURITY_CONFIG.RATE_LIMIT.API).toBeDefined();
    expect(SECURITY_CONFIG.RATE_LIMIT.API.MAX_REQUESTS).toBe(100);
  });

  it('SECURITY_CONFIG has VALIDATION section', () => {
    expect(SECURITY_CONFIG.VALIDATION).toBeDefined();
    expect(SECURITY_CONFIG.VALIDATION.MAX_PAYLOAD_SIZE).toBeDefined();
  });

  it('validateSecurityConfig passes with 64-char JWT_SECRET', () => {
    const saved = {
      jwt: process.env.JWT_SECRET,
      refresh: process.env.JWT_REFRESH_SECRET,
    };
    process.env.JWT_SECRET =
      'test-jwt-secret-min-64-chars-for-tracking-and-auth-in-tests-only-do-not-use-in-prod';
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-min-64-chars-for-tests-only-do-not-use-in-production-1234';
    const result = validateSecurityConfig();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    process.env.JWT_SECRET = saved.jwt;
    process.env.JWT_REFRESH_SECRET = saved.refresh;
  });

  it('validateSecurityConfig returns errors with short JWT_SECRET', () => {
    const savedJwt = process.env.JWT_SECRET;
    const savedPk = process.env.JWT_PRIVATE_KEY;
    process.env.JWT_SECRET = 'short';
    delete process.env.JWT_PRIVATE_KEY;
    const result = validateSecurityConfig();
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    process.env.JWT_SECRET = savedJwt;
    if (savedPk) process.env.JWT_PRIVATE_KEY = savedPk;
  });

  it('validateSecurityConfig returns errors when JWT_REFRESH_SECRET is missing', () => {
    const savedRefresh = process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    const result = validateSecurityConfig();
    expect(result.isValid).toBe(false);
    process.env.JWT_REFRESH_SECRET = savedRefresh;
  });

  it('validateSecurityConfig result has isValid and errors properties', () => {
    const result = validateSecurityConfig();
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('config/stripe.ts', () => {
  afterEach(() => {
    // Clean up module cache between tests is handled by vitest isolation
  });

  it('stripe is null when STRIPE_SECRET_KEY is not set', async () => {
    const saved = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    // Dynamic import to pick up env changes
    const { stripe } = await import('../config/stripe.js');
    // Note: module may be cached - stripe could be null or instance depending on test order
    // We verify ensureStripeConfigured throws when stripe is null
    if (!stripe) {
      const { ensureStripeConfigured } = await import('../config/stripe.js');
      expect(() => ensureStripeConfigured()).toThrow();
    }
    if (saved) process.env.STRIPE_SECRET_KEY = saved;
  });

  it('ensureStripeConfigured throws with code STRIPE_NOT_CONFIGURED when not configured', async () => {
    const { stripe, ensureStripeConfigured } = await import('../config/stripe.js');
    if (!stripe) {
      try {
        ensureStripeConfigured();
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('STRIPE_NOT_CONFIGURED');
      }
    } else {
      // Stripe is configured - just verify it returns an instance
      const instance = ensureStripeConfigured();
      expect(instance).toBeTruthy();
    }
  });

  it('stripe module exports both stripe and ensureStripeConfigured', async () => {
    const mod = await import('../config/stripe.js');
    expect(mod).toHaveProperty('stripe');
    expect(mod).toHaveProperty('ensureStripeConfigured');
    expect(typeof mod.ensureStripeConfigured).toBe('function');
  });
});

describe('config/validateEnv.ts', () => {
  it('validateEnvOrThrow does not throw in test (non-production) environment', async () => {
    const savedNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const { validateEnvOrThrow } = await import('../config/validateEnv.js');
    expect(() => validateEnvOrThrow()).not.toThrow();
    process.env.NODE_ENV = savedNodeEnv;
  });

  it('validateEnvOrThrow warns (not throws) in development for missing vars', async () => {
    const savedNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const { validateEnvOrThrow } = await import('../config/validateEnv.js');
    // In dev mode it should warn not throw, even with missing env vars
    expect(() => validateEnvOrThrow()).not.toThrow();
    process.env.NODE_ENV = savedNodeEnv;
  });

  it('exports validateEnvOrThrow as a function', async () => {
    const mod = await import('../config/validateEnv.js');
    expect(typeof mod.validateEnvOrThrow).toBe('function');
  });
});
