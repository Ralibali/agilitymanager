import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext } from "@/contexts/auth-context";

// Samma kontroll som i supabase/client.ts, men utan att importera klienten:
// Supabase (≈55 kB gzip) ska inte laddas före första renderingen på varje sida.
const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
const loadSupabase = () => import("@/integrations/supabase/client").then((m) => m.supabase);

/**
 * Avskalad auth-context för redesignen — allt på sajten är gratis,
 * så här finns ingen prenumerations-/triallogik kvar. Inloggning
 * används bara för molnlagring, kommentarer och klubbdelning.
 */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    loadSupabase()
      .then((supabase) => {
        if (!mounted) return;
        supabase.auth.getSession().then(({ data }) => {
          if (!mounted) return;
          setUser(data.session?.user ?? null);
          setLoading(false);
        }).catch(() => {
          if (mounted) setLoading(false);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
