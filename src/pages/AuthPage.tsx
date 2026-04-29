import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getAndClearUtmData } from '@/lib/utm';
import { readGuestInterestItems } from '@/lib/guestInterestsStorage';

function safeRedirectPath(value: string | null): string {
  if (!value) return '/v3';
  if (!value.startsWith('/')) return '/v3';
  if (value.startsWith('//')) return '/v3';
  return value;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');
  const mode = searchParams.get('mode');
  const redirectPath = useMemo(() => safeRedirectPath(searchParams.get('redirect')), [searchParams]);
  const source = searchParams.get('source');

  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { toast } = useToast();

  // Visa pending gäst-markeringar om användaren kommer från tävlingskalendern
  const guestInterestCount = useMemo(() => {
    if (source !== 'competitions') return 0;
    try {
      return readGuestInterestItems().length;
    } catch {
      return 0;
    }
  }, [source]);

  useEffect(() => {
    if (mode === 'signup') setIsLogin(false);
    if (mode === 'login') setIsLogin(true);
  }, [mode]);

  useEffect(() => {
    if (!source) return;
    try {
      window.localStorage.setItem('am_signup_source', source);
    } catch {
      // Ignore storage errors.
    }
  }, [source]);

  const goToRedirect = () => {
    navigate(redirectPath, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: 'Fel', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Kolla din e-post', description: 'En återställningslänk har skickats.' });
        setResetMode(false);
      }
      return;
    }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'Inloggningsfel', description: error.message, variant: 'destructive' });
      } else if (data.user) {
        goToRedirect();
      }
    } else {
      if (password !== confirmPassword) {
        toast({ title: 'Lösenorden matchar inte', description: 'Skriv samma lösenord i båda fälten.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast({ title: 'För kort lösenord', description: 'Lösenordet måste vara minst 6 tecken.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const emailRedirectUrl = new URL(window.location.origin + redirectPath);
      if (source) emailRedirectUrl.searchParams.set('source', source);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, signup_source: source ?? undefined },
          emailRedirectTo: emailRedirectUrl.toString(),
        },
      });
      if (error) {
        toast({ title: 'Registreringsfel', description: error.message, variant: 'destructive' });
      } else if (data.session) {
        toast({ title: 'Konto skapat!', description: 'Du är nu inloggad.' });
        const utmData = getAndClearUtmData();
        if (data.user) {
          try {
            await supabase.from('signup_sources').insert({
              user_id: data.user.id,
              ...utmData,
              ...(source ? { utm_source: source } : {}),
              ...(refCode ? { utm_source: 'friend_invite', referrer: refCode } : {}),
            });
          } catch {
            // Non-critical, don't block signup flow
          }
          if (refCode) {
            try {
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('referral_code', refCode)
                .single();
              if (referrerProfile) {
                await supabase.from('friendships').insert({
                  requester_id: referrerProfile.user_id,
                  receiver_id: data.user.id,
                  status: 'pending',
                });
              }
            } catch {
              // Non-critical
            }
          }
        }
        try {
          await supabase.functions.invoke('notify-admin', {
            body: { type: 'new_user', data: { email, display_name: displayName, source } },
          });
        } catch {
          // Non-critical
        }
        goToRedirect();
      } else {
        toast({ title: 'Konto skapat!', description: 'Kolla din e-post och fortsätt sedan i AgilityManager.' });
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>{isLogin ? 'Logga in' : 'Skapa konto'} – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">AgilityManager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {source === 'free_course_planner' ? 'Spara banor, logga pass och följ utvecklingen' : 'Din digitala agility-dagbok'}
          </p>
        </div>

        {source === 'free_course_planner' && !resetMode && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
            <strong className="block text-foreground mb-1">Fortsätt från banplaneraren</strong>
            Skapa konto så kan du ta nästa steg: spara banor, logga träningspass och se statistik över utvecklingen.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {resetMode ? (
            <>
              <div>
                <Label>E-post</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? 'Skickar...' : 'Skicka återställningslänk'}
              </Button>
              <button type="button" onClick={() => setResetMode(false)} className="text-sm text-primary w-full text-center">
                Tillbaka till inloggning
              </button>
            </>
          ) : (
            <>
              {!isLogin && (
                <div>
                  <Label>Namn</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ditt namn" />
                </div>
              )}
              <div>
                <Label>E-post</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" />
              </div>
              <div>
                <Label>Lösenord</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minst 6 tecken" />
              </div>
              {!isLogin && (
                <div>
                  <Label>Bekräfta lösenord</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Ange lösenordet igen" />
                </div>
              )}
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? 'Vänta...' : isLogin ? 'Logga in' : 'Skapa konto'}
              </Button>
              {isLogin && (
                <button type="button" onClick={() => setResetMode(true)} className="text-xs text-muted-foreground w-full text-center">
                  Glömt lösenord?
                </button>
              )}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary w-full text-center">
                {isLogin ? 'Har du inget konto? Skapa ett' : 'Har du redan konto? Logga in'}
              </button>
            </>
          )}
        </form>
      </motion.div>
      </div>
    </>
  );
}
