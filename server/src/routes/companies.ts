import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { enrichCompanySchema, fetchCompaniesSchema } from '../../../shared/types.js';
import { fetchCompaniesForDate } from '../services/brreg.js';
import { enrichCompany } from '../services/enrich.js';
import type { AppEnv } from '../auth/middleware.js';

const companies = new Hono<AppEnv>();

companies.post('/fetch', zValidator('json', fetchCompaniesSchema), async (c) => {
  const { date } = c.req.valid('json');
  try {
    const list = await fetchCompaniesForDate(date, { withRoller: false });
    return c.json({ date, count: list.length, companies: list });
  } catch (err) {
    return c.json(
      {
        error: {
          code: 'BRREG_FAILED',
          message: err instanceof Error ? err.message : 'Brreg-fetch feilet.',
        },
      },
      502,
    );
  }
});

companies.post('/enrich', zValidator('json', enrichCompanySchema), async (c) => {
  const { orgNumber, name, poststed } = c.req.valid('json');
  const result = await enrichCompany(orgNumber, name, poststed);
  if (!result) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Fant ikke selskap.' } },
      404,
    );
  }
  return c.json({ company: result });
});

export { companies };
