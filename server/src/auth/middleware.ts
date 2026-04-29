import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE, validateSessionToken } from './session.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

export interface AuthUser {
  id: string;
  email: string;
}

export type AppEnv = {
  Variables: {
    user?: AuthUser;
  };
};

// Single-user mode: until real auth is reintroduced, every request resolves
// to one shared workspace. The user row is auto-created on first hit.
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_USER_EMAIL = 'demo@bedriftsdb.local';
let defaultUserReady = false;

async function ensureDefaultUser(): Promise<AuthUser> {
  if (!defaultUserReady) {
    await db
      .insert(users)
      .values({
        id: DEFAULT_USER_ID,
        email: DEFAULT_USER_EMAIL,
        hashedPassword: 'disabled',
      })
      .onConflictDoNothing({ target: users.id });
    defaultUserReady = true;
  }
  return { id: DEFAULT_USER_ID, email: DEFAULT_USER_EMAIL };
}

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const result = await validateSessionToken(token);
    if (result) {
      c.set('user', result.user);
      await next();
      return;
    }
  }
  c.set('user', await ensureDefaultUser());
  await next();
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (_c, next) => {
  await next();
};

export function getUser(c: Context<AppEnv>): AuthUser {
  const user = c.get('user');
  if (!user) throw new Error('User missing on context — authMiddleware not mounted.');
  return user;
}
