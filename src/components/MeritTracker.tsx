import React from 'react';
import { Dog, CompetitionResult } from '@/types';
import { Award } from 'lucide-react';

// SAgiK merit rules (simplified):
// Brons: 3 godkända i samma klass
// Silver: 5 godkända i samma klass  
// Guld: 7 godkända i samma klass
type MeritLevel = 'Brons' | 'Silver' | 'Guld' | null;

interface Merit {
  level: MeritLevel;
  passedCount: number;
  competitionLevel: string;
}

export function calculateMerit(results: CompetitionResult[], competitionLevel: string): Merit {
  const passed = results.filter(r => r.passed && r.competition_level === competitionLevel).length;
  
  let level: MeritLevel = null;
  if (passed >= 7) level = 'Guld';
  else if (passed >= 5) level = 'Silver';
  else if (passed >= 3) level = 'Brons';

  return { level, passedCount: passed, competitionLevel };
}

const meritColors: Record<string, { bg: string; text: string; icon: string }> = {
  Brons: { bg: 'bg-amber-700/10', text: 'text-amber-700', icon: '🥉' },
  Silver: { bg: 'bg-slate-400/10', text: 'text-slate-500', icon: '🥈' },
  Guld: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', icon: '🥇' },
};

export function MeritBadge({ merit }: { merit: Merit }) {
  if (!merit.level) return null;
  const style = meritColors[merit.level];

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
      {style.icon} {merit.level} ({merit.competitionLevel})
    </span>
  );
}

export const MeritProgress = React.memo(
  React.forwardRef<HTMLDivElement, { merit: Merit }>(function MeritProgress({ merit }, ref) {
    const nextThreshold = merit.passedCount < 3 ? 3 : merit.passedCount < 5 ? 5 : merit.passedCount < 7 ? 7 : 7;
    const nextLevel = merit.passedCount < 3 ? 'Brons' : merit.passedCount < 5 ? 'Silver' : merit.passedCount < 7 ? 'Guld' : null;
    const progress = Math.min((merit.passedCount / nextThreshold) * 100, 100);

    return (
      <div ref={ref} className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            {merit.competitionLevel}: {merit.passedCount} godkända
          </span>
          {nextLevel ? (
            <span className="text-muted-foreground">{nextLevel} ({nextThreshold})</span>
          ) : (
            <span className="text-yellow-600 font-bold">Max merit! 🏆</span>
          )}
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  })
);
