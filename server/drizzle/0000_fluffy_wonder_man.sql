CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_number" text,
	"company_name" text,
	"recipient_email" text NOT NULL,
	"offer_id" uuid,
	"industry_code" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"resend_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "excluded_industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"industry_code" text NOT NULL,
	"industry_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organisasjonsnummer" text NOT NULL,
	"navn" text NOT NULL,
	"organisasjonsform_kode" text,
	"organisasjonsform_beskrivelse" text,
	"registreringsdato" text,
	"naeringskode" text,
	"naeringskode_beskrivelse" text,
	"poststed" text,
	"domain" text,
	"credit_score" integer,
	"registrert_i_mva" boolean,
	"daglig_leder_navn" text,
	"daglig_leder_fodselsdato" text,
	"daglig_leder_gender" text,
	"telefon" text,
	"mobil" text,
	"epostadresse" text,
	"styreleder_navn" text,
	"styremedlemmer" jsonb DEFAULT '[]'::jsonb,
	"roller_raw" jsonb DEFAULT '[]'::jsonb,
	"institusjonell_sektorkode" text,
	"institusjonell_sektorkode_beskrivelse" text,
	"antall_underenheter" integer DEFAULT 0,
	"contact_enriched_at" timestamp with time zone,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"follow_up_date" timestamp with time zone,
	"last_contact_date" timestamp with time zone,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"email_subject" text NOT NULL,
	"email_body" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"hashed_password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auto_send" boolean DEFAULT false NOT NULL,
	"funnel_type" text DEFAULT 'phone',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"webhook_config_id" uuid NOT NULL,
	"org_number" text,
	"company_name" text,
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"success" boolean NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excluded_industries" ADD CONSTRAINT "excluded_industries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_logs_user_sent_idx" ON "email_logs" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "excluded_user_code_unique" ON "excluded_industries" USING btree ("user_id","industry_code");--> statement-breakpoint
CREATE INDEX "leads_user_status_idx" ON "leads" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "leads_user_created_idx" ON "leads" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_user_orgnr_unique" ON "leads" USING btree ("user_id","organisasjonsnummer");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_user_sent_idx" ON "webhook_deliveries" USING btree ("user_id","sent_at");