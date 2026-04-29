import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { webhookConfigs, webhookDeliveries } from '../db/schema.js';
import {
  dateOnlySchema,
  webhookConfigPatchSchema,
  webhookConfigSchema,
} from '../../../shared/types.js';
import { getUser, type AppEnv } from '../auth/middleware.js';
import { dispatchForUser } from '../services/webhook-dispatch.js';

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

export const webhookConfigsRoute = new Hono<AppEnv>();

webhookConfigsRoute.get('/', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.userId, user.id))
    .orderBy(desc(webhookConfigs.createdAt));
  return c.json({ configs: rows });
});

webhookConfigsRoute.post('/', zValidator('json', webhookConfigSchema), async (c) => {
  const user = getUser(c);
  const input = c.req.valid('json');
  const [row] = await db
    .insert(webhookConfigs)
    .values({ ...input, userId: user.id })
    .returning();
  return c.json({ config: row }, 201);
});

webhookConfigsRoute.post(
  '/test-send',
  zValidator('json', z.object({ date: dateOnlySchema.optional() })),
  async (c) => {
    const user = getUser(c);
    const { date } = c.req.valid('json');
    const targetDate = date ?? yesterdayInOslo();
    const summary = await dispatchForUser(user.id, targetDate, { onlyAutoSend: false });
    return c.json({ summary });
  },
);

webhookConfigsRoute.patch('/:id', zValidator('json', webhookConfigPatchSchema), async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const patch = c.req.valid('json');
  const [row] = await db
    .update(webhookConfigs)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(webhookConfigs.userId, user.id), eq(webhookConfigs.id, id)))
    .returning();
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook ikke funnet.' } }, 404);
  return c.json({ config: row });
});

webhookConfigsRoute.delete('/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const result = await db
    .delete(webhookConfigs)
    .where(and(eq(webhookConfigs.userId, user.id), eq(webhookConfigs.id, id)))
    .returning({ id: webhookConfigs.id });
  if (!result.length) return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook ikke funnet.' } }, 404);
  return c.json({ ok: true });
});

export const webhookDeliveriesRoute = new Hono<AppEnv>();

webhookDeliveriesRoute.get('/', async (c) => {
  const user = getUser(c);
  const limit = Math.min(500, Math.max(1, Number(c.req.query('limit') ?? '50')));
  const rows = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.userId, user.id))
    .orderBy(desc(webhookDeliveries.sentAt))
    .limit(limit);
  return c.json({ deliveries: rows });
});
