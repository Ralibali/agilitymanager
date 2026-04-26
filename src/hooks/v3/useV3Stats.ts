import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type WeeklyBucket = {
  weekStart: string; // ISO date (Monday)
  label: string; // "v.13"
  sessions: number;
  minutes: number;
  passed: number;
  starts: number;
};

export type TypeDistribution = {
  type: string;
  count: number;
  percent: number;
};

export type ScoreTrend = {
  date: string;
  banflyt: number | null;
  dirigering: number | null;
  mood: number | null;
};

export type DogCompare = {
  dogId: string;
  dogName: string;
  themeColor: string;
  totalSessions: number;
  totalMinutes: number;
  passRate: number; // 0-1
  starts: number;
  avgPlacement: number | null;
};

export type Insight = {
  id: string;
  tone: "positive" | "neutral" | "warning";
  title: string;
  body: string;
};

export type V3Stats = {
  totals: {
    sessions: number;
    minutes: number;
    starts: number;
    passed: number;
    passRate: number;
    bestTime: number | null;
    avgMood: number | null;
  };
  weekly: WeeklyBucket[];
  typeDist: TypeDistribution[];
  scoreTrend: ScoreTrend[];
  topTags: { tag: string; count: number }[];
  insights: Insight[];
};

export type RangeKey = "30d" | "90d" | "365d" | "all";

const MS_DAY = 24 * 60 * 60 * 1000;

function localIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
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

function rangeStart(range: RangeKey): string | null {
  if (range === "all") return null;
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return localIsoDate(addDays(today, -days));
}

function defaultWeeksForRange(range: RangeKey): number {
  if (range === "30d") return 5;
  if (range === "90d") return 13;
  if (range === "365d") return 26;
  return 12;
}

function weekLabel(d: Date): string {
  // ISO-week (måndag-baserad)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const weekNum =
    1 + Math.round(((date.getTime() - firstThursday.getTime()) / MS_DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `v.${weekNum}`;
}

type SessionRow = {
  id: string;
  date: string;
  duration_min: number | null;
  type: string;
  sport: string;
  banflyt_score: number | null;
  dirigering_score: number | null;
  overall_mood: number | null;
  best_time_sec: number | null;
  tags: string[] | null;
  dog_id: string;
};

type ResultRow = {
  id: string;
  date: string;
  passed: boolean;
  placement: number | null;
  time_sec: number | null;
  dog_id: string;
};

type DogRow = {
  id: string;
  name: string;
  theme_color: string | null;
};

function makeEmptyBucket(date: Date): WeeklyBucket {
  const weekStart = localIsoDate(startOfWeek(date));
  return { weekStart, label: weekLabel(startOfWeek(date)), sessions: 0, minutes: 0, passed: 0, starts: 0 };
}

function buildWeekly(sessions: SessionRow[], results: ResultRow[], range: RangeKey): WeeklyBucket[] {
  const map = new Map<string, WeeklyBucket>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeek = startOfWeek(today);
  const defaultWeeks = defaultWeeksForRange(range);

  // Skapa alltid en sammanhängande serie veckor så grafen inte ser trasig ut vid lite data.
  for (let i = defaultWeeks - 1; i >= 0; i--) {
    const week = addDays(currentWeek, -i * 7);
    const bucket = makeEmptyBucket(week);
    map.set(bucket.weekStart, bucket);
  }

  const touch = (iso: string) => {
    const ws = startOfWeek(parseLocalDate(iso));
    const key = localIsoDate(ws);
    if (!map.has(key)) map.set(key, makeEmptyBucket(ws));
    return map.get(key)!;
  };

  sessions.forEach((s) => {
    const b = touch(s.date);
    b.sessions += 1;
    b.minutes += s.duration_min ?? 0;
  });
  results.forEach((r) => {
    const b = touch(r.date);
    b.starts += 1;
    if (r.passed) b.passed += 1;
  });

  const sorted = Array.from(map.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (range === "all") return sorted.slice(-Math.max(defaultWeeks, 12));
  return sorted;
}

function buildTypeDist(sessions: SessionRow[]): TypeDistribution[] {
  const counts = new Map<string, number>();
  sessions.forEach((s) => counts.set(s.type, (counts.get(s.type) ?? 0) + 1));
  const total = sessions.length || 1;
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count, percent: count / total }))
    .sort((a, b) => b.count - a.count);
}

