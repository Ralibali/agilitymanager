import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Target, Trophy, MoreVertical, Pencil, Trash2, CheckCircle2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/store";
import type { Dog, TrainingSession, CompetitionResult } from "@/types";
import {
  PageHeader,
  DSButton,
  DSCard,
  DSEmptyState,
  GoalCard,
  MetricCard,
  PageSkeleton,
  SegmentedControl,
} from "@/components/ds";
import { AddGoalDialog } from "@/components/AddGoalDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  target_date: string | null;
  target_value: number | null;
  current_value: number | null;
  dog_id: string;
  goal_type: string;
}

type Filter = "all" | "active" | "completed";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Alla",
  active: "Aktiva",
  completed: "Avklarade",
};

// Badge-definitioner — speglar AchievementsGrid.tsx
interface BadgeDef {
  key: string;
  emoji: string;
  title: string;
  description: string;
  check: (ctx: { training: TrainingSession[]; competitions: CompetitionResult[] }) => boolean;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    key: "first_training",
    emoji: "🐾",
    title: "Första steget",
    description: "Logga ditt första träningspass",
    check: (ctx) => ctx.training.length >= 1,
  },
  {
    key: "week_streak",
    emoji: "🔥",
    title: "Veckostreak",
    description: "Träna 5 dagar i rad",
    check: (ctx) => {
      const dates = [...new Set(ctx.training.map((t) => t.date))].sort();
      for (let i = 0; i <= dates.length - 5; i++) {
        let streak = true;
        for (let j = 1; j < 5; j++) {
          const d1 = new Date(dates[i + j - 1]);
          const d2 = new Date(dates[i + j]);
          if ((d2.getTime() - d1.getTime()) / 86400000 !== 1) {
            streak = false;
            break;
          }
        }
        if (streak) return true;
      }
      return false;
    },
  },
  {
    key: "first_clean_run",
    emoji: "🏅",
    title: "Nollrunda!",
    description: "Registrera din första nollrunda",
    check: (ctx) => ctx.competitions.some((c) => c.faults === 0 && !c.disqualified && c.passed),
  },
  {
    key: "personal_best",
    emoji: "⚡",
    title: "Snabbaste hunden",
    description: "Slå ditt eget bästarekord",
    check: (ctx) => {
      const byClass = new Map<string, number[]>();
      ctx.competitions.forEach((c) => {
        const t = Number(c.time_sec);
        if (t <= 0) return;
        const key = `${c.dog_id}_${c.competition_level}_${c.discipline}`;
        const arr = byClass.get(key) || [];
        arr.push(t);
        byClass.set(key, arr);
      });
      for (const times of byClass.values()) {
        if (times.length >= 2) return true;
      }
      return false;
    },
  },
  {
    key: "dedicated_50",
    emoji: "📅",
    title: "Dedikerad",
    description: "50 loggade träningspass",
    check: (ctx) => ctx.training.length >= 50,
  },
  {
    key: "class_promotion",
    emoji: "🏆",
    title: "Klassbyte",
    description: "Avancera till ny tävlingsklass",
    check: (ctx) => {
      const byDog = new Map<string, string[]>();
      const sorted = [...ctx.competitions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      sorted.forEach((c) => {
        const arr = byDog.get(c.dog_id) || [];
        arr.push(c.competition_level);
        byDog.set(c.dog_id, arr);
      });
      for (const levels of byDog.values()) {
        for (let i = 1; i < levels.length; i++) {
          if (levels[i] !== levels[i - 1]) return true;
        }
      }
      return false;
    },
  },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [goalsRes, d, t, c, achRes] = await Promise.all([
      supabase.from("training_goals").select("*").order("created_at", { ascending: false }),
      store.getDogs(),
      store.getTraining(),
      store.getCompetitions(),
      supabase.from("achievements").select("achievement_key"),
    ]);
    setGoals((goalsRes.data as Goal[]) ?? []);
    setDogs(d);
    setTraining(t);
    setCompetitions(c);
    setUnlockedBadges(new Set((achRes.data ?? []).map((r) => r.achievement_key as string)));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(
    () => ({
      total: goals.length,
      active: goals.filter((g) => g.status !== "completed").length,
      completed: goals.filter((g) => g.status === "completed").length,
    }),
    [goals],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return goals;
    if (filter === "completed") return goals.filter((g) => g.status === "completed");
    return goals.filter((g) => g.status !== "completed");
  }, [goals, filter]);

  const unlockedCount = useMemo(
    () => BADGE_DEFS.filter((d) => unlockedBadges.has(d.key)).length,
    [unlockedBadges],
  );

  const toggleComplete = async (goal: Goal) => {
    const newStatus = goal.status === "completed" ? "active" : "completed";
    const { error } = await supabase
      .from("training_goals")
      .update({ status: newStatus })
      .eq("id", goal.id);
    if (error) {
      toast.error("Kunde inte uppdatera status");
      return;
    }
    toast.success(newStatus === "completed" ? "Mål markerat som klart 🎉" : "Mål återställt");
    refresh();
  };

  const deleteGoal = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("training_goals").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast.error("Kunde inte ta bort mål");
      return;
    }
    toast.success("Mål borttaget");
    refresh();
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Träning"
        title="Mål & badges"
        subtitle="Sätt riktning för träningen och fira utvecklingen."
        actions={<AddGoalDialog dogs={dogs} onAdded={refresh} />}
      />

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Aktiva mål" value={counts.active} />
        <MetricCard label="Avklarade" value={counts.completed} />
        <MetricCard label="Badges" value={`${unlockedCount}/${BADGE_DEFS.length}`} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={(Object.keys(FILTER_LABEL) as Filter[]).map((f) => ({
            value: f,
            label: FILTER_LABEL[f],
          }))}
        />
      </div>

      {filtered.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={Target}
            title={
              counts.total === 0
                ? "Inga mål ännu"
                : filter === "completed"
                  ? "Inga avklarade mål än"
                  : "Inga aktiva mål"
            }
            description={
              counts.total === 0
                ? "Skapa ditt första mål – t.ex. 10 nollrundor, eller K2 till sommaren."
                : "När du klarar av mål samlas de här."
            }
            action={
              dogs.length > 0 ? (
                <AddGoalDialog
                  dogs={dogs}
                  onAdded={refresh}
                  trigger={
                    <DSButton>
                      <Plus className="w-4 h-4" /> Skapa mål
                    </DSButton>
                  }
                />
              ) : undefined
            }
          />
        </DSCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((g) => {
            const dog = dogs.find((d) => d.id === g.dog_id);
            return (
              <div key={g.id} className="relative group">
                <GoalCard
                  title={g.title}
                  description={g.description}
                  category={g.category}
                  status={g.status}
                  current={g.current_value}
                  target={g.target_value}
                  targetDate={g.target_date}
                  dogName={dog?.name}
                />
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-subtle text-text-tertiary hover:text-text-primary transition-colors"
                        aria-label="Hantera mål"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleComplete(g)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {g.status === "completed" ? "Återställ" : "Markera klart"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditGoal(g)}>
                        <Pencil className="w-4 h-4 mr-2" /> Redigera
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(g.id)}
                        className="text-semantic-danger focus:text-semantic-danger"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Badges-sektion — direkt på sidan, ingen extra navigation */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-900" />
            <h2 className="text-h2 text-text-primary">Badges & prestationer</h2>
          </div>
          <span className="text-small text-text-secondary tabular-nums">
            {unlockedCount} av {BADGE_DEFS.length} upplåsta
          </span>
        </div>
        <p className="text-small text-text-secondary">
          Lås upp märken när du når milstolpar – streaks, nollrundor, första K2, m.m.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BADGE_DEFS.map((def, i) => {
            const isUnlocked = unlockedBadges.has(def.key);
            return (
              <motion.div
                key={def.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <DSCard className={isUnlocked ? "" : "opacity-60"}>
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-2xl ${
                        isUnlocked ? "bg-amber-50" : "bg-subtle"
                      }`}
                    >
                      {isUnlocked ? def.emoji : <Lock className="w-4 h-4 text-text-tertiary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-body font-medium text-text-primary">{def.title}</h3>
                      <p className="text-small text-text-tertiary mt-0.5">{def.description}</p>
                      {isUnlocked && (
                        <span className="text-micro text-semantic-success mt-1.5 inline-block">
                          ✓ Upplåst
                        </span>
                      )}
                    </div>
                  </div>
                </DSCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Edit-dialog (extern kontroll) */}
      {editGoal && (
        <AddGoalDialog
          dogs={dogs}
          onAdded={refresh}
          open={!!editGoal}
          onOpenChange={(o) => !o && setEditGoal(null)}
          editId={editGoal.id}
          defaultValues={{
            title: editGoal.title,
            description: editGoal.description,
            category: editGoal.category,
            goalType: editGoal.goal_type,
            targetValue: editGoal.target_value?.toString() ?? "",
            currentValue: editGoal.current_value?.toString() ?? "",
            targetDate: editGoal.target_date ?? "",
            dogId: editGoal.dog_id,
          }}
        />
      )}

      {/* Bekräfta borttagning */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort mål?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta går inte att ångra. Målet och dess milstolpar tas bort permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteGoal}
              className="bg-semantic-danger text-text-on-inverse hover:bg-semantic-danger/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
