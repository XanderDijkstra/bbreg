import 'dotenv/config';
import { serve } from '@hono/node-server';
import cron from 'node-cron';
import { createApp } from './app.js';
import { db } from './db/client.js';
import { users } from './db/schema.js';
import { dispatchForUser } from './services/webhook-dispatch.js';
import { logger } from './lib/logger.js';

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, 'BedriftsDB API listening');
});

if (process.env.ENABLE_LOCAL_CRON === 'true') {
  cron.schedule(
    '0 6 * * *',
    async () => {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Oslo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const date = fmt.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
      logger.info({ date }, 'local cron starting');
      const all = await db.select({ id: users.id }).from(users);
      for (const u of all) {
        try {
          await dispatchForUser(u.id, date, { onlyAutoSend: true });
        } catch (err) {
          logger.error({ err, userId: u.id }, 'local cron user failed');
        }
      }
    },
    { timezone: 'UTC' },
  );
  logger.info('local cron scheduled at 06:00 UTC');
}
