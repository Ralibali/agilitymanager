import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, ExternalLink, Calendar, MapPin, Filter, X, Star, Check, Send, Trash2, Trophy, Inbox, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn, stripHtml } from "@/lib/utils";
import { toast } from "sonner";
import ShareToFriendDialog from "@/components/ShareToFriendDialog";
import { FetchMyResultDialog, type FetchMyResultTarget } from "@/components/v3/FetchMyResultDialog";
import { store } from "@/lib/store";
import type { Dog } from "@/types";

type Sport = "Agility" | "Hoopers";
type InterestStatus = "interested" | "registered";

interface CompRow {
  id: string;
  competition_id?: string;
  competition_name: string | null;
  club_name: string | null;
  location: string | null;
  region: string | null;
  date: string | null;
  registration_deadline: string | null;
  classes: string[];
  source_url: string | null;
  source_label: string;
  sport: Sport;
  /** Sätts när raden är delad till mig av en vän */
  sharedBy?: { name: string | null; avatar: string | null; message: string; at: string };
}

const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getDate()} ${MONTH[date.getMonth()]} ${date.getFullYear()}`;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso);
  t.setHours(23, 59, 59, 0);
  return t.getTime() < Date.now();
}

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH[Number(m) - 1]} ${y}`;
}

interface Props {
  preferredSport: Sport;
}

type ViewMode = "all" | "interested" | "registered" | "shared";

interface SharedCompMeta {
  message_id: string;
  shared_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  message: string;
  shared_at: string;
  data: Record<string, any>;
}

/**
 * Sök, filtrera och bläddra bland tävlingar (Agility + Hoopers).
 * - Markera intresserad / anmäld (sparas i competition_interests)
 * - Dela med vän (delade tävlingar visas i fliken "Delade")
 * - Hämta egna resultat (efter tävling) via GDPR-säker edge function
 */
