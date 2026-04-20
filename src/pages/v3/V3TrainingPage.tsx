import { useState, lazy, Suspense } from "react";
import { Plus, Dumbbell, Clock, TrendingUp, MapPin, GraduationCap, Download, type LucideIcon } from "lucide-react";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Training, type V3TrainingFilter } from "@/hooks/v3/useV3Training";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { DogHero } from "@/components/v3/DogHero";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

// Coach-feedback (Pro): lazy så den inte påverkar initial paint
const CoachVideoAnalysis = lazy(() => import("@/components/training/CoachVideoAnalysis"));

const PERIOD_LABELS: { value: V3TrainingFilter["period"]; label: string }[] = [
  { value: "7d", label: "7 dagar" },
  { value: "30d", label: "30 dagar" },
  { value: "90d", label: "90 dagar" },
  { value: "all", label: "Allt" },
];

const SPORT_LABELS: { value: V3TrainingFilter["sport"]; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "Agility", label: "Agility" },
  { value: "Hoopers", label: "Hoopers" },
];

const WEEKDAY = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  if (days < 7) return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
}

/**
 * v3 Träningssida – Fas 5.
 * Filterbar lista över träningspass per aktiv hund + stats-kort + trendgraf.
 */
export default function V3TrainingPage() {
  const navigate = useNavigate();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const [filter, setFilter] = useState<V3TrainingFilter>({ sport: "all", period: "30d" });
  const { sessions, stats, loading } = useV3Training(activeId, filter);

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
            Träning
          </div>
          <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
            Loggade pass.
          </h1>
        </div>
        {active && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (sessions.length === 0) {
                  toast.info("Inga pass att exportera i vald period");
                  return;
                }
                const rows = sessions.map((s) => ({
                  Datum: s.date,
                  Sport: s.sport,
                  Typ: s.type,
                  "Tid (min)": s.duration_min ?? 0,
                  Plats: s.location ?? "",
                  Taggar: (s.tags ?? []).join("; "),
                  "Bra noteringar": (s.notes_good ?? "").replace(/\n/g, " "),
                }));
                const today = new Date().toISOString().slice(0, 10);
                downloadCsv(rows, `traning-${active.name}-${today}.csv`);
                toast.success(`Exporterade ${rows.length} pass`);
              }}
              disabled={sessions.length === 0}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas-elevated text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Exportera till CSV"
            >
              <Download size={14} strokeWidth={1.8} />
              CSV
            </button>
            <button
              type="button"
              onClick={openV3LogSheet}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
            >
              <Plus size={16} strokeWidth={2} />
              Logga pass
            </button>
          </div>
        )}
      </header>

      {/* Hund-switcher */}
      {dogsLoading ? (
        <div className="h-28 rounded-v3-2xl  v3-skeleton" />
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
          {/* Filter */}
          <div className="space-y-3">
            <FilterRow
              label="Period"
              options={PERIOD_LABELS}
              value={filter.period}
              onChange={(v) => setFilter((f) => ({ ...f, period: v }))}
            />
            <FilterRow
              label="Sport"
              options={SPORT_LABELS}
              value={filter.sport}
              onChange={(v) => setFilter((f) => ({ ...f, sport: v }))}
            />
          </div>

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-v3-xl  v3-skeleton"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile icon={Dumbbell} label="Pass" value={String(stats.total)} sub="totalt" />
              <StatTile icon={Clock} label="Minuter" value={String(stats.totalMinutes)} sub="aktiv tid" />
              <StatTile
                icon={TrendingUp}
                label="Snitt"
                value={String(stats.avgMinutes)}
                sub="min/pass"
              />
              <StatTile
                icon={Dumbbell}
                label="Vanligaste"
                value={stats.topType ?? "—"}
                sub="typ av pass"
                small
              />
            </div>
          )}

          {/* Trendgraf */}
          {!loading && stats.byWeek.length > 1 && (
            <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Veckotrend</h2>
                <span className="text-v3-xs text-v3-text-tertiary">
                  pass per vecka
                </span>
              </div>
              <WeekBars data={stats.byWeek} />
            </section>
          )}

          {/* Lista */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Alla pass</h2>
              {!loading && (
                <span className="text-v3-xs text-v3-text-tertiary">
                  {sessions.length} {sessions.length === 1 ? "pass" : "pass"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-v3-lg  v3-skeleton"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <EmptyTraining onLog={openV3LogSheet} />
            ) : (
              <ol className="space-y-2">
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ol>
            )}
          </section>

          {/* Coach-feedback (Pro) – skicka in video för granskning */}
          <section className="space-y-3" id="coach">
            <div className="flex items-baseline justify-between">
              <h2 className="font-v3-display text-v3-2xl text-v3-text-primary inline-flex items-center gap-2">
                <GraduationCap size={18} strokeWidth={1.6} className="text-v3-brand-500" />
                Coach-feedback
              </h2>
              <span className="text-v3-xs text-v3-text-tertiary">Pro · video-granskning</span>
            </div>
            <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 overflow-hidden">
              <Suspense
                fallback={<div className="h-48 v3-skeleton" />}
              >
                <CoachVideoAnalysis dogs={dogs as unknown as Parameters<typeof CoachVideoAnalysis>[0]["dogs"]} />
              </Suspense>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary w-14 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "h-8 px-3 rounded-v3-base text-v3-xs font-medium transition-colors",
                active
                  ? "bg-v3-text-primary text-v3-text-inverse"
                  : "bg-v3-canvas-elevated text-v3-text-secondary border border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  small,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4">
      <div className="flex items-center gap-2">
        <Icon size={12} strokeWidth={1.8} className="text-v3-text-tertiary" />
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "font-v3-display leading-none mt-2 text-v3-text-primary tabular-nums truncate",
          small ? "text-[20px]" : "text-[28px]",
        )}
      >
        {value}
      </div>
      <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

