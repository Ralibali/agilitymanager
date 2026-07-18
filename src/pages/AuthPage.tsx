import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2, Eye, EyeOff, ShieldCheck, Heart, Clock, Trophy } from 'lucide-react';
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
      <div className="min-h-screen bg-bone font-sans-ds lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* ── Varumärkespanel (desktop) ── */}
        <aside className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-forest p-12 text-bone">
          {/* Dekor: mjuka ljusringar + båge ur logotypen */}
          <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-bone/[0.06]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full bg-bone/[0.05]" />
          <svg aria-hidden viewBox="0 0 400 220" className="pointer-events-none absolute bottom-24 right-8 w-72 opacity-20" fill="none">
            <path d="M20 200 C 120 40, 280 40, 380 200" stroke="#B5F94A" strokeWidth="10" strokeLinecap="round" />
          </svg>

          <Link to="/" className="relative z-10 inline-flex items-center gap-2.5 group w-fit" aria-label="Till startsidan">
            <span className="w-9 h-9 rounded-ds-sm bg-bone/10 border border-bone/15 flex items-center justify-center transition-transform duration-300 group-hover:rotate-[-3deg] group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M4 17 C 8 9, 16 9, 20 17" stroke="#B5F94A" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="4" cy="17" r="1.6" fill="#B5F94A" />
                <circle cx="20" cy="17" r="1.6" fill="#B5F94A" />
              </svg>
            </span>
            <span className="text-lg tracking-tight font-medium">
              agility<span className="font-normal opacity-60">manager</span>
            </span>
          </Link>

          <div className="relative z-10 max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[2.6rem] leading-[1.08] tracking-tight"
            >
              Din och hundens träningsresa börjar här.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 text-bone/75 text-[15px] leading-relaxed"
            >
              Logga pass på tio sekunder, se vad ni ska träna på härnäst och följ
              utvecklingen mot nästa tävling — med svenska regelverk inbyggda.
            </motion.p>

            <motion.ul
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-9 space-y-4"
            >
              {[
                { icon: Sparkles, title: 'Vet vad ni ska träna på härnäst', desc: 'Varje pass blir ett nästa steg — inte bara en rad i en logg.' },
                { icon: Trophy, title: 'Byggd för svensk tävling', desc: 'SAgiK- och SHoK-klasser, storlekar och regler redan på plats.' },
                { icon: Heart, title: 'Hela hundens resa samlad', desc: 'Hälsa, träning, tävling och känslan — på ett ställe.' },
              ].map((f) => (
                <li key={f.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-bone/10 border border-bone/15 flex items-center justify-center">
                    <f.icon size={16} className="text-[#B5F94A]" />
                  </span>
                  <span>
                    <strong className="block text-[15px] font-semibold">{f.title}</strong>
                    <span className="block text-sm text-bone/65 mt-0.5">{f.desc}</span>
                  </span>
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="relative z-10 flex items-center gap-5 text-[12px] text-bone/60"
          >
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Inga kort krävs</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={13} /> Klart på under en minut</span>
            <span className="inline-flex items-center gap-1.5"><Trophy size={13} /> SKK & SHoK</span>
          </motion.div>
        </aside>

        {/* ── Formulärsida ── */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">
            {/* Mobil logotyp */}
            <Link to="/" className="lg:hidden flex items-center justify-center gap-2.5 mb-8" aria-label="Till startsidan">
              <span className="w-9 h-9 rounded-ds-sm bg-forest flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <path d="M4 17 C 8 9, 16 9, 20 17" stroke="#B5F94A" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="4" cy="17" r="1.6" fill="#B5F94A" />
                  <circle cx="20" cy="17" r="1.6" fill="#B5F94A" />
                </svg>
              </span>
              <span className="text-lg tracking-tight font-medium text-forest">
                agility<span className="font-normal opacity-60">manager</span>
              </span>
            </Link>

            <div className="rounded-3xl border border-forest/12 bg-card p-7 sm:p-9 shadow-[0_24px_60px_rgba(26,107,60,0.10)]">
              <div className="text-center">
                <h1 className="font-display text-[1.65rem] leading-tight text-forest">{heading}</h1>
                <p className="text-sm text-stone mt-2">{subheading}</p>
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
                <Button type="submit" className="w-full h-11 rounded-xl bg-forest text-bone hover:bg-forest-soft font-semibold" disabled={loading}>
                  {loading ? 'Skickar...' : 'Skicka återställningslänk'}
                </Button>
                <button type="button" onClick={() => setResetMode(false)} className="text-sm font-medium text-forest w-full text-center hover:underline underline-offset-2">
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
                <Button type="submit" className="w-full h-11 rounded-xl bg-forest text-bone hover:bg-forest-soft font-semibold" disabled={loading}>
                  {loading ? 'Vänta...' : isLogin ? 'Logga in' : 'Skapa mitt gratiskonto'}
                </Button>

                {!isLogin && (
                  <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-stone pt-1">
                    <li className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-forest" /> Inget betalkort</li>
                    <li className="inline-flex items-center gap-1"><Heart size={12} className="text-forest" /> Gratis för 1 hund</li>
                    <li className="inline-flex items-center gap-1"><Clock size={12} className="text-forest" /> Klart på under en minut</li>
                  </ul>
                )}

                {isLogin && (
                  <button type="button" onClick={() => setResetMode(true)} className="text-xs text-stone w-full text-center hover:text-forest transition-colors">
                    Glömt lösenord?
                  </button>
                )}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-forest w-full text-center hover:underline underline-offset-2">
                  {isLogin ? 'Har du inget konto? Skapa ett' : 'Har du redan konto? Logga in'}
                </button>
              </>
            )}
          </form>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-stone">
                Genom att fortsätta godkänner du vår{' '}
                <Link to="/integritetspolicy" className="underline underline-offset-2 hover:text-forest">integritetspolicy</Link>
                {' '}och{' '}
                <Link to="/ansvarsfriskrivning" className="underline underline-offset-2 hover:text-forest">ansvarsfriskrivning</Link>.
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
}
