import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { authMiddleware, requireAuth, type AppEnv } from './auth/middleware.js';
import { auth } from './routes/auth.js';
import { companies } from './routes/companies.js';
import { leadsRoute } from './routes/leads.js';
import { webhookConfigsRoute, webhookDeliveriesRoute } from './routes/webhooks.js';
import { offersRoute } from './routes/offers.js';
import { emailRoute, resendWebhookRoute } from './routes/email.js';
import { industriesRoute } from './routes/industries.js';
import { analytics } from './routes/analytics.js';
import { cron } from './routes/cron.js';
import { proposalsRoute } from './routes/proposals.js';
import { logger } from './lib/logger.js';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', honoLogger((msg) => logger.info(msg)));
  app.use(
    '*',
    cors({
      origin: (origin) => origin ?? '*',
      credentials: true,
    }),
  );

  app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

  // Public, signature-verified webhook receivers.
  app.route('/api/email/resend-webhook', resendWebhookRoute);

  // Cron uses CRON_SECRET header — outside session middleware.
  app.route('/api/cron', cron);

  // Read session cookie on every other /api request.
  app.use('/api/*', authMiddleware);

  // Public auth endpoints.
  app.route('/api/auth', auth);

  // Authed API.
  const api = new Hono<AppEnv>();
  api.use('*', requireAuth);
  api.route('/companies', companies);
  api.route('/leads', leadsRoute);
  api.route('/webhook-configs', webhookConfigsRoute);
  api.route('/webhook-deliveries', webhookDeliveriesRoute);
  api.route('/offers', offersRoute);
  api.route('/email', emailRoute);
  api.route('/industries', industriesRoute);
  api.route('/analytics', analytics);
  api.route('/proposals', proposalsRoute);
  app.route('/api', api);

  app.onError((err, c) => {
    logger.error({ err }, 'unhandled error');
    return c.json(
      {
        error: {
          code: 'INTERNAL',
          message: process.env.NODE_ENV === 'production' ? 'Intern feil.' : err.message,
        },
      },
      500,
    );
  });

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404));

  return app;
}