function buildScoreTrend(sessions: SessionRow[]): ScoreTrend[] {
  const map = new Map<string, { b: number[]; d: number[]; m: number[] }>();
  sessions.forEach((s) => {
    const key = localIsoDate(startOfWeek(parseLocalDate(s.date)));
    if (!map.has(key)) map.set(key, { b: [], d: [], m: [] });
    const bucket = map.get(key)!;
    if (s.banflyt_score != null) bucket.b.push(s.banflyt_score);
    if (s.dirigering_score != null) bucket.d.push(s.dirigering_score);
    if (s.overall_mood != null) bucket.m.push(s.overall_mood);
  });
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, banflyt: avg(v.b), dirigering: avg(v.d), mood: avg(v.m) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildTopTags(sessions: SessionRow[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  sessions.forEach((s) => {
    (s.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildInsights(weekly: WeeklyBucket[], typeDist: TypeDistribution[], scoreTrend: ScoreTrend[], totals: V3Stats["totals"]): Insight[] {
  const out: Insight[] = [];
  if (weekly.length >= 6) {
    const last4 = weekly.slice(-4).reduce((s, w) => s + w.sessions, 0);
    const prev4 = weekly.slice(-8, -4).reduce((s, w) => s + w.sessions, 0);
    if (prev4 > 0) {
      const delta = ((last4 - prev4) / prev4) * 100;
      if (delta >= 15) out.push({ id: "vol-up", tone: "positive", title: "Träningsvolymen ökar", body: `Senaste 4 veckor har du tränat ${last4} pass – ${Math.round(delta)}% mer än perioden innan. Bra rytm.` });
      else if (delta <= -25) out.push({ id: "vol-down", tone: "warning", title: "Volymen har sjunkit", body: `Du har tränat ${last4} pass senaste 4 veckorna mot ${prev4} förra. Planera in ett par korta pass nästa vecka.` });
    }
  }
  const validScores = scoreTrend.filter((s) => s.banflyt != null);
  if (validScores.length >= 4) {
    const last2 = validScores.slice(-2);
    const first2 = validScores.slice(0, 2);
    const lastAvg = last2.reduce((s, w) => s + (w.banflyt ?? 0), 0) / last2.length;
    const firstAvg = first2.reduce((s, w) => s + (w.banflyt ?? 0), 0) / first2.length;
    if (lastAvg - firstAvg >= 0.5) out.push({ id: "score-up", tone: "positive", title: "Banflyt har förbättrats", body: `Snittet har gått från ${firstAvg.toFixed(1)} till ${lastAvg.toFixed(1)} – ditt arbete syns i siffrorna.` });
  }
  if (typeDist.length > 0 && typeDist[0].percent >= 0.6) out.push({ id: "mix", tone: "neutral", title: "Ensidig träningsmix", body: `${Math.round(typeDist[0].percent * 100)}% av passen är "${typeDist[0].type}". Variera med en annan typ för balanserad utveckling.` });
  if (totals.starts >= 5) {
    if (totals.passRate >= 0.7) out.push({ id: "pass-rate-good", tone: "positive", title: `${Math.round(totals.passRate * 100)}% godkända lopp`, body: `Av ${totals.starts} starter har ${totals.passed} gått igenom – stabilt resultat.` });
    else if (totals.passRate < 0.4) out.push({ id: "pass-rate-low", tone: "warning", title: "Låg andel godkända lopp", body: `${totals.passed} av ${totals.starts} starter klara. Fokusera på en specifik felkälla i nästa pass.` });
  }
  if (out.length === 0) out.push({ id: "default", tone: "neutral", title: "Bygger underlag", body: "Logga några pass och resultat till så ger vi dig skräddarsydda insikter." });
  return out;
}

export function useV3Stats(dogId: string | null, range: RangeKey) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onLogged = (event: Event) => {
      const detail = (event as CustomEvent<{ dogId?: string }>).detail;
      if (!detail?.dogId || detail.dogId === dogId) setReloadKey((key) => key + 1);
    };
    window.addEventListener("v3:training-logged", onLogged);
    return () => window.removeEventListener("v3:training-logged", onLogged);
  }, [dogId]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !dogId) {
      setSessions([]);
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const since = rangeStart(range);
      const sessionsQuery = supabase.from("training_sessions").select("id, date, duration_min, type, sport, banflyt_score, dirigering_score, overall_mood, best_time_sec, tags, dog_id").eq("user_id", user.id).eq("dog_id", dogId).order("date", { ascending: true });
      const resultsQuery = supabase.from("competition_results").select("id, date, passed, placement, time_sec, dog_id").eq("user_id", user.id).eq("dog_id", dogId).order("date", { ascending: true });
      const [sRes, rRes] = await Promise.all([since ? sessionsQuery.gte("date", since) : sessionsQuery, since ? resultsQuery.gte("date", since) : resultsQuery]);
      if (cancelled) return;
      setSessions((sRes.data ?? []) as SessionRow[]);
      setResults((rRes.data ?? []) as ResultRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, dogId, range, reloadKey]);

  const stats = useMemo<V3Stats>(() => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((s, x) => s + (x.duration_min ?? 0), 0);
    const starts = results.length;
    const passed = results.filter((r) => r.passed).length;
    const passRate = starts > 0 ? passed / starts : 0;
    const moodVals = sessions.map((s) => s.overall_mood).filter((v): v is number => v != null);
    const avgMood = moodVals.length ? moodVals.reduce((a, b) => a + b, 0) / moodVals.length : null;
    const times = results.map((r) => r.time_sec).filter((v): v is number => v != null && v > 0);
    const bestTime = times.length ? Math.min(...times) : null;
    const totals = { sessions: totalSessions, minutes: totalMinutes, starts, passed, passRate, bestTime, avgMood };
    const weekly = buildWeekly(sessions, results, range);
    const typeDist = buildTypeDist(sessions);
    const scoreTrend = buildScoreTrend(sessions);
    const topTags = buildTopTags(sessions);
    const insights = buildInsights(weekly, typeDist, scoreTrend, totals);
    return { totals, weekly, typeDist, scoreTrend, topTags, insights };
  }, [sessions, results, range]);

  return { stats, loading };
}

export function useV3DogCompare(range: RangeKey) {
  const { user } = useAuth();
  const [rows, setRows] = useState<DogCompare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const since = rangeStart(range);
      const dogsQ = supabase.from("dogs").select("id, name, theme_color").eq("user_id", user.id).order("created_at", { ascending: true });
      const sQ = supabase.from("training_sessions").select("dog_id, duration_min").eq("user_id", user.id);
      const rQ = supabase.from("competition_results").select("dog_id, passed, placement").eq("user_id", user.id);
      const [dogsRes, sRes, rRes] = await Promise.all([dogsQ, since ? sQ.gte("date", since) : sQ, since ? rQ.gte("date", since) : rQ]);
      if (cancelled) return;
      const dogs = (dogsRes.data ?? []) as DogRow[];
      const sList = (sRes.data ?? []) as { dog_id: string; duration_min: number | null }[];
      const rList = (rRes.data ?? []) as { dog_id: string; passed: boolean; placement: number | null }[];
      const compare: DogCompare[] = dogs.map((d) => {
        const ses = sList.filter((s) => s.dog_id === d.id);
        const res = rList.filter((r) => r.dog_id === d.id);
        const passed = res.filter((r) => r.passed).length;
        const placements = res.map((r) => r.placement).filter((v): v is number => v != null);
        return { dogId: d.id, dogName: d.name, themeColor: d.theme_color ?? "hsl(var(--v3-brand-500))", totalSessions: ses.length, totalMinutes: ses.reduce((sum, s) => sum + (s.duration_min ?? 0), 0), passRate: res.length > 0 ? passed / res.length : 0, starts: res.length, avgPlacement: placements.length ? placements.reduce((a, b) => a + b, 0) / placements.length : null };
      });
      setRows(compare);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, range]);

  return { rows, loading };
}
