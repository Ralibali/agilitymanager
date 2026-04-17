import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/store";
import type { Dog } from "@/types";
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

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("training_goals").select("*").order("created_at", { ascending: false }),
      store.getDogs(),
    ]).then(([goalsRes, d]) => {
      if (cancelled) return;
      setGoals((goalsRes.data as Goal[]) ?? []);
      setDogs(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      total: goals.length,
      active: goals.filter((g) => g.status !== "completed").length,
      completed: goals.filter((g) => g.status === "completed").length,
    };
  }, [goals]);

  const filtered = useMemo(() => {
    if (filter === "all") return goals;
    if (filter === "completed") return goals.filter((g) => g.status === "completed");
    return goals.filter((g) => g.status !== "completed");
  }, [goals, filter]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Träning"
        title="Mål & badges"
        subtitle="Sätt riktning för träningen och fira utvecklingen."
        actions={
          <DSButton asChild>
            <Link to="/goals">
              <Plus className="w-4 h-4" /> Hantera mål
            </Link>
          </DSButton>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Aktiva mål" value={counts.active} />
        <MetricCard label="Avklarade" value={counts.completed} />
        <MetricCard label="Totalt" value={counts.total} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <SegmentedControl
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
              <DSButton asChild>
                <Link to="/goals">
                  <Plus className="w-4 h-4" /> Skapa mål
                </Link>
              </DSButton>
            }
          />
        </DSCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((g) => {
            const dog = dogs.find((d) => d.id === g.dog_id);
            return (
              <GoalCard
                key={g.id}
                title={g.title}
                description={g.description}
                category={g.category}
                status={g.status}
                current={g.current_value}
                target={g.target_value}
                targetDate={g.target_date}
                dogName={dog?.name}
              />
            );
          })}
        </div>
      )}

      <DSCard variant="highlight">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-ds-md bg-amber-50 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-900" />
          </div>
          <div>
            <h3 className="text-h2 text-text-primary mb-1">Badges & prestationer</h3>
            <p className="text-small text-text-secondary mb-3">
              Lås upp märken när du når milstolpar – streaks, nollrundor, första K2, m.m.
            </p>
            <DSButton variant="secondary" asChild>
              <Link to="/goals">Se alla badges</Link>
            </DSButton>
          </div>
        </div>
      </DSCard>
    </div>
  );
}
