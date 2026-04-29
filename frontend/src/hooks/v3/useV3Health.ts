import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type V3HealthLog = {
  id: string;
  user_id: string;
  dog_id: string;
  date: string;
  type: string; // "vet_visit" | "vaccination" | "weight" | "deworming" | "medication" | "other"
  title: string;
  description: string;
  weight_kg: number | null;
  next_date: string | null;
  created_at: string;
};

export const HEALTH_TYPES = [
  { value: "vet_visit", label: "Vetbesök", emoji: "🩺" },
  { value: "vaccination", label: "Vaccination", emoji: "💉" },
  { value: "weight", label: "Vikt", emoji: "⚖️" },
  { value: "deworming", label: "Avmaskning", emoji: "🪱" },
  { value: "medication", label: "Medicin", emoji: "💊" },
  { value: "other", label: "Annat", emoji: "📋" },
] as const;

export function healthTypeMeta(type: string) {
  return HEALTH_TYPES.find((t) => t.value === type) ?? HEALTH_TYPES[5];
}

export type V3HealthState = {
  logs: V3HealthLog[];
  loading: boolean;
  reload: () => Promise<void>;
};

export function useV3Health(dogId: string | null): V3HealthState {
  const { user } = useAuth();
  const [logs, setLogs] = useState<V3HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !dogId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("dog_id", dogId)
      .order("date", { ascending: false });
    setLogs((data as V3HealthLog[]) ?? []);
    setLoading(false);
  }, [user?.id, dogId]);

  useEffect(() => {
    load();
  }, [load]);

  return { logs, loading, reload: load };
}

export type V3HealthStats = {
  total: number;
  upcomingReminders: V3HealthLog[];
  overdueReminders: V3HealthLog[];
  latestWeight: { weight: number; date: string } | null;
  weightTrend: number | null; // diff vs föregående vikt
  weightSeries: { date: string; weight: number }[];
};

export function computeHealthStats(logs: V3HealthLog[]): V3HealthStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminders = logs.filter((l) => l.next_date);
  const upcoming: V3HealthLog[] = [];
  const overdue: V3HealthLog[] = [];

  for (const r of reminders) {
    const d = new Date(r.next_date! + "T00:00:00");
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) overdue.push(r);
    else if (diff <= 30) upcoming.push(r);
  }

  upcoming.sort((a, b) => (a.next_date ?? "").localeCompare(b.next_date ?? ""));
  overdue.sort((a, b) => (a.next_date ?? "").localeCompare(b.next_date ?? ""));

  const weights = logs
    .filter((l) => l.weight_kg && l.weight_kg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const weightSeries = weights.map((w) => ({ date: w.date, weight: Number(w.weight_kg) }));
  const latest = weights[weights.length - 1];
  const prev = weights[weights.length - 2];

  return {
    total: logs.length,
    upcomingReminders: upcoming,
    overdueReminders: overdue,
    latestWeight: latest ? { weight: Number(latest.weight_kg), date: latest.date } : null,
    weightTrend: latest && prev ? Number(latest.weight_kg) - Number(prev.weight_kg) : null,
    weightSeries,
  };
}

export function useV3HealthStats(logs: V3HealthLog[]): V3HealthStats {
  return useMemo(() => computeHealthStats(logs), [logs]);
}
