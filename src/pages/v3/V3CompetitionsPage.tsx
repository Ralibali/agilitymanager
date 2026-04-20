import { useMemo, useState } from "react";
import {
  Plus,
  Trophy,
  Calendar,
  Compass,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Competitions, computeStats } from "@/hooks/v3/useV3Competitions";
import { DogHero } from "@/components/v3/DogHero";
import { V3AddPlannedSheet } from "@/components/v3/V3AddPlannedSheet";
import { V3AddResultSheet } from "@/components/v3/V3AddResultSheet";
import { V3FindCompetitions } from "@/components/v3/V3FindCompetitions";
import { ResultsImporter } from "@/components/competitions/ResultsImporter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { downloadPdf } from "@/lib/pdf";
import type { CompetitionResult, PlannedCompetition } from "@/types";

type Tab = "upcoming" | "results" | "find";

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "upcoming", label: "Kommande", icon: Calendar },
  { value: "results", label: "Resultat", icon: Trophy },
  { value: "find", label: "Hitta", icon: Compass },
];

const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function V3CompetitionsPage() {
  const navigate = useNavigate();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { results, planned, loading, reload } = useV3Competitions(activeId);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [planSheet, setPlanSheet] = useState(false);
  const [resultSheet, setResultSheet] = useState(false);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return planned.filter((p) => new Date(p.date) >= today);
  }, [planned]);

  const stats = useMemo(() => computeStats(results), [results]);

  const ctaLabel = tab === "results" ? "Logga resultat" : "Planera tävling";
  const onCta = () => (tab === "results" ? setResultSheet(true) : setPlanSheet(true));

  const scrollToImporter = () => {
    if (typeof document === "undefined") return;
    document.getElementById("sbk-import")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportRows = () => {
    return results.map((r) => ({
      Datum: r.date,
      Tävling: r.event_name,
      Arrangör: r.organizer ?? "",
      Disciplin: r.discipline,
      Klass: r.competition_level,
      Tid: r.time_sec ?? "",
      Fel: r.faults ?? 0,
      Placering: r.placement ?? "",
      Godkänd: r.disqualified ? "Disk" : r.passed ? "Ja" : "Nej",
    }));
  };

  const handleExportCsv = () => {
    if (results.length === 0) {
      toast.info("Inga resultat att exportera");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(exportRows(), `tavlingar-${active?.name ?? "alla"}-${today}.csv`);
    toast.success(`Exporterade ${results.length} resultat`);
  };

  const handleExportPdf = () => {
    if (results.length === 0) {
      toast.info("Inga resultat att exportera");
      return;
    }
    const rows = exportRows();
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => String(r[h as keyof typeof r] ?? "")));
    const today = new Date().toISOString().slice(0, 10);
    downloadPdf({
      title: `Tävlingsresultat – ${active?.name ?? "Alla hundar"}`,
      subtitle: `Genererad ${new Date().toLocaleDateString("sv-SE")} · ${results.length} resultat`,
      headers,
      rows: body,
      filename: `tavlingar-${active?.name ?? "alla"}-${today}.pdf`,
      landscape: true,
    });
    toast.success("PDF skapad");
  };

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
            Tävlingar
          </div>
          <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
            Mina starter.
          </h1>
        </div>
        {active && (
          <div className="flex items-center gap-2 shrink-0">
            {tab === "results" && (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={results.length === 0}
                  className="inline-flex items-center gap-1.5 h-11 px-3 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas-elevated text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Exportera till CSV"
                >
                  <Download size={14} strokeWidth={1.8} />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={results.length === 0}
                  className="inline-flex items-center gap-1.5 h-11 px-3 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas-elevated text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Exportera till PDF"
                >
                  <FileText size={14} strokeWidth={1.8} />
                  PDF
                </button>
              </>
            )}
            {tab !== "find" && (
              <button
                type="button"
                onClick={onCta}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
              >
                <Plus size={16} strokeWidth={2} />
                {ctaLabel}
              </button>
            )}
          </div>
        )}
      </header>

      {dogsLoading ? (
        <div className="h-28 rounded-v3-2xl v3-skeleton" />
      ) : (
        <DogHero
          dogs={dogs}
          active={active}
          activeId={activeId}
          onSelect={setActive}
          onAddDog={() => navigate("/v3/dogs")}
        />
      )}

      {active && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Starter" value={String(stats.total)} sub="totalt" />
            <StatTile label="Godkänt" value={`${Math.round(stats.passedRate * 100)}%`} sub="av starter" />
            <StatTile
              label="Snittplac."
              value={stats.avgPlacement ? stats.avgPlacement.toFixed(1) : "—"}
              sub="lägre = bättre"
            />
            <StatTile
              label={active.sport === "Hoopers" ? "Hoopers-poäng" : "Bästa plac."}
              value={
                active.sport === "Hoopers"
                  ? String(stats.hoopersPoints)
                  : stats.bestPlacement
                    ? `#${stats.bestPlacement}`
                    : "—"
              }
              sub="hittills"
            />
          </div>

          <div className="flex gap-1.5 border-b border-v3-canvas-sunken/40">
            {TABS.map(({ value, label, icon: Icon }) => {
              const isActive = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    "inline-flex items-center gap-2 h-11 px-4 -mb-px text-v3-sm font-medium transition-colors border-b-2",
                    isActive
                      ? "text-v3-text-primary border-v3-text-primary"
                      : "text-v3-text-tertiary border-transparent hover:text-v3-text-secondary",
                  )}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  {label}
                </button>
              );
            })}
          </div>

          {tab === "upcoming" && (
            <UpcomingList loading={loading} items={upcoming} onAdd={() => setPlanSheet(true)} onReload={reload} />
          )}

          {tab === "results" && (
            <div className="space-y-5">
              <div id="sbk-import" className="scroll-mt-24">
                <ResultsImporter dogs={dogs} onImported={() => void reload()} compact={results.length > 0} />
              </div>
              <ResultsList
                loading={loading}
                items={results}
                onAdd={() => setResultSheet(true)}
                onReload={reload}
                isHoopers={active.sport === "Hoopers"}
                onImport={scrollToImporter}
              />
            </div>
          )}

          {tab === "find" && (
            <V3FindCompetitions preferredSport={active.sport === "Hoopers" ? "Hoopers" : "Agility"} />
          )}
        </>
      )}

      <V3AddPlannedSheet open={planSheet} onClose={() => setPlanSheet(false)} dog={active} onSaved={reload} />
      <V3AddResultSheet open={resultSheet} onClose={() => setResultSheet(false)} dog={active} onSaved={reload} />
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">{label}</div>
      <div className="font-v3-display text-[28px] leading-none mt-2 text-v3-text-primary tabular-nums truncate">{value}</div>
      <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

