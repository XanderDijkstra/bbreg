import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface Offer {
  id: string;
  name: string;
  description: string | null;
  emailSubject: string;
  emailBody: string;
  isActive: boolean;
}

const SAMPLE = {
  navn: 'Kaffebrenneriet AS',
  dagligLederNavn: 'Kari Nordmann',
  poststed: 'Oslo',
  organisasjonsnummer: '987654321',
};

function render(template: string, lead: Record<string, string>) {
  const firstName = (lead.dagligLederNavn ?? '').split(' ').filter(Boolean)[0] ?? '';
  const map: Record<string, string> = {
    company_name: lead.navn,
    director_name: lead.dagligLederNavn,
    first_name: firstName,
    city: lead.poststed,
    org_number: lead.organisasjonsnummer,
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => map[k] ?? '');
}

export function OffersPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    emailSubject: '',
    emailBody: '',
  });

  const list = useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get<{ offers: Offer[] }>('/offers'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/offers', {
        ...draft,
        isActive: false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      setDraft({ name: '', description: '', emailSubject: '', emailBody: '' });
      toast.success('Tilbud opprettet');
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? 'Feil'),
  });

  const update = useMutation({
    mutationFn: (args: { id: string; patch: Partial<Offer> }) =>
      api.patch(`/offers/${args.id}`, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/offers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tilbud</h1>
        <p className="text-muted-foreground">
          Maler for kald e-post. Bruk plassholdere som <code>{'{{company_name}}'}</code>,{' '}
          <code>{'{{first_name}}'}</code>, <code>{'{{city}}'}</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nytt tilbud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="o-name">Navn</Label>
            <Input
              id="o-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="o-desc">Beskrivelse</Label>
            <Input
              id="o-desc"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="o-subj">Emne</Label>
            <Input
              id="o-subj"
              value={draft.emailSubject}
              onChange={(e) => setDraft((d) => ({ ...d, emailSubject: e.target.value }))}
              placeholder="Hei {{first_name}}, gratulerer med {{company_name}}"
            />
          </div>
          <div>
            <Label htmlFor="o-body">Brødtekst (HTML)</Label>
            <Textarea
              id="o-body"
              rows={8}
              value={draft.emailBody}
              onChange={(e) => setDraft((d) => ({ ...d, emailBody: e.target.value }))}
              placeholder="<p>Hei {{first_name}},</p><p>Vi så at {{company_name}} ble registrert nylig …</p>"
            />
          </div>
          {(draft.emailSubject || draft.emailBody) && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Forhåndsvisning
              </div>
              <div className="mt-1 text-sm font-medium">{render(draft.emailSubject, SAMPLE)}</div>
              <div
                className="mt-2 text-sm"
                dangerouslySetInnerHTML={{ __html: render(draft.emailBody, SAMPLE) }}
              />
            </div>
          )}
          <Button
            onClick={() => create.mutate()}
            disabled={!draft.name || !draft.emailSubject || !draft.emailBody || create.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Opprett tilbud
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {list.data?.offers.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{o.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{o.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={o.isActive ? 'success' : 'outline'}>
                  {o.isActive ? 'Aktiv' : 'Pause'}
                </Badge>
                <Switch
                  checked={o.isActive}
                  onCheckedChange={(v) => update.mutate({ id: o.id, patch: { isActive: v } })}
                />
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(o.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Emne</div>
              <div className="font-medium">{o.emailSubject}</div>
              <div className="mt-2 text-xs text-muted-foreground">Brødtekst</div>
              <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-muted/30 p-2 text-xs">
                {o.emailBody}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