function WeekBars({ data }: { data: { week: string; count: number; minutes: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => {
        const h = Math.max(6, Math.round((d.count / max) * 100));
        const date = new Date(d.week);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        return (
          <div key={d.week} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="text-v3-xs text-v3-text-secondary tabular-nums">{d.count}</div>
            <div
              className="w-full bg-v3-brand-500/80 rounded-t-sm transition-all"
              style={{ height: `${h}%` }}
              aria-label={`Vecka ${label}: ${d.count} pass, ${d.minutes} min`}
            />
            <div className="text-[10px] text-v3-text-tertiary tabular-nums">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function SessionRow({ session }: { session: { id: string; date: string; type: string; sport: string; duration_min: number | null; location: string | null; notes_good: string | null; tags: string[] | null } }) {
  return (
    <li className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-canvas-sunken transition-colors">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-v3-base text-v3-text-primary truncate">
            {session.type} <span className="text-v3-text-tertiary">·</span>{" "}
            <span className="text-v3-text-secondary">{session.sport}</span>
          </p>
          {session.notes_good && (
            <p className="text-v3-sm text-v3-text-secondary mt-1 line-clamp-1">
              {session.notes_good}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-v3-xs text-v3-text-tertiary">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock size={11} strokeWidth={1.8} />
              {session.duration_min ?? 0} min
            </span>
            {session.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin size={11} strokeWidth={1.8} />
                {session.location}
              </span>
            )}
            {session.tags && session.tags.length > 0 && (
              <span className="truncate">#{session.tags.slice(0, 2).join(" #")}</span>
            )}
          </div>
        </div>
        <span className="text-v3-xs text-v3-text-tertiary shrink-0 tabular-nums">
          {formatDay(session.date)}
        </span>
      </div>
    </li>
  );
}

function EmptyTraining({ onLog }: { onLog: () => void }) {
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-v3-brand-500/10 grid place-items-center mb-4">
        <Dumbbell size={20} strokeWidth={1.6} className="text-v3-brand-500" />
      </div>
      <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">Inga pass än</h3>
      <p className="text-v3-base text-v3-text-secondary mt-2 max-w-sm mx-auto">
        Logga ditt första pass så börjar vi bygga din historik. Filtret ovan visar inget för perioden.
      </p>
      <button
        type="button"
        onClick={onLog}
        className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
      >
        <Plus size={16} strokeWidth={2} />
        Logga pass
      </button>
    </div>
  );
}
