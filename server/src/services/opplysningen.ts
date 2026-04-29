import { logger } from '../lib/logger.js';

const OPPLYSNINGEN_BASE = 'https://services.api1881.no/search/unit';

interface UnitSearchResult {
  units?: Array<{
    name?: string;
    phoneNumbers?: Array<{ telephoneNumber?: string; type?: string }>;
    email?: string;
    geography?: { postalCode?: string; postalArea?: string };
  }>;
}

export async function searchUnit(query: {
  name: string;
  poststed?: string | null;
}): Promise<{
  telefon: string | null;
  mobil: string | null;
  epostadresse: string | null;
} | null> {
  const key = process.env.OPPLYSNINGEN_SUBSCRIPTION_KEY;
  if (!key) return null;
  try {
    const params = new URLSearchParams({ query: query.name });
    const res = await fetch(`${OPPLYSNINGEN_BASE}?${params.toString()}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as UnitSearchResult;
    const units = data.units ?? [];
    if (!units.length) return null;
    let pick = units[0]!;
    if (query.poststed) {
      const match = units.find(
        (u) =>
          u.geography?.postalArea?.toLowerCase().includes(query.poststed!.toLowerCase()) ||
          u.name?.toLowerCase() === query.name.toLowerCase(),
      );
      if (match) pick = match;
    }
    let telefon: string | null = null;
    let mobil: string | null = null;
    for (const p of pick.phoneNumbers ?? []) {
      if (!p.telephoneNumber) continue;
      const t = p.type?.toLowerCase() ?? '';
      if (t.includes('mobil') && !mobil) mobil = p.telephoneNumber;
      else if (!telefon) telefon = p.telephoneNumber;
    }
    return {
      telefon,
      mobil,
      epostadresse: pick.email ?? null,
    };
  } catch (err) {
    logger.warn({ err }, '1881 search failed');
    return null;
  }
}
