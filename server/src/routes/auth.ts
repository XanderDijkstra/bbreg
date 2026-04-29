import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import {
  SESSION_COOKIE,
  createSession,
  invalidateSessionToken,
  sessionCookieOptions,
} from '../auth/session.js';
import { signinSchema, signupSchema } from '../../../shared/types.js';
import type { AppEnv } from '../auth/middleware.js';
import { getCookie } from 'hono/cookie';

const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

const auth = new Hono<AppEnv>();

auth.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const normalized = email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existing.length) {
    return c.json({ error: { code: 'EMAIL_TAKEN', message: 'E-post er allerede i bruk.' } }, 409);
  }
  const hashedPassword = await hash(password, ARGON_OPTS);
  const [user] = await db
    .insert(users)
    .values({ email: normalized, hashedPassword })
    .returning({ id: users.id, email: users.email });
  if (!user) {
    return c.json({ error: { code: 'CREATE_FAILED', message: 'Kunne ikke opprette bruker.' } }, 500);
  }
  const { token, expiresAt } = await createSession(user.id);
  setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return c.json({ user: { id: user.id, email: user.email } }, 201);
});

auth.post('/signin', zValidator('json', signinSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const normalized = email.trim().toLowerCase();
  const [row] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (!row) {
    return c.json({ error: { code: 'INVALID_CREDS', message: 'Feil e-post eller passord.' } }, 401);
  }
  const ok = await verify(row.hashedPassword, password, ARGON_OPTS);
  if (!ok) {
    return c.json({ error: { code: 'INVALID_CREDS', message: 'Feil e-post eller passord.' } }, 401);
  }
  const { token, expiresAt } = await createSession(row.id);
  setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return c.json({ user: { id: row.id, email: row.email } });
});

auth.post('/signout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await invalidateSessionToken(token);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ user: null });
  return c.json({ user });
});

export { auth };
