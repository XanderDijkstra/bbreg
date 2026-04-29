import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WikiPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Veiledning</h1>
        <p className="text-muted-foreground">Slik bruker du BedriftsDB.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daglig flyt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            <strong>1. Oppdagelse.</strong> Velg en dato (vanligvis i går) og hent nyregistrerte
            selskaper fra Brønnøysundregisteret. Hver rad inneholder kontaktinfo som er offentlig
            registrert.
          </p>
          <p>
            <strong>2. Lagre leads.</strong> Klikk på et selskap for å se detaljer og lagre det som
            lead. Lagrede leads dukker opp i CRM og er tilgjengelige for e-postutsendelse.
          </p>
          <p>
            <strong>3. Automatisering.</strong> Sett opp webhooks for å sende leads videre til CRM
            (f.eks. GoHighLevel). Skru på <em>auto-send</em> for å la systemet sende gårsdagens
            kvalifiserte leads automatisk hver morgen kl. 06:00.
          </p>
          <p>
            <strong>4. Bransjefilter.</strong> Ekskluder bransjer du ikke ønsker. NACE-kode 73*
            (reklame) er alltid ekskludert.
          </p>
          <p>
            <strong>5. E-post.</strong> Lag tilbud (mal) og send kald e-post til lagrede leads.
            Bruk plassholdere som <code>{'{{first_name}}'}</code> for personalisering.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Webhook-format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
{`{
  "company_name": "Kaffebrenneriet AS",
  "email": "post@kaffe.no",
  "phone": "+4798765432",
  "org_number": "987654321",
  "industry": "Drift av restauranter og kafeer",
  "industry_code": "56.101",
  "city": "Oslo",
  "registration_date": "2025-04-28",
  "company_type": "as",
  "vat_registered": "Yes",
  "credit_score": "",
  "director_name": "Kari Nordmann",
  "source": "Brønnøysundregistrene"
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
