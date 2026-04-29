// Curated list of common NACE / SN2007 codes used by Brreg.
// Not exhaustive — covers the most common 2-digit groups + many 5-digit codes
// the user is likely to want to exclude. Sections A–U.
//
// Source basis: SSB Standard for næringsgruppering (SN2007).

export interface NaceEntry {
  code: string;
  description: string;
  section: string;
}

export const NACE_SECTIONS: Record<string, string> = {
  A: 'Jordbruk, skogbruk og fiske',
  B: 'Bergverksdrift og utvinning',
  C: 'Industri',
  D: 'Elektrisitets-, gass-, damp- og varmtvannsforsyning',
  E: 'Vannforsyning, avløps- og renovasjonsvirksomhet',
  F: 'Bygge- og anleggsvirksomhet',
  G: 'Varehandel; reparasjon av motorvogner',
  H: 'Transport og lagring',
  I: 'Overnattings- og serveringsvirksomhet',
  J: 'Informasjon og kommunikasjon',
  K: 'Finansierings- og forsikringsvirksomhet',
  L: 'Omsetning og drift av fast eiendom',
  M: 'Faglig, vitenskapelig og teknisk tjenesteyting',
  N: 'Forretningsmessig tjenesteyting',
  O: 'Offentlig administrasjon og forsvar; trygdeordninger',
  P: 'Undervisning',
  Q: 'Helse- og sosialtjenester',
  R: 'Kulturell virksomhet, underholdning og fritid',
  S: 'Annen tjenesteyting',
  T: 'Lønnet arbeid i private husholdninger',
  U: 'Internasjonale organisasjoner og organer',
};

