import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

describe('Dashboard Metrics & Organization Settings', () => {
  let authCookie = '';
  const testEmail = `dash_test_${Date.now()}@example.com`;
  const orgName = `Dashboard Analytics Org ${Date.now()}`;

  let prod1Id, prod2Id, prod3Id;

  before(async () => {
    // 1. Sign up user (default threshold is 5)
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        organizationName: orgName,
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('token='));
    authCookie = cookie.split(';')[0];

    // Product 1: Quantity 5, lowStockThreshold = null -> effectiveThreshold = 5 -> LOW STOCK (5 <= 5)
    const p1 = await request(app)
      .post('/api/products')
      .set('Cookie', [authCookie])
      .send({
        name: 'Item Using Default (Low Stock)',
        sku: 'SKU-D-1',
        quantityOnHand: 5,
        lowStockThreshold: null,
      });
    prod1Id = p1.body.id;

    // Product 2: Quantity 6, lowStockThreshold = null -> effectiveThreshold = 5 -> NORMAL (6 > 5)
    const p2 = await request(app)
      .post('/api/products')
      .set('Cookie', [authCookie])
      .send({
        name: 'Item Using Default (Normal)',
        sku: 'SKU-D-2',
        quantityOnHand: 6,
        lowStockThreshold: null,
      });
    prod2Id = p2.body.id;

    // Product 3: Quantity 3, product-specific lowStockThreshold = 2 -> effectiveThreshold = 2 -> NORMAL (3 > 2)
    const p3 = await request(app)
      .post('/api/products')
      .set('Cookie', [authCookie])
      .send({
        name: 'Item With Custom Threshold (Normal)',
        sku: 'SKU-D-3',
        quantityOnHand: 3,
        lowStockThreshold: 2,
      });
    prod3Id = p3.body.id;
  });

  after(async () => {
    // Cleanup
    await prisma.product.deleteMany({
      where: {
        sku: { in: ['SKU-D-1', 'SKU-D-2', 'SKU-D-3'] },
      },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.organization.deleteMany({
      where: { name: orgName },
    });
  });

  it('calculates dashboard metrics accurately with inclusive <= threshold', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', [authCookie]);

    assert.equal(res.status, 200);
    // 3 products total
    assert.equal(res.body.totalProducts, 3);
    // total stock = 5 + 6 + 3 = 14
    assert.equal(res.body.totalStockUnits, 14);
    // low stock count = 1 (only Product 1: 5 <= 5)
    assert.equal(res.body.lowStockCount, 1);
    assert.equal(res.body.lowStockItems.length, 1);
    assert.equal(res.body.lowStockItems[0].id, prod1Id);
    assert.equal(res.body.lowStockItems[0].effectiveThreshold, 5);
  });

  it('retrieves organization settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', [authCookie]);

    assert.equal(res.status, 200);
    assert.equal(res.body.organizationName, orgName);
    assert.equal(res.body.defaultLowStockThreshold, 5);
  });

  it('rejects invalid threshold in settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', [authCookie])
      .send({
        defaultLowStockThreshold: -3,
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /non-negative integer/i);
  });

  it('updates organization default threshold and immediately reflects in dashboard', async () => {
    // Update default threshold from 5 to 7
    const updateRes = await request(app)
      .put('/api/settings')
      .set('Cookie', [authCookie])
      .send({
        defaultLowStockThreshold: 7,
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.defaultLowStockThreshold, 7);

    // Re-check dashboard:
    // Product 1 (qty 5): 5 <= 7 -> LOW STOCK
    // Product 2 (qty 6): 6 <= 7 -> now also LOW STOCK!
    // Product 3 (qty 3, threshold 2): 3 > 2 -> stays NORMAL!
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Cookie', [authCookie]);

    assert.equal(dashRes.status, 200);
    assert.equal(dashRes.body.totalProducts, 3);
    assert.equal(dashRes.body.totalStockUnits, 14);
    assert.equal(dashRes.body.lowStockCount, 2, 'Both products relying on default threshold are now low stock');
    const lowStockIds = dashRes.body.lowStockItems.map((item) => item.id);
    assert.ok(lowStockIds.includes(prod1Id));
    assert.ok(lowStockIds.includes(prod2Id));
    assert.equal(lowStockIds.includes(prod3Id), false, 'Product with custom threshold remains normal');
  });
});
