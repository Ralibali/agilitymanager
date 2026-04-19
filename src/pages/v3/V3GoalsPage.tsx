import { useMemo, useState } from "react";
import { Plus, Target, Trophy, Calendar, CheckCircle2, Lock, MoreVertical, Pencil, Trash2, RotateCcw, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Goals, computeGoalStats, type V3Goal } from "@/hooks/v3/useV3Goals";
import { DogHero } from "@/components/v3/DogHero";
import { V3AddGoalSheet } from "@/components/v3/V3AddGoalSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Filter = "active" | "completed" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Aktiva" },
  { value: "completed", label: "Avklarade" },
  { value: "all", label: "Alla" },
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

interface BadgeDef {
  key: string;
  emoji: string;
  title: string;
  description: string;
}

const BADGE_DEFS: BadgeDef[] = [
  { key: "first_training", emoji: "🐾", title: "Första steget", description: "Logga ditt första pass" },
  { key: "week_streak", emoji: "🔥", title: "Veckostreak", description: "Träna 5 dagar i rad" },
  { key: "first_clean_run", emoji: "🏅", title: "Nollrunda!", description: "Din första nollrunda" },
  { key: "personal_best", emoji: "⚡", title: "Snabbaste hunden", description: "Slå ditt egna rekord" },
  { key: "dedicated_50", emoji: "📅", title: "Dedikerad", description: "50 loggade pass" },
  { key: "class_promotion", emoji: "🏆", title: "Klassbyte", description: "Avancera tävlingsklass" },
];

