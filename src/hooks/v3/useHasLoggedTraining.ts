import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Har den inloggade användaren loggat minst ett *riktigt* träningspass?
 *
 * Används för att hålla paywall och Pro-CTA:er helt ur vägen tills användaren
 * har fått sin första aha-upplevelse (första loggade passet). Efter det får
 * vi visa Pro-värdekortet på hemskärmen.
 *
 * Onboardingen skapar ingen training_session, så den här räknaren är rent
 * beteendebaserad.
 */
export function useHasLoggedTraining(): { loading: boolean; hasLogged: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{ loading: boolean; hasLogged: boolean }>({
    loading: true,
    hasLogged: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ loading: false, hasLogged: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("training_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        // Vid fel: var konservativ och behandla som "inte loggat" så vi inte
        // råkar visa paywall för en användare som inte har fått värde än.
        setState({ loading: false, hasLogged: false });
        return;
      }
      setState({ loading: false, hasLogged: (count ?? 0) > 0 });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
}
