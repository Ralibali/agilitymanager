import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type V3Dog = {
  id: string;
  name: string;
  breed: string;
  birthdate: string | null;
  photo_url: string | null;
  size_class: string;
  sport: string;
  competition_level: string;
  hoopers_level: string;
  is_active_competition_dog: boolean;
};

const STORAGE_KEY = "v3-active-dog-id";

/**
 * Lista över användarens hundar + aktiv hund.
 * Aktiv hund läses från localStorage först, annars dogs.is_active_competition_dog,
 * annars första hunden i listan. Persisterar val i localStorage.
 */
export function useV3Dogs() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<V3Dog[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setDogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("dogs")
        .select(
          "id, name, breed, birthdate, photo_url, size_class, sport, competition_level, hoopers_level, is_active_competition_dog",
        )
        .eq("user_id", user.id)
        .order("is_active_competition_dog", { ascending: false })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error || !data) {
        setDogs([]);
        setLoading(false);
        return;
      }

      const list = data as V3Dog[];
      setDogs(list);

      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const fromStorage = stored && list.find((d) => d.id === stored) ? stored : null;
      const fromActive = list.find((d) => d.is_active_competition_dog)?.id ?? null;
      setActiveId(fromStorage ?? fromActive ?? list[0]?.id ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const active = useMemo(
    () => (dogs && activeId ? dogs.find((d) => d.id === activeId) ?? null : null),
    [dogs, activeId],
  );

  return { dogs: dogs ?? [], active, activeId, setActive, loading };
}
