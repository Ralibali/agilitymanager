/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Hämtar användarens visningsnamn för PDF-footer m.m.
 * Faller tillbaka till handler_first_name + last_name, sedan email.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProfileName(): string {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setName(""); return; }
    setName(user.email ?? "");
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, handler_first_name, handler_last_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const full = [data.handler_first_name, data.handler_last_name].filter(Boolean).join(" ").trim();
      setName(data.display_name || full || user.email || "");
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  return name;
}
