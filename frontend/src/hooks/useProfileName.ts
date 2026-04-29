import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hämtar användarens display_name från profiles-tabellen.
 * Faller tillbaka till user_metadata.display_name, email-prefix eller 'Anonym'.
 * Cachar resultatet i localStorage mellan sidladdningar för snabb access.
 */
export function useProfileName(): { name: string; loading: boolean } {
  const { user } = useAuth();
  const cacheKey = user ? `profile_name:${user.id}` : null;

  const [name, setName] = useState<string>(() => {
    if (!cacheKey) return 'Anonym';
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch { /* ignore */ }
    // Fallback omedelbart (synk): user_metadata eller email-prefix
    const metaName = (user?.user_metadata?.display_name as string | undefined)
      || (user?.user_metadata?.full_name as string | undefined);
    if (metaName) return metaName;
    if (user?.email) return user.email.split('@')[0];
    return 'Anonym';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !cacheKey) {
      setName('Anonym');
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const dn = (data?.display_name as string | null) || null;
        const fallback = (user.user_metadata?.display_name as string | undefined)
          || (user.user_metadata?.full_name as string | undefined)
          || user.email?.split('@')[0]
          || 'Anonym';
        const final = dn && dn.trim().length > 0 ? dn : fallback;
        setName(final);
        try { localStorage.setItem(cacheKey, final); } catch { /* ignore */ }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, cacheKey]);

  return { name, loading };
}
