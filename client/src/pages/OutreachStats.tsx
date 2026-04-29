import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EmailStat {
  status: string;
  count: number;
}

export function OutreachStatsPage() {
  const stats = useQuery({
    queryKey: ['email-stats'],
    queryFn: () => api.get<{ rows: EmailStat[] }>('/analytics/email-stats'),
  });

  const total = (stats.data?.rows ?? []).reduce((s, r) => s + r.count, 0);
  const get = (k: string) => stats.data?.rows.find((r) => r.status === k)?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utsendingsstatistikk</h1>
        <p className="text-muted-foreground">Status på sendte kalde e-poster.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <Stat label="Totalt" value={total} />
        <Stat label="Sendt" value={get('sent')} variant="default" />
        <Stat label="Levert" value={get('delivered')} variant="success" />
        <Stat label="Bouncet" value={get('bounced')} variant="destructive" />
        <Stat label="Åpnet" value={get('opened')} variant="warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detaljer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(stats.data?.rows ?? []).map((r) => (
            <div key={r.status} className="flex items-center justify-between border-b pb-2">
              <span className="capitalize">{r.status}</span>
              <Badge variant="outline">{r.count}</Badge>
            </div>
          ))}
          {!stats.data?.rows?.length && (
            <p className="text-sm text-muted-foreground">Ingen e-poster sendt ennå.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'destructive' | 'warning';
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
        {variant && <Badge variant={variant} className="mt-2">{label}</Badge>}
      </CardContent>
    </Card>
  );
}
