import { useEffect, useMemo, useState } from "react";
import { Plus, AlertTriangle, Bell, Pencil, Trash2, MoreVertical, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Health, computeHealthStats, healthTypeMeta, type V3HealthLog } from "@/hooks/v3/useV3Health";
import { DogHero } from "@/components/v3/DogHero";
import { V3AddHealthSheet } from "@/components/v3/V3AddHealthSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Disclaimer } from "@/components/Disclaimer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Filter = "all" | "vet_visit" | "vaccination" | "weight" | "medication";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "vet_visit", label: "Vetbesök" },
  { value: "vaccination", label: "Vaccin" },
  { value: "weight", label: "Vikt" },
  { value: "medication", label: "Medicin" },
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
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export default function V3HealthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { logs, loading, reload } = useV3Health(activeId);

  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<V3HealthLog | null>(null);

  useEffect(() => {
    if (searchParams.get("action") !== "new") return;
    setEditing(null);
    setSheet(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const stats = useMemo(() => computeHealthStats(logs), [logs]);

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => l.type === filter);
  }, [logs, filter]);

  const removeLog = async (id: string) => {
    const { error } = await supabase.from("health_logs").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort");
      return;
    }
    toast.success("Logg borttagen");
    void reload();
  };

  const openEdit = (log: V3HealthLog) => {
    setEditing(log);
    setSheet(true);
  };
  const openNew = () => {
    setEditing(null);
    setSheet(true);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
            Hälsa & välmående
          </div>
          <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
            Håll koll på kroppen.
          </h1>
        </div>
        {active && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm shrink-0"
          >
            <Plus size={16} strokeWidth={2} />
            Ny logg
          </button>
        )}
      </header>

      <Disclaimer variant="health" />

      {dogsLoading ? (
        <div className="v3-skeleton h-28 rounded-v3-2xl" />
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
            <StatTile label="Loggar" value={String(stats.total)} sub="totalt" />
            <StatTile
              label="Senaste vikt"
              value={stats.latestWeight ? `${stats.latestWeight.weight.toFixed(1)} kg` : "—"}
              sub={stats.latestWeight ? formatDate(stats.latestWeight.date) : "ingen mätning"}
              trend={stats.weightTrend}
            />
            <StatTile
              label="Påminnelser"
              value={String(stats.upcomingReminders.length)}
              sub="≤ 30 dagar"
              accent={stats.upcomingReminders.length > 0 ? "warning" : undefined}
            />
            <StatTile
              label="Försenade"
              value={String(stats.overdueReminders.length)}
              sub="behöver bokas"
              accent={stats.overdueReminders.length > 0 ? "danger" : undefined}
            />
          </div>

          {(stats.overdueReminders.length > 0 || stats.upcomingReminders.length > 0) && (
            <section className="space-y-3">
              <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Påminnelser</h2>
              <div className="grid lg:grid-cols-2 gap-3">
                {stats.overdueReminders.map((r) => <ReminderCard key={r.id} log={r} overdue />)}
                {stats.upcomingReminders.map((r) => <ReminderCard key={r.id} log={r} />)}
              </div>
            </section>
          )}

          {stats.weightSeries.length >= 2 && (
            <section className="space-y-3">
              <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Viktutveckling</h2>
              <WeightChart series={stats.weightSeries} />
            </section>
          )}

          <div className="flex gap-1.5 border-b border-v3-canvas-sunken/40 overflow-x-auto">
            {FILTERS.map(({ value, label }) => {
              const isActive = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "h-11 px-4 -mb-px text-v3-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                    isActive ? "text-v3-text-primary border-v3-text-primary" : "text-v3-text-tertiary border-transparent hover:text-v3-text-secondary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <LogsList loading={loading} items={filtered} onAdd={openNew} onEdit={openEdit} onDelete={removeLog} />
        </>
      )}

      <V3AddHealthSheet
        open={sheet}
        onClose={() => {
          setSheet(false);
          setEditing(null);
        }}
        dog={active}
        editing={editing}
        onSaved={reload}
      />
    </div>
  );
}

function StatTile({ label, value, sub, trend, accent }: { label: string; value: string; sub: string; trend?: number | null; accent?: "warning" | "danger" }) {
  return (
    <div className={cn("rounded-v3-xl border p-4", accent === "danger" ? "bg-coral/10 border-coral/30 " : accent === "warning" ? "bg-coral/10 border-coral/25 " : "bg-v3-canvas-elevated border-v3-canvas-sunken/40")}>
      <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">{label}</div>
      <div className="font-v3-display text-[28px] leading-none mt-2 text-v3-text-primary tabular-nums truncate flex items-baseline gap-1.5">
        {value}
        {trend !== null && trend !== undefined && (
          <span className={cn("text-v3-xs font-sans inline-flex items-center gap-0.5", trend > 0 ? "text-coral" : trend < 0 ? "text-moss-deep" : "text-v3-text-tertiary")}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trend !== 0 && `${trend > 0 ? "+" : ""}${trend.toFixed(1)}`}
          </span>
        )}
      </div>
      <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

function ReminderCard({ log, overdue }: { log: V3HealthLog; overdue?: boolean }) {
  const meta = healthTypeMeta(log.type);
  const days = daysUntil(log.next_date);
  return (
    <div className={cn("rounded-v3-lg border p-4 flex items-start gap-3", overdue ? "bg-coral/10 border-coral/30 " : "bg-coral/10 border-coral/25 ")}>
      <div className="shrink-0 h-10 w-10 rounded-full grid place-items-center bg-white/70 text-xl">
        {overdue ? <AlertTriangle className="text-coral" size={18} /> : <Bell className="text-coral" size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-v3-sm font-medium text-v3-text-primary truncate">{meta.emoji} {log.title}</div>
        <div className="text-v3-xs text-v3-text-tertiary mt-0.5">{overdue ? "Försenad" : days === 0 ? "Idag" : days === 1 ? "Imorgon" : `Om ${days} dagar`} · {formatDate(log.next_date)}</div>
      </div>
    </div>
  );
}

function WeightChart({ series }: { series: { date: string; weight: number }[] }) {
  const W = 600;
  const H = 140;
  const padX = 12;
  const padY = 16;
  const min = Math.min(...series.map((s) => s.weight));
  const max = Math.max(...series.map((s) => s.weight));
  const range = max - min || 1;
  const xStep = (W - padX * 2) / Math.max(series.length - 1, 1);
  const points = series.map((s, i) => ({ x: padX + i * xStep, y: padY + (1 - (s.weight - min) / range) * (H - padY * 2), ...s }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;

  return (
    <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4">
      <div className="flex items-end justify-between mb-3"><div><div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">{series.length} mätningar</div><div className="text-v3-sm text-v3-text-secondary mt-0.5 tabular-nums">{min.toFixed(1)} – {max.toFixed(1)} kg</div></div></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs><linearGradient id="weight-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--v3-accent-halsa))" stopOpacity="0.25" /><stop offset="100%" stopColor="hsl(var(--v3-accent-halsa))" stopOpacity="0" /></linearGradient></defs>
        <path d={areaD} fill="url(#weight-grad)" />
        <path d={pathD} fill="none" stroke="hsl(var(--v3-accent-halsa))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(var(--v3-accent-halsa))" />)}
      </svg>
      <div className="flex justify-between text-v3-xs text-v3-text-tertiary mt-2 tabular-nums"><span>{formatDate(series[0].date)}</span><span>{formatDate(series[series.length - 1].date)}</span></div>
    </div>
  );
}

function LogsList({ loading, items, onAdd, onEdit, onDelete }: { loading: boolean; items: V3HealthLog[]; onAdd: () => void; onEdit: (log: V3HealthLog) => void; onDelete: (id: string) => void }) {
  if (loading) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="v3-skeleton h-20 rounded-v3-lg" />)}</div>;
  if (items.length === 0) {
    return (
      <div className="rounded-v3-xl border border-dashed border-v3-canvas-sunken/60 bg-v3-canvas-elevated/40 p-10 text-center space-y-3 animate-v3-fade-up">
        <div className="text-4xl">🩺</div>
        <h3 className="font-v3-display text-v3-lg text-v3-text-primary">Inga loggar än</h3>
        <p className="text-v3-sm text-v3-text-tertiary max-w-sm mx-auto">Logga vetbesök, vaccinationer och vikt för att hålla koll på din hunds hälsa över tid.</p>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors mt-2 v3-focus-ring"><Plus size={16} /> Ny logg</button>
      </div>
    );
  }
  return <div className="space-y-2 v3-stagger">{items.map((log) => <div key={log.id} className="animate-v3-fade-up"><LogRow log={log} onEdit={onEdit} onDelete={onDelete} /></div>)}</div>;
}

