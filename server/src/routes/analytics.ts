import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { emailLogs, leads } from '../db/schema.js';
import { getUser, type AppEnv } from '../auth/middleware.js';

const analytics = new Hono<AppEnv>();

analytics.get('/leads-by-status', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(eq(leads.userId, user.id))
    .groupBy(leads.status);
  return c.json({ rows });
});

analytics.get('/leads-by-industry', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select({
      industryCode: leads.naeringskode,
      industryDescription: leads.naeringskodeBeskrivelse,
      count: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(eq(leads.userId, user.id))
    .groupBy(leads.naeringskode, leads.naeringskodeBeskrivelse)
    .orderBy(sql`count(*) desc`)
    .limit(10);
  return c.json({ rows });
});

analytics.get('/leads-by-week', async (c) => {
  const user = getUser(c);
  const rows = await db.execute(sql`
    select to_char(date_trunc('week', created_at), 'IYYY-IW') as week,
           count(*)::int as count
    from leads
    where user_id = ${user.id}
    group by 1
    order by 1 desc
    limit 26
  `);
  return c.json({ rows });
});

analytics.get('/email-stats', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select({
      status: emailLogs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(emailLogs)
    .where(eq(emailLogs.userId, user.id))
    .groupBy(emailLogs.status);
  return c.json({ rows });
});

export { analytics };
