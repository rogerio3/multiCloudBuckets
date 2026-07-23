import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { signToken } from '../auth/jwt';
import { verifyPassword } from '../auth/passwords';
import type { IUserStore } from '../auth/users';
import { toPublic } from '../auth/users';
import { AuthError } from '../errors';

interface AuthRouteOptions {
  userStore: IUserStore;
  jwtSecret: string;
  jwtExpiresIn: number;
  authenticate: preHandlerHookHandler;
}

export function registerAuthRoutes(app: FastifyInstance, opts: AuthRouteOptions): void {
  app.post(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body as { username: string; password: string };
      const user = await opts.userStore.findByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw new AuthError('Invalid credentials', 401, 'InvalidCredentials');
      }
      const { token, expiresAt } = signToken(
        { sub: user.id, username: user.username, role: user.role },
        opts.jwtSecret,
        opts.jwtExpiresIn,
      );
      return reply.send({ token, user: toPublic(user), expiresAt });
    },
  );

  app.get('/api/auth/me', { preHandler: [opts.authenticate] }, async (request) => ({
    user: request.user,
  }));
}