import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import type { Dog, TrainingSession } from '@/types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Star, Clock, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrainingPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    const [d, t] = await Promise.all([store.getDogs(), store.getTraining()]);
    setDogs(d);
    setSessions(t);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const getDog = (id: string) => dogs.find(d => d.id === id);

  if (loading) return <PageContainer title="Träning"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <PageContainer
      title="Träning"
      subtitle={`${sessions.length} träningspass`}
      action={dogs.length > 0 ? <AddTrainingDialog dogs={dogs} onAdded={refresh} /> : undefined}
    >
      {sessions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-2">Inga träningspass loggade ännu.</p>
          {dogs.length > 0 ? (
            <AddTrainingDialog dogs={dogs} onAdded={refresh} />
          ) : (
            <p className="text-sm">Lägg till en hund först!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => {
            const dog = getDog(s.dog_id);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-foreground text-sm">{s.type}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(s.date), 'd MMM', { locale: sv })}
                      </span>
                    </div>
                    {dog && <div className="text-xs text-muted-foreground">{dog.name}</div>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={12} /> {s.duration_min} min</span>
                      <span className="flex items-center gap-1"><RotateCcw size={12} /> {s.reps} rep</span>
                    </div>
                    {(s.notes_good || s.notes_improve) && (
                      <div className="mt-2 space-y-1 text-xs">
                        {s.notes_good && <p className="text-success">✓ {s.notes_good}</p>}
                        {s.notes_improve && <p className="text-accent">↑ {s.notes_improve}</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">🐕</span>
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} size={10} className={n <= s.dog_energy ? 'fill-accent text-accent' : 'text-muted'} />
                        ))}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">🧑</span>
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} size={10} className={n <= s.handler_energy ? 'fill-primary text-primary' : 'text-muted'} />
                        ))}
                      </div>
                    </div>
                    {s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.tags.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
