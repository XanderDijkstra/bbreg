import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProposalDialog } from '@/components/ProposalDialog';

interface Lead {
  id: string;
  navn: string;
  organisasjonsnummer: string;
  status: string;
  poststed: string | null;
  naeringskodeBeskrivelse: string | null;
  epostadresse: string | null;
  telefon: string | null;
  mobil: string | null;
}

const STATUSES = ['new', 'contacted', 'qualified', 'negotiating', 'won', 'lost'] as const;

const STATUS_LABEL: Record<string, string> = {
  new: 'Ny',
  contacted: 'Kontaktet',
  qualified: 'Kvalifisert',
  negotiating: 'Forhandling',
  won: 'Vunnet',
  lost: 'Tapt',
};

export function CrmPage() {
  const qc = useQueryClient();
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const list = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: () => api.get<{ leads: Lead[] }>('/leads?pageSize=200'),
  });

  const update = useMutation({
    mutationFn: (args: { id: string; status: string }) =>
      api.patch(`/leads/${args.id}`, { status: args.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', 'all'] });
      toast.success('Status oppdatert');
    },
  });

  const buckets = useMemo(() => {
    const map = new Map<string, Lead[]>();
    STATUSES.forEach((s) => map.set(s, []));
    (list.data?.leads ?? []).forEach((l) => {
      const arr = map.get(l.status) ?? [];
      arr.push(l);
      map.set(l.status, arr);
    });
    return map;
  }, [list.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
        <p className="text-muted-foreground">Kanban-oversikt over leads.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STATUSES.map((s) => {
          const items = buckets.get(s) ?? [];
          return (
            <Card key={s} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  {STATUS_LABEL[s]}
                  <Badge variant="outline">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {items.map((l) => (
                  <div key={l.id} className="rounded-md border bg-card p-3 text-sm">
                    <div className="font-medium">{l.navn}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.organisasjonsnummer} · {l.poststed ?? '–'}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {l.naeringskodeBeskrivelse}
                    </div>
                    <Select
                      className="mt-2 h-8 text-xs"
                      value={l.status}
                      onChange={(e) => update.mutate({ id: l.id, status: e.target.value })}
                    >
                      {STATUSES.map((opt) => (
                        <option key={opt} value={opt}>
                          {STATUS_LABEL[opt]}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 w-full text-xs"
                      onClick={() => setProposalLead(l)}
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Generer tilbud
                    </Button>
                  </div>
                ))}
                {!items.length && (
                  <p className="text-xs text-muted-foreground">Ingen leads.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {proposalLead && (
        <ProposalDialog
          open
          onClose={() => setProposalLead(null)}
          leadId={proposalLead.id}
          defaultClientName={proposalLead.navn}
        />
      )}
    </div>
  );
}
