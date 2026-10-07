import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authErrorMessage, confirmationRedirect } from '@/lib/authMessages';

export function ResendConfirmation({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: confirmationRedirect() } });
      if (error) throw error;
      setSent(true);
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="space-y-3">
    <label className="block text-sm font-semibold">E-post för ny bekräftelselänk<input type="email" required autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} className="mt-1 w-full rounded-xl border-2 border-ink/20 bg-white p-3" /></label>
    {error && <p role="alert" className="text-sm text-ember">{error}</p>}
    {sent && <p role="status" className="text-sm text-forest">Om kontot behöver bekräftas skickas en ny länk. Kontrollera även skräpposten.</p>}
    <button type="submit" disabled={busy || sent} className="min-h-11 rounded-xl border-2 border-ink bg-tang px-4 font-bold disabled:opacity-50">{busy ? 'Skickar…' : 'Skicka ny bekräftelselänk'}</button>
  </form>;
}
