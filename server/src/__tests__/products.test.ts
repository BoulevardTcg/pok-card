import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { cleanupDatabase, createTestProduct, prisma } from './setup.js';

const app = createApp();

describe('Products Routes', () => {
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

  describe('GET /api/products', () => {
    it('retourne 200 avec products et pagination', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 12,
        total: expect.any(Number),
        pages: expect.any(Number),
      });
    });

    it('respecte page et limit', async () => {
      await createTestProduct({ name: 'Product A' });
      await createTestProduct({ name: 'Product B' });
      const res = await request(app).get('/api/products?page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.page).toBe(1);
    });

    it('filtre par category si fourni', async () => {
      await createTestProduct({ name: 'Booster' });
      const res = await request(app).get('/api/products?category=Test');
      expect(res.status).toBe(200);
      expect(res.body.products.every((p: any) => p.category === 'Test')).toBe(true);
    });
  });
});
