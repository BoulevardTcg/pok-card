import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, prisma } from './setup.js';
import { hashPassword } from '../utils/auth.js';

// Mock du service email pour éviter un vrai SMTP
vi.mock('../services/email.js', () => ({
  sendContactEmail: vi.fn(() => Promise.resolve(true)),
  sendContactAutoReply: vi.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve(true)),
  sendOrderConfirmationEmail: vi.fn(() => Promise.resolve(true)),
  sendShippingNotificationEmail: vi.fn(() => Promise.resolve(true)),
}));

// ============================================================================
// sanitizeInput — tests SANS base de données
// ============================================================================

describe('Security - sanitizeInput middleware', () => {
  it('devrait supprimer les balises <script> dans le champ description', async () => {
    const { sanitizeInput } = await import('../middleware/security.js');

    const req: any = {
      path: '/api/products',
      body: { description: '<script>alert("xss")</script>Hello' },
      query: {},
      params: {},
    };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    sanitizeInput(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.body.description).not.toContain('<script>');
    expect(req.body.description).not.toContain('</script>');
    expect(req.body.description).toContain('Hello');
  });

  it('devrait supprimer les event handlers onclick= dans le champ imageUrl', async () => {
    const { sanitizeInput } = await import('../middleware/security.js');

    const req: any = {
      path: '/api/products',
      body: { imageUrl: 'https://example.com/img.png" onclick=alert(1)' },
      query: {},
      params: {},
    };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    sanitizeInput(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.body.imageUrl).not.toMatch(/onclick\s*=/i);
  });

  it('devrait sanitizer les champs normaux (name, email) de la même façon', async () => {
    const { sanitizeInput } = await import('../middleware/security.js');

    const req: any = {
      path: '/api/contact',
      body: {
        name: 'Test <b>User</b>',
        email: 'test@example.com',
        message: 'Hello <world>',
      },
      query: {},
      params: {},
    };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    sanitizeInput(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.body.name).not.toContain('<');
    expect(req.body.name).not.toContain('>');
    expect(req.body.message).not.toContain('<');
    expect(req.body.message).not.toContain('>');
    // L'email ne contient pas de < > donc reste intact
    expect(req.body.email).toBe('test@example.com');
  });

  it('devrait supprimer javascript: dans une URL', async () => {
    const { sanitizeInput } = await import('../middleware/security.js');

    const req: any = {
      path: '/api/products',
      body: { url: 'javascript:alert(1)' },
      query: {},
      params: {},
    };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    sanitizeInput(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.body.url).not.toMatch(/javascript:/i);
  });

  it('ne devrait PAS sanitizer le body du webhook Stripe', async () => {
    const { sanitizeInput } = await import('../middleware/security.js');

    const rawBody = '{"type":"checkout.session.completed","data":{}}';
    const req: any = {
      path: '/api/checkout/webhook',
      body: rawBody,
      query: {},
      params: {},
    };
    const res: any = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    sanitizeInput(req, res, next);

    expect(nextCalled).toBe(true);
    // Le body webhook ne doit pas être modifié (c'est une string, pas un objet)
    expect(req.body).toBe(rawBody);
  });
});

// ============================================================================
// Contact sans authentification
// ============================================================================

describe('Security - Contact sans authentification', () => {
  const app = createApp();

  it("ne devrait PAS retourner 401 pour POST /api/contact sans token d'auth", async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Visiteur',
      email: 'visiteur@example.com',
      subject: 'Question sur une carte',
      message: 'Bonjour, je voudrais savoir si vous avez ce produit en stock.',
    });

    expect(response.status).not.toBe(401);
  });

  it('devrait retourner 200 pour POST /api/contact sans token avec données valides', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Visiteur Anonymous',
      email: 'visiteur@test.fr',
      subject: 'Question produit',
      message: 'Je voudrais des informations sur votre catalogue.',
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('devrait retourner 400 pour POST /api/contact avec des données invalides', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'X', // trop court (< 2 chars)
      email: 'not-an-email',
      subject: '',
      message: 'Court', // trop court (< 10 chars)
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it('devrait retourner 400 si le message est trop court (< 10 caractères)', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Visiteur',
      email: 'visiteur@test.fr',
      subject: 'Sujet valide',
      message: 'Court',
    });

    expect(response.status).toBe(400);
  });

  it('devrait retourner 200 silencieusement si le honeypot website est rempli (anti-spam)', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Spambot',
      email: 'spam@example.com',
      subject: 'Offre commerciale',
      message: 'Cliquez sur ce lien pour gagner.',
      website: 'http://spam.example.com', // champ honeypot rempli
    });

    // Le serveur répond 200 silencieusement (anti-spam, sans révéler le blocage)
    expect(response.status).toBe(200);
  });
});

// ============================================================================
// 2FA rate limiting
// ============================================================================

describe('Security - 2FA rate limiting', () => {
  // Nouvelle instance createApp() → le rate limiter twoFaAttempts est frais
  const app = createApp();

  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  it('devrait retourner requiresTwoFactor: true si 2FA activé et aucun code fourni', async () => {
    await prisma.user.create({
      data: {
        email: 'twofa@example.com',
        username: 'twofauser',
        password: await hashPassword('TestPassword123!'),
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      },
    });
    await prisma.userProfile.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { email: 'twofa@example.com' } }))!.id,
      },
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'twofa@example.com',
      password: 'TestPassword123!',
      // pas de twoFactorCode
    });

    expect(response.status).toBe(200);
    expect(response.body.requiresTwoFactor).toBe(true);
  });

  it('devrait retourner 401 INVALID_2FA_CODE pour un mauvais code 2FA', async () => {
    await prisma.user.create({
      data: {
        email: 'twofa2@example.com',
        username: 'twofauser2',
        password: await hashPassword('TestPassword123!'),
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      },
    });
    await prisma.userProfile.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { email: 'twofa2@example.com' } }))!.id,
      },
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'twofa2@example.com',
      password: 'TestPassword123!',
      twoFactorCode: '000000', // mauvais code intentionnel
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_2FA_CODE');
    expect(response.body.requiresTwoFactor).toBe(true);
  });

  it('devrait retourner 429 RATE_LIMIT_EXCEEDED après 5 tentatives 2FA invalides', async () => {
    await prisma.user.create({
      data: {
        email: 'twofalimit@example.com',
        username: 'twofauserLimit',
        password: await hashPassword('TestPassword123!'),
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      },
    });
    await prisma.userProfile.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { email: 'twofalimit@example.com' } }))!.id,
      },
    });

    // Envoyer 5 tentatives invalides
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({
        email: 'twofalimit@example.com',
        password: 'TestPassword123!',
        twoFactorCode: '000000',
      });
      expect(res.status).toBe(401);
    }

    // La 6ème tentative doit être bloquée par le rate limiter
    const blocked = await request(app).post('/api/auth/login').send({
      email: 'twofalimit@example.com',
      password: 'TestPassword123!',
      twoFactorCode: '000000',
    });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
