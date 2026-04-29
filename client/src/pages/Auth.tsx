import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSignIn, useSignUp } from '@/hooks/useAuth';

export function AuthPage() {
  const navigate = useNavigate();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (mode: 'signin' | 'signup') => {
    if (!email || password.length < 8) {
      toast.error('Skriv inn e-post og passord (minst 8 tegn).');
      return;
    }
    try {
      if (mode === 'signin') {
        await signIn.mutateAsync({ email, password });
        toast.success('Velkommen tilbake!');
      } else {
        await signUp.mutateAsync({ email, password });
        toast.success('Konto opprettet!');
      }
      navigate('/');
    } catch (err) {
      const message = (err as { message?: string }).message ?? 'Noe gikk galt.';
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">BedriftsDB</CardTitle>
          <CardDescription>Norsk B2B leadsplattform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logg inn</TabsTrigger>
              <TabsTrigger value="signup">Opprett konto</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit('signin');
                }}
              >
                <Field label="E-post" id="signin-email">
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Passord" id="signin-password">
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Button className="w-full" type="submit" disabled={signIn.isPending}>
                  {signIn.isPending ? 'Logger inn …' : 'Logg inn'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit('signup');
                }}
              >
                <Field label="E-post" id="signup-email">
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Passord (min. 8 tegn)" id="signup-password">
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Button className="w-full" type="submit" disabled={signUp.isPending}>
                  {signUp.isPending ? 'Oppretter …' : 'Opprett konto'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
