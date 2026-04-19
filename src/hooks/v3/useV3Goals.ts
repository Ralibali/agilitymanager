import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type V3Goal = {
  id: string;
  user_id: string;
  dog_id: string;
  title: string;
  description: string;
  category: string;
  goal_type: string; // "milestone" | "numeric"
  status: string;    // "active" | "completed"
  target_value: number | null;
  current_value: number | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type V3GoalsState = {
  goals: V3Goal[];
  unlockedBadges: Set<string>;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useV3Goals(dogId: string | null): V3GoalsState {
  const { user } = useAuth();
  const [goals, setGoals] = useState<V3Goal[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setGoals([]);
      setUnlockedBadges(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const goalsQuery = supabase
      .from("training_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dogId) goalsQuery.eq("dog_id", dogId);

    const [goalsRes, achRes] = await Promise.all([
      goalsQuery,
      supabase.from("achievements").select("achievement_key").eq("user_id", user.id),
    ]);

    setGoals((goalsRes.data as V3Goal[]) ?? []);
    setUnlockedBadges(new Set((achRes.data ?? []).map((r) => r.achievement_key as string)));
    setLoading(false);
  }, [user?.id, dogId]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(() => ({ goals, unlockedBadges, loading, reload: load }), [goals, unlockedBadges, loading, load]);
}

export type GoalStats = {
  total: number;
  active: number;
  completed: number;
  completionRate: number; // 0-1
  dueSoon: number;        // active goals with target_date within 14 days
};

export function computeGoalStats(goals: V3Goal[]): GoalStats {
  const total = goals.length;
  const completed = goals.filter((g) => g.status === "completed").length;
  const active = total - completed;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueSoon = goals.filter((g) => {
    if (g.status === "completed" || !g.target_date) return false;
    const t = new Date(g.target_date + "T00:00:00").getTime();
    const diff = (t - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14;
  }).length;
  return {
    total,
    active,
    completed,
    completionRate: total > 0 ? completed / total : 0,
    dueSoon,
  };
}
