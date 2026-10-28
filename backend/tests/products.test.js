import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

describe('Product Management & Multi-Tenant Isolation', () => {
  let orgA_cookie = '';
  let orgB_cookie = '';
  let productA_id = '';

  const orgA_email = `orga_${Date.now()}@example.com`;
  const orgB_email = `orgb_${Date.now()}@example.com`;

  before(async () => {
    // 1. Create Organization A
    const resA = await request(app)
      .post('/api/auth/signup')
      .send({
        organizationName: 'Acme Supplies',
        email: orgA_email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    const cookieA = resA.headers['set-cookie'].find((c) => c.startsWith('token='));
    orgA_cookie = cookieA.split(';')[0];

    // 2. Create Organization B
    const resB = await request(app)
      .post('/api/auth/signup')
      .send({
        organizationName: 'Beta Logistics',
        email: orgB_email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    const cookieB = resB.headers['set-cookie'].find((c) => c.startsWith('token='));
    orgB_cookie = cookieB.split(';')[0];
  });

  after(async () => {
    // Cleanup
    await prisma.product.deleteMany({
      where: {
        sku: { in: ['SKU-100', 'SKU-200', 'SHARED-SKU'] },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [orgA_email, orgB_email] } },
    });
    await prisma.organization.deleteMany({
      where: { name: { in: ['Acme Supplies', 'Beta Logistics'] } },
    });
  });

  it('allows Organization A to create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', [orgA_cookie])
      .send({
        name: 'Wireless Mechanical Keyboard',
        sku: 'SKU-100',
        description: 'RGB Backlit Gaming Keyboard',
        quantityOnHand: 15,
        costPrice: 45.5,
        sellingPrice: 89.99,
        lowStockThreshold: 5,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Wireless Mechanical Keyboard');
    assert.equal(res.body.sku, 'SKU-100');
    assert.equal(res.body.quantityOnHand, 15);
    assert.equal(res.body.sellingPrice, 89.99);
    assert.equal(res.body.isLowStock, false);
    productA_id = res.body.id;
  });

  it('rejects duplicate SKU within the same organization', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', [orgA_cookie])
      .send({
        name: 'Another Keyboard',
        sku: 'SKU-100', // same SKU as above
        quantityOnHand: 2,
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /already exists in your organization/i);
  });

  it('permits the identical SKU in a different organization', async () => {
    // Org B creates a product with SKU-100
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', [orgB_cookie])
      .send({
        name: 'Beta Keyboard Variant',
        sku: 'SKU-100', // identical SKU in Org B
        quantityOnHand: 50,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.sku, 'SKU-100');
  });

  it('rejects invalid inputs such as negative quantity or price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', [orgA_cookie])
      .send({
        name: 'Faulty Product',
        sku: 'SKU-INVALID',
        quantityOnHand: -5,
        sellingPrice: -10,
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /non-negative/i);
  });

  it('prevents Organization B from listing Organization A products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Cookie', [orgB_cookie]);

    assert.equal(res.status, 200);
    const hasOrgAProduct = res.body.some((p) => p.id === productA_id);
    assert.equal(hasOrgAProduct, false, 'Org B should not see Org A products');
  });

  it('prevents Organization B from viewing Organization A product by ID (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/products/${productA_id}`)
      .set('Cookie', [orgB_cookie]);

    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/i);
  });

  it('prevents Organization B from updating Organization A product (returns 404)', async () => {
    const res = await request(app)
      .put(`/api/products/${productA_id}`)
      .set('Cookie', [orgB_cookie])
      .send({
        name: 'Hacked Title',
      });

    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/i);
  });

  it('prevents Organization B from deleting Organization A product (returns 404)', async () => {
    const res = await request(app)
      .delete(`/api/products/${productA_id}`)
      .set('Cookie', [orgB_cookie]);

    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/i);
  });

  it('allows Organization A to update its own product', async () => {
    const res = await request(app)
      .put(`/api/products/${productA_id}`)
      .set('Cookie', [orgA_cookie])
      .send({
        name: 'Pro Wireless Mechanical Keyboard',
        quantityOnHand: 3, // Now <= lowStockThreshold (5)
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Pro Wireless Mechanical Keyboard');
    assert.equal(res.body.quantityOnHand, 3);
    assert.equal(res.body.isLowStock, true, 'Quantity 3 <= 5 should now be low stock');
  });

  it('supports searching by product name or SKU', async () => {
    const resByName = await request(app)
      .get('/api/products?search=Keyboard')
      .set('Cookie', [orgA_cookie]);

    assert.equal(resByName.status, 200);
    assert.ok(resByName.body.some((p) => p.id === productA_id));

    const resBySku = await request(app)
      .get('/api/products?search=SKU-100')
      .set('Cookie', [orgA_cookie]);

    assert.equal(resBySku.status, 200);
    assert.ok(resBySku.body.some((p) => p.id === productA_id));

    const resEmpty = await request(app)
      .get('/api/products?search=NonExistent9999')
      .set('Cookie', [orgA_cookie]);

    assert.equal(resEmpty.status, 200);
    assert.equal(resEmpty.body.length, 0);
  });

  it('allows Organization A to delete its own product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productA_id}`)
      .set('Cookie', [orgA_cookie]);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify it is gone
    const getRes = await request(app)
      .get(`/api/products/${productA_id}`)
      .set('Cookie', [orgA_cookie]);

    assert.equal(getRes.status, 404);
  });
});
