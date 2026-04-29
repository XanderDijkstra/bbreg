import { Hono } from 'hono';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { dispatchForUser } from '../services/webhook-dispatch.js';
import { logger } from '../lib/logger.js';

const cron = new Hono();

function yesterdayInOslo(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return fmt.format(d);
}

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get('authorization') ?? '';
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> automatically.
  return auth === `Bearer ${expected}`;
}

cron.all('/daily-fetch', async (c) => {
  if (!authorize(c.req.raw)) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Bad cron token.' } }, 401);
  }
  const date = c.req.query('date') ?? yesterdayInOslo();
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  const summaries = [] as unknown[];
  for (const u of allUsers) {
    try {
      const s = await dispatchForUser(u.id, date, { onlyAutoSend: true });
      summaries.push({
        userId: u.id,
        email: u.email,
        eligibleCount: s.eligibleCount,
        webhooksUsed: s.webhooksUsed,
        deliveries: s.deliveries.length,
      });
    } catch (err) {
      logger.error({ err, userId: u.id }, 'cron user dispatch failed');
      summaries.push({
        userId: u.id,
        email: u.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return c.json({ date, processed: allUsers.length, summaries });
});

export { cron };
