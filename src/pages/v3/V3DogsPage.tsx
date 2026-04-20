import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trophy, Activity, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Dog } from "@/types";
import { V3AddDogSheet } from "@/components/v3/V3AddDogSheet";
import { V3EditDogSheet } from "@/components/v3/V3EditDogSheet";

type DogStats = {
  trainingCount: number;
  resultCount: number;
  lastTraining: string | null;
};

function ageFromBirthdate(birthdate: string | null): string | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  if (years < 1) {
    const months = (now.getFullYear() - b.getFullYear()) * 12 + m + (now.getDate() < b.getDate() ? -1 : 0);
    return `${Math.max(months, 0)} mån`;
  }
  return `${years} år`;
}

function relativeDate(iso: string | null): string {
  if (!iso) return "Aldrig";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "I dag";
  if (diff === 1) return "I går";
  if (diff < 7) return `${diff} d sedan`;
  if (diff < 30) return `${Math.floor(diff / 7)} v sedan`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function initialsOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export default function V3DogsPage() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [stats, setStats] = useState<Record<string, DogStats>>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editDog, setEditDog] = useState<Dog | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setDogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data: dogData } = await supabase
        .from("dogs")
        .select("*")
        .eq("user_id", user.id)
        .order("is_active_competition_dog", { ascending: false })
        .order("created_at", { ascending: true });

      if (cancelled) return;
      const list = (dogData ?? []) as Dog[];
      setDogs(list);

      // Stats per hund (en query var för enkelhet)
      const ids = list.map((d) => d.id);
      if (ids.length > 0) {
        const [{ data: trainings }, { data: results }] = await Promise.all([
          supabase
            .from("training_sessions")
            .select("dog_id, date")
            .in("dog_id", ids)
            .order("date", { ascending: false }),
          supabase.from("competition_results").select("dog_id").in("dog_id", ids),
        ]);
        const map: Record<string, DogStats> = {};
        for (const id of ids) map[id] = { trainingCount: 0, resultCount: 0, lastTraining: null };
        for (const t of trainings ?? []) {
          const s = map[t.dog_id];
          if (!s) continue;
          s.trainingCount++;
          if (!s.lastTraining || t.date > s.lastTraining) s.lastTraining = t.date;
        }
        for (const r of results ?? []) {
          const s = map[r.dog_id];
          if (s) s.resultCount++;
        }
        if (!cancelled) setStats(map);
      } else {
        setStats({});
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, reloadKey]);

  const activeCount = useMemo(() => dogs.filter((d) => d.is_active_competition_dog).length, [dogs]);

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 font-v3-sans animate-v3-fade-in">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="font-v3-display text-[40px] lg:text-[56px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
            Mina hundar
          </h1>
          <p className="text-v3-sm text-v3-text-secondary mt-1">
            {dogs.length} totalt · {activeCount} aktiv{activeCount === 1 ? "" : "a"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shrink-0"
        >
          <Plus size={16} strokeWidth={1.8} />
          Ny hund
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[120px] rounded-v3-2xl  v3-skeleton"
            />
          ))}
        </div>
      ) : dogs.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <ul className="space-y-3">
          {dogs.map((dog, i) => {
            const s = stats[dog.id] ?? { trainingCount: 0, resultCount: 0, lastTraining: null };
            const age = ageFromBirthdate(dog.birthdate);
            const meta = [age, dog.breed, dog.sport].filter(Boolean).join(" · ");
            return (
              <motion.li
                key={dog.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
              >
                <button
                  type="button"
                  onClick={() => setEditDog(dog)}
                  className={cn(
                    "w-full text-left rounded-v3-2xl border p-4 lg:p-5 transition-all",
                    "bg-v3-canvas-elevated border-v3-canvas-sunken/40",
                    "hover:border-v3-brand-500/30 hover:shadow-v3-sm",
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-v3-xl bg-v3-brand-100 grid place-items-center overflow-hidden shrink-0">
                      {dog.photo_url ? (
                        <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-v3-display text-[28px] lg:text-[32px] text-v3-brand-700 leading-none">
                          {initialsOf(dog.name)}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-v3-display text-[22px] lg:text-[26px] text-v3-text-primary leading-tight truncate">
                            {dog.name}
                          </h3>
                          {meta && (
                            <p className="text-v3-xs lg:text-v3-sm text-v3-text-secondary mt-0.5 truncate">
                              {meta}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!dog.is_active_competition_dog && (
                            <span className="text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded-full bg-v3-canvas-sunken text-v3-text-tertiary font-medium">
                              Pension
                            </span>
                          )}
                          <span className="h-7 w-7 grid place-items-center rounded-full text-v3-text-tertiary group-hover:text-v3-text-primary">
                            <Pencil size={13} />
                          </span>
                        </div>
                      </div>

                      {/* Nivå-badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(dog.sport === "Agility" || dog.sport === "Båda") && (
                          <>
                            <Badge>AG {dog.competition_level}</Badge>
                            <Badge>Hopp {dog.jumping_level}</Badge>
                            <Badge tone="muted">{dog.size_class}</Badge>
                          </>
                        )}
                        {(dog.sport === "Hoopers" || dog.sport === "Båda") && (
                          <>
                            <Badge tone="hoopers">HO {dog.hoopers_level}</Badge>
                            <Badge tone="muted">{dog.hoopers_size}</Badge>
                          </>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-v3-canvas-sunken/40">
                        <Stat
                          icon={<Activity size={12} />}
                          value={s.trainingCount}
                          label="pass"
                        />
                        <Stat
                          icon={<Trophy size={12} />}
                          value={s.resultCount}
                          label="resultat"
                        />
                        <Stat
                          icon={<Calendar size={12} />}
                          value={relativeDate(s.lastTraining)}
                          label="senast"
                        />
                      </div>
                    </div>
                  </div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      <V3AddDogSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => reload()}
      />
      <V3EditDogSheet
        open={!!editDog}
        dog={editDog}
        onClose={() => setEditDog(null)}
        onSaved={() => reload()}
      />
    </div>
  );
}

function Badge({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: "brand" | "muted" | "hoopers";
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-[0.04em]",
        tone === "brand" && "bg-v3-brand-500/10 text-v3-brand-700",
        tone === "muted" && "bg-v3-canvas-sunken text-v3-text-secondary",
        tone === "hoopers" && "bg-v3-accent-prestation/15 text-v3-accent-prestation",
      )}
    >
      {children}
    </span>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-v3-text-tertiary shrink-0">{icon}</span>
      <span className="text-v3-sm font-medium text-v3-text-primary truncate">{value}</span>
      <span className="text-[11px] text-v3-text-tertiary truncate">{label}</span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-v3-2xl border border-dashed border-v3-canvas-sunken/60 bg-v3-canvas-elevated/40 px-6 py-12 text-center">
      <div className="mx-auto h-14 w-14 rounded-v3-xl bg-v3-brand-500/10 grid place-items-center mb-4">
        <Plus size={22} className="text-v3-brand-700" strokeWidth={1.6} />
      </div>
      <h2 className="font-v3-display text-[24px] text-v3-text-primary mb-1.5">
        Inga hundar än
      </h2>
      <p className="text-v3-sm text-v3-text-secondary max-w-sm mx-auto mb-5">
        Lägg till din första hund för att börja logga pass, planera tävlingar och följa utvecklingen.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors"
      >
        <Plus size={16} strokeWidth={1.8} />
        Lägg till hund
      </button>
    </div>
  );
}
