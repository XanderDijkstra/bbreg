import pLimit from 'p-limit';
import type { BrregCompany, EnrichedCompany } from '../../../shared/types.js';
import { logger } from '../lib/logger.js';

const BRREG_BASE = 'https://data.brreg.no/enhetsregisteret/api';
const PAGE_SIZE = 1000;
const DETAIL_CONCURRENCY = 8;

interface BrregListResponse {
  _embedded?: { enheter?: BrregCompany[] };
  page?: { totalPages?: number; number?: number; size?: number; totalElements?: number };
}

async function fetchPage(date: string, page: number): Promise<BrregListResponse> {
  const params = new URLSearchParams({
    fraRegistreringsdatoEnhetsregisteret: date,
    tilRegistreringsdatoEnhetsregisteret: date,
    size: String(PAGE_SIZE),
    page: String(page),
  });
  const url = `${BRREG_BASE}/enheter?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Brreg list ${res.status} for ${date} page ${page}`);
  }
  return (await res.json()) as BrregListResponse;
}

async function fetchDetail(orgnr: string): Promise<BrregCompany | null> {
  try {
    const res = await fetch(`${BRREG_BASE}/enheter/${orgnr}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as BrregCompany;
  } catch (err) {
    logger.warn({ err, orgnr }, 'brreg detail failed');
    return null;
  }
}

interface RolleGruppe {
  type?: { kode?: string; beskrivelse?: string };
  roller?: Array<{
    type?: { kode?: string; beskrivelse?: string };
    person?: {
      navn?: { fornavn?: string; mellomnavn?: string; etternavn?: string };
      foedselsdato?: string;
      kjoenn?: string;
    };
    fratraadt?: boolean;
  }>;
}

interface RollerResponse {
  rollegrupper?: RolleGruppe[];
}

export async function fetchRoller(orgnr: string): Promise<{
  dagligLederNavn: string | null;
  dagligLederFodselsdato: string | null;
  dagligLederGender: string | null;
  styrelederNavn: string | null;
  styremedlemmer: unknown[];
  rollerRaw: unknown[];
}> {
  const empty = {
    dagligLederNavn: null,
    dagligLederFodselsdato: null,
    dagligLederGender: null,
    styrelederNavn: null,
    styremedlemmer: [] as unknown[],
    rollerRaw: [] as unknown[],
  };
  try {
    const res = await fetch(`${BRREG_BASE}/enheter/${orgnr}/roller`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as RollerResponse;
    const groups = data.rollegrupper ?? [];

    let dagligLederNavn: string | null = null;
    let dagligLederFodselsdato: string | null = null;
    let dagligLederGender: string | null = null;
    let styrelederNavn: string | null = null;
    const styremedlemmer: unknown[] = [];

    const fmtName = (n?: { fornavn?: string; mellomnavn?: string; etternavn?: string }) => {
      if (!n) return null;
      return [n.fornavn, n.mellomnavn, n.etternavn].filter(Boolean).join(' ').trim() || null;
    };

    for (const g of groups) {
      for (const r of g.roller ?? []) {
        if (r.fratraadt) continue;
        const code = r.type?.kode;
        if (code === 'DAGL' && !dagligLederNavn) {
          dagligLederNavn = fmtName(r.person?.navn);
          dagligLederFodselsdato = r.person?.foedselsdato ?? null;
          dagligLederGender = r.person?.kjoenn ?? null;
        } else if (code === 'LEDE' && !styrelederNavn) {
          styrelederNavn = fmtName(r.person?.navn);
        } else if (code === 'MEDL') {
          const name = fmtName(r.person?.navn);
          if (name) styremedlemmer.push({ navn: name });
        }
      }
    }

    return {
      dagligLederNavn,
      dagligLederFodselsdato,
      dagligLederGender,
      styrelederNavn,
      styremedlemmer,
      rollerRaw: groups,
    };
  } catch (err) {
    logger.warn({ err, orgnr }, 'brreg roller failed');
    return empty;
  }
}

function extractDomain(hjemmeside?: string): string | null {
  if (!hjemmeside) return null;
  try {
    const url = hjemmeside.startsWith('http') ? hjemmeside : `https://${hjemmeside}`;
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function shapeCompany(detail: BrregCompany): EnrichedCompany {
  return {
    organisasjonsnummer: detail.organisasjonsnummer,
    navn: detail.navn,
    organisasjonsformKode: detail.organisasjonsform?.kode ?? null,
    organisasjonsformBeskrivelse: detail.organisasjonsform?.beskrivelse ?? null,
    registreringsdato: detail.registreringsdatoEnhetsregisteret ?? null,
    naeringskode: detail.naeringskode1?.kode ?? null,
    naeringskodeBeskrivelse: detail.naeringskode1?.beskrivelse ?? null,
    poststed: detail.forretningsadresse?.poststed ?? null,
    postnummer: detail.forretningsadresse?.postnummer ?? null,
    domain: extractDomain(detail.hjemmeside),
    registrertIMva: detail.registrertIMvaregisteret ?? null,
    telefon: detail.telefon ?? null,
    mobil: detail.mobil ?? null,
    epostadresse: detail.epostadresse ?? null,
    dagligLederNavn: null,
    dagligLederFodselsdato: null,
    dagligLederGender: null,
    styrelederNavn: null,
    styremedlemmer: [],
    rollerRaw: [],
    institusjonellSektorkode: detail.institusjonellSektorkode?.kode ?? null,
    institusjonellSektorkodeBeskrivelse: detail.institusjonellSektorkode?.beskrivelse ?? null,
  };
}

export async function fetchCompaniesForDate(
  date: string,
  opts: { withRoller?: boolean } = {},
): Promise<EnrichedCompany[]> {
  const start = Date.now();

  const collected: BrregCompany[] = [];
  let page = 0;
  while (true) {
    const data = await fetchPage(date, page);
    const enheter = data._embedded?.enheter ?? [];
    collected.push(...enheter);
    const totalPages = data.page?.totalPages ?? 0;
    if (page + 1 >= totalPages || enheter.length === 0) break;
    page++;
    if (page > 30) break; // safety guard
  }

  // The list endpoint already contains every field the detail endpoint returns
  // for newly registered companies (organisasjonsform, naeringskode1,
  // forretningsadresse, MVA flag, sektorkode). Phone/email/roller are pulled
  // on demand when the user clicks "Lagre som lead" (via /api/companies/enrich).
  const enriched = collected.map(shapeCompany);

  if (opts.withRoller) {
    const limiter = pLimit(DETAIL_CONCURRENCY);
    await Promise.all(
      enriched.map((shaped) =>
        limiter(async () => {
          const roller = await fetchRoller(shaped.organisasjonsnummer);
          Object.assign(shaped, roller);
        }),
      ),
    );
  }

  logger.info(
    { date, count: enriched.length, durationMs: Date.now() - start },
    'brreg fetchCompaniesForDate',
  );

  return enriched;
}
