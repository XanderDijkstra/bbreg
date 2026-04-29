import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const signinSchema = signupSchema;
export type SigninInput = z.infer<typeof signinSchema>;

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const fetchCompaniesSchema = z.object({
  date: dateOnlySchema,
});

export const enrichCompanySchema = z.object({
  orgNumber: z.string().regex(/^\d{9}$/),
  name: z.string().optional(),
  poststed: z.string().optional(),
});

export const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'won',
  'lost',
]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const upsertLeadSchema = z.object({
  organisasjonsnummer: z.string().regex(/^\d{9}$/),
  navn: z.string(),
  organisasjonsformKode: z.string().nullable().optional(),
  organisasjonsformBeskrivelse: z.string().nullable().optional(),
  registreringsdato: z.string().nullable().optional(),
  naeringskode: z.string().nullable().optional(),
  naeringskodeBeskrivelse: z.string().nullable().optional(),
  poststed: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  creditScore: z.number().nullable().optional(),
  registrertIMva: z.boolean().nullable().optional(),
  dagligLederNavn: z.string().nullable().optional(),
  dagligLederFodselsdato: z.string().nullable().optional(),
  dagligLederGender: z.string().nullable().optional(),
  telefon: z.string().nullable().optional(),
  mobil: z.string().nullable().optional(),
  epostadresse: z.string().nullable().optional(),
  styrelederNavn: z.string().nullable().optional(),
  styremedlemmer: z.array(z.unknown()).optional(),
  rollerRaw: z.array(z.unknown()).optional(),
  institusjonellSektorkode: z.string().nullable().optional(),
  institusjonellSektorkodeBeskrivelse: z.string().nullable().optional(),
  antallUnderenheter: z.number().nullable().optional(),
  status: leadStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
export type UpsertLeadInput = z.infer<typeof upsertLeadSchema>;

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  lastContactDate: z.string().datetime().nullable().optional(),
});

export const webhookConfigSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  enabled: z.boolean().default(true),
  autoSend: z.boolean().default(false),
  funnelType: z.enum(['phone', 'email']).default('phone'),
});
export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>;

export const webhookConfigPatchSchema = webhookConfigSchema.partial();

export const offerSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  emailSubject: z.string().min(1).max(300),
  emailBody: z.string().min(1),
  isActive: z.boolean().default(false),
});
export const offerPatchSchema = offerSchema.partial();

export const sendEmailSchema = z.object({
  leadId: z.string().uuid(),
  offerId: z.string().uuid(),
});

export const sendBulkEmailSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  offerId: z.string().uuid(),
});

export const excludedIndustrySchema = z.object({
  industryCode: z.string().min(2).max(10),
  industryDescription: z.string().nullable().optional(),
});

export interface BrregCompany {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode?: string; beskrivelse?: string };
  registreringsdatoEnhetsregisteret?: string;
  naeringskode1?: { kode?: string; beskrivelse?: string };
  forretningsadresse?: { poststed?: string; postnummer?: string; adresse?: string[] };
  hjemmeside?: string;
  telefon?: string;
  mobil?: string;
  epostadresse?: string;
  registrertIMvaregisteret?: boolean;
  institusjonellSektorkode?: { kode?: string; beskrivelse?: string };
  antallAnsatte?: number;
}

export interface EnrichedCompany {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsformKode: string | null;
  organisasjonsformBeskrivelse: string | null;
  registreringsdato: string | null;
  naeringskode: string | null;
  naeringskodeBeskrivelse: string | null;
  poststed: string | null;
  postnummer: string | null;
  domain: string | null;
  registrertIMva: boolean | null;
  telefon: string | null;
  mobil: string | null;
  epostadresse: string | null;
  dagligLederNavn: string | null;
  dagligLederFodselsdato: string | null;
  dagligLederGender: string | null;
  styrelederNavn: string | null;
  styremedlemmer: unknown[];
  rollerRaw: unknown[];
  institusjonellSektorkode: string | null;
  institusjonellSektorkodeBeskrivelse: string | null;
}

export interface WebhookPayload {
  company_name: string;
  email: string;
  phone: string;
  org_number: string;
  industry: string;
  industry_code: string;
  city: string;
  registration_date: string;
  company_type: string;
  vat_registered: 'Yes' | 'No';
  credit_score: number | '';
  director_name: string;
  source: 'Brønnøysundregistrene';
}
