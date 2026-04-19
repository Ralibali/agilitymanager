import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type V3Session = {
  id: string;
  date: string;
  dog_id: string;
  duration_min: number | null;
  type: string;
  sport: string;
  location: string | null;
  notes_good: string | null;
  notes_improve: string | null;
  tags: string[] | null;
  dog_energy: number | null;
  handler_energy: number | null;
  obstacles_trained: string[] | null;
};

export type V3TrainingFilter = {
  sport: "all" | "Agility" | "Hoopers" | "Båda";
  period: "7d" | "30d" | "90d" | "all";
};

export type V3TrainingStats = {
  total: number;
  totalMinutes: number;
  avgMinutes: number;
  byWeek: { week: string; count: number; minutes: number }[];
  topType: string | null;
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * Hämtar träningspass för aktiv hund med filter.
 * Returnerar passen + aggregerad statistik (vecka, toppar).
 */
export function useV3Training(dogId: string | null, filter: V3TrainingFilter) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<V3Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !dogId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      let query = supabase
        .from("training_sessions")
        .select(
          "id, date, dog_id, duration_min, type, sport, location, notes_good, notes_improve, tags, dog_energy, handler_energy, obstacles_trained",
        )
        .eq("user_id", user.id)
        .eq("dog_id", dogId)
        .order("date", { ascending: false })
        .limit(200);

      if (filter.sport !== "all") {
        query = query.eq("sport", filter.sport);
      }
      if (filter.period !== "all") {
        const days = filter.period === "7d" ? 7 : filter.period === "30d" ? 30 : 90;
        query = query.gte("date", isoDaysAgo(days));
      }

      const { data } = await query;
      if (cancelled) return;
      setSessions((data ?? []) as V3Session[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, dogId, filter.sport, filter.period, reloadKey]);

  const stats = useMemo<V3TrainingStats>(() => {
    if (sessions.length === 0) {
      return { total: 0, totalMinutes: 0, avgMinutes: 0, byWeek: [], topType: null };
    }
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_min ?? 0), 0);
    const byWeekMap = new Map<string, { count: number; minutes: number }>();
    const typeCounts = new Map<string, number>();

    for (const s of sessions) {
      const wk = weekKey(s.date);
      const cur = byWeekMap.get(wk) ?? { count: 0, minutes: 0 };
      byWeekMap.set(wk, { count: cur.count + 1, minutes: cur.minutes + (s.duration_min ?? 0) });
      typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1);
    }

    const byWeek = Array.from(byWeekMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-8)
      .map(([week, v]) => ({ week, ...v }));

    const topType =
      Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      total: sessions.length,
      totalMinutes,
      avgMinutes: Math.round(totalMinutes / sessions.length),
      byWeek,
      topType,
    };
  }, [sessions]);

  return { sessions, stats, loading, reload };
}
