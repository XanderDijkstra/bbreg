// Service templates for the proposal generator.
// Shared between server (PDF build) and client (template pre-fill in UI).

export type ServiceType = 'website' | 'meta_ads' | 'seo' | 'google_ads' | 'reviews' | 'custom';

export interface Deliverable {
  num: string;
  title: string;
  bullets: string[];
}

export interface Step {
  num: string;
  title: string;
  desc: string;
}

export interface ProposalData {
  clientName: string;
  clientContact: string;
  proposalDate: string;          // formatted Norwegian, e.g. "12. mai 2026"
  proposalTitle: string;
  serviceType: ServiceType;

  eyebrow: string;
  heroHtml: string;              // supports {orange:...} markup for orange-colored span
  sublead: string;

  deliverablesIntro: string;
  deliverables: Deliverable[];   // exactly 4 (renders as 2x2 grid)

  pricing: {
    intro: string;
    leftCard: { label: string; amount: string; subtitle: string; description: string };
    rightCard: { label: string; amount: string; subtitle: string; description: string };
    summaryRows: Array<[string, string]>;
  };

  nextSteps: {
    intro: string;
    steps: Step[];               // exactly 4
  };

  cta: {
    headlineHtml: string;
    subtext: string;
    primary: string;             // primary button label (email)
    secondary: string;           // secondary button label (phone)
  };
}

export interface ServiceTemplate {
  label: string;
  defaultEyebrow: string;
  defaultProposalTitle: string;
  heroTemplate: string;          // contains {clientName} and {orange:...} markup
  deliverables: Deliverable[];
}

