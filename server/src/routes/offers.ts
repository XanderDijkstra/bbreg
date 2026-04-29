import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { offers } from '../db/schema.js';
import { offerPatchSchema, offerSchema } from '../../../shared/types.js';
import { getUser, type AppEnv } from '../auth/middleware.js';

const offersRoute = new Hono<AppEnv>();

offersRoute.get('/', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select()
    .from(offers)
    .where(eq(offers.userId, user.id))
    .orderBy(desc(offers.createdAt));
  return c.json({ offers: rows });
});

offersRoute.post('/', zValidator('json', offerSchema), async (c) => {
  const user = getUser(c);
  const input = c.req.valid('json');
  const [row] = await db
    .insert(offers)
    .values({ ...input, userId: user.id })
    .returning();
  return c.json({ offer: row }, 201);
});

offersRoute.patch('/:id', zValidator('json', offerPatchSchema), async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const patch = c.req.valid('json');
  const [row] = await db
    .update(offers)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(offers.userId, user.id), eq(offers.id, id)))
    .returning();
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Tilbud ikke funnet.' } }, 404);
  return c.json({ offer: row });
});

offersRoute.delete('/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const result = await db
    .delete(offers)
    .where(and(eq(offers.userId, user.id), eq(offers.id, id)))
    .returning({ id: offers.id });
  if (!result.length) return c.json({ error: { code: 'NOT_FOUND', message: 'Tilbud ikke funnet.' } }, 404);
  return c.json({ ok: true });
});

export { offersRoute };
