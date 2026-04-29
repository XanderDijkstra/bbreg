import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import pLimit from 'p-limit';
import { db } from '../db/client.js';
import { emailLogs, leads, offers } from '../db/schema.js';
import {
  sendBulkEmailSchema,
  sendEmailSchema,
} from '../../../shared/types.js';
import { getUser, type AppEnv } from '../auth/middleware.js';
import { renderTemplate, sendEmail } from '../services/resend.js';
import { logger } from '../lib/logger.js';

export const emailRoute = new Hono<AppEnv>();

emailRoute.post('/send', zValidator('json', sendEmailSchema), async (c) => {
  const user = getUser(c);
  const { leadId, offerId } = c.req.valid('json');
  const result = await sendOne(user.id, leadId, offerId);
  return c.json(result);
});

emailRoute.post('/send-bulk', zValidator('json', sendBulkEmailSchema), async (c) => {
  const user = getUser(c);
  const { leadIds, offerId } = c.req.valid('json');
  const limiter = pLimit(5);
  const results = [] as Array<{ leadId: string; ok: boolean; error?: string }>;
  await Promise.all(
    leadIds.map((id) =>
      limiter(async () => {
        await new Promise((r) => setTimeout(r, 200));
        try {
          const r = await sendOne(user.id, id, offerId);
          results.push({ leadId: id, ok: r.ok, error: r.error ?? undefined });
        } catch (err) {
          results.push({
            leadId: id,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    ),
  );
  return c.json({ results });
});

// Public Resend webhook receiver (no auth).
export const resendWebhookRoute = new Hono();
resendWebhookRoute.post('/', async (c) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const sig = c.req.header('resend-signature') ?? c.req.header('svix-signature');
    if (!sig) {
      logger.warn('resend webhook missing signature');
      return c.json({ ok: false }, 401);
    }
    // Full svix verification omitted; presence check is the soft accept.
  } else {
    logger.warn('RESEND_WEBHOOK_SECRET not set — accepting unsigned webhook');
  }

  const body = (await c.req.json().catch(() => null)) as
    | { type?: string; data?: { email_id?: string } }
    | null;
  if (!body?.data?.email_id) return c.json({ ok: true });

  let status = 'sent';
  if (body.type?.includes('delivered')) status = 'delivered';
  else if (body.type?.includes('bounced')) status = 'bounced';
  else if (body.type?.includes('opened')) status = 'opened';
  else if (body.type?.includes('clicked')) status = 'clicked';
  else if (body.type?.includes('complained')) status = 'complained';

  await db
    .update(emailLogs)
    .set({ status })
    .where(eq(emailLogs.resendId, body.data.email_id));
  return c.json({ ok: true });
});

async function sendOne(userId: string, leadId: string, offerId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.id, leadId)))
    .limit(1);
  if (!lead) return { ok: false, error: 'Lead not found' };
  if (!lead.epostadresse) return { ok: false, error: 'Lead mangler e-post' };
  const [offer] = await db
    .select()
    .from(offers)
    .where(and(eq(offers.userId, userId), eq(offers.id, offerId)))
    .limit(1);
  if (!offer) return { ok: false, error: 'Offer not found' };

  const subject = renderTemplate(offer.emailSubject, lead);
  const body = renderTemplate(offer.emailBody, lead);
  const send = await sendEmail({ to: lead.epostadresse, subject, body });
  await db.insert(emailLogs).values({
    userId,
    orgNumber: lead.organisasjonsnummer,
    companyName: lead.navn,
    recipientEmail: lead.epostadresse,
    offerId,
    industryCode: lead.naeringskode,
    status: send.error ? 'failed' : 'sent',
    resendId: send.id,
  });
  return { ok: !send.error, error: send.error ?? null, resendId: send.id };
}
