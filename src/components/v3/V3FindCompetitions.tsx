import { useEffect, useState, useMemo } from "react";
import { Search, ExternalLink, Calendar, MapPin, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn, stripHtml } from "@/lib/utils";

type Sport = "Agility" | "Hoopers";

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

/**
 * Sök, filtrera och bläddra bland kommande tävlingar (Agility + Hoopers).
 * Visar klasser, sista anmälan, ort/region och länk till originalkällan.
 */
export function V3FindCompetitions({ preferredSport }: Props) {
  const [sport, setSport] = useState<Sport>(preferredSport);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      if (sport === "Agility") {
        const { data } = await supabase
          .from("competitions")
          .select(
            "id, competition_name, club_name, location, region, date_start, last_registration_date, classes_agility, classes_hopp, classes_other, source_url",
          )
          .gte("date_start", today)
          .order("date_start", { ascending: true })
          .limit(120);
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
        const { data } = await supabase
          .from("hoopers_competitions_public")
          .select(
            "id, competition_id, competition_name, club_name, location, county, date, registration_closes, classes, source_url",
          )
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(120);
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
  }, [sport]);

  // Härled filter-alternativ från data
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
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
  }, [rows, query, region, month, classFilter]);

  const hasActiveFilters = region !== "all" || month !== "all" || classFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Sport-toggle + sök + filter-knapp */}
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

      {/* Resultatantal */}
      {!loading && (
        <div className="text-v3-xs text-v3-text-tertiary tabular-nums">
          {filtered.length} {filtered.length === 1 ? "tävling" : "tävlingar"} hittade
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
          <p className="text-v3-base text-v3-text-secondary">
            Inga kommande {sport.toLowerCase()}-tävlingar matchar.
          </p>
          <p className="text-v3-sm text-v3-text-tertiary mt-1">
            Prova att rensa sökrutan eller ändra filter.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {filtered.map((r) => {
            const deadlineDays = daysUntil(r.registration_deadline);
            const deadlineClosed = deadlineDays !== null && deadlineDays < 0;
            const deadlineSoon = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7;
            return (
              <li
                key={`${r.sport}-${r.id}`}
                className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-canvas-sunken transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
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
                      {deadlineClosed && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-v3-canvas-sunken text-v3-text-tertiary shrink-0">
                          Stängd
                        </span>
                      )}
                      {deadlineSoon && (
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
                      {r.registration_deadline && !deadlineClosed && !deadlineSoon && (
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
                    <p className="mt-2 text-[10px] text-v3-text-tertiary">
                      Källa:{" "}
                      {r.source_url ? (
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 hover:text-v3-text-secondary hover:underline"
                        >
                          {r.source_label} <ExternalLink size={9} />
                        </a>
                      ) : (
                        <span>{r.source_label}</span>
                      )}
                    </p>
                  </div>
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 rounded-full bg-v3-canvas border border-v3-canvas-sunken/60 grid place-items-center text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas-sunken transition-colors shrink-0"
                      aria-label="Öppna tävling"
                    >
                      <ExternalLink size={13} strokeWidth={1.8} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
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
