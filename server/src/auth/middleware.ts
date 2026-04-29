import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE, validateSessionToken } from './session.js';

export interface AuthUser {
  id: string;
  email: string;
}

export type AppEnv = {
  Variables: {
    user?: AuthUser;
  };
};

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const result = await validateSessionToken(token);
    if (result) c.set('user', result.user);
  }
  await next();
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }, 401);
  }
  await next();
};

export function getUser(c: Context<AppEnv>): AuthUser {
  const user = c.get('user');
  if (!user) throw new Error('User not authenticated — requireAuth missing.');
  return user;
}