function LogRow({ log, onEdit, onDelete }: { log: V3HealthLog; onEdit: (log: V3HealthLog) => void; onDelete: (id: string) => void }) {
  const meta = healthTypeMeta(log.type);
  return (
    <div className="rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 flex items-start gap-3 hover:bg-v3-canvas-elevated/80 transition-colors">
      <div className="shrink-0 h-11 w-11 rounded-full grid place-items-center bg-v3-canvas text-2xl">{meta.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap"><div className="text-v3-sm font-medium text-v3-text-primary truncate">{log.title}</div><span className="text-[11px] tracking-wide font-medium text-v3-text-tertiary px-1.5 py-0.5 rounded bg-v3-canvas">{meta.label}</span></div>
        {log.description && <div className="text-v3-xs text-v3-text-secondary mt-1 line-clamp-2">{log.description}</div>}
        <div className="text-v3-xs text-v3-text-tertiary mt-1.5 flex items-center gap-3 flex-wrap tabular-nums"><span>{formatDate(log.date)}</span>{log.weight_kg && <span>· {Number(log.weight_kg).toFixed(1)} kg</span>}{log.next_date && <span>· nästa {formatDate(log.next_date)}</span>}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" className="p-2 rounded-full text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas transition shrink-0" aria-label="Alternativ"><MoreVertical size={16} /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onEdit(log)}><Pencil size={14} className="mr-2" /> Redigera</DropdownMenuItem>
          <DropdownMenuItem className="text-coral focus:text-coral" onClick={() => { if (confirm("Ta bort denna logg?")) onDelete(log.id); }}><Trash2 size={14} className="mr-2" /> Ta bort</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
