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
      date: string; // ISO
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
  date: string; // ISO
  accent: "traning" | "tavlings" | "prestation" | "halsa";
};

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // måndag = 0
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Räknar streak baklänges från idag: antal sammanhängande dagar med pass.
 */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // tillåt att idag inte har pass – då börjar vi räkna från igår
  if (!set.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Hämtar alla data för dashboard för aktiv hund. Kör parallella queries.
 */
export function useV3Dashboard(dogId: string | null) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextEvent, setNextEvent] = useState<NextEvent>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
      const weekStart = isoDate(startOfWeek(today));
      const monthStart = isoDate(startOfMonth(today));
      const todayIso = isoDate(today);

      const [sessionsRes, allSessionsRes, resultsMonthRes, plannedCompRes, plannedTrainingRes, recentResultsRes] = await Promise.all([
        // veckans pass
        supabase
          .from("training_sessions")
          .select("id, duration_min, date")
          .eq("user_id", user.id)
          .eq("dog_id", dogId)
          .gte("date", weekStart),
        // alla datum (för streak) senaste 60 dagar
        supabase
          .from("training_sessions")
          .select("date")
          .eq("user_id", user.id)
          .eq("dog_id", dogId)
          .gte("date", isoDate(new Date(today.getTime() - 60 * 24 * 3600 * 1000)))
          .order("date", { ascending: false }),
        // klarade lopp denna månad
        supabase
          .from("competition_results")
          .select("id")
          .eq("user_id", user.id)
          .eq("dog_id", dogId)
          .eq("passed", true)
          .gte("date", monthStart),
        // nästa planerade tävling
        supabase
          .from("planned_competitions")
          .select("id, event_name, date, location, status")
          .eq("user_id", user.id)
          .eq("dog_id", dogId)
          .gte("date", todayIso)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        // nästa planerade träning
        supabase
          .from("planned_training")
          .select("id, title, date, location, time_start, training_type")
          .eq("user_id", user.id)
          .eq("dog_id", dogId)
          .eq("completed", false)
          .gte("date", todayIso)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        // timeline – senaste sessions + resultat
        Promise.all([
          supabase
            .from("training_sessions")
            .select("id, date, duration_min, type, sport, notes_good, tags")
            .eq("user_id", user.id)
            .eq("dog_id", dogId)
            .order("date", { ascending: false })
            .limit(5),
          supabase
            .from("competition_results")
            .select("id, date, event_name, placement, passed, time_sec, faults, discipline")
            .eq("user_id", user.id)
            .eq("dog_id", dogId)
            .order("date", { ascending: false })
            .limit(5),
        ]),
      ]);

      if (cancelled) return;

      const sessions = sessionsRes.data ?? [];
      const allDates = (allSessionsRes.data ?? []).map((s: { date: string }) => s.date);
      const passedMonth = resultsMonthRes.data ?? [];

      setStats({
        sessionsThisWeek: sessions.length,
        minutesThisWeek: sessions.reduce((sum, s: { duration_min: number | null }) => sum + (s.duration_min ?? 0), 0),
        streakDays: computeStreak(allDates),
        passedThisMonth: passedMonth.length,
      });

      // Välj närmaste event av tävling vs träning
      const comp = plannedCompRes.data;
      const train = plannedTrainingRes.data;
      let next: NextEvent = null;
      if (comp && train) {
        next =
          new Date(comp.date) <= new Date(train.date)
            ? { kind: "competition", id: comp.id, title: comp.event_name, date: comp.date, location: comp.location ?? "", status: comp.status }
            : { kind: "training", id: train.id, title: train.title, date: train.date, location: train.location ?? "", time_start: train.time_start };
      } else if (comp) {
        next = { kind: "competition", id: comp.id, title: comp.event_name, date: comp.date, location: comp.location ?? "", status: comp.status };
      } else if (train) {
        next = { kind: "training", id: train.id, title: train.title, date: train.date, location: train.location ?? "", time_start: train.time_start };
      }
      setNextEvent(next);

      const [recentSessions, recentResults] = recentResultsRes;
      const tlSessions: TimelineEntry[] = (recentSessions.data ?? []).map((s: {
        id: string; date: string; duration_min: number | null; type: string; sport: string; notes_good: string | null;
      }) => ({
        id: `s-${s.id}`,
        kind: "training",
        title: `${s.type} · ${s.sport}`,
        subtitle: `${s.duration_min ?? 0} min${s.notes_good ? ` · ${s.notes_good.slice(0, 60)}` : ""}`,
        date: s.date,
        accent: "traning",
      }));
      const tlResults: TimelineEntry[] = (recentResults.data ?? []).map((r: {
        id: string; date: string; event_name: string; placement: number | null; passed: boolean; discipline: string;
      }) => ({
        id: `r-${r.id}`,
        kind: "result",
        title: r.event_name,
        subtitle: r.passed
          ? `${r.discipline}${r.placement ? ` · plac ${r.placement}` : ""} · godkänd`
          : `${r.discipline} · ej godkänd`,
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
  }, [user?.id, dogId]);

  return { stats, nextEvent, timeline, loading };
}
