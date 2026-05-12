import { useState } from 'react';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type ServiceType = 'website' | 'meta_ads' | 'seo' | 'google_ads' | 'reviews';

const SERVICE_OPTIONS: Array<{ value: ServiceType; label: string; defaultPrice: number }> = [
  { value: 'website',    label: 'Nettside',     defaultPrice: 700 },
  { value: 'meta_ads',   label: 'Meta Ads',     defaultPrice: 4900 },
  { value: 'seo',        label: 'SEO',          defaultPrice: 4900 },
  { value: 'google_ads', label: 'Google Ads',   defaultPrice: 4900 },
  { value: 'reviews',    label: 'Anmeldelser',  defaultPrice: 990 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  defaultClientName: string;
  defaultContact?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export function ProposalDialog({ open, onClose, leadId, defaultClientName, defaultContact }: Props) {
  const [serviceType, setServiceType] = useState<ServiceType>('website');
  const [monthlyPrice, setMonthlyPrice] = useState(700);
  const [freeSetup, setFreeSetup] = useState(true);
  const [bindingPeriod, setBindingPeriod] = useState('Ingen');
  const [adBudget, setAdBudget] = useState('');
  const [clientName, setClientName] = useState(defaultClientName);
  const [clientContact, setClientContact] = useState(defaultContact ?? '');
  const [submitting, setSubmitting] = useState(false);

  const isAdService = serviceType === 'meta_ads' || serviceType === 'google_ads';

  const handleServiceChange = (v: string) => {
    const next = v as ServiceType;
    setServiceType(next);
    const opt = SERVICE_OPTIONS.find((o) => o.value === next);
    if (opt) setMonthlyPrice(opt.defaultPrice);
  };

  const handleGenerate = async () => {
    if (!clientName || monthlyPrice <= 0) {
      toast.error('Fyll inn klientnavn og månedspris.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/proposals/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          serviceType,
          clientName,
          clientContact: clientContact || undefined,
          monthlyPriceNok: monthlyPrice,
          freeSetup,
          bindingPeriod,
          adBudget: isAdService && adBudget ? adBudget : undefined,
          save: true,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* leave default */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FX Media - Tilbud - ${clientName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Tilbud generert');
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? 'Klarte ikke generere tilbud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Generer tilbud">
      <div className="space-y-4 text-sm">
        <div>
          <Label htmlFor="p-service">Tjeneste</Label>
          <Select id="p-service" value={serviceType} onChange={(e) => handleServiceChange(e.target.value)}>
            {SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-client">Klientnavn</Label>
            <Input
              id="p-client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="p-contact">Kontaktperson</Label>
            <Input
              id="p-contact"
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-price">Månedspris (NOK)</Label>
            <Input
              id="p-price"
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(Number(e.target.value))}
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="p-binding">Bindingstid</Label>
            <Input
              id="p-binding"
              value={bindingPeriod}
              onChange={(e) => setBindingPeriod(e.target.value)}
            />
          </div>
        </div>

        {isAdService && (
          <div>
            <Label htmlFor="p-ad">Anbefalt annonsebudsjett (valgfritt)</Label>
            <Input
              id="p-ad"
              value={adBudget}
              onChange={(e) => setAdBudget(e.target.value)}
              placeholder="f.eks. 4 000 – 7 500"
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-medium">Gratis oppsett</div>
            <div className="text-xs text-muted-foreground">
              Viser «Gratis» på venstre priskort. Skru av for å vise oppstart som engangspris.
            </div>
          </div>
          <Switch checked={freeSetup} onCheckedChange={setFreeSetup} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Avbryt
        </Button>
        <Button onClick={handleGenerate} disabled={submitting}>
          <FileText className="mr-2 h-4 w-4" />
          {submitting ? 'Genererer …' : 'Generer PDF'}
        </Button>
      </div>
    </Dialog>
  );
}
