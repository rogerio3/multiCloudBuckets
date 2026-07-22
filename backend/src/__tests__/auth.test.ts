import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { authHeader, createTestApp, loginAs, type TestContext } from './helpers';

describe('Authentication & Authorization', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  test('login succeeds with valid admin credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ id: 'u-1', username: 'admin', role: 'admin', name: expect.any(String) });
    expect(body.expiresAt).toEqual(expect.any(String));
  });

  test('login succeeds with valid viewer credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'viewer', password: 'viewer123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('viewer');
  });

  test('login with invalid credentials returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'Invalid credentials' });
  });

  test('login with missing fields returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toEqual(expect.any(String));
  });

  test('protected endpoint without token returns 401 Authentication required', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/logs' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'Authentication required' });
  });

  test('protected endpoint with malformed token returns 401 Invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'Invalid token' });
  });

  test('protected endpoint with expired token returns 401 Token expired', async () => {
    const expired = jwt.sign(
      { sub: 'u-1', username: 'admin', role: 'admin' },
      'test-secret',
      { expiresIn: -10 },
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs',
      headers: authHeader(expired),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'Token expired' });
  });

  test('GET /api/auth/me returns the authenticated user', async () => {
    const token = await loginAs(app, 'viewer', 'viewer123');
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: authHeader(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ username: 'viewer', role: 'viewer' });
  });

  test('viewer is forbidden from admin-only endpoints (403)', async () => {
    const token = await loginAs(app, 'viewer', 'viewer123');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'Insufficient permissions' });
  });

  test('admin can access admin-only endpoints', async () => {
    const token = await loginAs(app, 'admin', 'admin123');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const usernames = res.json().users.map((u: { username: string }) => u.username);
    expect(usernames).toEqual(expect.arrayContaining(['admin', 'viewer']));
  });

  test('viewer can access log endpoints', async () => {
    const token = await loginAs(app, 'viewer', 'viewer123');
    const res = await app.inject({ method: 'GET', url: '/api/logs', headers: authHeader(token) });
    expect(res.statusCode).toBe(200);
  });
});