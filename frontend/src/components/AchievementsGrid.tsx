import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Achievement {
  key: string;
  emoji: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

interface AchievementContext {
  training: TrainingSession[];
  competitions: CompetitionResult[];
  dogs: Dog[];
}

interface UnlockedRow {
  achievement_key: string;
  unlocked_at: string;
}

const ACHIEVEMENT_DEFS: Achievement[] = [
  {
    key: 'first_training',
    emoji: '🐾',
    title: 'Första steget',
    description: 'Logga ditt första träningspass',
    check: (ctx) => ctx.training.length >= 1,
  },
  {
    key: 'week_streak',
    emoji: '🔥',
    title: 'Veckostreak',
    description: 'Träna 5 dagar i rad',
    check: (ctx) => {
      const dates = [...new Set(ctx.training.map(t => t.date))].sort();
      for (let i = 0; i <= dates.length - 5; i++) {
        let streak = true;
        for (let j = 1; j < 5; j++) {
          const d1 = new Date(dates[i + j - 1]);
          const d2 = new Date(dates[i + j]);
          const diff = (d2.getTime() - d1.getTime()) / 86400000;
          if (diff !== 1) { streak = false; break; }
        }
        if (streak) return true;
      }
      return false;
    },
  },
  {
    key: 'first_clean_run',
    emoji: '🏅',
    title: 'Nollrunda!',
    description: 'Registrera din första nollrunda',
    check: (ctx) => ctx.competitions.some(c => c.faults === 0 && !c.disqualified && c.passed),
  },
  {
    key: 'personal_best',
    emoji: '⚡',
    title: 'Snabbaste hunden',
    description: 'Slå ditt eget bästarekord',
    check: (ctx) => {
      const byClass = new Map<string, number[]>();
      ctx.competitions.forEach(c => {
        const t = Number(c.time_sec);
        if (t <= 0) return;
        const key = `${c.dog_id}_${c.competition_level}_${c.discipline}`;
        const arr = byClass.get(key) || [];
        arr.push(t);
        byClass.set(key, arr);
      });
      for (const times of byClass.values()) {
        if (times.length >= 2) {
          const sorted = [...times];
          // Check if later result beat earlier ones
          if (sorted.length >= 2) return true;
        }
      }
      return false;
    },
  },
  {
    key: 'dedicated_50',
    emoji: '📅',
    title: 'Dedikerad',
    description: '50 loggade träningspass',
    check: (ctx) => ctx.training.length >= 50,
  },
  {
    key: 'class_promotion',
    emoji: '🏆',
    title: 'Klassbyte',
    description: 'Avancera till ny tävlingsklass',
    check: (ctx) => {
      const byDog = new Map<string, string[]>();
      const sorted = [...ctx.competitions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      sorted.forEach(c => {
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

function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
}

interface AchievementsGridProps {
  dogs: Dog[];
  training: TrainingSession[];
  competitions: CompetitionResult[];
  compact?: boolean;
}

export default function AchievementsGrid({ dogs, training, competitions, compact = false }: AchievementsGridProps) {
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map());
  const [checked, setChecked] = useState(false);

  const fetchUnlocked = useCallback(async () => {
    const { data } = await supabase.from('achievements').select('achievement_key, unlocked_at');
    const map = new Map<string, string>();
    (data || []).forEach((r: UnlockedRow) => map.set(r.achievement_key, r.unlocked_at));
    setUnlocked(map);
    return map;
  }, []);

  useEffect(() => { fetchUnlocked(); }, [fetchUnlocked]);

  // Check and unlock new achievements
  useEffect(() => {
    if (checked) return;
    if (training.length === 0 && competitions.length === 0) return;

    const checkAchievements = async () => {
      const current = await fetchUnlocked();
      const ctx: AchievementContext = { training, competitions, dogs };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let newlyUnlocked = 0;
      for (const def of ACHIEVEMENT_DEFS) {
        if (current.has(def.key)) continue;
        if (def.check(ctx)) {
          await supabase.from('achievements').insert({
            user_id: user.id,
            achievement_key: def.key,
          });
          newlyUnlocked++;
          toast.success(`${def.emoji} Badge upplåst: ${def.title}!`);
        }
      }

      if (newlyUnlocked > 0) {
        fireConfetti();
        await fetchUnlocked();
      }
      setChecked(true);
    };

    checkAchievements();
  }, [training, competitions, dogs, checked, fetchUnlocked]);

  const total = ACHIEVEMENT_DEFS.length;
  const unlockedCount = ACHIEVEMENT_DEFS.filter(d => unlocked.has(d.key)).length;

  if (compact) {
    return (
      <div className="bg-card rounded-xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-foreground text-sm">🏅 Badges</h3>
          <span className="text-xs text-muted-foreground">{unlockedCount} av {total} upplåsta</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ACHIEVEMENT_DEFS.map(def => {
            const isUnlocked = unlocked.has(def.key);
            return (
              <div
                key={def.key}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  isUnlocked ? 'bg-accent/20' : 'bg-muted opacity-40'
                }`}
                title={`${def.title}: ${def.description}`}
              >
                {isUnlocked ? def.emoji : <Lock size={14} className="text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-foreground flex items-center gap-2">
          🏅 Achievements
        </h2>
        <span className="text-sm text-muted-foreground">{unlockedCount}/{total} upplåsta</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENT_DEFS.map((def, i) => {
          const isUnlocked = unlocked.has(def.key);
          const unlockedAt = unlocked.get(def.key);
          return (
            <motion.div
              key={def.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-xl p-4 shadow-card text-center ${
                isUnlocked ? '' : 'opacity-50 grayscale'
              }`}
            >
              <div className={`w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl ${
                isUnlocked ? 'bg-accent/20' : 'bg-muted'
              }`}>
                {isUnlocked ? def.emoji : <Lock size={20} className="text-muted-foreground" />}
              </div>
              <h4 className="font-display font-semibold text-foreground text-sm">{def.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">{def.description}</p>
              {isUnlocked && unlockedAt && (
                <span className="text-[9px] text-success mt-1 block">
                  ✓ {new Date(unlockedAt).toLocaleDateString('sv-SE')}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
