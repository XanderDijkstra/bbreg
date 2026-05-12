import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileText, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProposalDialog } from '@/components/ProposalDialog';

interface ProposalRow {
  id: string;
  clientName: string;
  serviceType: string;
  proposalTitle: string;
  monthlyPriceNok: number | null;
  createdAt: string;
  updatedAt: string;
}

const SERVICE_LABELS: Record<string, string> = {
  website: 'Nettside',
  meta_ads: 'Meta Ads',
  seo: 'SEO',
  google_ads: 'Google Ads',
  reviews: 'Anmeldelser',
  custom: 'Tilpasset',
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export function ProposalsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const list = useQuery({
    queryKey: ['proposals'],
    queryFn: () => api.get<{ proposals: ProposalRow[] }>('/proposals'),
  });

  const regen = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/proposals/${id}/regenerate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return res.blob();
    },
    onSuccess: (blob, id) => {
      const proposal = list.data?.proposals.find((p) => p.id === id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FX Media - Tilbud - ${proposal?.clientName ?? 'klient'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF lastet ned');
    },
    onError: (e) => toast.error((e as Error).message ?? 'Klarte ikke generere.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/proposals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Tilbud slettet');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tilbud</h1>
          <p className="text-muted-foreground">Lagrede PDF-tilbud. Du kan regenerere når som helst.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Nytt tilbud
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mine tilbud ({list.data?.proposals.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {list.data?.proposals?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klient</TableHead>
                  <TableHead>Tjeneste</TableHead>
                  <TableHead>Pris/mnd</TableHead>
                  <TableHead>Opprettet</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.proposals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{SERVICE_LABELS[p.serviceType] ?? p.serviceType}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.monthlyPriceNok ? `kr ${p.monthlyPriceNok}` : '–'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString('nb-NO')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regen.mutate(p.id)}
                        disabled={regen.isPending}
                        className="mr-2"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Last ned
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ingen tilbud ennå. Trykk «Nytt tilbud» eller bruk «Generer tilbud»-knappen på en lead.
            </p>
          )}
        </CardContent>
      </Card>

      {showNew && (
        <ProposalDialog
          open
          onClose={() => {
            setShowNew(false);
            qc.invalidateQueries({ queryKey: ['proposals'] });
          }}
          defaultClientName=""
        />
      )}
    </div>
  );
}
