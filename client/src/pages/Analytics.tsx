import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#f97316', '#6366f1'];

export function AnalyticsPage() {
  const byStatus = useQuery({
    queryKey: ['ana', 'status'],
    queryFn: () => api.get<{ rows: { status: string; count: number }[] }>('/analytics/leads-by-status'),
  });
  const byIndustry = useQuery({
    queryKey: ['ana', 'industry'],
    queryFn: () =>
      api.get<{ rows: { industryCode: string | null; industryDescription: string | null; count: number }[] }>(
        '/analytics/leads-by-industry',
      ),
  });
  const byWeek = useQuery({
    queryKey: ['ana', 'week'],
    queryFn: () => api.get<{ rows: { week: string; count: number }[] }>('/analytics/leads-by-week'),
  });
  const email = useQuery({
    queryKey: ['ana', 'email'],
    queryFn: () => api.get<{ rows: { status: string; count: number }[] }>('/analytics/email-stats'),
  });

  const totalLeads = (byStatus.data?.rows ?? []).reduce((s, r) => s + r.count, 0);
  const wonLeads = (byStatus.data?.rows ?? []).find((r) => r.status === 'won')?.count ?? 0;
  const sentEmails = (email.data?.rows ?? []).reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analyse</h1>
        <p className="text-muted-foreground">Oversikt over leads og e-postaktivitet.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Totale leads" value={totalLeads} />
        <Kpi label="Vunne deals" value={wonLeads} />
        <Kpi label="Sendte e-poster" value={sentEmails} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads per status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus.data?.rows ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topp 10 bransjer</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(byIndustry.data?.rows ?? []).map((r) => ({
                    name: r.industryDescription ?? r.industryCode ?? 'Ukjent',
                    value: r.count,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {(byIndustry.data?.rows ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Leads per uke</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(byWeek.data?.rows ?? []).slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
