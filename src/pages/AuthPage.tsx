import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2, Eye, EyeOff, ShieldCheck, Heart, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getAndClearUtmData } from '@/lib/utm';
import { readGuestInterestItems } from '@/lib/guestInterestsStorage';
import { trackGrowthEvent } from '@/lib/growth';
import { trackAnalyticsEvent } from '@/lib/analytics';

function safeRedirectPath(value: string | null): string {
  if (!value) return '/v3';
  if (!value.startsWith('/')) return '/v3';
  if (value.startsWith('//')) return '/v3';
  return value;
}

function classifyAuthError(message: string | undefined): string {
  if (!message) return 'unknown';
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'invalid_credentials';
  if (m.includes('email not confirmed')) return 'email_not_confirmed';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already')) return 'user_exists';
  if (m.includes('password')) return 'password_policy';
  if (m.includes('rate') || m.includes('too many')) return 'rate_limited';
  if (m.includes('network') || m.includes('fetch')) return 'network';
  return 'other';
}

function friendlyErrorMessage(errorType: string, mode: 'login' | 'signup' | 'reset'): string {
  switch (errorType) {
    case 'invalid_credentials':
      return 'Fel e-post eller lösenord. Prova igen eller återställ lösenordet.';
    case 'email_not_confirmed':
      return 'Bekräfta din e-post först — vi har skickat en länk till din inkorg.';
    case 'user_exists':
      return 'Det finns redan ett konto med den e-posten. Logga in istället.';
    case 'password_policy':
      return 'Lösenordet uppfyller inte kraven. Använd minst 6 tecken.';
    case 'rate_limited':
      return 'För många försök. Vänta en minut och försök igen.';
    case 'network':
      return 'Nätverksfel. Kontrollera din anslutning och försök igen.';
    default:
      return mode === 'signup'
        ? 'Kunde inte skapa konto just nu. Försök igen om en stund.'
        : mode === 'reset'
        ? 'Kunde inte skicka återställningslänken. Försök igen.'
        : 'Kunde inte logga in just nu. Försök igen.';
  }
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
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { toast } = useToast();
  const formStartedRef = useRef(false);

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

  useEffect(() => {
    trackGrowthEvent('auth_page_view', {
      mode: isLogin ? 'login' : 'signup',
      source: source ?? null,
      has_ref: !!refCode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reset "form started" flag when switching between login/signup/reset.
    formStartedRef.current = false;
  }, [isLogin, resetMode]);

  const markFormStarted = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackGrowthEvent('auth_form_started', {
      mode: resetMode ? 'reset' : isLogin ? 'login' : 'signup',
      source: source ?? null,
    });
  };

  const goToRedirect = () => {
    navigate(redirectPath, { replace: true });
  };

  // Källanpassade rubriker/underrubriker
  const { heading, subheading, contextCard } = useMemo(() => {
    if (resetMode) {
      return {
        heading: 'Återställ lösenord',
        subheading: 'Vi mejlar en länk för att välja ett nytt lösenord.',
        contextCard: null as null | { title: string; body: string },
      };
    }
    if (isLogin) {
      return {
        heading: 'Logga in på AgilityManager',
        subheading: 'Fortsätt din och hundens träningsresa.',
        contextCard: null,
      };
    }
    // Signup
    if (source === 'landing_hero') {
      return {
        heading: 'Skapa ditt gratiskonto',
        subheading: 'Logga träning, planera banor och följ utvecklingen — helt gratis för en hund.',
        contextCard: null,
      };
    }
    if (source === 'free_course_planner') {
      return {
        heading: 'Spara din bana — skapa konto',
        subheading: 'Fortsätt där du var. Dina banor följer med.',
        contextCard: {
          title: 'Fortsätt från banplaneraren',
          body: 'Skapa konto så kan du ta nästa steg: spara banor, logga träningspass och se statistik över utvecklingen.',
        },
      };
    }
    if (source === 'competitions' && guestInterestCount > 0) {
      return {
        heading: 'Skapa konto och behåll dina markeringar',
        subheading: 'Vi kopplar dina sparade tävlingar till kontot automatiskt.',
        contextCard: null,
      };
    }
    if (refCode) {
      return {
        heading: 'Skapa gratiskonto via kompis',
        subheading: 'Ni får båda en belöning när ditt konto är klart.',
        contextCard: {
          title: 'Inbjuden av en vän',
          body: 'När du skapar kontot får både du och din vän en liten belöning i AgilityManager.',
        },
      };
    }
    return {
      heading: 'Skapa konto på AgilityManager',
      subheading: 'Din digitala agility-dagbok.',
      contextCard: null,
    };
  }, [isLogin, resetMode, source, guestInterestCount, refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const currentMode: 'login' | 'signup' | 'reset' = resetMode ? 'reset' : isLogin ? 'login' : 'signup';
    trackGrowthEvent('auth_submit', { mode: currentMode, source: source ?? null });

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        const errorType = classifyAuthError(error.message);
        trackGrowthEvent('auth_error', { mode: 'reset', error_type: errorType });
        toast({ title: 'Fel', description: friendlyErrorMessage(errorType, 'reset'), variant: 'destructive' });
      } else {
        toast({ title: 'Kolla din e-post', description: 'En återställningslänk har skickats.' });
        setResetMode(false);
      }
      return;
    }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const errorType = classifyAuthError(error.message);
        trackGrowthEvent('auth_error', { mode: 'login', error_type: errorType });
        toast({ title: 'Inloggningsfel', description: friendlyErrorMessage(errorType, 'login'), variant: 'destructive' });
      } else if (data.user) {
        trackGrowthEvent('login_completed', { source: source ?? null });
        goToRedirect();
      }
      setLoading(false);
      return;
    }

    // Signup
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      trackGrowthEvent('auth_error', { mode: 'signup', error_type: 'missing_name' });
      toast({ title: 'Ange ditt namn', description: 'Skriv ditt namn så vet vi vad hunden ska kalla dig.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      trackGrowthEvent('auth_error', { mode: 'signup', error_type: 'password_policy' });
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
        data: { display_name: trimmedName, signup_source: source ?? undefined },
        emailRedirectTo: emailRedirectUrl.toString(),
      },
    });
    if (error) {
      const errorType = classifyAuthError(error.message);
      trackGrowthEvent('auth_error', { mode: 'signup', error_type: errorType });
      toast({ title: 'Registreringsfel', description: friendlyErrorMessage(errorType, 'signup'), variant: 'destructive' });
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
          // Non-critical
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
          body: { type: 'new_user', data: { email, display_name: trimmedName, source } },
        });
      } catch {
        // Non-critical
      }
      trackGrowthEvent('signup_completed', { source: source ?? null, has_ref: !!refCode });
      trackAnalyticsEvent('signup_completed', { source: source ?? undefined });
      goToRedirect();
    } else {
      trackGrowthEvent('signup_completed', { source: source ?? null, has_ref: !!refCode, requires_email_confirm: true });
      trackAnalyticsEvent('signup_completed', { source: source ?? undefined });
      toast({ title: 'Konto skapat!', description: 'Kolla din e-post och fortsätt sedan i AgilityManager.' });
      setIsLogin(true);
    }
    setLoading(false);
  };

  const passwordAutocomplete = isLogin ? 'current-password' : 'new-password';

  return (
    <>
      <Helmet>
        <title>{isLogin ? 'Logga in' : 'Skapa konto'} – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 bg-background py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">{heading}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
          </div>

          {contextCard && !resetMode && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <strong className="block text-foreground mb-1">{contextCard.title}</strong>
              {contextCard.body}
            </div>
          )}

          {source === 'competitions' && guestInterestCount > 0 && !resetMode && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <strong className="flex items-center gap-2 text-foreground mb-1">
                <CheckCircle2 size={16} className="text-primary" />
                Vi har sparat dina {guestInterestCount} markering{guestInterestCount === 1 ? '' : 'ar'}
              </strong>
              De kopplas automatiskt till ditt konto när du loggat in — ingenting går förlorat.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" onFocus={markFormStarted}>
            {resetMode ? (
              <>
                <div>
                  <Label htmlFor="reset-email">E-post</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => { markFormStarted(); setEmail(e.target.value); }}
                    required
                    placeholder="din@email.se"
                  />
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
                    <Label htmlFor="auth-name">Namn</Label>
                    <Input
                      id="auth-name"
                      autoComplete="name"
                      value={displayName}
                      onChange={e => { markFormStarted(); setDisplayName(e.target.value); }}
                      placeholder="Ditt namn"
                      required
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="auth-email">E-post</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => { markFormStarted(); setEmail(e.target.value); }}
                    required
                    placeholder="din@email.se"
                  />
                </div>
                <div>
                  <Label htmlFor="auth-password">Lösenord</Label>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={passwordAutocomplete}
                      value={password}
                      onChange={e => { markFormStarted(); setPassword(e.target.value); }}
                      required
                      minLength={6}
                      placeholder="Minst 6 tecken"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? 'Vänta...' : isLogin ? 'Logga in' : 'Skapa mitt gratiskonto'}
                </Button>

                {!isLogin && (
                  <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground pt-1">
                    <li className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-primary" /> Inget betalkort</li>
                    <li className="inline-flex items-center gap-1"><Heart size={12} className="text-primary" /> Gratis för 1 hund</li>
                    <li className="inline-flex items-center gap-1"><Clock size={12} className="text-primary" /> Klart på under en minut</li>
                  </ul>
                )}

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
