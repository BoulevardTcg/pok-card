import { describe, it, expect, vi } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  updateStockSchema,
  validateBody,
  validateQuery,
} from '../validators/product.validator.js';

// ─── createProductSchema ───────────────────────────────────────────────────────

describe('createProductSchema', () => {
  const validProduct = {
    name: 'Booster Pack Écarlate',
    slug: 'booster-pack-ecarlate',
    category: 'Booster',
    description: 'A nice booster.',
    variants: [
      {
        name: 'Standard',
        priceCents: 499,
        stock: 100,
      },
    ],
  };

  it('passes with a valid product', () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('fails when name is missing', () => {
    const { name, ...rest } = validProduct;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when name is empty string', () => {
    const result = createProductSchema.safeParse({ ...validProduct, name: '' });
    expect(result.success).toBe(false);
  });

  it('fails when slug is missing', () => {
    const { slug, ...rest } = validProduct;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when slug contains uppercase', () => {
    const result = createProductSchema.safeParse({ ...validProduct, slug: 'InvalidSlug' });
    expect(result.success).toBe(false);
  });

  it('fails when category is missing', () => {
    const { category, ...rest } = validProduct;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails with variants array empty', () => {
    const result = createProductSchema.safeParse({ ...validProduct, variants: [] });
    expect(result.success).toBe(false);
  });

  it('fails when variant priceCents is negative', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      variants: [{ name: 'Standard', priceCents: -1, stock: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('fails when variant priceCents is a float', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      variants: [{ name: 'Standard', priceCents: 4.99, stock: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('passes with multiple valid variants', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      variants: [
        { name: 'Standard', priceCents: 499, stock: 10 },
        { name: 'Holo', priceCents: 999, stock: 5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('passes with optional description omitted', () => {
    const { description, ...rest } = validProduct;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('passes with images array', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      images: [{ url: 'https://example.com/img.jpg', altText: 'Product image', position: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('fails when image URL is empty', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      images: [{ url: '', altText: null, position: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── updateProductSchema ───────────────────────────────────────────────────────

describe('updateProductSchema', () => {
  it('passes with partial update (just name)', () => {
    const result = updateProductSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('passes with empty object (all optional)', () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('passes with all fields provided', () => {
    const result = updateProductSchema.safeParse({
      name: 'Updated Product',
      slug: 'updated-product',
      category: 'Booster',
      description: 'Updated description',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid slug (uppercase)', () => {
    const result = updateProductSchema.safeParse({ slug: 'InvalidSlug' });
    expect(result.success).toBe(false);
  });

  it('fails with empty name', () => {
    const result = updateProductSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

// ─── listProductsQuerySchema ───────────────────────────────────────────────────

describe('listProductsQuerySchema', () => {
  it('applies default values when empty object', () => {
    const result = listProductsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    }
  });

  it('parses string numbers into integers', () => {
    const result = listProductsQuerySchema.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it('passes with category filter', () => {
    const result = listProductsQuerySchema.safeParse({ category: 'Booster' });
    expect(result.success).toBe(true);
  });

  it('passes with search filter', () => {
    const result = listProductsQuerySchema.safeParse({ search: 'pikachu' });
    expect(result.success).toBe(true);
  });

  it('fails when page is less than 1', () => {
    const result = listProductsQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('fails when limit exceeds 100', () => {
    const result = listProductsQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('passes with limit of 100', () => {
    const result = listProductsQuerySchema.safeParse({ limit: '100' });
    expect(result.success).toBe(true);
  });
});

// ─── updateStockSchema ─────────────────────────────────────────────────────────

describe('updateStockSchema', () => {
  it('passes with valid stock number', () => {
    const result = updateStockSchema.safeParse({ stock: 50 });
    expect(result.success).toBe(true);
  });

  it('passes with stock of 0', () => {
    const result = updateStockSchema.safeParse({ stock: 0 });
    expect(result.success).toBe(true);
  });

  it('fails with negative stock', () => {
    const result = updateStockSchema.safeParse({ stock: -1 });
    expect(result.success).toBe(false);
  });

  it('fails with float stock', () => {
    const result = updateStockSchema.safeParse({ stock: 5.5 });
    expect(result.success).toBe(false);
  });

  it('fails with missing stock', () => {
    const result = updateStockSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('passes with optional reason', () => {
    const result = updateStockSchema.safeParse({ stock: 10, reason: 'Restock from supplier' });
    expect(result.success).toBe(true);
  });
});

// ─── validateBody middleware ───────────────────────────────────────────────────

describe('validateBody middleware', () => {
  function makeReqRes(body: any) {
    const req: any = { body };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn();
    return { req, res, next };
  }

  it('calls next() for valid body', () => {
    const middleware = validateBody(updateStockSchema);
    const { req, res, next } = makeReqRes({ stock: 42 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body', () => {
    const middleware = validateBody(updateStockSchema);
    const { req, res, next } = makeReqRes({ stock: -5 });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with field details for missing required field', () => {
    const middleware = validateBody(updateStockSchema);
    const { req, res, next } = makeReqRes({});
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.details).toBeDefined();
    expect(Array.isArray(jsonArg.details)).toBe(true);
    expect(jsonArg.details.length).toBeGreaterThan(0);
  });

  it('mutates req.body with parsed/default values on success', () => {
    const middleware = validateBody(updateStockSchema);
    const { req, res, next } = makeReqRes({ stock: 7 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.stock).toBe(7);
  });
});

// ─── validateQuery middleware ──────────────────────────────────────────────────

describe('validateQuery middleware', () => {
  function makeReqRes(query: any) {
    const req: any = { query };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn();
    return { req, res, next };
  }

  it('calls next() for valid query params', () => {
    const middleware = validateQuery(listProductsQuerySchema);
    const { req, res, next } = makeReqRes({ page: '1', limit: '20' });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('applies defaults when query is empty', () => {
    const middleware = validateQuery(listProductsQuerySchema);
    const { req, res, next } = makeReqRes({});
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(1);
    expect(req.query.limit).toBe(50);
  });

  it('returns 400 for invalid query params', () => {
    const middleware = validateQuery(listProductsQuerySchema);
    const { req, res, next } = makeReqRes({ limit: '999' }); // exceeds max 100
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    expect(next).not.toHaveBeenCalled();
  });
});
