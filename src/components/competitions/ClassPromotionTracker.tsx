import React from 'react';
import { TrendingUp, CheckCircle2 } from 'lucide-react';
import type { CompetitionResult, Dog } from '@/types';

const CLASS_ORDER = ['Nollklass', 'K1', 'K2', 'K3'] as const;
const REQUIRED_CLEAN_RUNS = 3;

interface PromotionProgress {
  discipline: string;
  currentClass: string;
  nextClass: string | null;
  cleanRuns: number;
  required: number;
  dates: string[]; // dates of qualifying runs
}

function getCleanRuns(
  results: CompetitionResult[],
  discipline: 'Agility' | 'Jumping',
  level: string
) {
  return results
    .filter(
      (r) =>
        r.discipline === discipline &&
        r.competition_level === level &&
        r.passed &&
        !r.disqualified &&
        r.faults === 0
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculatePromotionProgress(
  results: CompetitionResult[],
  dog: Dog
): PromotionProgress[] {
  const progress: PromotionProgress[] = [];

  const disciplines: { key: 'Agility' | 'Jumping'; label: string; levelField: 'competition_level' | 'jumping_level' }[] = [
    { key: 'Agility', label: 'Agility', levelField: 'competition_level' },
    { key: 'Jumping', label: 'Hopp', levelField: 'jumping_level' },
  ];

  for (const disc of disciplines) {
    const currentClass = dog[disc.levelField];
    const classIdx = CLASS_ORDER.indexOf(currentClass as any);
    if (classIdx < 0 || classIdx >= CLASS_ORDER.length - 1) {
      // Already at K3 or unknown
      if (classIdx === CLASS_ORDER.length - 1) {
        progress.push({
          discipline: disc.label,
          currentClass,
          nextClass: null,
          cleanRuns: 0,
          required: 0,
          dates: [],
        });
      }
      continue;
    }

    const nextClass = CLASS_ORDER[classIdx + 1];
    const clean = getCleanRuns(results, disc.key, currentClass);

    progress.push({
      discipline: disc.label,
      currentClass,
      nextClass,
      cleanRuns: Math.min(clean.length, REQUIRED_CLEAN_RUNS),
      required: REQUIRED_CLEAN_RUNS,
      dates: clean.slice(0, REQUIRED_CLEAN_RUNS).map((r) => r.date),
    });
  }

  return progress;
}

interface Props {
  results: CompetitionResult[];
  dogs: Dog[];
}

export default React.memo(function ClassPromotionTracker({ results, dogs }: Props) {
  if (dogs.length === 0 || results.length === 0) return null;

  const allProgress = dogs
    .map((dog) => ({
      dog,
      progress: calculatePromotionProgress(
        results.filter((r) => r.dog_id === dog.id),
        dog
      ),
    }))
    .filter((d) => d.progress.length > 0);

  if (allProgress.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-3 mb-4">
      <div className="flex items-center gap-1.5">
        <TrendingUp size={14} className="text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Klassuppflyttning</h4>
      </div>

      {allProgress.map(({ dog, progress }) => (
        <div key={dog.id} className="space-y-2">
          {dogs.length > 1 && (
            <p className="text-[11px] font-medium text-foreground">{dog.name}</p>
          )}
          {progress.map((p) => (
            <div key={`${dog.id}-${p.discipline}`} className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">
                  {p.discipline}: {p.currentClass}
                </span>
                {p.nextClass ? (
                  <span className="text-muted-foreground">
                    {p.cleanRuns}/{p.required} → {p.nextClass}
                  </span>
                ) : (
                  <span className="text-primary font-bold flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Högsta klass
                  </span>
                )}
              </div>
              {p.nextClass && (
                <div className="flex gap-1">
                  {Array.from({ length: p.required }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        i < p.cleanRuns
                          ? 'bg-primary'
                          : 'bg-secondary'
                      }`}
                    />
                  ))}
                </div>
              )}
              {p.nextClass && p.cleanRuns >= p.required && (
                <p className="text-[10px] text-primary font-semibold">
                  🎉 Redo för uppflyttning till {p.nextClass}!
                </p>
              )}
            </div>
          ))}
        </div>
      ))}

      <p className="text-[9px] text-muted-foreground">
        Baserat på registrerade resultat. Kräver {REQUIRED_CLEAN_RUNS} felfria godkända lopp i nuvarande klass.
      </p>
    </div>
  );
});
