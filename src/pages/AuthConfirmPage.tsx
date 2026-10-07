import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { authCallbackError, authErrorMessage } from '@/lib/authMessages';
import { ResendConfirmation } from '@/components/ResendConfirmation';
import { SiteNav } from '@/components/SiteNav';
import { AuthDialog } from '@/components/AuthDialog';
import { Seo } from '@/components/Seo';

export default function AuthConfirmPage() {
  const location = useLocation();
  const [result, setResult] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Kontrollerar bekräftelsen…');
  const [login, setLogin] = useState(false);
  // React StrictMode must never consume a single-use token twice.
  const request = useRef<Promise<{ ok: boolean; message: string }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!request.current) request.current = (async () => {
      try {
        const callbackError = authCallbackError(location.search, location.hash);
        if (callbackError) throw { code: callbackError };
        const params = new URLSearchParams(location.search);
        const tokenHash = params.get('token_hash');
        if (tokenHash) {
          // This route only confirms email/signup; never silently accepts recovery tokens.
          if (!['email', 'signup'].includes(params.get('type') ?? '')) throw new Error('Invalid token');
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
          if (error) throw error;
        }
        // getSession waits for Supabase's own implicit/PKCE URL handling.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw { code: 'otp_expired' };
        return { ok: true, message: 'E-postadressen är bekräftad. Du är inloggad.' };
      } catch (error) { return { ok: false, message: authErrorMessage(error) }; }
    })();
    request.current.then(value => {
      if (cancelled) return;
      setResult(value.ok ? 'success' : 'error'); setMessage(value.message);
      // Tokens and provider errors should not remain in history/address bar.
      window.history.replaceState(window.history.state, '', '/auth/bekrafta');
    });
    return () => { cancelled = true; };
  }, [location.search, location.hash]);
  return <><Seo title="Bekräfta e-post – AgilityManager" description="Bekräfta ditt konto eller begär en ny länk." noIndex /><SiteNav /><main className="mx-auto max-w-lg space-y-5 px-4 py-16"><h1 className="font-display text-3xl">Bekräfta din e-post</h1><p role={result === 'error' ? 'alert' : 'status'}>{message}</p>{result === 'error' && <ResendConfirmation />}<Link to="/banplanerare" className="block font-semibold underline">Öppna banplaneraren</Link><button className="min-h-11 underline" onClick={() => setLogin(true)}>Logga in</button></main><AuthDialog open={login} onOpenChange={setLogin} /></>;
}
