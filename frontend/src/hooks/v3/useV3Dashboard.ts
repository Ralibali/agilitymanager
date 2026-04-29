import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type DashboardStats = {
  sessionsThisWeek: number;
  minutesThisWeek: number;
  streakDays: number;
  passedThisMonth: number;
};

export type NextEvent =
  | {
      kind: "competition";
      id: string;
      title: string;
      date: string;
      location: string;
      status: string;
    }
  | {
      kind: "training";
      id: string;
      title: string;
      date: string;
      location: string;
      time_start: string | null;
    }
  | null;

export type TimelineEntry = {
  id: string;
  kind: "training" | "result" | "goal" | "health";
  title: string;
  subtitle: string;
  date: string;
  accent: "traning" | "tavlings" | "prestation" | "halsa";
};

function localIsoDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function startOfMonth(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date;
}

/**
 * Räknar streak baklänges från idag: antal sammanhängande dagar med pass.
 * Tillåter att idag saknar pass, då börjar den räkna från igår.
 */
function computeStreak(dates: string[], today: Date = new Date()): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates.map((date) => date.slice(0, 10)));
  let streak = 0;
  let cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  if (!set.has(localIsoDate(cursor))) {
    cursor = addDays(cursor, -1);
  }

  while (set.has(localIsoDate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function useV3Dashboard(dogId: string | null) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextEvent, setNextEvent] = useState<NextEvent>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onLogged = (event: Event) => {
      const detail = (event as CustomEvent<{ dogId?: string }>).detail;
      if (!detail?.dogId || detail.dogId === dogId) {
        setReloadKey((key) => key + 1);
      }
    };
    window.addEventListener("v3:training-logged", onLogged);
    return () => window.removeEventListener("v3:training-logged", onLogged);
  }, [dogId]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !dogId) {
      setStats(null);
      setNextEvent(null);
      setTimeline([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const today = new Date();
      const weekStart = localIsoDate(startOfWeek(today));
      const monthStart = localIsoDate(startOfMonth(today));
      const todayIso = localIsoDate(today);
      const sixtyDaysAgo = localIsoDate(addDays(today, -60));

      const [sessionsRes, allSessionsRes, resultsMonthRes, plannedCompRes, plannedTrainingRes, recentResultsRes] = await Promise.all([
        supabase.from("training_sessions").select("id, duration_min, date").eq("user_id", user.id).eq("dog_id", dogId).gte("date", weekStart),
        supabase.from("training_sessions").select("date").eq("user_id", user.id).eq("dog_id", dogId).gte("date", sixtyDaysAgo).order("date", { ascending: false }),
        supabase.from("competition_results").select("id").eq("user_id", user.id).eq("dog_id", dogId).eq("passed", true).gte("date", monthStart),
        supabase.from("planned_competitions").select("id, event_name, date, location, status").eq("user_id", user.id).eq("dog_id", dogId).gte("date", todayIso).order("date", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("planned_training").select("id, title, date, location, time_start, training_type").eq("user_id", user.id).eq("dog_id", dogId).eq("completed", false).gte("date", todayIso).order("date", { ascending: true }).limit(1).maybeSingle(),
        Promise.all([
          supabase.from("training_sessions").select("id, date, duration_min, type, sport, notes_good, tags").eq("user_id", user.id).eq("dog_id", dogId).order("date", { ascending: false }).limit(5),
          supabase.from("competition_results").select("id, date, event_name, placement, passed, time_sec, faults, discipline").eq("user_id", user.id).eq("dog_id", dogId).order("date", { ascending: false }).limit(5),
        ]),
      ]);

      if (cancelled) return;

      const sessions = sessionsRes.data ?? [];
      const allDates = (allSessionsRes.data ?? []).map((s: { date: string }) => s.date);
      const passedMonth = resultsMonthRes.data ?? [];

      setStats({
        sessionsThisWeek: sessions.length,
        minutesThisWeek: sessions.reduce((sum, s: { duration_min: number | null }) => sum + (s.duration_min ?? 0), 0),
        streakDays: computeStreak(allDates, today),
        passedThisMonth: passedMonth.length,
      });

      const comp = plannedCompRes.data;
      const train = plannedTrainingRes.data;
      let next: NextEvent = null;
      if (comp && train) {
        next = new Date(comp.date) <= new Date(train.date)
          ? { kind: "competition", id: comp.id, title: comp.event_name, date: comp.date, location: comp.location ?? "", status: comp.status }
          : { kind: "training", id: train.id, title: train.title, date: train.date, location: train.location ?? "", time_start: train.time_start };
      } else if (comp) {
        next = { kind: "competition", id: comp.id, title: comp.event_name, date: comp.date, location: comp.location ?? "", status: comp.status };
      } else if (train) {
        next = { kind: "training", id: train.id, title: train.title, date: train.date, location: train.location ?? "", time_start: train.time_start };
      }
      setNextEvent(next);

      const [recentSessions, recentResults] = recentResultsRes;
      const tlSessions: TimelineEntry[] = (recentSessions.data ?? []).map((s: { id: string; date: string; duration_min: number | null; type: string; sport: string; notes_good: string | null }) => ({
        id: `s-${s.id}`,
        kind: "training",
        title: `${s.type} · ${s.sport}`,
        subtitle: `${s.duration_min ?? 0} min${s.notes_good ? ` · ${s.notes_good.slice(0, 60)}` : ""}`,
        date: s.date,
        accent: "traning",
      }));
      const tlResults: TimelineEntry[] = (recentResults.data ?? []).map((r: { id: string; date: string; event_name: string; placement: number | null; passed: boolean; discipline: string }) => ({
        id: `r-${r.id}`,
        kind: "result",
        title: r.event_name,
        subtitle: r.passed ? `${r.discipline}${r.placement ? ` · plac ${r.placement}` : ""} · godkänd` : `${r.discipline} · ej godkänd`,
        date: r.date,
        accent: r.passed ? "prestation" : "tavlings",
      }));

      const merged = [...tlSessions, ...tlResults]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);

      setTimeline(merged);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, dogId, reloadKey]);

  return { stats, nextEvent, timeline, loading };
}
