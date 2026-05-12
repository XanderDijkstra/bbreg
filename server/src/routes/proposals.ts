import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { leads, proposals } from '../db/schema.js';
import { getUser, type AppEnv } from '../auth/middleware.js';
import {
  SERVICE_TEMPLATES,
  buildDefaultProposalData,
  type ProposalData,
  type ServiceType,
} from '../../../shared/proposal-templates.js';
import { buildProposalPdf } from '../services/proposal-pdf.js';

const serviceTypeSchema = z.enum(['website', 'meta_ads', 'seo', 'google_ads', 'reviews', 'custom']);

const generateInputSchema = z.object({
  leadId: z.string().uuid().optional(),
  serviceType: serviceTypeSchema,
  clientName: z.string().min(1),
  clientContact: z.string().optional(),
  monthlyPriceNok: z.number().int().positive(),
  freeSetup: z.boolean().optional(),
  bindingPeriod: z.string().optional(),
  cancellation: z.string().optional(),
  adBudget: z.string().optional(),
  save: z.boolean().default(true),
  data: z.unknown().optional(), // optional override of the full ProposalData
});

const updateProposalSchema = z.object({
  monthlyPriceNok: z.number().int().positive().optional(),
  data: z.unknown().optional(),
});

export const proposalsRoute = new Hono<AppEnv>();

proposalsRoute.get('/templates', (c) => {
  const out = Object.fromEntries(
    Object.entries(SERVICE_TEMPLATES).map(([k, v]) => [
      k,
      {
        label: v.label,
        defaultEyebrow: v.defaultEyebrow,
        defaultProposalTitle: v.defaultProposalTitle,
        heroTemplate: v.heroTemplate,
        deliverables: v.deliverables,
      },
    ]),
  );
  return c.json({ templates: out });
});

proposalsRoute.get('/', async (c) => {
  const user = getUser(c);
  const rows = await db
    .select()
    .from(proposals)
    .where(eq(proposals.userId, user.id))
    .orderBy(desc(proposals.createdAt))
    .limit(200);
  return c.json({ proposals: rows });
});

proposalsRoute.get('/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const [row] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.userId, user.id), eq(proposals.id, id)))
    .limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Tilbud ikke funnet.' } }, 404);
  return c.json({ proposal: row });
});

proposalsRoute.patch('/:id', zValidator('json', updateProposalSchema), async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const patch = c.req.valid('json');
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.monthlyPriceNok !== undefined) updates.monthlyPriceNok = patch.monthlyPriceNok;
  if (patch.data !== undefined) updates.data = patch.data;
  const [row] = await db
    .update(proposals)
    .set(updates)
    .where(and(eq(proposals.userId, user.id), eq(proposals.id, id)))
    .returning();
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Tilbud ikke funnet.' } }, 404);
  return c.json({ proposal: row });
});

proposalsRoute.delete('/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const result = await db
    .delete(proposals)
    .where(and(eq(proposals.userId, user.id), eq(proposals.id, id)))
    .returning({ id: proposals.id });
  if (!result.length) return c.json({ error: { code: 'NOT_FOUND', message: 'Tilbud ikke funnet.' } }, 404);
  return c.json({ ok: true });
});

// Generate (and optionally save) a proposal, returning the PDF binary.
proposalsRoute.post('/generate', zValidator('json', generateInputSchema), async (c) => {
  const user = getUser(c);
  const input = c.req.valid('json');

  let clientName = input.clientName;
  let clientContact = input.clientContact;
  // If a lead was provided, prefer its fields.
  if (input.leadId) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.userId, user.id), eq(leads.id, input.leadId)))
      .limit(1);
    if (lead) {
      clientName = clientName || lead.navn;
      clientContact = clientContact || lead.dagligLederNavn || 'Bedriften';
    }
  }

  const proposalData: ProposalData =
    (input.data as ProposalData | undefined) ??
    buildDefaultProposalData({
      serviceType: input.serviceType as ServiceType,
      clientName,
      clientContact,
      monthlyPriceNok: input.monthlyPriceNok,
      freeSetup: input.freeSetup,
      bindingPeriod: input.bindingPeriod,
      cancellation: input.cancellation,
      adBudget: input.adBudget,
    });

  let proposalId: string | null = null;
  if (input.save) {
    const [row] = await db
      .insert(proposals)
      .values({
        userId: user.id,
        leadId: input.leadId ?? null,
        clientName: proposalData.clientName,
        serviceType: input.serviceType,
        proposalTitle: proposalData.proposalTitle,
        monthlyPriceNok: input.monthlyPriceNok,
        data: proposalData,
      })
      .returning({ id: proposals.id });
    proposalId = row?.id ?? null;
  }

  const pdf = await buildProposalPdf(proposalData);
  const fname = `FX Media - ${proposalData.proposalTitle} - ${proposalData.clientName}.pdf`;
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="${encodeFilename(fname)}"`);
  if (proposalId) c.header('X-Proposal-Id', proposalId);
  return c.body(new Uint8Array(pdf));
});

// Regenerate a saved proposal's PDF.
proposalsRoute.post('/:id/regenerate', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const [row] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.userId, user.id), eq(proposals.id, id)))
    .limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Tilbud ikke funnet.' } }, 404);
  const pdf = await buildProposalPdf(row.data as ProposalData);
  const fname = `FX Media - ${row.proposalTitle} - ${row.clientName}.pdf`;
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="${encodeFilename(fname)}"`);
  return c.body(new Uint8Array(pdf));
});

function encodeFilename(name: string): string {
  return name.replace(/"/g, '').replace(/[\r\n]/g, ' ');
}
