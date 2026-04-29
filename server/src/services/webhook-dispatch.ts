import pLimit from 'p-limit';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { excludedIndustries, leads, webhookConfigs, webhookDeliveries } from '../db/schema.js';
import type { EnrichedCompany, WebhookPayload } from '../../../shared/types.js';
import { pickPhone } from '../lib/phone.js';
import { isExcludedByUser, isHardExcluded } from '../lib/nace.js';
import { fetchCompaniesForDate } from './brreg.js';
import { logger } from '../lib/logger.js';

export function buildPayload(c: EnrichedCompany): WebhookPayload {
  const phone = pickPhone(c.mobil, c.telefon);
  return {
    company_name: c.navn ?? '',
    email: c.epostadresse ?? '',
    phone,
    org_number: c.organisasjonsnummer ?? '',
    industry: c.naeringskodeBeskrivelse ?? '',
    industry_code: c.naeringskode ?? '',
    city: c.poststed ?? '',
    registration_date: c.registreringsdato ?? '',
    company_type: (c.organisasjonsformKode ?? '').toLowerCase(),
    vat_registered: c.registrertIMva ? 'Yes' : 'No',
    credit_score: '',
    director_name: c.dagligLederNavn ?? '',
    source: 'Brønnøysundregistrene',
  };
}

interface DispatchResult {
  webhookConfigId: string;
  orgNumber: string;
  companyName: string;
  status: number | null;
  success: boolean;
  error?: string;
}

export async function dispatchOne(
  webhookConfigId: string,
  url: string,
  payload: WebhookPayload,
  userId: string,
): Promise<DispatchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let status: number | null = null;
  let body = '';
  let success = false;
  let errMsg: string | undefined;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    status = res.status;
    body = (await res.text()).slice(0, 2048);
    success = res.ok;
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timeout);
  }

  await db.insert(webhookDeliveries).values({
    userId,
    webhookConfigId,
    orgNumber: payload.org_number || null,
    companyName: payload.company_name || null,
    payload,
    responseStatus: status,
    responseBody: body || errMsg || null,
    success,
  });

  return {
    webhookConfigId,
    orgNumber: payload.org_number,
    companyName: payload.company_name,
    status,
    success,
    error: errMsg,
  };
}

export interface EligibilityOpts {
  userId: string;
  excludeUserIndustries?: boolean;
}

export async function filterEligible(
  companies: EnrichedCompany[],
  opts: EligibilityOpts,
): Promise<EnrichedCompany[]> {
  const exclusions = opts.excludeUserIndustries
    ? (
        await db
          .select({ code: excludedIndustries.industryCode })
          .from(excludedIndustries)
          .where(eq(excludedIndustries.userId, opts.userId))
      ).map((r) => r.code)
    : [];

  return companies.filter((c) => {
    const phone = pickPhone(c.mobil, c.telefon);
    const hasContact = Boolean(phone || c.epostadresse);
    if (!hasContact) return false;
    if (isHardExcluded(c.naeringskode)) return false;
    if (isExcludedByUser(c.naeringskode, exclusions)) return false;
    return true;
  });
}

export interface DispatchSummary {
  date: string;
  userId: string;
  totalCompanies: number;
  eligibleCount: number;
  webhooksUsed: number;
  deliveries: DispatchResult[];
}

export async function dispatchForUser(
  userId: string,
  date: string,
  opts: { onlyAutoSend: boolean },
): Promise<DispatchSummary> {
  const hooks = await db
    .select()
    .from(webhookConfigs)
    .where(
      opts.onlyAutoSend
        ? and(
            eq(webhookConfigs.userId, userId),
            eq(webhookConfigs.enabled, true),
            eq(webhookConfigs.autoSend, true),
          )
        : and(eq(webhookConfigs.userId, userId), eq(webhookConfigs.enabled, true)),
    );

  if (!hooks.length) {
    return {
      date,
      userId,
      totalCompanies: 0,
      eligibleCount: 0,
      webhooksUsed: 0,
      deliveries: [],
    };
  }

  const companies = await fetchCompaniesForDate(date, { withRoller: true });
  const eligible = await filterEligible(companies, { userId, excludeUserIndustries: true });

  const limiter = pLimit(5);
  const deliveries: DispatchResult[] = [];
  await Promise.all(
    eligible.flatMap((c) => {
      const payload = buildPayload(c);
      return hooks.map((h) =>
        limiter(async () => {
          const r = await dispatchOne(h.id, h.url, payload, userId);
          deliveries.push(r);
        }),
      );
    }),
  );

  logger.info(
    {
      userId,
      date,
      totalCompanies: companies.length,
      eligibleCount: eligible.length,
      webhooksUsed: hooks.length,
      deliveries: deliveries.length,
    },
    'webhook dispatch complete',
  );

  return {
    date,
    userId,
    totalCompanies: companies.length,
    eligibleCount: eligible.length,
    webhooksUsed: hooks.length,
    deliveries,
  };
}

export async function dispatchLeadToWebhook(
  userId: string,
  leadId: string,
  webhookConfigId: string,
): Promise<DispatchResult> {
  const lead = (
    await db
      .select()
      .from(leads)
      .where(and(eq(leads.userId, userId), eq(leads.id, leadId)))
      .limit(1)
  )[0];
  if (!lead) throw new Error('Lead not found');

  const hook = (
    await db
      .select()
      .from(webhookConfigs)
      .where(and(eq(webhookConfigs.userId, userId), eq(webhookConfigs.id, webhookConfigId)))
      .limit(1)
  )[0];
  if (!hook) throw new Error('Webhook config not found');

  const payload = buildPayload({
    organisasjonsnummer: lead.organisasjonsnummer,
    navn: lead.navn,
    organisasjonsformKode: lead.organisasjonsformKode,
    organisasjonsformBeskrivelse: lead.organisasjonsformBeskrivelse,
    registreringsdato: lead.registreringsdato,
    naeringskode: lead.naeringskode,
    naeringskodeBeskrivelse: lead.naeringskodeBeskrivelse,
    poststed: lead.poststed,
    postnummer: null,
    domain: lead.domain,
    registrertIMva: lead.registrertIMva,
    telefon: lead.telefon,
    mobil: lead.mobil,
    epostadresse: lead.epostadresse,
    dagligLederNavn: lead.dagligLederNavn,
    dagligLederFodselsdato: lead.dagligLederFodselsdato,
    dagligLederGender: lead.dagligLederGender,
    styrelederNavn: lead.styrelederNavn,
    styremedlemmer: (lead.styremedlemmer as unknown[]) ?? [],
    rollerRaw: (lead.rollerRaw as unknown[]) ?? [],
    institusjonellSektorkode: lead.institusjonellSektorkode,
    institusjonellSektorkodeBeskrivelse: lead.institusjonellSektorkodeBeskrivelse,
  });

  return dispatchOne(hook.id, hook.url, payload, userId);
}
