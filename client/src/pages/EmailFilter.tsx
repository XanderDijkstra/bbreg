import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Filter, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface NaceEntry {
  code: string;
  description: string;
  section: string;
}

interface ExcludedRow {
  id: string;
  industryCode: string;
  industryDescription: string | null;
}

export function EmailFilterPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const nace = useQuery({
    queryKey: ['nace'],
    queryFn: () =>
      api.get<{ codes: NaceEntry[]; sections: Record<string, string> }>('/industries/nace'),
    staleTime: Infinity,
  });

  const excluded = useQuery({
    queryKey: ['excluded'],
    queryFn: () => api.get<{ excluded: ExcludedRow[] }>('/industries/excluded'),
  });

  const add = useMutation({
    mutationFn: (entry: NaceEntry) =>
      api.post('/industries/excluded', {
        industryCode: entry.code,
        industryDescription: entry.description,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['excluded'] });
      toast.success('Ekskludert');
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? 'Feil'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/industries/excluded/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['excluded'] }),
  });

  const excludedSet = useMemo(
    () => new Set((excluded.data?.excluded ?? []).map((e) => e.industryCode)),
    [excluded.data],
  );

  const filteredCodes = useMemo(() => {
    const all = nace.data?.codes ?? [];
    if (!search) return all.slice(0, 100);
    const q = search.toLowerCase();
    return all.filter(
      (c) =>
        c.code.includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [nace.data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bransjefilter</h1>
        <p className="text-muted-foreground">
          Bransjer som ekskluderes fra automatisering. NACE-kode 73* (reklame) ekskluderes alltid.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ekskluderte bransjer ({excluded.data?.excluded.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {excluded.data?.excluded.length ? (
            <div className="flex flex-wrap gap-2">
              {excluded.data.excluded.map((e) => (
                <Badge
                  key={e.id}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => remove.mutate(e.id)}
                >
                  {e.industryCode} {e.industryDescription ?? ''}
                  <Trash2 className="ml-2 h-3 w-3" />
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen ekskluderte bransjer.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legg til ekskludering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nace-search">Søk i NACE-koder</Label>
              <Input
                id="nace-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="frisør, 73, reklame …"
              />
            </div>
            <div className="grid max-h-96 gap-1 overflow-y-auto rounded-md border p-2">
              {filteredCodes.map((c) => {
                const isExcluded = excludedSet.has(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    disabled={isExcluded}
                    onClick={() => add.mutate(c)}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-xs">{c.code}</span>
                      <span>{c.description}</span>
                      <Badge variant="outline" className="ml-1">
                        {c.section}
                      </Badge>
                    </div>
                    {isExcluded ? <Badge variant="secondary">Ekskludert</Badge> : <Plus className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
