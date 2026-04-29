import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { leads } from '../db/schema.js';
import {
  leadStatusSchema,
  updateLeadSchema,
  upsertLeadSchema,
} from '../../../shared/types.js';
import { getUser, type AppEnv } from '../auth/middleware.js';
import { dispatchLeadToWebhook } from '../services/webhook-dispatch.js';

const leadsRoute = new Hono<AppEnv>();

leadsRoute.get('/', async (c) => {
  const user = getUser(c);
  const status = c.req.query('status');
  const search = c.req.query('search');
  const tag = c.req.query('tag');
  const page = Math.max(1, Number(c.req.query('page') ?? '1'));
  const pageSize = Math.min(200, Math.max(1, Number(c.req.query('pageSize') ?? '50')));

  const conds = [eq(leads.userId, user.id)];
  if (status) {
    const parsed = leadStatusSchema.safeParse(status);
    if (parsed.success) conds.push(eq(leads.status, parsed.data));
  }
  if (search) {
    const q = `%${search}%`;
    conds.push(
      or(
        ilike(leads.navn, q),
        ilike(leads.organisasjonsnummer, q),
        ilike(leads.poststed, q),
      )!,
    );
  }
  if (tag) {
    conds.push(sql`${tag} = ANY(${leads.tags})`);
  }

  const where = and(...conds);
  const rows = await db
    .select()
    .from(leads)
    .where(where)
    .orderBy(desc(leads.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(where);

  return c.json({
    leads: rows,
    page,
    pageSize,
    total: totalRow[0]?.count ?? 0,
  });
});

leadsRoute.post('/', zValidator('json', upsertLeadSchema), async (c) => {
  const user = getUser(c);
  const input = c.req.valid('json');
  const [row] = await db
    .insert(leads)
    .values({
      userId: user.id,
      organisasjonsnummer: input.organisasjonsnummer,
      navn: input.navn,
      organisasjonsformKode: input.organisasjonsformKode ?? null,
      organisasjonsformBeskrivelse: input.organisasjonsformBeskrivelse ?? null,
      registreringsdato: input.registreringsdato ?? null,
      naeringskode: input.naeringskode ?? null,
      naeringskodeBeskrivelse: input.naeringskodeBeskrivelse ?? null,
      poststed: input.poststed ?? null,
      domain: input.domain ?? null,
      creditScore: input.creditScore ?? null,
      registrertIMva: input.registrertIMva ?? null,
      dagligLederNavn: input.dagligLederNavn ?? null,
      dagligLederFodselsdato: input.dagligLederFodselsdato ?? null,
      dagligLederGender: input.dagligLederGender ?? null,
      telefon: input.telefon ?? null,
      mobil: input.mobil ?? null,
      epostadresse: input.epostadresse ?? null,
      styrelederNavn: input.styrelederNavn ?? null,
      styremedlemmer: (input.styremedlemmer ?? []) as unknown[],
      rollerRaw: (input.rollerRaw ?? []) as unknown[],
      institusjonellSektorkode: input.institusjonellSektorkode ?? null,
      institusjonellSektorkodeBeskrivelse: input.institusjonellSektorkodeBeskrivelse ?? null,
      antallUnderenheter: input.antallUnderenheter ?? 0,
      contactEnrichedAt: new Date(),
      status: input.status ?? 'new',
      notes: input.notes ?? null,
      tags: input.tags ?? [],
    })
    .onConflictDoUpdate({
      target: [leads.userId, leads.organisasjonsnummer],
      set: {
        navn: input.navn,
        organisasjonsformKode: input.organisasjonsformKode ?? null,
        organisasjonsformBeskrivelse: input.organisasjonsformBeskrivelse ?? null,
        naeringskode: input.naeringskode ?? null,
        naeringskodeBeskrivelse: input.naeringskodeBeskrivelse ?? null,
        poststed: input.poststed ?? null,
        telefon: input.telefon ?? null,
        mobil: input.mobil ?? null,
        epostadresse: input.epostadresse ?? null,
        dagligLederNavn: input.dagligLederNavn ?? null,
        styrelederNavn: input.styrelederNavn ?? null,
        domain: input.domain ?? null,
        registrertIMva: input.registrertIMva ?? null,
        contactEnrichedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();
  return c.json({ lead: row }, 201);
});

leadsRoute.get('/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const [row] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, user.id), eq(leads.id, id)))
    .limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Lead ikke funnet.' } }, 404);
  return c.json({ lead: row });
});

leadsRoute.patch('/:id', zValidator('json', updateLeadSchema), async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const patch = c.req.valid('json');
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (patch.followUpDate !== undefined)
    updates.followUpDate = patch.followUpDate ? new Date(patch.followUpDate) : null;
  if (patch.lastContactDate !== undefined)
    updates.lastContactDate = patch.lastContactDate ? new Date(patch.lastContactDate) : null;
  const [row] = await db
    .update(leads)
    .set(updates)
    .where(and(eq(leads.userId, user.id), eq(leads.id, id)))
    .returning();
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Lead ikke funnet.' } }, 404);
  return c.json({ lead: row });
});

leadsRoute.delete('/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const result = await db
    .delete(leads)
    .where(and(eq(leads.userId, user.id), eq(leads.id, id)))
    .returning({ id: leads.id });
  if (!result.length) return c.json({ error: { code: 'NOT_FOUND', message: 'Lead ikke funnet.' } }, 404);
  return c.json({ ok: true });
});

leadsRoute.post(
  '/:id/dispatch-webhook',
  zValidator('json', z.object({ webhookConfigId: z.string().uuid() })),
  async (c) => {
    const user = getUser(c);
    const id = c.req.param('id');
    const { webhookConfigId } = c.req.valid('json');
    try {
      const result = await dispatchLeadToWebhook(user.id, id, webhookConfigId);
      return c.json({ result });
    } catch (err) {
      return c.json(
        {
          error: {
            code: 'DISPATCH_FAILED',
            message: err instanceof Error ? err.message : 'Dispatch feilet.',
          },
        },
        400,
      );
    }
  },
);

export { leadsRoute };