export const SERVICE_TEMPLATES: Record<Exclude<ServiceType, 'custom'>, ServiceTemplate> = {
  website: {
    label: 'Nettside',
    defaultEyebrow: 'EN GRATIS NETTSIDE · KUN KR {price} / MND',
    defaultProposalTitle: 'Nettside Tilbud',
    heroTemplate: 'Profesjonell {orange:nettside} for {orange:{clientName}}',
    deliverables: [
      {
        num: '01',
        title: 'Design & Utvikling',
        bullets: [
          'Skreddersydd nettside for {clientName}',
          'Responsivt design – mobil, nettbrett, desktop',
          'Forside, om oss, tjenester, kontakt og flere',
          'Rent og profesjonelt uttrykk tilpasset bransjen',
        ],
      },
      {
        num: '02',
        title: 'Innhold & Struktur',
        bullets: [
          'Innholdsrådgivning og teksthjelp',
          'SEO-vennlig sidestruktur fra start',
          'Profesjonell bildebehandling og optimalisering',
          'Tydelig «call to action» på hver side',
        ],
      },
      {
        num: '03',
        title: 'Teknisk oppsett',
        bullets: [
          'SSL-sertifikat og sikkerhet',
          'Hastighetsoptimalisering',
          'Google Analytics og Search Console oppsett',
          'Kontaktskjema med e-postvarsling',
        ],
      },
      {
        num: '04',
        title: 'Lansering & Overlevering',
        bullets: [
          'Forhåndsvisning før du bestemmer deg',
          'Testing og kvalitetssikring',
          'Kort gjennomgang etter lansering',
          'Vi tar hånd om alt det tekniske',
        ],
      },
    ],
  },
  meta_ads: {
    label: 'Meta Ads',
    defaultEyebrow: 'FACEBOOK & INSTAGRAM ANNONSER',
    defaultProposalTitle: 'Meta Ads Tilbud',
    heroTemplate: 'Meta-annonser som {orange:konverterer} for {orange:{clientName}}',
    deliverables: [
      {
        num: '01',
        title: 'Oppsett & Strategi',
        bullets: [
          'Kampanjestrategi tilpasset bransje og marked',
          'Meta Business Manager + annonsekonto + piksel',
          'Målgruppebygging: alder, geo, interesser, lookalikes',
          'Konverteringssporing på nettsiden',
        ],
      },
      {
        num: '02',
        title: 'Annonseproduksjon',
        bullets: [
          '3–5 motiver per måned (feed/stories/reels)',
          'Profesjonelt design med tydelig CTA',
          'A/B-testing av motiver',
          'Tekstet og formatert for Meta',
        ],
      },
      {
        num: '03',
        title: 'Kampanjeforvaltning',
        bullets: [
          'Løpende optimalisering – budsjett, målgrupper, motiver',
          'Retargeting av besøkende',
          'Negative ord og budjustering',
          'Månedlig resultatrapport',
        ],
      },
      {
        num: '04',
        title: 'Teknisk oppsett',
        bullets: [
          'Meta-piksel og Conversions API',
          'Event-tracking (skjema, telefonklikk, booking)',
          'Domeneverifisering',
          'Rapportering i dashbordet',
        ],
      },
    ],
  },
  seo: {
    label: 'SEO',
    defaultEyebrow: 'SØKEMOTOROPTIMALISERING',
    defaultProposalTitle: 'SEO Tilbud',
    heroTemplate: 'Bli funnet av {orange:flere kunder} – synlighet for {orange:{clientName}}',
    deliverables: [
      {
        num: '01',
        title: 'Teknisk SEO',
        bullets: [
          'Teknisk audit (hastighet, mobil, indeksering)',
          'Feilretting og forbedringer',
          'Search Console og Analytics oppsett',
          'Strukturert data og schema',
        ],
      },
      {
        num: '02',
        title: 'Søkeord & Strategi',
        bullets: [
          'Kartlegging av relevante søkeord',
          'Konkurrentanalyse',
          'Prioritering etter volum og intensjon',
          'Lokal SEO-strategi',
        ],
      },
      {
        num: '03',
        title: 'Innholdsproduksjon',
        bullets: [
          'SEO-optimaliserte artikler hver måned',
          'On-page optimalisering av eksisterende sider',
          'Intern lenkestruktur',
          'Lokal og kommersiell intensjon',
        ],
      },
      {
        num: '04',
        title: 'Google Min Bedrift & Rapportering',
        bullets: [
          'Optimalisering av Google-profil',
          'Strategi for flere anmeldelser',
          'Månedlig rapport: rangering, trafikk, synlighet',
          'Anbefalinger for neste periode',
        ],
      },
    ],
  },
  google_ads: {
    label: 'Google Ads',
    defaultEyebrow: 'GOOGLE SEARCH-ANNONSER',
    defaultProposalTitle: 'Google Ads Tilbud',
    heroTemplate: 'Google-annonser som gir {orange:resultater} for {orange:{clientName}}',
    deliverables: [
      {
        num: '01',
        title: 'Oppsett & Strategi',
        bullets: [
          'Kontostruktur tilpasset bransje og budsjett',
          'Søkeordsanalyse og annonsegrupper',
          'Konverteringssporing (Tag Manager)',
          'Negative søkeord fra start',
        ],
      },
      {
        num: '02',
        title: 'Annonseproduksjon',
        bullets: [
          'Responsive søkeannonser',
          'Annonseutvidelser (sitelinks, callouts)',
          'A/B-testing av tekster',
          'Landingsside-anbefalinger',
        ],
      },
      {
        num: '03',
        title: 'Kampanjeforvaltning',
        bullets: [
          'Løpende budsjettstyring og budoptimalisering',
          'Søkeordsforedling',
          'Kvalitetsscore-optimalisering',
          'Budstrategier (manuell/automatisk)',
        ],
      },
      {
        num: '04',
        title: 'Rapportering',
        bullets: [
          'Månedlig rapport: klikk, konverteringer, CPA, ROAS',
          'Anbefalinger for neste periode',
          'Insights fra søkeordsdata',
          'Konkurrentinnsikt',
        ],
      },
    ],
  },
  reviews: {
    label: 'Anmeldelser',
    defaultEyebrow: 'AUTOMATISERTE GOOGLE-ANMELDELSER',
    defaultProposalTitle: 'Anmeldelser Tilbud',
    heroTemplate: 'Flere {orange:5-stjerners anmeldelser} for {orange:{clientName}}',
    deliverables: [
      {
        num: '01',
        title: 'Oppsett',
        bullets: [
          'NFC-kort med personlig design',
          'Landingsside for enkel anmeldelse (QR + NFC)',
          'Integrasjon med Google Min Bedrift',
          'Branded til bedriften',
        ],
      },
      {
        num: '02',
        title: 'AI-drevne svar',
        bullets: [
          'Automatisk generering av svar',
          'Tilpasset tone og stil for bedriften',
          'Håndtering av positive og negative',
          'Manuell godkjenning hvis ønskelig',
        ],
      },
      {
        num: '03',
        title: 'Oppfølging',
        bullets: [
          'Månedlig oversikt over nye anmeldelser',
          'Gjennomsnittlig score-tracking',
          'Strategi for å øke volum',
          'Rådgivning ved negativ feedback',
        ],
      },
      {
        num: '04',
        title: 'Rapportering',
        bullets: [
          'Månedsrapport i dashbordet',
          'Sammenligning over tid',
          'Konkurrentbenchmarking',
          'Anbefalinger for forbedring',
        ],
      },
    ],
  },
};

const MONTHS_NB = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

export function formatNorwegianDate(d: Date = new Date()): string {
  const day = d.getDate();
  const month = MONTHS_NB[d.getMonth()];
  const year = d.getFullYear();
  return `${day}. ${month} ${year}`;
}

export interface BuildDataInput {
  serviceType: ServiceType;
  clientName: string;
  clientContact?: string;
  monthlyPriceNok: number;
  freeSetup?: boolean;
  bindingPeriod?: string;
  cancellation?: string;
  adBudget?: string;             // for ad services
  customTemplate?: Partial<ServiceTemplate>;
}

