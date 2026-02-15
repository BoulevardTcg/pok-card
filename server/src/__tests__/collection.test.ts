import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestUser, prisma } from './setup.js';

const app = createApp();

describe('Collection Routes', () => {
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

  describe('GET /api/collection', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/collection');
      expect(res.status).toBe(401);
    });

    it('retourne 200 avec token et forme collection / pagination / stats', async () => {
      await createTestUser({
        email: 'collect@example.com',
        username: 'collectuser',
        password: 'TestPassword123!',
      });
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'collect@example.com',
        password: 'TestPassword123!',
      });
      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.accessToken;
      expect(accessToken).toBeDefined();

      const res = await request(app)
        .get('/api/collection')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('collection');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body).toHaveProperty('stats');
      expect(Array.isArray(res.body.collection)).toBe(true);
      expect(res.body.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        pages: expect.any(Number),
      });
      expect(res.body.stats).toHaveProperty('totalCards');
      expect(res.body.stats).toHaveProperty('uniqueCards');
    });
  });
});
