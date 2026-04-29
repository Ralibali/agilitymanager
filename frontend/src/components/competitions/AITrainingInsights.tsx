import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Lightbulb, AlertTriangle, ThumbsUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import { subMonths, format } from 'date-fns';

interface Insight {
  title: string;
  description: string;
  type: 'tip' | 'warning' | 'praise' | 'suggestion';
}

const typeConfig = {
  tip: { icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  praise: { icon: ThumbsUp, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  suggestion: { icon: ArrowRight, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
};

function buildTrainingSummary(sessions: TrainingSession[], dogs: Dog[]): string {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const recent = sessions.filter(s => new Date(s.date) >= threeMonthsAgo);

  if (recent.length === 0) return 'Inga träningspass de senaste 3 månaderna.';

  const dogMap = new Map(dogs.map(d => [d.id, d.name]));
  const byType: Record<string, number> = {};
  const byDog: Record<string, number> = {};
  let totalMin = 0;

  for (const s of recent) {
    byType[s.type] = (byType[s.type] || 0) + 1;
    const name = dogMap.get(s.dog_id) || 'Okänd';
    byDog[name] = (byDog[name] || 0) + 1;
    totalMin += s.duration_min;
  }

  const avgEnergy = recent.length > 0
    ? (recent.reduce((s, t) => s + t.dog_energy, 0) / recent.length).toFixed(1)
    : '-';

  const lines = [
    `Totalt ${recent.length} pass, ${totalMin} minuter`,
    `Snitt hundenergi: ${avgEnergy}/5`,
    `Per typ: ${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
    `Per hund: ${Object.entries(byDog).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
  ];

  // Add recent notes
  const withNotes = recent.filter(s => s.notes_good || s.notes_improve).slice(0, 5);
  if (withNotes.length > 0) {
    lines.push('Senaste anteckningar:');
    for (const s of withNotes) {
      const dog = dogMap.get(s.dog_id) || '';
      if (s.notes_good) lines.push(`  ${dog} - Bra: ${s.notes_good}`);
      if (s.notes_improve) lines.push(`  ${dog} - Förbättra: ${s.notes_improve}`);
    }
  }

  return lines.join('\n');
}

function buildCompetitionSummary(results: CompetitionResult[], dogs: Dog[]): string {
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const recent = results.filter(r => new Date(r.date) >= sixMonthsAgo);

  if (recent.length === 0) return 'Inga tävlingsresultat de senaste 6 månaderna.';

  const dogMap = new Map(dogs.map(d => [d.id, d.name]));
  const passed = recent.filter(r => r.passed).length;
  const disqualified = recent.filter(r => r.disqualified).length;
  const avgFaults = (recent.reduce((s, r) => s + r.faults, 0) / recent.length).toFixed(1);

  const byDog: Record<string, { total: number; passed: number; faults: number }> = {};
  for (const r of recent) {
    const name = dogMap.get(r.dog_id) || 'Okänd';
    if (!byDog[name]) byDog[name] = { total: 0, passed: 0, faults: 0 };
    byDog[name].total++;
    if (r.passed) byDog[name].passed++;
    byDog[name].faults += r.faults;
  }

  const lines = [
    `${recent.length} starter, ${passed} godkända (${Math.round(passed / recent.length * 100)}%)`,
    `${disqualified} diskningar, snitt ${avgFaults} fel/start`,
    ...Object.entries(byDog).map(
      ([name, d]) => `${name}: ${d.total} starter, ${d.passed} godkända, snitt ${(d.faults / d.total).toFixed(1)} fel`
    ),
  ];

  return lines.join('\n');
}

function buildDogsInfo(dogs: Dog[]): string {
  return dogs.map(d =>
    `${d.name} (${d.breed || 'okänd ras'}, ${d.size_class}, Agility: ${d.competition_level}, Hopp: ${d.jumping_level})`
  ).join('\n');
}

interface Props {
  dogs: Dog[];
  sessions: TrainingSession[];
  results: CompetitionResult[];
}

export default function AITrainingInsights({ dogs, sessions, results }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    if (dogs.length === 0) {
      toast.error('Lägg till minst en hund först');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('training-insights', {
        body: {
          trainingSummary: buildTrainingSummary(sessions, dogs),
          competitionSummary: buildCompetitionSummary(results, dogs),
          dogs: buildDogsInfo(dogs),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInsights(data.insights || []);
      setFetched(true);
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte hämta insikter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          <h4 className="text-xs font-semibold text-foreground">AI-träningsinsikter</h4>
        </div>
        <Button
          size="sm"
          variant={fetched ? 'outline' : 'default'}
          className="gap-1.5 text-xs h-7"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={12} className="animate-spin" /> Analyserar...</>
          ) : fetched ? (
            <><Sparkles size={12} /> Uppdatera</>
          ) : (
            <><Sparkles size={12} /> Analysera</>
          )}
        </Button>
      </div>

      {!fetched && !loading && (
        <p className="text-[10px] text-muted-foreground">
          AI analyserar din tränings- och tävlingsdata och ger personliga tips.
        </p>
      )}

      <AnimatePresence mode="wait">
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {insights.map((insight, i) => {
              const config = typeConfig[insight.type] || typeConfig.tip;
              const Icon = config.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-lg p-2.5 border ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={14} className={`${config.color} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