export default function V3GoalsPage() {
  const navigate = useNavigate();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { goals, unlockedBadges, loading, reload } = useV3Goals(activeId);

  const [filter, setFilter] = useState<Filter>("active");
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<V3Goal | null>(null);

  const stats = useMemo(() => computeGoalStats(goals), [goals]);

  const filtered = useMemo(() => {
    if (filter === "all") return goals;
    if (filter === "completed") return goals.filter((g) => g.status === "completed");
    return goals.filter((g) => g.status !== "completed");
  }, [goals, filter]);

  const unlockedCount = useMemo(
    () => BADGE_DEFS.filter((b) => unlockedBadges.has(b.key)).length,
    [unlockedBadges],
  );

  const toggleComplete = async (goal: V3Goal) => {
    const newStatus = goal.status === "completed" ? "active" : "completed";
    const { error } = await supabase
      .from("training_goals")
      .update({ status: newStatus })
      .eq("id", goal.id);
    if (error) {
      toast.error("Kunde inte uppdatera");
      return;
    }
    toast.success(newStatus === "completed" ? "Mål klart 🎉" : "Mål återställt");
    void reload();
  };

  const removeGoal = async (id: string) => {
    const { error } = await supabase.from("training_goals").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort");
      return;
    }
    toast.success("Mål borttaget");
    void reload();
  };

  const openEdit = (goal: V3Goal) => {
    setEditing(goal);
    setSheet(true);
  };

  const openNew = () => {
    setEditing(null);
    setSheet(true);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
            Mål & badges
          </div>
          <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
            Sikta mot nästa.
          </h1>
        </div>
        {active && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm shrink-0"
          >
            <Plus size={16} strokeWidth={2} />
            Nytt mål
          </button>
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
          {/* Stat-tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Aktiva" value={String(stats.active)} sub="pågående mål" />
            <StatTile label="Avklarade" value={String(stats.completed)} sub="totalt" />
            <StatTile label="Nära deadline" value={String(stats.dueSoon)} sub="≤ 14 dagar" />
            <StatTile label="Badges" value={`${unlockedCount}/${BADGE_DEFS.length}`} sub="upplåsta" />
          </div>

          {/* Filter-tabs */}
          <div className="flex gap-1.5 border-b border-v3-canvas-sunken/40">
            {FILTERS.map(({ value, label }) => {
              const isActive = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "h-11 px-4 -mb-px text-v3-sm font-medium transition-colors border-b-2",
                    isActive
                      ? "text-v3-text-primary border-v3-text-primary"
                      : "text-v3-text-tertiary border-transparent hover:text-v3-text-secondary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Mållista */}
          <GoalsList
            loading={loading}
            items={filtered}
            onAdd={openNew}
            onToggle={toggleComplete}
            onEdit={openEdit}
            onDelete={removeGoal}
            filter={filter}
          />

          {/* Badges */}
          <section className="space-y-4 pt-2">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
                  Prestationer
                </div>
                <h2 className="font-v3-display text-v3-2xl text-v3-text-primary mt-1">
                  Badges
                </h2>
              </div>
              <span className="text-v3-xs text-v3-text-tertiary tabular-nums">
                {unlockedCount} / {BADGE_DEFS.length}
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {BADGE_DEFS.map((b) => {
                const unlocked = unlockedBadges.has(b.key);
                return (
                  <div
                    key={b.key}
                    className={cn(
                      "rounded-v3-lg border p-4 flex items-start gap-3 transition-colors",
                      unlocked
                        ? "bg-v3-canvas-elevated border-v3-canvas-sunken/40"
                        : "bg-v3-canvas-elevated/40 border-v3-canvas-sunken/30 opacity-70",
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 h-11 w-11 rounded-full grid place-items-center text-2xl",
                        unlocked ? "bg-amber-50 dark:bg-amber-950/30" : "bg-v3-canvas-sunken",
                      )}
                    >
                      {unlocked ? b.emoji : <Lock size={14} className="text-v3-text-tertiary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-v3-sm font-medium text-v3-text-primary">{b.title}</div>
                      <div className="text-v3-xs text-v3-text-tertiary mt-0.5">{b.description}</div>
                      {unlocked && (
                        <div className="text-[10px] font-medium text-emerald-600 mt-1.5">✓ Upplåst</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <V3AddGoalSheet
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

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
        {label}
      </div>
      <div className="font-v3-display text-[28px] leading-none mt-2 text-v3-text-primary tabular-nums truncate">
        {value}
      </div>
      <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

function GoalsList({
  loading,
  items,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  filter,
}: {
  loading: boolean;
  items: V3Goal[];
  onAdd: () => void;
  onToggle: (g: V3Goal) => void;
  onEdit: (g: V3Goal) => void;
  onDelete: (id: string) => void;
  filter: Filter;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-v3-lg  v3-skeleton"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-v3-brand-500/10 grid place-items-center mb-4">
          <Target size={20} strokeWidth={1.6} className="text-v3-brand-500" />
        </div>
        <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">
          {filter === "completed" ? "Inga avklarade mål än" : "Inga mål för den här hunden"}
        </h3>
        <p className="text-v3-base text-v3-text-secondary mt-2 max-w-sm mx-auto">
          {filter === "completed"
            ? "När du markerar mål som klara samlas de här."
            : "Sätt riktning för träningen — t.ex. 10 nollrundor eller K2 till sommaren."}
        </p>
        {filter !== "completed" && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
          >
            <Plus size={16} strokeWidth={2} />
            Skapa mål
          </button>
        )}
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((g) => {
        const isDone = g.status === "completed";
        const isNumeric = g.goal_type === "numeric" && g.target_value && g.target_value > 0;
        const progress = isNumeric ? Math.min(1, (g.current_value ?? 0) / (g.target_value ?? 1)) : 0;
        const days = daysUntil(g.target_date);

        return (
          <li
            key={g.id}
            className={cn(
              "rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-canvas-sunken transition-colors group",
              isDone && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-v3-base text-v3-text-primary truncate",
                      isDone && "line-through",
                    )}
                  >
                    {g.title}
                  </span>
                  <CategoryChip category={g.category} />
                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 size={10} /> Klart
                    </span>
                  )}
                </div>

                {g.description && (
                  <p className="text-v3-sm text-v3-text-secondary mt-1.5 line-clamp-2">{g.description}</p>
                )}

                {isNumeric && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-v3-xs text-v3-text-tertiary tabular-nums">
                      <span>
                        {g.current_value ?? 0} / {g.target_value}
                      </span>
                      <span>{Math.round(progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-v3-canvas-sunken overflow-hidden">
                      <div
                        className="h-full bg-v3-brand-500 transition-all"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {g.target_date && (
                  <div className="flex items-center gap-1.5 mt-2.5 text-v3-xs text-v3-text-tertiary tabular-nums">
                    <Calendar size={11} strokeWidth={1.8} />
                    <span>{formatDate(g.target_date)}</span>
                    {!isDone && days !== null && (
                      <span
                        className={cn(
                          "font-medium",
                          days < 0
                            ? "text-red-600"
                            : days <= 7
                              ? "text-amber-600"
                              : "text-v3-brand-700",
                        )}
                      >
                        ·{" "}
                        {days < 0
                          ? `${Math.abs(days)} d sen`
                          : days === 0
                            ? "Idag"
                            : days === 1
                              ? "Imorgon"
                              : `om ${days} d`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Åtgärder"
                    className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas-sunken transition-colors shrink-0"
                  >
                    <MoreVertical size={14} strokeWidth={1.8} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onToggle(g)}>
                    {isDone ? (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" /> Återställ
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Markera klart
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(g)}>
                    <Pencil className="w-4 h-4 mr-2" /> Redigera
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(g.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CategoryChip({ category }: { category: string }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-v3-canvas-sunken text-v3-text-secondary">
      {category}
    </span>
  );
}
