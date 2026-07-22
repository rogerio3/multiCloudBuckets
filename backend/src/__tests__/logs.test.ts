import type { FastifyInstance } from 'fastify';
import { authHeader, createTestApp, loginAs, type TestContext } from './helpers';

describe('Log endpoints (mock storage provider)', () => {
  let ctx: TestContext;
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    token = await loginAs(app, 'admin', 'admin123');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  test('GET /api/health returns service status without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.uptime).toEqual(expect.any(Number));
  });

  test('GET /api/logs lists seeded log files with metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/logs', headers: authHeader(token) });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.files)).toBe(true);
    expect(body.files.length).toBeGreaterThan(0);
    expect(body.isTruncated).toBe(false);
    expect(body.nextMarker).toBeNull();
    const file = body.files[0];
    expect(file).toMatchObject({
      key: expect.any(String),
      name: expect.any(String),
      size: expect.any(Number),
      lastModified: expect.any(String),
      etag: expect.any(String),
    });
  });

  test('GET /api/logs?prefix filters by key prefix', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs?prefix=archive/',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.files.length).toBeGreaterThan(0);
    for (const f of body.files) {
      expect(f.key.startsWith('archive/')).toBe(true);
    }
  });

  test('GET /api/logs?maxKeys truncates the result set', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs?maxKeys=5',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.files.length).toBe(5);
    expect(body.isTruncated).toBe(true);
    expect(body.nextMarker).toEqual(expect.any(String));
  });

  test('GET /api/logs/:key/download streams an existing file', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/logs?maxKeys=1', headers: authHeader(token) });
    const key = list.json().files[0].key as string;

    const res = await app.inject({
      method: 'GET',
      url: `/api/logs/${encodeURIComponent(key)}/download`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${encodeURIComponent(key)}"`,
    );
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/logs/:key/download supports nested keys via URI encoding', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/logs?prefix=archive/',
      headers: authHeader(token),
    });
    const key = list.json().files[0].key as string;
    const res = await app.inject({
      method: 'GET',
      url: `/api/logs/${encodeURIComponent(key)}/download`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/logs/:key/download returns 404 for a missing file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs/nonexistent.log/download',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'File not found' });
  });

  test('POST /api/logs/:key/presign generates a temporary URL', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/logs?maxKeys=1', headers: authHeader(token) });
    const key = list.json().files[0].key as string;

    const res = await app.inject({
      method: 'POST',
      url: `/api/logs/${encodeURIComponent(key)}/presign`,
      headers: authHeader(token),
      payload: { expiresIn: 3600 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.url).toContain(`/api/logs/${encodeURIComponent(key)}/download`);
    expect(body.key).toBe(key);
    expect(body.expiresAt).toEqual(expect.any(String));
  });

  test('POST /api/logs/:key/presign honours a custom expiry', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/logs?maxKeys=1', headers: authHeader(token) });
    const key = list.json().files[0].key as string;

    const before = Date.now();
    const res = await app.inject({
      method: 'POST',
      url: `/api/logs/${encodeURIComponent(key)}/presign`,
      headers: authHeader(token),
      payload: { expiresIn: 7200 },
    });
    expect(res.statusCode).toBe(200);
    const expiresAt = new Date(res.json().expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 7200 * 1000 - 5000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 7200 * 1000 + 5000);
  });

  test('POST /api/logs/:key/presign returns 404 for a missing file', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/nonexistent.log/presign',
      headers: authHeader(token),
      payload: { expiresIn: 3600 },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'File not found' });
  });

  test('POST /api/logs/:key/presign rejects expiry above the maximum', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/logs?maxKeys=1', headers: authHeader(token) });
    const key = list.json().files[0].key as string;
    const res = await app.inject({
      method: 'POST',
      url: `/api/logs/${encodeURIComponent(key)}/presign`,
      headers: authHeader(token),
      payload: { expiresIn: 999_999_999 },
    });
    expect(res.statusCode).toBe(400);
  });

  test('log endpoints reject unauthenticated requests', async () => {
    for (const url of ['/api/logs', '/api/logs/whatever.log/download']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(401);
    }
  });
});