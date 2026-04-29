# Progress

Initial scaffolding of BedriftsDB completed in one pass. All 14 build steps from §12 of the
spec are implemented at MVP level.

## Done

- [x] 1. Monorepo scaffold (package.json, tsconfigs, Vite, Tailwind, Hono /api/health).
- [x] 2. Drizzle schema + Neon HTTP client with lazy-initialized connection.
- [x] 3. Argon2 + cookie-session auth (Postgres-backed) + `/auth` page (signup/signin).
- [x] 4. Brreg service: list + detail + roller, concurrency-limited fan-out.
- [x] 5. Discovery page: date picker, stats, filters, table, detail dialog, save-as-lead.
- [x] 6. Webhook dispatch + configs CRUD + test-send endpoint (one POST per lead, flat payload).
- [x] 7. Automation page (Webhooks + Aktivitet tabs).
- [x] 8. Excluded industries: NACE list, CRUD endpoint, page UI, eligibility filter.
- [x] 9. 1881 enrichment fallback in `enrichCompany` (soft-fails when key missing).
- [x] 10. Cron endpoint + `node-cron` (opt-in via `ENABLE_LOCAL_CRON`) + Vercel Cron in
       `vercel.json` + GitHub Actions workflow as alternative.
- [x] 11. Offers CRUD + Email send/send-bulk via Resend + `email_logs` + Resend webhook
       receiver under `/api/email/resend-webhook`.
- [x] 12. Analytics page (status bar, top industries pie, weekly line, KPIs).
- [x] 13. CRM kanban (status columns + dropdown), OutreachStats, Wiki.
- [x] 14. README, `.env.example`, `vercel.json`, `.github/workflows/daily-fetch.yml`,
       smoke test in README.

## Verified

- `npm install` succeeds with the pinned versions.
- `npm run typecheck` passes for both server and client.
- `npm run build:web` produces `client/dist/index.html` + assets (~742 kB JS, ~18 kB CSS).
- `npm run build:api` compiles to `server/dist/`.
- `tsx server/src/index.ts` boots the Hono server. `GET /api/health` returns
  `{ ok: true, time }`. `GET /api/auth/me` returns `{ user: null }` without a session.

## Known caveats

- DB queries fail at runtime without `DATABASE_URL` (intentionally; client is lazy).
- The map on Discovery (mentioned in the spec) is not implemented; would need a
  postnummer→lat/lng lookup table (~5000 rows). Listed in the README TODO.
- Drag-and-drop on the CRM kanban uses a status dropdown rather than dnd-kit to keep
  the bundle smaller. Kanban itself is fully functional.
- Resend webhook signature is a soft-check; production should use the `svix` package.
