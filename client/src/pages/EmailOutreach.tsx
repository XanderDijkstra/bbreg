import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Lead {
  id: string;
  navn: string;
  organisasjonsnummer: string;
  epostadresse: string | null;
  status: string;
}

interface Offer {
  id: string;
  name: string;
}

export function EmailOutreachPage() {
  const qc = useQueryClient();
  const [offerId, setOfferId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const offers = useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get<{ offers: Offer[] }>('/offers'),
  });

  const leads = useQuery({
    queryKey: ['leads', 'with-email'],
    queryFn: () => api.get<{ leads: Lead[] }>('/leads?pageSize=200'),
  });

  const eligible = useMemo(
    () => (leads.data?.leads ?? []).filter((l) => l.epostadresse),
    [leads.data],
  );

  const send = useMutation({
    mutationFn: () =>
      api.post<{ results: { leadId: string; ok: boolean; error?: string }[] }>(
        '/email/send-bulk',
        { offerId, leadIds: Array.from(selected) },
      ),
    onSuccess: (data) => {
      const ok = data.results.filter((r) => r.ok).length;
      const fail = data.results.length - ok;
      toast[fail ? 'warning' : 'success'](`Sendt ${ok}, feilet ${fail}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['email-stats'] });
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? 'Feil'),
  });

  const toggleAll = () => {
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible.map((l) => l.id)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">E-postutsendelse</h1>
        <p className="text-muted-foreground">Send kald e-post fra et tilbud til valgte leads.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Velg tilbud</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-64">
            <Label htmlFor="offer">Tilbud</Label>
            <Select id="offer" value={offerId} onChange={(e) => setOfferId(e.target.value)}>
              <option value="">Velg tilbud …</option>
              {(offers.data?.offers ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => send.mutate()}
            disabled={!offerId || selected.size === 0 || send.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {send.isPending ? 'Sender …' : `Send (${selected.size})`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads med e-post ({eligible.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {eligible.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === eligible.length && eligible.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Navn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligible.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(l.id);
                          else next.delete(l.id);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.navn}</div>
                      <div className="text-xs text-muted-foreground">{l.organisasjonsnummer}</div>
                    </TableCell>
                    <TableCell>{l.epostadresse}</TableCell>
                    <TableCell>{l.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen lagrede leads med e-post.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