export const COMMON_INDUSTRIES: NaceEntry[] = [
  // A
  { code: '01', description: 'Jordbruk og tjenester tilknyttet jordbruk', section: 'A' },
  { code: '02', description: 'Skogbruk og tjenester tilknyttet skogbruk', section: 'A' },
  { code: '03', description: 'Fiske, fangst og akvakultur', section: 'A' },
  // B
  { code: '05', description: 'Bryting av steinkull og brunkull', section: 'B' },
  { code: '06', description: 'Utvinning av råolje og naturgass', section: 'B' },
  { code: '07', description: 'Bryting av metallholdig malm', section: 'B' },
  { code: '08', description: 'Annen bryting og utvinning', section: 'B' },
  { code: '09', description: 'Tjenester tilknyttet bergverksdrift', section: 'B' },
  // C
  { code: '10', description: 'Produksjon av nærings- og nytelsesmidler', section: 'C' },
  { code: '11', description: 'Produksjon av drikkevarer', section: 'C' },
  { code: '13', description: 'Produksjon av tekstiler', section: 'C' },
  { code: '14', description: 'Produksjon av klær', section: 'C' },
  { code: '15', description: 'Produksjon av lær og lærvarer', section: 'C' },
  { code: '16', description: 'Produksjon av trelast og varer av tre', section: 'C' },
  { code: '17', description: 'Produksjon av papir og papirvarer', section: 'C' },
  { code: '18', description: 'Trykking og reproduksjon av innspilte opptak', section: 'C' },
  { code: '20', description: 'Produksjon av kjemikalier og kjemiske produkter', section: 'C' },
  { code: '21', description: 'Produksjon av farmasøytiske råvarer og preparater', section: 'C' },
  { code: '22', description: 'Produksjon av gummi- og plastprodukter', section: 'C' },
  { code: '23', description: 'Produksjon av andre ikke-metallholdige mineralprodukter', section: 'C' },
  { code: '24', description: 'Produksjon av metaller', section: 'C' },
  { code: '25', description: 'Produksjon av metallvarer', section: 'C' },
  { code: '26', description: 'Produksjon av datamaskiner og elektronikk', section: 'C' },
  { code: '27', description: 'Produksjon av elektrisk utstyr', section: 'C' },
  { code: '28', description: 'Produksjon av maskiner og utstyr', section: 'C' },
  { code: '29', description: 'Produksjon av motorvogner og tilhengere', section: 'C' },
  { code: '30', description: 'Produksjon av andre transportmidler', section: 'C' },
  { code: '31', description: 'Produksjon av møbler', section: 'C' },
  { code: '32', description: 'Annen industriproduksjon', section: 'C' },
  { code: '33', description: 'Reparasjon og installasjon av maskiner og utstyr', section: 'C' },
  // D
  { code: '35', description: 'Elektrisitets-, gass-, damp- og varmtvannsforsyning', section: 'D' },
  // E
  { code: '36', description: 'Uttak fra kilde, rensing og distribusjon av vann', section: 'E' },
  { code: '37', description: 'Oppsamling og behandling av avløpsvann', section: 'E' },
  { code: '38', description: 'Innsamling, behandling, disponering og gjenvinning av avfall', section: 'E' },
  { code: '39', description: 'Miljørydding, miljørensing og lignende virksomhet', section: 'E' },
  // F
  { code: '41', description: 'Oppføring av bygninger', section: 'F' },
  { code: '41.200', description: 'Oppføring av bygninger', section: 'F' },
  { code: '42', description: 'Anleggsvirksomhet', section: 'F' },
  { code: '43', description: 'Spesialisert bygge- og anleggsvirksomhet', section: 'F' },
  { code: '43.210', description: 'Elektrisk installasjonsarbeid', section: 'F' },
  { code: '43.220', description: 'VVS-arbeid', section: 'F' },
  { code: '43.310', description: 'Stukkatørarbeid og pussing', section: 'F' },
  { code: '43.320', description: 'Snekkerarbeid', section: 'F' },
  { code: '43.330', description: 'Gulvlegging og tapetsering', section: 'F' },
  { code: '43.341', description: 'Malerarbeid', section: 'F' },
  { code: '43.342', description: 'Glassarbeid', section: 'F' },
  { code: '43.390', description: 'Annen ferdiggjøring av bygninger', section: 'F' },
  { code: '43.910', description: 'Takarbeid', section: 'F' },
  { code: '43.991', description: 'Riving av bygninger og andre konstruksjoner', section: 'F' },
  { code: '43.999', description: 'Annen spesialisert bygge- og anleggsvirksomhet', section: 'F' },
  // G
  { code: '45', description: 'Handel med og reparasjon av motorvogner', section: 'G' },
  { code: '46', description: 'Agentur- og engroshandel', section: 'G' },
  { code: '47', description: 'Detaljhandel', section: 'G' },
  { code: '47.110', description: 'Butikkhandel med bredt vareutvalg, mest dagligvarer', section: 'G' },
  { code: '47.190', description: 'Butikkhandel med bredt vareutvalg ellers', section: 'G' },
  { code: '47.910', description: 'Postordrehandel og netthandel', section: 'G' },
  // H
  { code: '49', description: 'Landtransport og rørtransport', section: 'H' },
  { code: '49.410', description: 'Godstransport på vei', section: 'H' },
  { code: '50', description: 'Sjøfart', section: 'H' },
  { code: '51', description: 'Lufttransport', section: 'H' },
  { code: '52', description: 'Lagring og andre tjenester tilknyttet transport', section: 'H' },
  { code: '53', description: 'Post- og distribusjonsvirksomhet', section: 'H' },
  // I
  { code: '55', description: 'Overnattingsvirksomhet', section: 'I' },
  { code: '56', description: 'Serveringsvirksomhet', section: 'I' },
  { code: '56.101', description: 'Drift av restauranter og kafeer', section: 'I' },
  { code: '56.210', description: 'Cateringvirksomhet', section: 'I' },
  { code: '56.301', description: 'Drift av puber', section: 'I' },
  // J
  { code: '58', description: 'Forlagsvirksomhet', section: 'J' },
  { code: '59', description: 'Film-, video- og fjernsynsproduksjon', section: 'J' },
  { code: '60', description: 'Radio- og fjernsynskringkasting', section: 'J' },
  { code: '61', description: 'Telekommunikasjon', section: 'J' },
  { code: '62', description: 'Tjenester tilknyttet informasjonsteknologi', section: 'J' },
  { code: '62.010', description: 'Programmeringstjenester', section: 'J' },
  { code: '62.020', description: 'Konsulentvirksomhet tilknyttet informasjonsteknologi', section: 'J' },
  { code: '62.090', description: 'Andre tjenester tilknyttet informasjonsteknologi', section: 'J' },
  { code: '63', description: 'Informasjonstjenester', section: 'J' },
  // K
  { code: '64', description: 'Finansieringsvirksomhet', section: 'K' },
  { code: '65', description: 'Forsikringsvirksomhet og pensjonskasser', section: 'K' },
  { code: '66', description: 'Tjenester tilknyttet finansierings- og forsikringsvirksomhet', section: 'K' },
  // L
  { code: '68', description: 'Omsetning og drift av fast eiendom', section: 'L' },
  // M
  { code: '69', description: 'Juridisk og regnskapsmessig tjenesteyting', section: 'M' },
  { code: '69.100', description: 'Juridisk tjenesteyting', section: 'M' },
  { code: '69.201', description: 'Regnskap og bokføring', section: 'M' },
  { code: '69.202', description: 'Revisjon', section: 'M' },
  { code: '70', description: 'Hovedkontortjenester, administrativ rådgivning', section: 'M' },
  { code: '70.220', description: 'Bedriftsrådgivning og annen administrativ rådgivning', section: 'M' },
  { code: '71', description: 'Arkitektvirksomhet og teknisk konsulentvirksomhet', section: 'M' },
  { code: '71.112', description: 'Arkitekttjenester vedrørende byggverk', section: 'M' },
  { code: '71.121', description: 'Byggeteknisk konsulentvirksomhet', section: 'M' },
  { code: '71.129', description: 'Annen teknisk konsulentvirksomhet', section: 'M' },
  { code: '72', description: 'Forskning og utviklingsarbeid', section: 'M' },
  { code: '73', description: 'Annonse- og reklamevirksomhet og markedsundersøkelser', section: 'M' },
  { code: '73.110', description: 'Reklamebyråer', section: 'M' },
  { code: '73.120', description: 'Medieformidlingstjenester', section: 'M' },
  { code: '73.200', description: 'Markedsundersøkelser og opinionsmålinger', section: 'M' },
  { code: '74', description: 'Annen faglig, vitenskapelig og teknisk virksomhet', section: 'M' },
  { code: '74.101', description: 'Industridesign, produktdesign og annen teknisk designvirksomhet', section: 'M' },
  { code: '74.102', description: 'Grafisk og visuell kommunikasjonsdesign', section: 'M' },
  { code: '74.201', description: 'Portrett- og reklamefotografering', section: 'M' },
  { code: '74.300', description: 'Oversettelses- og tolkevirksomhet', section: 'M' },
  { code: '74.900', description: 'Annen faglig, vitenskapelig og teknisk virksomhet', section: 'M' },
  { code: '75', description: 'Veterinærtjenester', section: 'M' },
  // N
  { code: '77', description: 'Utleie- og leasingvirksomhet', section: 'N' },
  { code: '78', description: 'Arbeidskrafttjenester', section: 'N' },
  { code: '79', description: 'Reisebyrå- og reisearrangørvirksomhet', section: 'N' },
  { code: '80', description: 'Vakttjeneste og etterforskning', section: 'N' },
  { code: '81', description: 'Tjenester tilknyttet eiendomsdrift', section: 'N' },
  { code: '81.210', description: 'Rengjøring av bygninger', section: 'N' },
  { code: '81.220', description: 'Annen rengjøringsvirksomhet av bygninger og industriell rengjøring', section: 'N' },
  { code: '81.300', description: 'Beplantning av hager og parkanlegg', section: 'N' },
  { code: '82', description: 'Annen forretningsmessig tjenesteyting', section: 'N' },
  // O
  { code: '84', description: 'Offentlig administrasjon og forsvar; trygdeordninger', section: 'O' },
  // P
  { code: '85', description: 'Undervisning', section: 'P' },
  // Q
  { code: '86', description: 'Helsetjenester', section: 'Q' },
  { code: '86.210', description: 'Allmenn legetjeneste', section: 'Q' },
  { code: '86.901', description: 'Fysioterapitjeneste', section: 'Q' },
  { code: '86.909', description: 'Andre helsetjenester', section: 'Q' },
  { code: '87', description: 'Pleie- og omsorgstjenester i institusjon', section: 'Q' },
  { code: '88', description: 'Sosiale omsorgstjenester uten botilbud', section: 'Q' },
  // R
  { code: '90', description: 'Kunstnerisk virksomhet og underholdningsvirksomhet', section: 'R' },
  { code: '91', description: 'Drift av biblioteker, arkiver, museer og annen kulturvirksomhet', section: 'R' },
  { code: '92', description: 'Lotteri og totalisatorspill', section: 'R' },
  { code: '93', description: 'Sports- og fritidsaktiviteter', section: 'R' },
  // S
  { code: '94', description: 'Aktiviteter i medlemsorganisasjoner', section: 'S' },
  { code: '95', description: 'Reparasjon av datamaskiner, husholdningsvarer og varer til personlig bruk', section: 'S' },
  { code: '96', description: 'Annen personlig tjenesteyting', section: 'S' },
  { code: '96.020', description: 'Frisering og annen skjønnhetspleie', section: 'S' },
  { code: '96.021', description: 'Frisørvirksomhet', section: 'S' },
  { code: '96.022', description: 'Skjønnhetspleie', section: 'S' },
  { code: '96.040', description: 'Virksomhet knyttet til kroppspleie', section: 'S' },
  { code: '96.090', description: 'Annen personlig tjenesteyting ikke nevnt annet sted', section: 'S' },
  // T
  { code: '97', description: 'Lønnet arbeid i private husholdninger', section: 'T' },
  // U
  { code: '99', description: 'Internasjonale organisasjoner og organer', section: 'U' },
];

const HARD_EXCLUDED_PREFIXES = ['73'];

export function isHardExcluded(naeringskode?: string | null): boolean {
  if (!naeringskode) return false;
  return HARD_EXCLUDED_PREFIXES.some((p) => naeringskode.startsWith(p));
}

export function isExcludedByUser(
  naeringskode: string | null | undefined,
  userExclusions: string[],
): boolean {
  if (!naeringskode) return false;
  return userExclusions.some((code) => {
    if (!code) return false;
    return naeringskode === code || naeringskode.startsWith(code);
  });
}
