import { logger } from '../lib/logger.js';

const RESEND_BASE = 'https://api.resend.com';

interface SendArgs {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}

export async function sendEmail(
  args: SendArgs,
): Promise<{ id: string | null; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = args.fromName ?? process.env.RESEND_FROM_NAME ?? 'BedriftsDB';
  if (!apiKey || !fromEmail) {
    return { id: null, error: 'RESEND_API_KEY or RESEND_FROM_EMAIL missing' };
  }
  try {
    const res = await fetch(`${RESEND_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [args.to],
        subject: args.subject,
        html: args.body,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      logger.warn({ status: res.status, msg: data.message }, 'resend send failed');
      return { id: null, error: data.message ?? `HTTP ${res.status}` };
    }
    return { id: data.id ?? null, error: null };
  } catch (err) {
    return { id: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface TemplateLead {
  navn?: string | null;
  dagligLederNavn?: string | null;
  poststed?: string | null;
  organisasjonsnummer?: string | null;
}

export function renderTemplate(template: string, lead: TemplateLead): string {
  const firstName =
    (lead.dagligLederNavn ?? '').split(' ').filter(Boolean)[0] ?? '';
  const map: Record<string, string> = {
    company_name: lead.navn ?? '',
    director_name: lead.dagligLederNavn ?? '',
    first_name: firstName,
    city: lead.poststed ?? '',
    org_number: lead.organisasjonsnummer ?? '',
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => map[key] ?? '');
}
