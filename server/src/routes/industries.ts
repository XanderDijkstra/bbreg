import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { excludedIndustries } from '../db/schema.js';
import { excludedIndustrySchema } from '../../../shared/types.js';
import { getUser, type AppEnv } from '../auth/middleware.js';
import { COMMON_INDUSTRIES, NACE_SECTIONS } from '../lib/nace.js';

const industriesRoute = new Hono<AppEnv>();

industriesRoute.get('/excluded', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select()
    .from(excludedIndustries)
    .where(eq(excludedIndustries.userId, user.id))
    .orderBy(desc(excludedIndustries.createdAt));
  return c.json({ excluded: rows });
});

industriesRoute.post('/excluded', zValidator('json', excludedIndustrySchema), async (c) => {
  const user = getUser(c);
  const input = c.req.valid('json');
  try {
    const [row] = await db
      .insert(excludedIndustries)
      .values({
        userId: user.id,
        industryCode: input.industryCode,
        industryDescription: input.industryDescription ?? null,
      })
      .returning();
    return c.json({ excluded: row }, 201);
  } catch {
    return c.json(
      { error: { code: 'DUPLICATE', message: 'Bransjekode er allerede ekskludert.' } },
      409,
    );
  }
});

industriesRoute.delete('/excluded/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const result = await db
    .delete(excludedIndustries)
    .where(and(eq(excludedIndustries.userId, user.id), eq(excludedIndustries.id, id)))
    .returning({ id: excludedIndustries.id });
  if (!result.length) return c.json({ error: { code: 'NOT_FOUND', message: 'Ikke funnet.' } }, 404);
  return c.json({ ok: true });
});

industriesRoute.get('/nace', (c) => {
  return c.json({ sections: NACE_SECTIONS, codes: COMMON_INDUSTRIES });
});

export { industriesRoute };
