import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';

export const SESSION_COOKIE = 'auth_session';
const SESSION_DAYS = 30;

export function generateSessionToken(): string {
  return randomBytes(20).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSessionToken(token: string) {
  const sessionId = hashToken(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      userId: users.id,
      userEmail: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.sessionExpiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Sliding refresh: if less than 15 days left, extend.
  const halfLife = (SESSION_DAYS / 2) * 24 * 60 * 60 * 1000;
  if (row.sessionExpiresAt.getTime() - Date.now() < halfLife) {
    const newExpires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await db.update(sessions).set({ expiresAt: newExpires }).where(eq(sessions.id, sessionId));
    row.sessionExpiresAt = newExpires;
  }

  return {
    user: { id: row.userId, email: row.userEmail },
    session: { id: row.sessionId, expiresAt: row.sessionExpiresAt },
  };
}

export async function invalidateSessionToken(token: string): Promise<void> {
  const sessionId = hashToken(token);
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  };
}
