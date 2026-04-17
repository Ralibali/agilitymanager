import { useEffect, useState } from "react";
import { Plus, Dog as DogIcon, TrendingUp, Trophy, Calendar } from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  PageHeader,
  PageSkeleton,
  DSCard,
  DSButton,
  DSEmptyState,
  MetricCard,
  StatusBadge,
} from "@/components/ds";
import { AddDogDialog } from "@/components/AddDogDialog";
import { DogPhotoUpload } from "@/components/DogPhotoUpload";
import { Switch } from "@/components/ui/switch";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { Dog, CompetitionResult, TrainingSession } from "@/types";
import { calculatePromotionProgress } from "@/components/competitions/ClassPromotionTracker";
import { toast } from "sonner";

export default function V2DogsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [d, r, s] = await Promise.all([
      store.getDogs(),
      store.getCompetitions(),
      store.getTraining(),
    ]);
    setDogs(d);
    setResults(r);
    setSessions(s);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <PageSkeleton />;

  const activeDogs = dogs.filter((d) => d.is_active_competition_dog).length;
  const totalRuns = results.length;
  const totalSessions = sessions.length;

  const toggleActive = async (dog: Dog, value: boolean) => {
    setDogs((prev) =>
      prev.map((d) => (d.id === dog.id ? { ...d, is_active_competition_dog: value } : d)),
    );
    const { error } = await supabase
      .from("dogs")
      .update({ is_active_competition_dog: value })
      .eq("id", dog.id);
    if (error) toast.error("Kunde inte uppdatera");
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hundar"
        title="Mina hundar"
        subtitle="Hantera dina hundars profiler, klasser och tävlingsstatus."
        actions={<AddDogDialog onAdded={refresh} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard label="Hundar i kenneln" value={dogs.length} hint="totalt" />
        <MetricCard label="Aktiva tävlingshundar" value={activeDogs} hint="i drift" />
        <MetricCard label="Tävlingsstarter" value={totalRuns} hint="loggade" />
      </div>

      {dogs.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={DogIcon}
            title="Inga hundar ännu"
            description="Lägg till din första hund för att börja logga träning och tävlingar."
            action={<AddDogDialog onAdded={refresh} />}
          />
        </DSCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {dogs.map((dog) => {
            const dogResults = results.filter((r) => r.dog_id === dog.id);
            const dogSessions = sessions.filter((s) => s.dog_id === dog.id);
            const progress = calculatePromotionProgress(dogResults, dog);
            const ready = progress.filter((p) => p.nextClass && p.cleanRuns >= p.required);
            const age = dog.birthdate
              ? differenceInYears(new Date(), new Date(dog.birthdate))
              : null;
            const lastResult = dogResults[0];
            return (
              <DSCard key={dog.id} className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <DogPhotoUpload
                    dogId={dog.id}
                    currentUrl={dog.photo_url}
                    onUploaded={(url) =>
                      setDogs((prev) =>
                        prev.map((d) => (d.id === dog.id ? { ...d, photo_url: url } : d)),
                      )
                    }
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-h2 text-text-primary truncate">{dog.name}</h3>
                        <p className="text-small text-text-secondary truncate">
                          {[dog.breed, dog.gender, age != null ? `${age} år` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {dog.is_active_competition_dog && (
                        <StatusBadge tone="success">Aktiv</StatusBadge>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusBadge tone="neutral">{dog.sport}</StatusBadge>
                      {(dog.sport === "Agility" || dog.sport === "Båda") && (
                        <>
                          <StatusBadge tone="info">Storlek {dog.size_class}</StatusBadge>
                          <StatusBadge tone="neutral">AG {dog.competition_level}</StatusBadge>
                          <StatusBadge tone="neutral">Hopp {dog.jumping_level}</StatusBadge>
                        </>
                      )}
                      {(dog.sport === "Hoopers" || dog.sport === "Båda") && (
                        <>
                          <StatusBadge tone="info">{dog.hoopers_size}</StatusBadge>
                          <StatusBadge tone="neutral">HO {dog.hoopers_level}</StatusBadge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-3">
                  <DogStat icon={Trophy} label="Starter" value={dogResults.length} />
                  <DogStat icon={Calendar} label="Pass" value={dogSessions.length} />
                  <DogStat
                    icon={TrendingUp}
                    label="Senast"
                    value={
                      lastResult
                        ? format(new Date(lastResult.date), "d MMM", { locale: sv })
                        : "—"
                    }
                  />
                </div>

                {ready.length > 0 && (
                  <div className="rounded-ds-md bg-brand-50 px-3 py-2 text-small text-brand-900">
                    🎉 Redo för uppflyttning:{" "}
                    {ready.map((r) => `${r.discipline} ${r.nextClass}`).join(", ")}
                  </div>
                )}

                {dog.notes && (
                  <p className="text-small text-text-secondary border-t border-border-subtle pt-3">
                    {dog.notes}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="text-small text-text-secondary">Aktiv tävlingshund</span>
                  <Switch
                    checked={dog.is_active_competition_dog}
                    onCheckedChange={(v) => toggleActive(dog, v)}
                  />
                </div>
              </DSCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DogStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1 text-text-tertiary">
        <Icon size={12} strokeWidth={1.75} />
        <span className="text-micro uppercase">{label}</span>
      </div>
      <span className="text-body font-medium text-text-primary">{value}</span>
    </div>
  );
}