const interp = (s: string, vars: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export function buildDefaultProposalData(input: BuildDataInput): ProposalData {
  const t =
    input.serviceType === 'custom'
      ? SERVICE_TEMPLATES.website
      : SERVICE_TEMPLATES[input.serviceType];
  const tpl = { ...t, ...(input.customTemplate ?? {}) };
  const contact = input.clientContact?.trim() || 'Bedriften';
  const vars = {
    clientName: input.clientName,
    price: String(input.monthlyPriceNok),
  };
  const freeSetup = input.freeSetup ?? true;
  const binding = input.bindingPeriod ?? 'Ingen';
  const cancellation = input.cancellation ?? 'Når som helst';

  const deliverables = tpl.deliverables.map((d) => ({
    num: d.num,
    title: d.title,
    bullets: d.bullets.map((b) => interp(b, vars)),
  }));

  return {
    clientName: input.clientName,
    clientContact: contact,
    proposalDate: formatNorwegianDate(),
    proposalTitle: tpl.defaultProposalTitle,
    serviceType: input.serviceType,

    eyebrow: interp(tpl.defaultEyebrow, vars).toUpperCase(),
    heroHtml: interp(tpl.heroTemplate, vars),
    sublead:
      input.serviceType === 'website'
        ? 'Vi designer og lanserer hele nettsiden uten oppstartskostnad. Du ser det ferdige resultatet før du bestemmer deg.'
        : 'Vi setter opp og forvalter kampanjene for deg. Du følger resultatene i dashbordet og betaler kun løpende.',

    deliverablesIntro:
      freeSetup
        ? `Vi setter opp en komplett løsning helt uten oppstartskostnad. Hvis du liker resultatet, betaler du kun kr ${input.monthlyPriceNok}/mnd for drift, domene og support. Ingen bindingstid.`
        : `Vi setter opp en komplett løsning og forvalter den løpende for kr ${input.monthlyPriceNok}/mnd. Ingen bindingstid.`,
    deliverables,

    pricing: {
      intro: 'Ingen skjulte kostnader. Du vet nøyaktig hva du betaler – og hva du får.',
      leftCard: freeSetup
        ? {
            label: 'OPPSETT & DESIGN',
            amount: 'Gratis',
            subtitle: 'Ingen oppstartskostnad',
            description: 'Du ser det ferdige resultatet før du bestemmer deg for å lansere.',
          }
        : {
            label: 'OPPSETT',
            amount: `kr ${input.monthlyPriceNok}`,
            subtitle: 'Engangs oppstart',
            description: 'Strategi, oppsett og første kampanje.',
          },
      rightCard: {
        label: input.serviceType === 'website' ? 'DRIFT, DOMENE & SUPPORT' : 'LØPENDE FORVALTNING',
        amount: `kr ${input.monthlyPriceNok}`,
        subtitle: 'per måned eks. mva.',
        description:
          input.serviceType === 'website'
            ? 'Hosting · domene · sikkerhet · backup · support og mindre justeringer.'
            : 'Annonsestyring, optimalisering, rapportering og fortløpende rådgivning.',
      },
      summaryRows: [
        ['Total løpende kostnad', `kr ${input.monthlyPriceNok} / mnd`],
        ['Bindingstid', binding],
        ['Oppsigelse', cancellation],
        ...(input.adBudget ? ([['Anbefalt annonsebudsjett', `kr ${input.adBudget} / mnd`]] as Array<[string, string]>) : []),
      ],
    },

    nextSteps: {
      intro: 'Enkel prosess fra dag én. Du kan trekke deg når som helst – uten kostnad.',
      steps: [
        { num: '01', title: 'Bekreft interesse', desc: 'Svar på e-posten – eller ring +47 401 85 596.' },
        { num: '02', title: 'Kort oppstartsmøte', desc: 'Uforpliktende videosamtale. Vi blir kjent med deg og det du driver med.' },
        { num: '03', title: 'Produksjon', desc: 'Vi setter opp hele løsningen og sender deg en lenke til forhåndsvisning.' },
        {
          num: '04',
          title: 'Du bestemmer',
          desc: freeSetup
            ? `Liker du resultatet, lanserer vi – kun kr ${input.monthlyPriceNok}/mnd. Ellers: ingen kostnad.`
            : `Vi går i gang så snart du gir grønt lys – kr ${input.monthlyPriceNok}/mnd, ingen bindingstid.`,
        },
      ],
    },

    cta: {
      headlineHtml: 'Klar til å {orange:komme i gang?}',
      subtext: 'Send en e-post eller ring – så setter vi opp et kort møte.',
      primary: 'info@fx-media.no',
      secondary: '+47 401 85 596',
    },
  };
}
