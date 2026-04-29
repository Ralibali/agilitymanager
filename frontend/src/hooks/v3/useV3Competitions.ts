import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { CompetitionResult, PlannedCompetition } from "@/types";

export type V3CompetitionsState = {
  results: CompetitionResult[];
  planned: PlannedCompetition[];
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * Hämtar tävlingsresultat + planerade tävlingar för en specifik hund.
 * Centralt dataskal för v3/competitions.
 */
export function useV3Competitions(dogId: string | null): V3CompetitionsState {
  const { user } = useAuth();
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !dogId) {
      setResults([]);
      setPlanned([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [resR, resP] = await Promise.all([
      supabase
        .from("competition_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("dog_id", dogId)
        .order("date", { ascending: false }),
      supabase
        .from("planned_competitions")
        .select("*")
        .eq("user_id", user.id)
        .eq("dog_id", dogId)
        .order("date", { ascending: true }),
    ]);
    setResults((resR.data as CompetitionResult[]) ?? []);
    setPlanned((resP.data as PlannedCompetition[]) ?? []);
    setLoading(false);
  }, [user?.id, dogId]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ results, planned, loading, reload: load }),
    [results, planned, loading, load],
  );
}

export type CompetitionStats = {
  total: number;
  passedRate: number; // 0-1
  avgPlacement: number | null;
  hoopersPoints: number;
  bestPlacement: number | null;
  recent: CompetitionResult | null;
};

export function computeStats(results: CompetitionResult[]): CompetitionStats {
  if (results.length === 0) {
    return { total: 0, passedRate: 0, avgPlacement: null, hoopersPoints: 0, bestPlacement: null, recent: null };
  }
  const placements = results.map((r) => r.placement).filter((p): p is number => typeof p === "number");
  const passed = results.filter((r) => r.passed && !r.disqualified).length;
  const hoopers = results.reduce((sum, r) => sum + (r.hoopers_points ?? 0), 0);
  const avg = placements.length ? placements.reduce((a, b) => a + b, 0) / placements.length : null;
  const best = placements.length ? Math.min(...placements) : null;
  return {
    total: results.length,
    passedRate: passed / results.length,
    avgPlacement: avg,
    hoopersPoints: hoopers,
    bestPlacement: best,
    recent: results[0] ?? null,
  };
}
