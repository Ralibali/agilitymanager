import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import { Dog, CompetitionResult } from '@/types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CheckCircle2, XCircle, Medal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CompetitionPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const refresh = () => {
    setDogs(store.getDogs());
    setResults(store.getCompetitions().sort((a, b) => b.date.localeCompare(a.date)));
  };
  useEffect(refresh, []);

  const getDog = (id: string) => dogs.find(d => d.id === id);

  return (
    <PageContainer
      title="Tävling"
      subtitle={`${results.length} resultat`}
      action={dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : undefined}
    >
      {results.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-2">Inga tävlingsresultat ännu.</p>
          {dogs.length > 0 ? (
            <AddCompetitionDialog dogs={dogs} onAdded={refresh} />
          ) : (
            <p className="text-sm">Lägg till en hund först!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const dog = getDog(r.dogId);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-foreground text-sm">{r.eventName}</h3>
                      {r.passed ? (
                        <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-destructive flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.date), 'd MMM yyyy', { locale: sv })} · {r.discipline} · {r.sizeClass}
                    </div>
                    {r.organizer && <div className="text-xs text-muted-foreground">{r.organizer}</div>}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-foreground font-medium">{r.timeSec}s</span>
                      <span className={r.faults > 0 ? 'text-destructive' : 'text-success'}>
                        {r.faults} fel
                      </span>
                      {r.placement && (
                        <span className="flex items-center gap-0.5 text-accent font-medium">
                          <Medal size={12} /> #{r.placement}
                        </span>
                      )}
                    </div>
                    {r.notes && <p className="mt-1.5 text-xs text-muted-foreground">{r.notes}</p>}
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
