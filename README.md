# BedriftsDB

Norsk B2B leadsplattform: hent nyregistrerte selskaper fra Brønnøysundregisteret, beriker
kontaktinfo via 1881, kvalifiser leads, og send dem videre til CRM via webhooks eller kald
e-post via Resend. Daglig cron kl. 06:00 CET sender dagens kvalifiserte selskaper til alle
aktive auto-send webhooks.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind + shadcn-style UI + TanStack Query.
- **Backend**: Hono på Node 20 + Neon Postgres + Drizzle ORM. Argon2-hashet
  e-post/passord-auth med session-cookies lagret i Postgres.
- **Hosting**: Vercel (statisk frontend + serverless Hono-funksjon under `/api/*`).
- **Cron**: Vercel Cron (anbefalt) eller GitHub Actions som workflow.
- **Eksterne**: Brreg Enhetsregisteret (gratis), 1881 Opplysningen (Ocp-Apim-key), Resend.

## Komme i gang lokalt

1. Kopier `.env.example` til `.env` og fyll inn `DATABASE_URL` (Neon-pooler eller direct).
2. Installer:
   ```bash
   npm install
   npm run db:generate   # genererer migrasjonen i server/drizzle/
   npm run db:migrate    # kjører den mot Neon
   ```
3. Start dev:
   ```bash
   npm run dev   # starter API på 8787 og Vite på 5173 (proxy /api → 8787)
   ```
4. Åpne http://localhost:5173, opprett en konto, gå til **Oppdagelse** og hent gårsdagens
   selskaper.

## Test webhooks lokalt

1. Lag en URL på https://webhook.site og kopier den.
2. På `/automation` legg til en webhook med URL'en, skru på **Aktiv** og **Auto-send**.
3. Trykk **Send dagens leads nå**. Du vil se én POST per kvalifisert lead på webhook.site.
4. Aktivitetsfanen viser status og responskode for hver leveranse.

## Webhook payload (én per lead)

```json
{
  "company_name": "Eksempel AS",
  "email": "post@eksempel.no",
  "phone": "+4798765432",
  "org_number": "987654321",
  "industry": "Drift av restauranter og kafeer",
  "industry_code": "56.101",
  "city": "Oslo",
  "registration_date": "2025-04-28",
  "company_type": "as",
  "vat_registered": "Yes",
  "credit_score": "",
  "director_name": "Kari Nordmann",
  "source": "Brønnøysundregistrene"
}
```

`company_type` er alltid lowercase. Tomme felter er `""` (ikke `null`). Telefon er normalisert
til `+47…` (mobil prioriteres over fasttelefon).

## Kvalifiseringsregler (automatisering)

Et selskap er kvalifisert for automatisk webhook-sending hvis ALT er sant:

1. Har telefon eller e-post (etter berikelse).
2. NACE-kode starter ikke med `73` (reklame – alltid hard-ekskludert).
3. NACE-kode er ikke i brukerens egen ekskluderingsliste på `/email-filter`.

Både AS og ENK sendes. Manuell **Lagre som lead** fra Oppdagelse omgår filteret.

## Deploy til Vercel

1. Push repoet til GitHub.
2. På Vercel: **Add New Project** → import repoet. Vercel finner `vercel.json` og bygger
   automatisk klientens statiske assets til `client/dist`. API-funksjonen ligger under
   `/api/index.ts` og håndterer alt under `/api/*`.
3. Sett miljøvariablene under **Project → Settings → Environment Variables**:
   - `DATABASE_URL` – Neon connection string (HTTP-driveren passer for serverless).
   - `SESSION_SECRET` – tilfeldig hex.
   - `CRON_SECRET` – tilfeldig token (Vercel sender denne automatisk i cron).
   - `OPPLYSNINGEN_SUBSCRIPTION_KEY` – valgfri.
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_WEBHOOK_SECRET` –
     valgfrie (kreves for kald e-post).
   - `NODE_ENV=production`.
4. Vercel Cron er allerede konfigurert i `vercel.json`:
   ```json
   "crons": [{ "path": "/api/cron/daily-fetch", "schedule": "0 6 * * *" }]
   ```
   Endepunktet sjekker `Authorization: Bearer ${CRON_SECRET}` og dispatcher kun webhooks
   som har `enabled = true AND auto_send = true`.

### Alternativ: GitHub Actions cron

Hvis du heller vil bruke GitHub Actions (f.eks. for å treffe et selv-hostet endepunkt):

1. Sett repository secrets `APP_URL` (uten trailing slash) og `CRON_SECRET`.
2. Workflow ligger i `.github/workflows/daily-fetch.yml` og treffer endepunktet kl. 06:00 UTC.

## Database-migrasjoner

```bash
npm run db:generate     # etter endringer i server/src/db/schema.ts
npm run db:migrate      # kjør pending migrasjoner
npm run db:push         # raskt skjema-push for utvikling
npm run db:studio       # Drizzle Studio
```

## Sikkerhet og auth

- Alle DB-spørringer mot brukerdata har `where eq(table.userId, user.id)`.
- `requireAuth` middleware avviser med 401 hvis cookien mangler eller utløpt.
- Passord hashes med argon2 (`@node-rs/argon2`).
- Sessions lagres i `sessions`-tabellen (sha256-hashet token), 30-dagers utløp med
  glidende fornyelse.
- Cron-endepunktet er fullstendig adskilt: ingen sessions, kun `Authorization`-header.

## Smoketest

```bash
# 1. Health
curl -s https://your-app.vercel.app/api/health

# 2. Sign up + sign in returnerer Set-Cookie
curl -i -X POST https://your-app.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"changethis123"}'

# 3. Brreg fetch (med cookie fra forrige)
curl -X POST https://your-app.vercel.app/api/companies/fetch \
  -H "Content-Type: application/json" \
  -b "auth_session=…" \
  -d '{"date":"2025-04-28"}'

# 4. Cron (krever CRON_SECRET)
curl -X POST https://your-app.vercel.app/api/cron/daily-fetch \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Begrensninger / TODO

- Ingen postnummer→koordinat-lookup ennå; kartet på Oppdagelse er ikke aktivert.
- Resend signaturverifisering er en soft-accept (sjekker bare at headeren finnes når
  `RESEND_WEBHOOK_SECRET` er satt). Bytt til `svix`-pakken for streng validering.
- Lead-deduplisering er per-bruker. To brukere kan ha samme orgnr som lead.
- `credit_score` er alltid `""` i webhook-payloaden inntil en kredittscore-leverandør
  er integrert.
