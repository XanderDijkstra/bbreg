import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Send, Trash2, Webhook } from 'lucide-react';
import { api } from '@/lib/api';
import { yesterdayOslo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  autoSend: boolean;
  funnelType: string | null;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookConfigId: string;
  orgNumber: string | null;
  companyName: string | null;
  responseStatus: number | null;
  success: boolean;
  sentAt: string;
}

export function AutomationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automatisering</h1>
        <p className="text-muted-foreground">
          Send leads automatisk til CRM via webhooks. En POST per lead.
        </p>
      </div>
      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="activity">Aktivitet</TabsTrigger>
        </TabsList>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WebhooksTab() {
  const qc = useQueryClient();
  const [date, setDate] = useState(yesterdayOslo());
  const [form, setForm] = useState({
    name: '',
    url: '',
    funnelType: 'phone',
  });

  const list = useQuery({
    queryKey: ['webhook-configs'],
    queryFn: () => api.get<{ configs: WebhookConfig[] }>('/webhook-configs'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/webhook-configs', {
        name: form.name,
        url: form.url,
        enabled: true,
        autoSend: false,
        funnelType: form.funnelType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhook-configs'] });
      setForm({ name: '', url: '', funnelType: 'phone' });
      toast.success('Webhook lagt til');
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? 'Klarte ikke lagre.'),
  });

  const update = useMutation({
    mutationFn: (args: { id: string; patch: Partial<WebhookConfig> }) =>
      api.patch(`/webhook-configs/${args.id}`, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhook-configs'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/webhook-configs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Webhook slettet');
    },
  });

  const testSend = useMutation({
    mutationFn: () =>
      api.post<{ summary: { eligibleCount: number; deliveries: unknown[] } }>(
        '/webhook-configs/test-send',
        { date },
      ),
    onSuccess: (data) => {
      toast.success(
        `${data.summary.deliveries.length} leveranse(r) sendt for ${data.summary.eligibleCount} kvalifiserte selskaper.`,
      );
      qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? 'Send feilet.'),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Send dagens leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="ts-date">Dato</Label>
              <Input
                id="ts-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={() => testSend.mutate()} disabled={testSend.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {testSend.isPending ? 'Sender …' : 'Send dagens leads nå'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sender til alle aktive webhooks (uavhengig av auto-send-bryter).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ny webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label htmlFor="wh-name">Navn</Label>
              <Input
                id="wh-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="GoHighLevel – telefonsalg"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://services.leadconnectorhq.com/hooks/..."
              />
            </div>
            <div>
              <Label htmlFor="wh-type">Type</Label>
              <Select
                id="wh-type"
                value={form.funnelType}
                onChange={(e) => setForm((f) => ({ ...f, funnelType: e.target.value }))}
              >
                <option value="phone">Telefon</option>
                <option value="email">E-post</option>
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Button
              onClick={() => create.mutate()}
              disabled={!form.name || !form.url || create.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Legg til webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mine webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          {list.data?.configs?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead>Auto-send</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.configs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {c.url}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.funnelType ?? 'phone'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={(v) =>
                          update.mutate({ id: c.id, patch: { enabled: v } })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.autoSend}
                        onCheckedChange={(v) =>
                          update.mutate({ id: c.id, patch: { autoSend: v } })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(c.id)}
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
              <Webhook className="mr-2 inline h-4 w-4" />
              Ingen webhooks ennå.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTab() {
  const list = useQuery({
    queryKey: ['webhook-deliveries'],
    queryFn: () => api.get<{ deliveries: WebhookDelivery[] }>('/webhook-deliveries?limit=100'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Siste leveranser</CardTitle>
      </CardHeader>
      <CardContent>
        {list.data?.deliveries?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tid</TableHead>
                <TableHead>Selskap</TableHead>
                <TableHead>Org.nr</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(d.sentAt).toLocaleString('nb-NO')}
                  </TableCell>
                  <TableCell>{d.companyName ?? '–'}</TableCell>
                  <TableCell className="font-mono text-xs">{d.orgNumber ?? '–'}</TableCell>
                  <TableCell>
                    <Badge variant={d.success ? 'success' : 'destructive'}>
                      {d.success ? `OK ${d.responseStatus ?? ''}` : `Feil ${d.responseStatus ?? ''}`}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Ingen leveranser ennå.</p>
        )}
      </CardContent>
    </Card>
  );
}