export function V3FindCompetitions({ preferredSport }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("all");
  const [sport, setSport] = useState<Sport>(preferredSport);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<Record<string, InterestStatus>>({});
  const [markedRows, setMarkedRows] = useState<CompRow[]>([]);
  const [sharedComps, setSharedComps] = useState<SharedCompMeta[]>([]);
  const [shareTarget, setShareTarget] = useState<CompRow | null>(null);
  const [resultTarget, setResultTarget] = useState<FetchMyResultTarget | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);

  // Hämta hundar (för Hämta resultat-dialogen)
  useEffect(() => {
    if (!user) return;
    store.getDogs().then(setDogs).catch(() => setDogs([]));
  }, [user]);

  // Hämta tävlingar för aktuell sport (kommande för "Alla", alla för "Mina")
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const includePast = view !== "all"; // i mina/intresserade/anmälda/delade vill vi se passerade också
      if (sport === "Agility") {
        let q = supabase
          .from("competitions")
          .select(
            "id, competition_name, club_name, location, region, date_start, last_registration_date, classes_agility, classes_hopp, classes_other, source_url",
          )
          .order("date_start", { ascending: !includePast })
          .limit(180);
        if (!includePast) q = q.gte("date_start", today);
        const { data } = await q;
        if (cancelled) return;
        setRows(
          (data ?? []).map((r: any) => ({
            id: r.id,
            competition_name: stripHtml(r.competition_name ?? ""),
            club_name: stripHtml(r.club_name ?? ""),
            location: r.location,
            region: r.region,
            date: r.date_start,
            registration_deadline: r.last_registration_date,
            classes: [
              ...(r.classes_agility ?? []),
              ...(r.classes_hopp ?? []),
              ...(r.classes_other ?? []),
            ],
            source_url: r.source_url ?? "https://agilitydata.se/taevlingar/",
            source_label: "agilitydata.se",
            sport: "Agility" as const,
          })),
        );
      } else {
        let q = supabase
          .from("hoopers_competitions_public")
          .select(
            "id, competition_id, competition_name, club_name, location, county, date, registration_closes, classes, source_url",
          )
          .order("date", { ascending: !includePast })
          .limit(180);
        if (!includePast) q = q.gte("date", today);
        const { data } = await q;
        if (cancelled) return;
        setRows(
          (data ?? []).map((r: any) => ({
            id: r.id ?? r.competition_id,
            competition_id: r.competition_id,
            competition_name: r.competition_name,
            club_name: r.club_name,
            location: r.location,
            region: r.county,
            date: r.date,
            registration_deadline: r.registration_closes,
            classes: r.classes ?? [],
            source_url: r.source_url,
            source_label: "shok.se",
            sport: "Hoopers" as const,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sport, view]);

  // Hämta användarens intressen + de faktiska tävlingsraderna (oberoende av aktiv sport / tidsfönster)
  const reloadInterests = useCallback(async () => {
    if (!user) {
      setInterests({});
      setMarkedRows([]);
      return;
    }
    const { data } = await supabase
      .from("competition_interests")
      .select("competition_id, status")
      .eq("user_id", user.id);
    const map: Record<string, InterestStatus> = {};
    const ids: string[] = [];
    (data ?? []).forEach((r) => {
      if (r.status === "interested" || r.status === "registered") {
        map[r.competition_id] = r.status as InterestStatus;
        ids.push(r.competition_id);
      }
    });
    setInterests(map);

    if (ids.length === 0) {
      setMarkedRows([]);
      return;
    }

    // Slå upp de markerade tävlingarna i båda tabellerna parallellt
    const [agi, hoo] = await Promise.all([
      supabase
        .from("competitions")
        .select(
          "id, competition_name, club_name, location, region, date_start, last_registration_date, classes_agility, classes_hopp, classes_other, source_url",
        )
        .in("id", ids),
      supabase
        .from("hoopers_competitions_public")
        .select(
          "id, competition_id, competition_name, club_name, location, county, date, registration_closes, classes, source_url",
        )
        .in("competition_id", ids),
    ]);

    const merged: CompRow[] = [
      ...((agi.data ?? []) as any[]).map((r) => ({
        id: r.id,
        competition_name: stripHtml(r.competition_name ?? ""),
        club_name: stripHtml(r.club_name ?? ""),
        location: r.location,
        region: r.region,
        date: r.date_start,
        registration_deadline: r.last_registration_date,
        classes: [
          ...(r.classes_agility ?? []),
          ...(r.classes_hopp ?? []),
          ...(r.classes_other ?? []),
        ],
        source_url: r.source_url ?? "https://agilitydata.se/taevlingar/",
        source_label: "agilitydata.se",
        sport: "Agility" as Sport,
      })),
      ...((hoo.data ?? []) as any[]).map((r) => ({
        id: r.id ?? r.competition_id,
        competition_id: r.competition_id,
        competition_name: r.competition_name,
        club_name: r.club_name,
        location: r.location,
        region: r.county,
        date: r.date,
        registration_deadline: r.registration_closes,
        classes: r.classes ?? [],
        source_url: r.source_url,
        source_label: "shok.se",
        sport: "Hoopers" as Sport,
      })),
    ];
    setMarkedRows(merged);
  }, [user]);

  useEffect(() => {
    reloadInterests();
  }, [reloadInterests]);

  // Hämta tävlingar som vänner delat med mig (messages.shared_type='competition')
  const reloadShared = useCallback(async () => {
    if (!user) {
      setSharedComps([]);
      return;
    }
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, shared_id, shared_data, content, created_at")
      .eq("receiver_id", user.id)
      .eq("shared_type", "competition")
      .not("shared_id", "is", null)
      .order("created_at", { ascending: false });
    if (!data?.length) {
      setSharedComps([]);
      return;
    }
    const senderIds = [...new Set(data.map((m) => m.sender_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", senderIds);
    const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
    // Behåll endast senaste posten per shared_id
    const seen = new Set<string>();
    const uniq: SharedCompMeta[] = [];
    for (const m of data) {
      if (!m.shared_id || seen.has(m.shared_id)) continue;
      seen.add(m.shared_id);
      const p = profMap.get(m.sender_id);
      uniq.push({
        message_id: m.id,
        shared_id: m.shared_id,
        sender_id: m.sender_id,
        sender_name: p?.display_name ?? null,
        sender_avatar: p?.avatar_url ?? null,
        message: m.content ?? "",
        shared_at: m.created_at,
        data: (m.shared_data as Record<string, any>) ?? {},
      });
    }
    setSharedComps(uniq);
  }, [user]);

  useEffect(() => {
    reloadShared();
  }, [reloadShared]);

  const toggleInterest = async (comp: CompRow, target: InterestStatus) => {
    if (!user) {
      toast.error("Logga in för att markera tävlingar");
      return;
    }
    const compKey = comp.competition_id ?? comp.id;
    const current = interests[compKey];
    setInterests((prev) => {
      const next = { ...prev };
      if (current === target) delete next[compKey];
      else next[compKey] = target;
      return next;
    });
    try {
      if (current === target) {
        await supabase
          .from("competition_interests")
          .delete()
          .eq("user_id", user.id)
          .eq("competition_id", compKey);
        toast.success(target === "interested" ? "Intresse borttaget" : "Anmälan borttagen");
      } else if (current) {
        await supabase
          .from("competition_interests")
          .update({ status: target })
          .eq("user_id", user.id)
          .eq("competition_id", compKey);
        toast.success(target === "interested" ? "⭐ Markerad som intresserad" : "✅ Markerad som anmäld");
      } else {
        await supabase.from("competition_interests").insert({
          user_id: user.id,
          competition_id: compKey,
          status: target,
        });
        toast.success(target === "interested" ? "⭐ Markerad som intresserad" : "✅ Markerad som anmäld");
      }
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte spara");
      reloadInterests();
    }
  };

  const regions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.region && set.add(r.region));
    return Array.from(set).sort();
  }, [rows]);

  const months = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const k = monthKey(r.date);
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [rows]);

  const classes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.classes.forEach((c) => c && set.add(c)));
    return Array.from(set).sort();
  }, [rows]);

  // (sharedKeySet borttagen — vi visar shared via syntetiserade rader nedan)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    // I Delade-fliken bygger vi listan från sharedComps (gärna anrikad med data ur rows om den finns)
    let base: CompRow[];
    if (view === "shared") {
      const rowsByKey = new Map(rows.map((r) => [r.competition_id ?? r.id, r] as const));
      base = sharedComps.map((s) => {
        const existing = rowsByKey.get(s.shared_id);
        const d = s.data ?? {};
        const merged: CompRow = existing
          ? { ...existing }
          : {
              id: s.shared_id,
              competition_id: s.shared_id,
              competition_name: (d.competition_name as string) ?? null,
              club_name: (d.club_name as string) ?? null,
              location: (d.location as string) ?? null,
              region: (d.region as string) ?? null,
              date: (d.date as string) ?? null,
              registration_deadline: (d.registration_deadline as string) ?? null,
              classes: Array.isArray(d.classes) ? (d.classes as string[]) : [],
              source_url: (d.source_url as string) ?? null,
              source_label: (d.source_label as string) ?? "extern",
              sport: ((d.sport as Sport) ?? sport) as Sport,
            };
        merged.sharedBy = {
          name: s.sender_name,
          avatar: s.sender_avatar,
          message: s.message,
          at: s.shared_at,
        };
        return merged;
      });
    } else {
      base = rows;
    }

    return base.filter((r) => {
      const compKey = r.competition_id ?? r.id;
      // Vy-specifik filtrering (shared filtreras redan)
      if (view === "interested" && interests[compKey] !== "interested") return false;
      if (view === "registered" && interests[compKey] !== "registered") return false;
      if (region !== "all" && r.region !== region) return false;
      if (month !== "all" && monthKey(r.date) !== month) return false;
      if (classFilter !== "all" && !r.classes.includes(classFilter)) return false;
      if (!q) return true;
      return (
        (r.competition_name ?? "").toLowerCase().includes(q) ||
        (r.club_name ?? "").toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, region, month, classFilter, view, interests, sharedComps, sport]);

  const interestedCount = Object.values(interests).filter((s) => s === "interested").length;
  const registeredCount = Object.values(interests).filter((s) => s === "registered").length;
  const sharedCount = sharedComps.length;
  const hasActiveFilters = region !== "all" || month !== "all" || classFilter !== "all";

  return (
    <div className="space-y-4">
      {/* View-toggle: 4 flikar */}
      <div className="flex items-center gap-1.5 p-1 rounded-v3-base bg-v3-canvas-sunken/40 w-fit flex-wrap">
        {(
          [
            { id: "all", label: "Alla", icon: null, count: 0 },
            { id: "interested", label: "Intresserad", icon: Star, count: interestedCount },
            { id: "registered", label: "Anmäld", icon: Check, count: registeredCount },
            { id: "shared", label: "Delade", icon: Inbox, count: sharedCount },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id as ViewMode)}
              className={cn(
                "h-9 px-3 sm:px-4 rounded-[calc(theme(borderRadius.v3-base)-2px)] text-v3-sm font-medium transition-colors inline-flex items-center gap-1.5",
                active
                  ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-xs"
                  : "text-v3-text-secondary hover:text-v3-text-primary",
              )}
            >
              {Icon && <Icon size={12} strokeWidth={1.8} />}
              {tab.label}
              {tab.count > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-v3-brand-500 text-white text-[10px] font-medium grid place-items-center tabular-nums">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sport-toggle + sök + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {(["Agility", "Hoopers"] as Sport[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSport(s);
                setRegion("all");
                setMonth("all");
                setClassFilter("all");
              }}
              className={cn(
                "h-10 px-4 rounded-v3-base text-v3-sm font-medium transition-colors",
                sport === s
                  ? "bg-v3-text-primary text-v3-text-inverse"
                  : "bg-v3-canvas-elevated text-v3-text-secondary border border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-v3-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök klubb, ort eller arrangemang"
            className="w-full h-10 pl-9 pr-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-3 rounded-v3-base text-v3-sm font-medium transition-colors border",
            showFilters || hasActiveFilters
              ? "bg-v3-brand-500/10 text-v3-brand-700 border-v3-brand-500/30"
              : "bg-v3-canvas-elevated text-v3-text-secondary border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
          )}
          aria-expanded={showFilters}
        >
          <Filter size={14} strokeWidth={1.8} />
          Filter
          {hasActiveFilters && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-v3-brand-500 text-white text-[10px] font-medium grid place-items-center tabular-nums">
              {[region !== "all", month !== "all", classFilter !== "all"].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filterpanel */}
      {showFilters && (
        <div className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 space-y-3">
          <FilterSelect
            label="Län/region"
            value={region}
            options={[{ value: "all", label: "Alla" }, ...regions.map((r) => ({ value: r, label: r }))]}
            onChange={setRegion}
          />
          <FilterSelect
            label="Månad"
            value={month}
            options={[{ value: "all", label: "Alla" }, ...months.map((k) => ({ value: k, label: monthLabel(k) }))]}
            onChange={setMonth}
          />
          {classes.length > 0 && (
            <FilterSelect
              label="Klass"
              value={classFilter}
              options={[{ value: "all", label: "Alla" }, ...classes.map((c) => ({ value: c, label: c }))]}
              onChange={setClassFilter}
            />
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setRegion("all");
                setMonth("all");
                setClassFilter("all");
              }}
              className="inline-flex items-center gap-1 text-v3-xs font-medium text-v3-text-secondary hover:text-v3-text-primary transition-colors"
            >
              <X size={12} strokeWidth={2} />
              Rensa filter
            </button>
          )}
        </div>
      )}

      {!loading && (
        <div className="text-v3-xs text-v3-text-tertiary tabular-nums">
          {filtered.length} {filtered.length === 1 ? "tävling" : "tävlingar"}{" "}
          {view === "all" ? "hittade" : view === "shared" ? "delade med dig" : "markerade"}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
          {view === "interested" ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 grid place-items-center mb-4">
                <Star size={20} strokeWidth={1.6} className="text-amber-600" />
              </div>
              <p className="text-v3-base text-v3-text-secondary">Du har inte markerat några tävlingar som intressanta än.</p>
              <p className="text-v3-sm text-v3-text-tertiary mt-1">
                Klicka på ⭐ Intresse på en tävling i fliken Alla.
              </p>
              <button
                type="button"
                onClick={() => setView("all")}
                className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-text-primary text-v3-text-inverse text-v3-sm font-medium hover:opacity-90 transition-opacity"
              >
                Visa alla tävlingar
              </button>
            </>
          ) : view === "registered" ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-green-500/10 grid place-items-center mb-4">
                <Check size={20} strokeWidth={1.6} className="text-green-600" />
              </div>
              <p className="text-v3-base text-v3-text-secondary">Du har inte markerat dig som anmäld på någon tävling än.</p>
              <p className="text-v3-sm text-v3-text-tertiary mt-1">
                Klicka på ✓ Anmäld på en tävling i fliken Alla.
              </p>
              <button
                type="button"
                onClick={() => setView("all")}
                className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-text-primary text-v3-text-inverse text-v3-sm font-medium hover:opacity-90 transition-opacity"
              >
                Visa alla tävlingar
              </button>
            </>
          ) : view === "shared" ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-v3-brand-500/10 grid place-items-center mb-4">
                <Inbox size={20} strokeWidth={1.6} className="text-v3-brand-500" />
              </div>
              <p className="text-v3-base text-v3-text-secondary">Inga vänner har delat tävlingar med dig än.</p>
              <p className="text-v3-sm text-v3-text-tertiary mt-1">
                Tävlingar som dina vänner skickar via Dela-knappen dyker upp här.
              </p>
            </>
          ) : (
            <>
              <p className="text-v3-base text-v3-text-secondary">
                Inga kommande {sport.toLowerCase()}-tävlingar matchar.
              </p>
              <p className="text-v3-sm text-v3-text-tertiary mt-1">
                Prova att rensa sökrutan eller ändra filter.
              </p>
            </>
          )}
        </div>
      ) : (
        <ol className="space-y-2">
          {filtered.map((r) => {
            const compKey = r.competition_id ?? r.id;
            const status = interests[compKey];
            const deadlineDays = daysUntil(r.registration_deadline);
            const deadlineClosed = deadlineDays !== null && deadlineDays < 0;
            const deadlineSoon = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7;
            const past = isPast(r.date);
            const canFetchResults = past && !!status && r.source_url;

            return (
              <li
                key={`${r.sport}-${r.id}`}
                className={cn(
                  "rounded-v3-lg border p-4 transition-colors",
                  status
                    ? "bg-v3-brand-500/5 border-v3-brand-500/30"
                    : "bg-v3-canvas-elevated border-v3-canvas-sunken/40 hover:border-v3-canvas-sunken",
                )}
              >
                {r.sharedBy && (
                  <div className="mb-3 -mt-1 flex items-center gap-2 text-v3-xs text-v3-text-secondary">
                    {r.sharedBy.avatar ? (
                      <img
                        src={r.sharedBy.avatar}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-v3-canvas-sunken grid place-items-center">
                        <User size={12} strokeWidth={1.8} className="text-v3-text-tertiary" />
                      </div>
                    )}
                    <span>
                      Delad av <span className="font-medium text-v3-text-primary">{r.sharedBy.name ?? "en vän"}</span>
                      {r.sharedBy.message && (
                        <span className="text-v3-text-tertiary">: "{r.sharedBy.message}"</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-v3-base text-v3-text-primary truncate">
                        {r.competition_name || r.club_name || "Tävling"}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium shrink-0",
                          r.sport === "Hoopers"
                            ? "bg-v3-brand-500/10 text-v3-brand-700"
                            : "bg-v3-canvas-sunken text-v3-text-secondary",
                        )}
                      >
                        {r.sport}
                      </span>
                      {status === "interested" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-amber-500/15 text-amber-700 shrink-0 inline-flex items-center gap-1">
                          <Star size={9} className="fill-amber-500 text-amber-500" /> Intresserad
                        </span>
                      )}
                      {status === "registered" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-green-500/15 text-green-700 shrink-0 inline-flex items-center gap-1">
                          <Check size={9} /> Anmäld
                        </span>
                      )}
                      {past && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-v3-canvas-sunken text-v3-text-tertiary shrink-0">
                          Genomförd
                        </span>
                      )}
                      {!past && deadlineClosed && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-v3-canvas-sunken text-v3-text-tertiary shrink-0">
                          Stängd
                        </span>
                      )}
                      {!past && deadlineSoon && !status && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-amber-500/15 text-amber-700 shrink-0">
                          {deadlineDays === 0 ? "Sista dagen" : `${deadlineDays} d kvar`}
                        </span>
                      )}
                    </div>
                    {r.club_name && r.competition_name && (
                      <div className="text-v3-sm text-v3-text-secondary truncate mt-0.5">{r.club_name}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-v3-xs text-v3-text-tertiary">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar size={11} strokeWidth={1.8} />
                        {formatDate(r.date)}
                      </span>
                      {r.location && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin size={11} strokeWidth={1.8} />
                          {r.location}
                          {r.region && <span className="text-v3-text-tertiary/70">· {r.region}</span>}
                        </span>
                      )}
                      {r.registration_deadline && !past && !deadlineClosed && !deadlineSoon && (
                        <span className="tabular-nums">
                          Anmälan t.o.m. {formatDate(r.registration_deadline)}
                        </span>
                      )}
                    </div>
                    {r.classes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.classes.slice(0, 8).map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center px-1.5 h-5 rounded bg-v3-canvas-sunken/70 text-[10px] font-medium text-v3-text-secondary"
                          >
                            {c}
                          </span>
                        ))}
                        {r.classes.length > 8 && (
                          <span className="text-[10px] text-v3-text-tertiary self-center">
                            +{r.classes.length - 8}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action-rad */}
                <div className="mt-3 pt-3 border-t border-v3-canvas-sunken/40 flex flex-wrap items-center gap-1.5">
                  {!past && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleInterest(r, "interested")}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-v3-base text-v3-xs font-medium transition-colors",
                          status === "interested"
                            ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                            : "bg-v3-canvas-sunken/40 text-v3-text-secondary hover:bg-v3-canvas-sunken hover:text-v3-text-primary",
                        )}
                        aria-pressed={status === "interested"}
                      >
                        <Star
                          size={12}
                          strokeWidth={1.8}
                          className={status === "interested" ? "fill-amber-500 text-amber-500" : ""}
                        />
                        {status === "interested" ? "Intresserad" : "Intresse"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleInterest(r, "registered")}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-v3-base text-v3-xs font-medium transition-colors",
                          status === "registered"
                            ? "bg-green-500/15 text-green-700 border border-green-500/30"
                            : "bg-v3-canvas-sunken/40 text-v3-text-secondary hover:bg-v3-canvas-sunken hover:text-v3-text-primary",
                        )}
                        aria-pressed={status === "registered"}
                      >
                        <Check size={12} strokeWidth={1.8} />
                        Anmäld
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShareTarget(r)}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-v3-base text-v3-xs font-medium bg-v3-canvas-sunken/40 text-v3-text-secondary hover:bg-v3-canvas-sunken hover:text-v3-text-primary transition-colors"
                    title="Dela med en vän"
                  >
                    <Send size={12} strokeWidth={1.8} />
                    Dela
                  </button>
                  {status && !past && (
                    <button
                      type="button"
                      onClick={() => toggleInterest(r, status)}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-v3-base text-v3-xs font-medium text-v3-text-tertiary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Avmarkera"
                    >
                      <Trash2 size={12} strokeWidth={1.8} />
                    </button>
                  )}
                  {canFetchResults && (
                    <button
                      type="button"
                      onClick={() =>
                        setResultTarget({
                          source_url: r.source_url!,
                          source_label: r.source_label,
                          competition_name: r.competition_name || r.club_name || "Tävling",
                          date: r.date,
                          sport: r.sport,
                          competition_id: compKey,
                        })
                      }
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-v3-base text-v3-xs font-medium bg-v3-brand-500 text-white hover:bg-v3-brand-600 transition-colors"
                    >
                      <Trophy size={12} strokeWidth={1.8} />
                      Hämta mina resultat
                    </button>
                  )}
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1.5 h-8 px-2.5 rounded-v3-base text-v3-xs font-medium bg-v3-text-primary text-v3-text-inverse hover:opacity-90 transition-opacity"
                    >
                      {past ? "Källa" : "Anmäl"} på {r.source_label}
                      <ExternalLink size={11} strokeWidth={1.8} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {shareTarget && (
        <ShareToFriendDialog
          open={!!shareTarget}
          onOpenChange={(o) => !o && setShareTarget(null)}
          sharedType="competition"
          sharedId={shareTarget.competition_id ?? shareTarget.id}
          sharedData={{
            competition_name: shareTarget.competition_name,
            club_name: shareTarget.club_name,
            location: shareTarget.location,
            date: shareTarget.date,
            sport: shareTarget.sport,
            source_url: shareTarget.source_url,
          }}
        />
      )}

      <FetchMyResultDialog
        open={!!resultTarget}
        onOpenChange={(o) => !o && setResultTarget(null)}
        target={resultTarget}
        dogs={dogs}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary w-20 shrink-0">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
