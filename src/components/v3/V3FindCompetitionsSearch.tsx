import { useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, Filter, Info, MapPin, RefreshCw, Search, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn, stripHtml } from "@/lib/utils";

type Sport = "Agility" | "Hoopers";

type CompRow = {
  id: string;
  competition_id?: string | null;
  competition_name: string | null;
  club_name: string | null;
  location: string | null;
  region: string | null;
  date: string | null;
  date_end?: string | null;
  registration_deadline: string | null;
  registration_status?: string | null;
  classes: string[];
  source_url: string | null;
  source_label: string;
  sport: Sport;
  judges?: string[];
  organizer?: string | null;
  indoor_outdoor?: string | null;
  type?: string | null;
  price_per_lopp?: string | null;
  extra_info?: string | null;
};

const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

function monthKey(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH[Number(m) - 1]} ${y}`;
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function safeLike(input: string) {
  return input.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ");
}

function searchable(row: CompRow) {
  return [
    row.competition_name,
    row.club_name,
    row.location,
    row.region,
    row.organizer,
    row.indoor_outdoor,
    row.type,
    row.price_per_lopp,
    row.extra_info,
    ...(row.judges ?? []),
    ...(row.classes ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
}

async function loadAgility(query: string, includePast: boolean): Promise<CompRow[]> {
  const term = safeLike(query);
  let request = supabase
    .from("competitions")
    .select("id, competition_name, club_name, location, region, date_start, date_end, last_registration_date, classes_agility, classes_hopp, classes_other, source_url, indoor_outdoor, status, judges")
    .order("date_start", { ascending: !includePast })
    .limit(term.length >= 2 ? 1000 : 500);

  if (!includePast) request = request.gte("date_start", todayIso());
  if (term.length >= 2) {
    request = request.or(`competition_name.ilike.%${term}%,club_name.ilike.%${term}%,location.ilike.%${term}%,region.ilike.%${term}%`);
  }

  const { data, error } = await request;
  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const classes = [...(r.classes_agility ?? []), ...(r.classes_hopp ?? []), ...(r.classes_other ?? [])].filter(Boolean);
    return {
      id: r.id,
      competition_name: stripHtml(r.competition_name ?? ""),
      club_name: stripHtml(r.club_name ?? ""),
      location: r.location,
      region: r.region,
      date: r.date_start,
      date_end: r.date_end,
      registration_deadline: r.last_registration_date,
      classes,
      source_url: r.source_url ?? "https://agilitydata.se/taevlingar/",
      source_label: "agilitydata.se",
      sport: "Agility" as const,
      judges: r.judges ?? [],
      indoor_outdoor: r.indoor_outdoor,
      type: r.status,
    };
  });
}

async function loadHoopers(query: string, includePast: boolean): Promise<CompRow[]> {
  const term = safeLike(query);
  let request = supabase
    .from("hoopers_competitions_public")
    .select("id, competition_id, competition_name, club_name, location, county, date, registration_closes, registration_status, classes, source_url, judge, organizer, type, price_per_lopp, extra_info")
    .order("date", { ascending: !includePast })
    .limit(term.length >= 2 ? 1000 : 500);

  if (!includePast) request = request.gte("date", todayIso());
  if (term.length >= 2) {
    request = request.or(`competition_name.ilike.%${term}%,club_name.ilike.%${term}%,location.ilike.%${term}%,county.ilike.%${term}%,organizer.ilike.%${term}%,judge.ilike.%${term}%`);
  }

  const { data, error } = await request;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id ?? r.competition_id,
    competition_id: r.competition_id,
    competition_name: r.competition_name,
    club_name: r.club_name,
    location: r.location,
    region: r.county,
    date: r.date,
    registration_deadline: r.registration_closes,
    registration_status: r.registration_status,
    classes: r.classes ?? [],
    source_url: r.source_url,
    source_label: "shok.se",
    sport: "Hoopers" as const,
    judges: r.judge ? [r.judge] : [],
    organizer: r.organizer,
    type: r.type,
    price_per_lopp: r.price_per_lopp,
    extra_info: r.extra_info,
  }));
}

export function V3FindCompetitions({ preferredSport }: { preferredSport: Sport }) {
  const [sport, setSport] = useState<Sport>(preferredSport);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [month, setMonth] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [includePast, setIncludePast] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = sport === "Agility" ? await loadAgility(debouncedQuery, includePast) : await loadHoopers(debouncedQuery, includePast);
        if (!cancelled) setRows(data);
      } catch (err: any) {
        console.error("Competition search failed", err);
        if (!cancelled) {
          setRows([]);
          setError(err?.message ?? "Kunde inte hämta tävlingar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sport, debouncedQuery, includePast]);

  const regions = useMemo(() => Array.from(new Set(rows.map((r) => r.region).filter(Boolean) as string[])).sort(), [rows]);
  const months = useMemo(() => Array.from(new Set(rows.map((r) => monthKey(r.date)).filter(Boolean) as string[])).sort(), [rows]);
  const classes = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.classes ?? []).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (region !== "all" && row.region !== region) return false;
      if (month !== "all" && monthKey(row.date) !== month) return false;
      if (classFilter !== "all" && !(row.classes ?? []).includes(classFilter)) return false;
      if (!q) return true;
      return searchable(row).includes(q);
    });
  }, [rows, region, month, classFilter, debouncedQuery]);

  const activeFilterCount = [region !== "all", month !== "all", classFilter !== "all", includePast].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas-sunken/30 px-3 py-2 text-[11px] leading-relaxed text-v3-text-secondary">
        <Info size={13} strokeWidth={1.8} className="mt-0.5 shrink-0 text-v3-text-tertiary" />
        <p><span className="font-medium text-v3-text-primary">Datakälla:</span> tävlingar hämtas från publika källor. Verifiera alltid datum, klasser och anmälan hos arrangören.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-3">
        <div className="flex gap-1.5">
          {(["Agility", "Hoopers"] as Sport[]).map((item) => (
            <button key={item} type="button" onClick={() => { setSport(item); setRegion("all"); setMonth("all"); setClassFilter("all"); }} className={cn("h-10 px-4 rounded-v3-base text-v3-sm font-medium transition-colors", sport === item ? "bg-v3-text-primary text-v3-text-inverse" : "bg-v3-canvas-elevated text-v3-text-secondary border border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken")}>{item}</button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-v3-text-tertiary" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök klubb, ort, arrangemang, domare eller klass" className="w-full h-10 pl-9 pr-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40" />
        </div>
        <button type="button" onClick={() => setShowFilters((prev) => !prev)} className={cn("inline-flex items-center gap-2 h-10 px-3 rounded-v3-base text-v3-sm font-medium transition-colors border", showFilters || activeFilterCount > 0 ? "bg-v3-brand-500/10 text-v3-brand-700 border-v3-brand-500/30" : "bg-v3-canvas-elevated text-v3-text-secondary border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken")}>
          <Filter size={14} /> Filter {activeFilterCount > 0 && <span className="h-4 min-w-4 px-1 rounded-full bg-v3-brand-500 text-white text-[10px] grid place-items-center">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select label="Län/region" value={region} onChange={setRegion} options={[{ value: "all", label: "Alla" }, ...regions.map((r) => ({ value: r, label: r }))]} />
          <Select label="Månad" value={month} onChange={setMonth} options={[{ value: "all", label: "Alla" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]} />
          {classes.length > 0 && <Select label="Klass" value={classFilter} onChange={setClassFilter} options={[{ value: "all", label: "Alla" }, ...classes.map((c) => ({ value: c, label: c }))]} />}
          <label className="md:col-span-3 flex items-center gap-2 text-v3-sm text-v3-text-secondary">
            <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} className="h-4 w-4 accent-v3-brand-500" /> Visa även passerade tävlingar
          </label>
          {activeFilterCount > 0 && <button type="button" onClick={() => { setRegion("all"); setMonth("all"); setClassFilter("all"); setIncludePast(false); }} className="md:col-span-3 inline-flex items-center gap-1 text-v3-xs font-medium text-v3-text-secondary hover:text-v3-text-primary"><X size={12} /> Rensa filter</button>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-v3-xs text-v3-text-tertiary tabular-nums">
        <span>{loading ? "Söker…" : `${filtered.length} ${filtered.length === 1 ? "tävling" : "tävlingar"} hittade`}</span>
        <button type="button" onClick={() => setDebouncedQuery(query)} className="inline-flex items-center gap-1 hover:text-v3-text-primary"><RefreshCw size={12} /> Uppdatera</button>
      </div>

      {error && <div className="rounded-v3-lg border border-red-200 bg-red-50 px-4 py-3 text-v3-sm text-red-700">{error}</div>}
      {loading ? <SkeletonList /> : filtered.length === 0 ? <EmptyState query={debouncedQuery} /> : <div className="space-y-2">{filtered.map((row) => <CompetitionCard key={`${row.sport}-${row.id}`} row={row} />)}</div>}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="block"><span className="block text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-1.5">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/30">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function CompetitionCard({ row }: { row: CompRow }) {
  const deadline = daysUntil(row.registration_deadline);
  return <article className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-brand-500/25 hover:shadow-v3-xs transition-all">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap"><span className="inline-flex items-center gap-1 rounded-full bg-v3-brand-500/10 text-v3-brand-700 px-2 py-0.5 text-[10px] font-medium"><Trophy size={10} />{row.sport}</span>{row.type && <span className="rounded-full bg-v3-canvas-sunken px-2 py-0.5 text-[10px] text-v3-text-secondary">{row.type}</span>}</div>
        <h3 className="font-v3-display text-v3-xl text-v3-text-primary mt-2 leading-tight">{row.competition_name || "Namnlös tävling"}</h3>
        <p className="text-v3-sm text-v3-text-secondary mt-1">{row.club_name || row.organizer || "Arrangör saknas"}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-v3-xs text-v3-text-tertiary">
          <span className="inline-flex items-center gap-1"><Calendar size={12} />{formatDate(row.date)}{row.date_end && row.date_end !== row.date ? ` – ${formatDate(row.date_end)}` : ""}</span>
          {(row.location || row.region) && <span className="inline-flex items-center gap-1"><MapPin size={12} />{[row.location, row.region].filter(Boolean).join(", ")}</span>}
        </div>
        {row.classes.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{row.classes.slice(0, 8).map((item) => <span key={item} className="rounded-full bg-v3-canvas px-2 py-0.5 text-[11px] text-v3-text-secondary border border-v3-canvas-sunken/40">{item}</span>)}{row.classes.length > 8 && <span className="text-[11px] text-v3-text-tertiary">+{row.classes.length - 8}</span>}</div>}
        {(row.judges?.length || row.price_per_lopp || row.extra_info) && <p className="text-v3-xs text-v3-text-tertiary mt-3 line-clamp-2">{[row.judges?.length ? `Domare: ${row.judges.join(", ")}` : null, row.price_per_lopp, row.extra_info].filter(Boolean).join(" · ")}</p>}
      </div>
      <div className="flex lg:flex-col gap-2 lg:items-end shrink-0">
        {deadline !== null && <span className={cn("inline-flex items-center h-8 px-3 rounded-full text-v3-xs font-medium", deadline < 0 ? "bg-v3-canvas-sunken text-v3-text-tertiary" : deadline <= 7 ? "bg-orange-100 text-orange-700" : "bg-v3-brand-500/10 text-v3-brand-700")}>{deadline < 0 ? "Anmälan stängd" : deadline === 0 ? "Sista dag idag" : `${deadline} d kvar`}</span>}
        {row.source_url && <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-v3-base bg-v3-text-primary text-v3-text-inverse text-v3-xs font-medium hover:opacity-90 transition-opacity"><ExternalLink size={13} /> Öppna</a>}
      </div>
    </div>
  </article>;
}

function SkeletonList() {
  return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse" />)}</div>;
}

function EmptyState({ query }: { query: string }) {
  return <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center"><Search className="mx-auto mb-3 text-v3-text-tertiary" size={24} /><h3 className="font-v3-display text-v3-2xl text-v3-text-primary">Inga tävlingar hittades</h3><p className="text-v3-sm text-v3-text-secondary mt-2 max-w-md mx-auto">{query ? "Testa färre ord, annan stavning, byt sport eller slå på historik i filtret." : "Det finns inga tävlingar i valt urval just nu."}</p></div>;
}
