import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

describe('Authentication & Session Management', () => {
  const testEmail = `tester_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testOrgName = 'Test Warehouse Inc';

  let authCookie = '';

  after(async () => {
    // Cleanup created test records
    await prisma.user.deleteMany({
      where: { email: { contains: 'tester_' } },
    });
    await prisma.organization.deleteMany({
      where: { name: testOrgName },
    });
  });

  it('rejects access to protected routes when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Authentication required/i);
  });

  it('registers a new user and organization atomically', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        organizationName: testOrgName,
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.organization.name, testOrgName);
    assert.equal(res.body.user.passwordHash, undefined, 'Password hash must never be returned');

    // Extract cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Expected Set-Cookie header');
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    assert.ok(tokenCookie, 'Token cookie must be set');
    assert.ok(tokenCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');
    authCookie = tokenCookie.split(';')[0];
  });

  it('rejects duplicate email registrations', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        organizationName: 'Another Org',
        email: testEmail,
        password: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /already exists/i);
  });

  it('rejects registration when passwords do not match', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        organizationName: 'Diff Org',
        email: `mismatch_${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'MismatchPassword!',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /passwords do not match/i);
  });

  it('authenticates user with valid credentials and sets HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.passwordHash, undefined);

    const cookies = res.headers['set-cookie'];
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    assert.ok(tokenCookie);
    authCookie = tokenCookie.split(';')[0];
  });

  it('rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword999',
      });

    assert.equal(res.status, 401);
    assert.match(res.body.error, /invalid email or password/i);
  });

  it('allows access to /api/auth/me using valid authentication cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.organization.name, testOrgName);
  });

  it('clears session cookie on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [authCookie]);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    assert.ok(tokenCookie);
    // Max-age=0 or expires in past
    assert.ok(tokenCookie.includes('Max-Age=0') || tokenCookie.includes('Expires='));
  });
});