function UpcomingList({
  loading,
  items,
  onAdd,
  onReload,
}: {
  loading: boolean;
  items: PlannedCompetition[];
  onAdd: () => void;
  onReload: () => Promise<void>;
}) {
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("planned_competitions").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort");
      return;
    }
    toast.success("Borttagen");
    await onReload();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-v3-lg v3-skeleton" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-v3-brand-500/10 grid place-items-center mb-4">
          <Calendar size={20} strokeWidth={1.6} className="text-v3-brand-500" />
        </div>
        <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">Inga planerade tävlingar</h3>
        <p className="text-v3-base text-v3-text-secondary mt-2 max-w-sm mx-auto">
          Lägg till din nästa start så får du påminnelser inför anmälan och tävlingsdagen.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
        >
          <Plus size={16} strokeWidth={2} />
          Planera tävling
        </button>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((p) => {
        const days = daysUntil(p.date);
        return (
          <li
            key={p.id}
            className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-canvas-sunken transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-v3-base text-v3-text-primary truncate">{p.event_name}</div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-v3-xs text-v3-text-tertiary">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Calendar size={11} strokeWidth={1.8} />
                    {formatDate(p.date)}
                  </span>
                  {p.location && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin size={11} strokeWidth={1.8} />
                      {p.location}
                    </span>
                  )}
                  {days !== null && days >= 0 && (
                    <span className="text-v3-brand-700 font-medium tabular-nums">
                      {days === 0 ? "Idag" : days === 1 ? "Imorgon" : `om ${days} d`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.signup_url && (
                  <a
                    href={p.signup_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas-sunken transition-colors"
                    aria-label="Öppna anmälan"
                  >
                    <ExternalLink size={13} strokeWidth={1.8} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Ta bort"
                >
                  <Trash2 size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ResultsList({
  loading,
  items,
  onAdd,
  onReload,
  isHoopers,
  onImport,
}: {
  loading: boolean;
  items: CompetitionResult[];
  onAdd: () => void;
  onReload: () => Promise<void>;
  isHoopers: boolean;
  onImport: () => void;
}) {
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("competition_results").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort");
      return;
    }
    toast.success("Borttaget");
    await onReload();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-v3-lg v3-skeleton" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-v3-brand-500/10 grid place-items-center mb-4">
          <Trophy size={20} strokeWidth={1.6} className="text-v3-brand-500" />
        </div>
        <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">Inga resultat än</h3>
        <p className="text-v3-base text-v3-text-secondary mt-2 max-w-sm mx-auto">
          Logga ditt första tävlingsresultat manuellt eller importera din historik från SBK direkt här ovanför.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
          >
            <Plus size={16} strokeWidth={2} />
            Logga resultat
          </button>
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors"
          >
            Importera från SBK
          </button>
        </div>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((r) => {
        const isPassed = r.passed && !r.disqualified;
        return (
          <li
            key={r.id}
            className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-canvas-sunken transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-v3-base font-medium text-v3-text-primary truncate">
                    {(() => {
                      const n = (r.event_name || "").trim();
                      if (!n || n.toLowerCase() === "tävling") {
                        return `${r.sport}-tävling${r.date ? ` · ${formatDate(r.date)}` : ""}`;
                      }
                      return n;
                    })()}
                  </span>
                  {r.disqualified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      <AlertCircle size={10} /> Diskad
                    </span>
                  ) : isPassed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 size={10} /> Godkänd
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-v3-canvas-sunken text-v3-text-secondary">
                      Ej godkänd
                    </span>
                  )}
                </div>
                {r.organizer && (
                  <div className="text-v3-sm text-v3-text-secondary truncate mt-0.5">{r.organizer}</div>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-v3-xs text-v3-text-tertiary tabular-nums">
                  <span>{formatDate(r.date)}</span>
                  <span aria-hidden>·</span>
                  <span>{isHoopers ? r.sport : `${r.discipline} · ${r.competition_level}`}</span>
                  {r.placement && (<><span aria-hidden>·</span><span>#{r.placement}</span></>)}
                  {r.faults > 0 && (<><span aria-hidden>·</span><span>{r.faults} fel</span></>)}
                  {r.time_sec > 0 && (<><span aria-hidden>·</span><span>{r.time_sec.toFixed(2)} s</span></>)}
                  {r.hoopers_points ? (<><span aria-hidden>·</span><span>{r.hoopers_points} p</span></>) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                aria-label="Ta bort"
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
