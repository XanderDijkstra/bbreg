import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, FileText, Mail, Phone, Search, Sparkles } from 'lucide-react';
import { ProposalDialog } from '@/components/ProposalDialog';
import { api } from '@/lib/api';
import { yesterdayOslo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface EnrichedCompany {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsformKode: string | null;
  organisasjonsformBeskrivelse: string | null;
  registreringsdato: string | null;
  naeringskode: string | null;
  naeringskodeBeskrivelse: string | null;
  poststed: string | null;
  postnummer: string | null;
  domain: string | null;
  registrertIMva: boolean | null;
  telefon: string | null;
  mobil: string | null;
  epostadresse: string | null;
  dagligLederNavn: string | null;
}

interface FetchResp {
  date: string;
  count: number;
  companies: EnrichedCompany[];
}

interface Filters {
  search: string;
  form: string;
  hasPhone: boolean;
  hasEmail: boolean;
  nacePrefix: string;
  poststed: string;
}

export function DiscoveryPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(yesterdayOslo());
  const [data, setData] = useState<FetchResp | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    form: '',
    hasPhone: false,
    hasEmail: false,
    nacePrefix: '',
    poststed: '',
  });
  const [selected, setSelected] = useState<EnrichedCompany | null>(null);
  const [proposalCompany, setProposalCompany] = useState<EnrichedCompany | null>(null);

  const fetcher = useMutation({
    mutationFn: () => api.post<FetchResp>('/companies/fetch', { date }),
    onSuccess: (res) => {
      setData(res);
      toast.success(`Hentet ${res.count} selskaper for ${res.date}`);
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Brreg-fetch feilet.'),
  });

  const enrichSave = useMutation({
    mutationFn: async (c: EnrichedCompany) => {
      const enriched = await api.post<{ company: EnrichedCompany }>(
        '/companies/enrich',
        {
          orgNumber: c.organisasjonsnummer,
          name: c.navn,
          poststed: c.poststed,
        },
      );
      return api.post<{ lead: { id: string } }>('/leads', {
        organisasjonsnummer: c.organisasjonsnummer,
        navn: c.navn,
        organisasjonsformKode: enriched.company.organisasjonsformKode ?? c.organisasjonsformKode,
        organisasjonsformBeskrivelse:
          enriched.company.organisasjonsformBeskrivelse ?? c.organisasjonsformBeskrivelse,
        registreringsdato: enriched.company.registreringsdato ?? c.registreringsdato,
        naeringskode: enriched.company.naeringskode ?? c.naeringskode,
        naeringskodeBeskrivelse:
          enriched.company.naeringskodeBeskrivelse ?? c.naeringskodeBeskrivelse,
        poststed: enriched.company.poststed ?? c.poststed,
        domain: enriched.company.domain ?? c.domain,
        registrertIMva: enriched.company.registrertIMva ?? c.registrertIMva,
        telefon: enriched.company.telefon ?? c.telefon,
        mobil: enriched.company.mobil ?? c.mobil,
        epostadresse: enriched.company.epostadresse ?? c.epostadresse,
        dagligLederNavn: enriched.company.dagligLederNavn ?? c.dagligLederNavn,
      });
    },
    onSuccess: () => {
      toast.success('Lead lagret');
      qc.invalidateQueries({ queryKey: ['leads'] });
      setSelected(null);
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Lagring feilet.'),
  });

  const filtered = useMemo(() => {
    if (!data?.companies) return [];
    return data.companies.filter((c) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !c.navn?.toLowerCase().includes(q) &&
          !c.organisasjonsnummer.includes(q) &&
          !(c.dagligLederNavn?.toLowerCase().includes(q) ?? false)
        ) {
          return false;
        }
      }
      if (filters.form && c.organisasjonsformKode !== filters.form) return false;
      const phone = c.mobil || c.telefon;
      if (filters.hasPhone && !phone) return false;
      if (filters.hasEmail && !c.epostadresse) return false;
      if (filters.nacePrefix && !c.naeringskode?.startsWith(filters.nacePrefix)) return false;
      if (
        filters.poststed &&
        !(c.poststed?.toLowerCase().includes(filters.poststed.toLowerCase()) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const all = data?.companies ?? [];
    const withPhone = all.filter((c) => c.mobil || c.telefon).length;
    const withEmail = all.filter((c) => c.epostadresse).length;
    const eligible = all.filter(
      (c) =>
        (c.mobil || c.telefon || c.epostadresse) &&
        !(c.naeringskode ?? '').startsWith('73'),
    ).length;
    return { total: all.length, withPhone, withEmail, eligible };
  }, [data]);

  const orgFormOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.companies ?? []).forEach((c) => {
      if (c.organisasjonsformKode) set.add(c.organisasjonsformKode);
    });
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oppdagelse</h1>
          <p className="text-muted-foreground">
            Hent nylig registrerte selskaper fra Brønnøysundregisteret.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor="discovery-date">Dato</Label>
            <Input
              id="discovery-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button
            onClick={() => fetcher.mutate()}
            disabled={fetcher.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {fetcher.isPending ? 'Henter …' : 'Hent selskaper'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Totalt" value={stats.total} icon={Building2} />
        <StatCard label="Med telefon" value={stats.withPhone} icon={Phone} />
        <StatCard label="Med e-post" value={stats.withEmail} icon={Mail} />
        <StatCard label="Kvalifisert" value={stats.eligible} icon={Sparkles} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="f-search">Søk</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="f-search"
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Navn, orgnr, daglig leder"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f-form">Selskapsform</Label>
              <Select
                id="f-form"
                value={filters.form}
                onChange={(e) => setFilters((f) => ({ ...f, form: e.target.value }))}
              >
                <option value="">Alle</option>
                {orgFormOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="f-nace">NACE-prefiks</Label>
              <Input
                id="f-nace"
                value={filters.nacePrefix}
                onChange={(e) => setFilters((f) => ({ ...f, nacePrefix: e.target.value }))}
                placeholder="f.eks. 62"
              />
            </div>
            <div>
              <Label htmlFor="f-by">Poststed</Label>
              <Input
                id="f-by"
                value={filters.poststed}
                onChange={(e) => setFilters((f) => ({ ...f, poststed: e.target.value }))}
                placeholder="Oslo"
              />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.hasPhone}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, hasPhone: v }))}
                />
                Har telefon
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.hasEmail}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, hasEmail: v }))}
                />
                Har e-post
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Selskaper ({filtered.length}
            {filtered.length !== stats.total ? ` av ${stats.total}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {data ? 'Ingen treff med valgte filtre.' : 'Velg en dato og trykk «Hent selskaper».'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Bransje</TableHead>
                  <TableHead>Sted</TableHead>
                  <TableHead>Kontakt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((c) => (
                  <TableRow
                    key={c.organisasjonsnummer}
                    className="cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell>
                      <div className="font-medium">{c.navn}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.organisasjonsnummer}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.organisasjonsformKode ?? '–'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <div className="text-sm">{c.naeringskodeBeskrivelse ?? '–'}</div>
                      <div className="text-xs text-muted-foreground">{c.naeringskode}</div>
                    </TableCell>
                    <TableCell>{c.poststed ?? '–'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(c.mobil || c.telefon) && (
                          <Badge variant="success">
                            <Phone className="mr-1 h-3 w-3" />
                            Tlf
                          </Badge>
                        )}
                        {c.epostadresse && (
                          <Badge variant="success">
                            <Mail className="mr-1 h-3 w-3" />
                            E-post
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > 500 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Viser de første 500 radene. Snevre inn med filtrene for å se flere.
            </p>
          )}
        </CardContent>
      </Card>

      <CompanyDetailDialog
        company={selected}
        onClose={() => setSelected(null)}
        onSave={(c) => enrichSave.mutate(c)}
        saving={enrichSave.isPending}
        onProposal={(c) => setProposalCompany(c)}
      />
      {proposalCompany && (
        <ProposalDialog
          open
          onClose={() => setProposalCompany(null)}
          defaultClientName={proposalCompany.navn}
          defaultContact={proposalCompany.dagligLederNavn ?? undefined}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <Icon className="h-8 w-8 text-primary/60" />
      </CardContent>
    </Card>
  );
}

function CompanyDetailDialog({
  company,
  onClose,
  onSave,
  saving,
  onProposal,
}: {
  company: EnrichedCompany | null;
  onClose: () => void;
  onSave: (c: EnrichedCompany) => void;
  saving: boolean;
  onProposal: (c: EnrichedCompany) => void;
}) {
  if (!company) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={company.navn}>
      <div className="space-y-3 text-sm">
        <Row label="Organisasjonsnummer" value={company.organisasjonsnummer} />
        <Row
          label="Selskapsform"
          value={`${company.organisasjonsformKode ?? '–'} – ${company.organisasjonsformBeskrivelse ?? ''}`}
        />
        <Row
          label="Bransje"
          value={`${company.naeringskode ?? '–'} ${company.naeringskodeBeskrivelse ?? ''}`}
        />
        <Row label="Registreringsdato" value={company.registreringsdato ?? '–'} />
        <Row label="Sted" value={company.poststed ?? '–'} />
        <Row label="Daglig leder" value={company.dagligLederNavn ?? '–'} />
        <Row label="Telefon" value={company.telefon ?? '–'} />
        <Row label="Mobil" value={company.mobil ?? '–'} />
        <Row label="E-post" value={company.epostadresse ?? '–'} />
        <Row label="Domene" value={company.domain ?? '–'} />
        <Row label="MVA-registrert" value={company.registrertIMva ? 'Ja' : 'Nei'} />
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Lukk
        </Button>
        <Button variant="secondary" onClick={() => onProposal(company)}>
          <FileText className="mr-2 h-4 w-4" />
          Generer tilbud
        </Button>
        <Button onClick={() => onSave(company)} disabled={saving}>
          {saving ? 'Lagrer …' : 'Lagre som lead'}
        </Button>
      </div>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
