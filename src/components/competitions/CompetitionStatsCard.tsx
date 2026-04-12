import { useMemo } from 'react';
import { Trophy, Target, Timer, TrendingUp } from 'lucide-react';
import type { CompetitionResult, Dog } from '@/types';

interface Props {
  results: CompetitionResult[];
  dogs: Dog[];
}

export function CompetitionStatsCard({ results, dogs }: Props) {
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYear = results.filter(r => new Date(r.date).getFullYear() === currentYear);
    const total = thisYear.length;
    const nollrundor = thisYear.filter(r => r.passed && r.faults === 0 && !r.disqualified).length;
    const nollPct = total > 0 ? Math.round((nollrundor / total) * 100) : 0;

    // Best time per class
    const bestPerClass: Record<string, number> = {};
    for (const r of thisYear) {
      if (r.time_sec > 0) {
        const key = `${r.discipline} ${r.competition_level}`;
        if (!bestPerClass[key] || r.time_sec < bestPerClass[key]) {
          bestPerClass[key] = Number(r.time_sec);
        }
      }
    }

    // Current class per dog
    const dogClasses: { name: string; level: string; discipline: string }[] = [];
    for (const dog of dogs) {
      if (dog.sport !== 'Hoopers') {
        dogClasses.push({ name: dog.name, level: dog.competition_level, discipline: 'Agility' });
        if (dog.jumping_level !== 'Nollklass') {
          dogClasses.push({ name: dog.name, level: dog.jumping_level, discipline: 'Hopp' });
        }
      }
    }

    return { total, nollPct, bestPerClass, dogClasses };
  }, [results, dogs]);

  if (results.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
        <Trophy size={14} className="text-accent" /> Tävlingsstatistik {new Date().getFullYear()}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Starter i år</div>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-success">{stats.nollPct}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Nollrundor</div>
        </div>
      </div>

      {Object.keys(stats.bestPerClass).length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
            <Timer size={12} /> Bästa tid per klass
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.bestPerClass).map(([cls, time]) => (
              <span key={cls} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {cls}: {time}s
              </span>
            ))}
          </div>
        </div>
      )}

      {stats.dogClasses.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
            <TrendingUp size={12} /> Nuvarande klass
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.dogClasses.map((dc, i) => (
              <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                {dc.name} · {dc.discipline} {dc.level}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
