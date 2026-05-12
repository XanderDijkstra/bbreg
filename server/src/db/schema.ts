import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organisasjonsnummer: text('organisasjonsnummer').notNull(),
    navn: text('navn').notNull(),
    organisasjonsformKode: text('organisasjonsform_kode'),
    organisasjonsformBeskrivelse: text('organisasjonsform_beskrivelse'),
    registreringsdato: text('registreringsdato'),
    naeringskode: text('naeringskode'),
    naeringskodeBeskrivelse: text('naeringskode_beskrivelse'),
    poststed: text('poststed'),
    domain: text('domain'),
    creditScore: integer('credit_score'),
    registrertIMva: boolean('registrert_i_mva'),
    dagligLederNavn: text('daglig_leder_navn'),
    dagligLederFodselsdato: text('daglig_leder_fodselsdato'),
    dagligLederGender: text('daglig_leder_gender'),
    telefon: text('telefon'),
    mobil: text('mobil'),
    epostadresse: text('epostadresse'),
    styrelederNavn: text('styreleder_navn'),
    styremedlemmer: jsonb('styremedlemmer').$type<unknown[]>().default([]),
    rollerRaw: jsonb('roller_raw').$type<unknown[]>().default([]),
    institusjonellSektorkode: text('institusjonell_sektorkode'),
    institusjonellSektorkodeBeskrivelse: text('institusjonell_sektorkode_beskrivelse'),
    antallUnderenheter: integer('antall_underenheter').default(0),
    contactEnrichedAt: timestamp('contact_enriched_at', { withTimezone: true }),
    status: text('status').notNull().default('new'),
    notes: text('notes'),
    followUpDate: timestamp('follow_up_date', { withTimezone: true }),
    lastContactDate: timestamp('last_contact_date', { withTimezone: true }),
    tags: text('tags').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userStatusIdx: index('leads_user_status_idx').on(t.userId, t.status),
    userCreatedIdx: index('leads_user_created_idx').on(t.userId, t.createdAt),
    userOrgUnique: uniqueIndex('leads_user_orgnr_unique').on(t.userId, t.organisasjonsnummer),
  }),
);

export const excludedIndustries = pgTable(
  'excluded_industries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    industryCode: text('industry_code').notNull(),
    industryDescription: text('industry_description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCodeUnique: uniqueIndex('excluded_user_code_unique').on(t.userId, t.industryCode),
  }),
);

export const webhookConfigs = pgTable('webhook_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  autoSend: boolean('auto_send').notNull().default(false),
  funnelType: text('funnel_type').default('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  emailSubject: text('email_subject').notNull(),
  emailBody: text('email_body').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const emailLogs = pgTable(
  'email_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgNumber: text('org_number'),
    companyName: text('company_name'),
    recipientEmail: text('recipient_email').notNull(),
    offerId: uuid('offer_id'),
    industryCode: text('industry_code'),
    status: text('status').notNull().default('sent'),
    resendId: text('resend_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSentIdx: index('email_logs_user_sent_idx').on(t.userId, t.sentAt),
  }),
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    webhookConfigId: uuid('webhook_config_id').notNull(),
    orgNumber: text('org_number'),
    companyName: text('company_name'),
    payload: jsonb('payload').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    success: boolean('success').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSentIdx: index('webhook_deliveries_user_sent_idx').on(t.userId, t.sentAt),
  }),
);

export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    clientName: text('client_name').notNull(),
    serviceType: text('service_type').notNull(),
    proposalTitle: text('proposal_title').notNull(),
    monthlyPriceNok: integer('monthly_price_nok'),
    data: jsonb('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('proposals_user_created_idx').on(t.userId, t.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type ExcludedIndustry = typeof excludedIndustries.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
