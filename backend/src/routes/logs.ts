import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { StorageProvider } from '../types';

interface LogRouteOptions {
  storage: StorageProvider;
  authenticate: preHandlerHookHandler;
  presignDefaultExpiresIn: number;
  presignMaxExpiresIn: number;
}

export function registerLogRoutes(app: FastifyInstance, opts: LogRouteOptions): void {
  const auth = { preHandler: [opts.authenticate] };

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  app.get(
    '/api/logs',
    {
      ...auth,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            prefix: { type: 'string' },
            maxKeys: { type: 'integer', minimum: 1, maximum: 1000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const { prefix, maxKeys } = request.query as { prefix?: string; maxKeys?: number };
      return opts.storage.listFiles(prefix, maxKeys ?? 100);
    },
  );

  app.get('/api/logs/:key/download', auth, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { stream, metadata } = await opts.storage.downloadFile(key);
    const filename = metadata.key.split('/').pop() ?? 'download.log';
    reply.header('Content-Type', metadata.contentType);
    reply.header('Content-Length', String(metadata.size));
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return reply.send(stream);
  });

  app.post(
    '/api/logs/:key/presign',
    {
      ...auth,
      schema: {
        body: {
          type: 'object',
          properties: {
            expiresIn: { type: 'integer', minimum: 60, maximum: opts.presignMaxExpiresIn },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const { key } = request.params as { key: string };
      const body = (request.body ?? {}) as { expiresIn?: number };
      const expiresIn = body.expiresIn ?? opts.presignDefaultExpiresIn;
      return opts.storage.generatePresignedUrl(key, expiresIn);
    },
  );
}