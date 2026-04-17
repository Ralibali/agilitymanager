import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returnerar true om inloggad user har admin-rollen.
 * Används för att dölja Admin-länken i sidebaren.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data, error }) => {
      if (!active) return;
      if (!error) setIsAdmin(Boolean(data));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return { isAdmin, loading };
}
