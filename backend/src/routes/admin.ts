import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { IUserStore } from '../auth/users';
import { AuthError } from '../errors';
import type { Role } from '../types';

interface AdminRouteOptions {
  userStore: IUserStore;
  authenticate: preHandlerHookHandler;
  requireAdmin: preHandlerHookHandler;
}

/** Admin-only endpoints — manage users and view system state. */
export function registerAdminRoutes(app: FastifyInstance, opts: AdminRouteOptions): void {
  app.get(
    '/api/admin/users',
    { preHandler: [opts.authenticate, opts.requireAdmin] },
    async () => ({ users: await opts.userStore.list() }),
  );

  app.post(
    '/api/admin/users',
    {
      preHandler: [opts.authenticate, opts.requireAdmin],
      schema: {
        body: {
          type: 'object',
          required: ['username', 'name', 'password', 'role'],
          properties: {
            username: { type: 'string', minLength: 1, maxLength: 50 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            role: { type: 'string', enum: ['admin', 'viewer'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { username, name, password, role } = request.body as {
        username: string;
        name: string;
        password: string;
        role: Role;
      };

      const existing = await opts.userStore.findByUsername(username);
      if (existing) {
        throw new AuthError('Username already exists', 409, 'Conflict');
      }

      const user = await opts.userStore.create(username, name, password, role);
      return reply.status(201).send({ user });
    },
  );
}