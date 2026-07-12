import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getAndClearUtmData } from '@/lib/utm';
import { readGuestInterestItems } from '@/lib/guestInterestsStorage';
import { trackGrowthEvent } from '@/lib/growth';

function safeRedirectPath(value: string | null): string {
  if (!value) return '/v3';
  if (!value.startsWith('/')) return '/v3';
  if (value.startsWith('//')) return '/v3';
  return value;
}

function getSignupMessage(source: string | null) {
  if (source === 'free_course_planner') {
    return 'Spara din bana och fortsätt utveckla träningen.';
  }
  if (source === 'competitions') {
    return 'Spara tävlingar, resultat och hela er klassresa.';
  }
  if (source === 'landing_hero') {
    return 'Kom igång på mindre än en minut – helt utan kort.';
  }
  return 'Börja logga er utveckling på mindre än en minut.';
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
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { toast } = useToast();

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
    trackGrowthEvent(isLogin ? 'login_page_viewed' : 'signup_page_viewed', {
      source: source ?? 'direct',
      has_referral: Boolean(refCode),
    });
  }, [isLogin, refCode, source]);

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
      trackGrowthEvent('password_reset_requested');
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
      trackGrowthEvent('login_submitted', { source: source ?? 'direct' });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        trackGrowthEvent('login_failed', { reason: error.message });
        toast({ title: 'Inloggningsfel', description: error.message, variant: 'destructive' });
      } else if (data.user) {
        trackGrowthEvent('login_completed', { source: source ?? 'direct' });
        goToRedirect();
      }
    } else {
      if (password.length < 6) {
        toast({ title: 'För kort lösenord', description: 'Lösenordet måste vara minst 6 tecken.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      trackGrowthEvent('signup_submitted', {
        source: source ?? 'direct',
        has_name: Boolean(displayName.trim()),
        has_referral: Boolean(refCode),
      });

      const emailRedirectUrl = new URL(window.location.origin + redirectPath);
      if (source) emailRedirectUrl.searchParams.set('source', source);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim(), signup_source: source ?? undefined },
          emailRedirectTo: emailRedirectUrl.toString(),
        },
      });
      if (error) {
        trackGrowthEvent('signup_failed', { reason: error.message, source: source ?? 'direct' });
        toast({ title: 'Registreringsfel', description: error.message, variant: 'destructive' });
      } else if (data.session) {
        trackGrowthEvent('signup_completed', {
          source: source ?? 'direct',
          confirmation_required: false,
        });
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
        trackGrowthEvent('signup_completed', {
          source: source ?? 'direct',
          confirmation_required: true,
        });
        toast({ title: 'Konto skapat!', description: 'Kolla din e-post och fortsätt sedan i AgilityManager.' });
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  const switchMode = () => {
    const nextIsLogin = !isLogin;
    setIsLogin(nextIsLogin);
    setResetMode(false);
    trackGrowthEvent(nextIsLogin ? 'switched_to_login' : 'switched_to_signup', {
      source: source ?? 'direct',
    });
  };

  return (
    <>
      <Helmet>
        <title>{isLogin ? 'Logga in' : 'Skapa konto'} – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Sparkles size={26} className="text-primary-foreground" />
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary mb-2">
              {isLogin ? 'Välkommen tillbaka' : 'Gratis för 1 hund'}
            </p>
            <h1 className="text-2xl font-bold font-display text-foreground">
              {isLogin ? 'Logga in på AgilityManager' : 'Skapa ditt konto'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isLogin ? 'Fortsätt där du slutade.' : getSignupMessage(source)}
            </p>
          </div>

          {!isLogin && !resetMode && (
            <div className="grid grid-cols-3 gap-2 mt-6" aria-label="Fördelar med gratis konto">
              {['Inget kort', 'Klart på 1 min', 'Avsluta när du vill'].map((item) => (
                <div key={item} className="rounded-xl bg-primary/5 px-2 py-2 text-center text-[11px] text-muted-foreground">
                  <CheckCircle2 size={14} className="mx-auto mb-1 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          )}

          {source === 'free_course_planner' && !resetMode && (
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <strong className="block text-foreground mb-1">Din bana väntar på dig</strong>
              Skapa konto så kan du spara banan, logga pass och följa utvecklingen.
            </div>
          )}

          {source === 'competitions' && guestInterestCount > 0 && !resetMode && (
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <strong className="flex items-center gap-2 text-foreground mb-1">
                <CheckCircle2 size={16} className="text-primary" />
                Vi har sparat dina {guestInterestCount} markering{guestInterestCount === 1 ? '' : 'ar'}
              </strong>
              De kopplas automatiskt till ditt konto när du loggat in — ingenting går förlorat.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {resetMode ? (
              <>
                <div>
                  <Label htmlFor="reset-email">E-post</Label>
                  <Input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="din@email.se" />
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
                    <Label htmlFor="display-name">Namn <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
                    <Input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} autoComplete="name" placeholder="Ditt namn" />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">E-post</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" inputMode="email" placeholder="din@email.se" />
                </div>
                <div>
                  <Label htmlFor="password">Lösenord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      placeholder={isLogin ? 'Ditt lösenord' : 'Minst 6 tecken'}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {!isLogin && <p className="mt-1.5 text-xs text-muted-foreground">Du behöver bara skriva lösenordet en gång.</p>}
                </div>
                <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? 'Vänta...' : isLogin ? 'Logga in' : 'Skapa gratis konto'}
                </Button>
                {!isLogin && (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck size={14} className="text-primary" />
                    Inga kortuppgifter. Grundversionen är gratis.
                  </p>
                )}
                {isLogin && (
                  <button type="button" onClick={() => setResetMode(true)} className="text-xs text-muted-foreground w-full text-center hover:text-foreground">
                    Glömt lösenord?
                  </button>
                )}
                <button type="button" onClick={switchMode} className="text-sm text-primary w-full text-center font-medium">
                  {isLogin ? 'Har du inget konto? Skapa ett gratis' : 'Har du redan konto? Logga in'}
                </button>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </>
  );
}
