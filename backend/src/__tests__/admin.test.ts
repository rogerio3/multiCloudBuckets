import type { FastifyInstance } from 'fastify';
import { authHeader, createTestApp, loginAs, type TestContext } from './helpers';

describe('Admin User Management', () => {
  let ctx: TestContext;
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    adminToken = await loginAs(app, 'admin', 'admin123');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('POST /api/admin/users', () => {
    test('admin can create a new viewer user (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { username: 'newuser', name: 'New User', password: 'password123', role: 'viewer' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user).toMatchObject({
        username: 'newuser',
        name: 'New User',
        role: 'viewer',
      });
      expect(res.json().user.id).toEqual(expect.any(String));
    });

    test('admin can create a new admin user (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { username: 'admin2', name: 'Admin Two', password: 'password123', role: 'admin' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user.role).toBe('admin');
    });

    test('duplicate username returns 409', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { username: 'admin', name: 'Duplicate', password: 'password123', role: 'viewer' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ error: 'Username already exists' });
    });

    test('missing required fields returns 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { username: 'incomplete' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('short password returns 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { username: 'shortpwd', name: 'Short', password: '123', role: 'viewer' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('invalid role returns 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { username: 'badrole', name: 'Bad', password: 'password123', role: 'superadmin' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('viewer cannot create users (403)', async () => {
      const viewerToken = await loginAs(app, 'viewer', 'viewer123');
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(viewerToken),
        payload: { username: 'hacker', name: 'Hacker', password: 'password123', role: 'admin' },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ error: 'Insufficient permissions' });
    });

    test('unauthenticated request returns 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: { username: 'anon', name: 'Anon', password: 'password123', role: 'viewer' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Authentication required' });
    });
  });

  describe('GET /api/admin/users', () => {
    test('admin can list users including newly created ones', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const usernames = res.json().users.map((u: { username: string }) => u.username);
      expect(usernames).toContain('admin');
      expect(usernames).toContain('viewer');
      expect(usernames).toContain('newuser');
    });
  });
});