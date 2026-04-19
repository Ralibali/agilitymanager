import { useEffect, useState, useMemo } from "react";
import { Search, ExternalLink, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils";

type Sport = "Agility" | "Hoopers";

interface CompRow {
  id: string;
  competition_id?: string;
  competition_name: string | null;
  club_name: string | null;
  location: string | null;
  date: string | null;
  date_start?: string | null;
  source_url: string | null;
  sport: Sport;
}

const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getDate()} ${MONTH[date.getMonth()]} ${date.getFullYear()}`;
}

interface Props {
  preferredSport: Sport;
}

/**
 * Snabb sök/bläddra i tävlingar (agility + hoopers) med sport-filter och fritextsökning.
 * Read-only listning – för att markera intresse hänvisas till v2-kalendern.
 */
export function V3FindCompetitions({ preferredSport }: Props) {
  const [sport, setSport] = useState<Sport>(preferredSport);
  const [query, setQuery] = useState("");
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
          .select("id, competition_name, club_name, location, date_start, source_url")
          .gte("date_start", today)
          .order("date_start", { ascending: true })
          .limit(60);
        if (cancelled) return;
        setRows(
          (data ?? []).map((r: any) => ({
            id: r.id,
            competition_name: stripHtml(r.competition_name ?? ""),
            club_name: stripHtml(r.club_name ?? ""),
            location: r.location,
            date: r.date_start,
            source_url: r.source_url ?? "https://agilitydata.se/taevlingar/",
            sport: "Agility" as const,
          })),
        );
      } else {
        const { data } = await supabase
          .from("hoopers_competitions_public")
          .select("id, competition_id, competition_name, club_name, location, date, source_url")
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(60);
        if (cancelled) return;
        setRows(
          (data ?? []).map((r: any) => ({
            id: r.id ?? r.competition_id,
            competition_id: r.competition_id,
            competition_name: r.competition_name,
            club_name: r.club_name,
            location: r.location,
            date: r.date,
            source_url: r.source_url,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        (r.competition_name ?? "").toLowerCase().includes(q) ||
        (r.club_name ?? "").toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {(["Agility", "Hoopers"] as Sport[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(s)}
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
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
          <p className="text-v3-base text-v3-text-secondary">
            Inga kommande {sport.toLowerCase()}-tävlingar hittades.
          </p>
          <p className="text-v3-sm text-v3-text-tertiary mt-1">Prova en annan sport eller töm sökrutan.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {filtered.map((r) => (
            <li
              key={`${r.sport}-${r.id}`}
              className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-canvas-sunken transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-v3-base text-v3-text-primary truncate">
                    {r.competition_name || r.club_name || "Tävling"}
                  </div>
                  {r.club_name && r.competition_name && (
                    <div className="text-v3-sm text-v3-text-secondary truncate mt-0.5">{r.club_name}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-v3-xs text-v3-text-tertiary">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar size={11} strokeWidth={1.8} />
                      {formatDate(r.date)}
                    </span>
                    {r.location && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin size={11} strokeWidth={1.8} />
                        {r.location}
                      </span>
                    )}
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium",
                        r.sport === "Hoopers"
                          ? "bg-v3-brand-500/10 text-v3-brand-700"
                          : "bg-v3-canvas-sunken text-v3-text-secondary",
                      )}
                    >
                      {r.sport}
                    </span>
                  </div>
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
          ))}
        </ol>
      )}
    </div>
  );
}
