import type { EnrichedCompany } from '../../../shared/types.js';
import { fetchRoller, shapeCompany } from './brreg.js';
import { searchUnit } from './opplysningen.js';

const BRREG_BASE = 'https://data.brreg.no/enhetsregisteret/api';

export async function enrichCompany(
  orgNumber: string,
  fallbackName?: string,
  fallbackPoststed?: string,
): Promise<EnrichedCompany | null> {
  let shaped: EnrichedCompany | null = null;
  try {
    const res = await fetch(`${BRREG_BASE}/enheter/${orgNumber}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const detail = (await res.json()) as Parameters<typeof shapeCompany>[0];
      shaped = shapeCompany(detail);
    }
  } catch {
    // continue to fallback
  }

  if (!shaped) {
    if (!fallbackName) return null;
    shaped = {
      organisasjonsnummer: orgNumber,
      navn: fallbackName,
      organisasjonsformKode: null,
      organisasjonsformBeskrivelse: null,
      registreringsdato: null,
      naeringskode: null,
      naeringskodeBeskrivelse: null,
      poststed: fallbackPoststed ?? null,
      postnummer: null,
      domain: null,
      registrertIMva: null,
      telefon: null,
      mobil: null,
      epostadresse: null,
      dagligLederNavn: null,
      dagligLederFodselsdato: null,
      dagligLederGender: null,
      styrelederNavn: null,
      styremedlemmer: [],
      rollerRaw: [],
      institusjonellSektorkode: null,
      institusjonellSektorkodeBeskrivelse: null,
    };
  }

  // Augment with roller
  const roller = await fetchRoller(orgNumber);
  Object.assign(shaped, roller);

  // 1881 fallback if missing phone or email
  const needsPhone = !shaped.telefon && !shaped.mobil;
  const needsEmail = !shaped.epostadresse;
  if ((needsPhone || needsEmail) && shaped.navn) {
    const found = await searchUnit({ name: shaped.navn, poststed: shaped.poststed });
    if (found) {
      if (needsPhone) {
        shaped.telefon = found.telefon ?? shaped.telefon;
        shaped.mobil = found.mobil ?? shaped.mobil;
      }
      if (needsEmail) {
        shaped.epostadresse = found.epostadresse ?? shaped.epostadresse;
      }
    }
  }

  return shaped;
}
