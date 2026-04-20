import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CompetitionResult } from '@/types';

type ImportableDog = {
  id: string;
  name: string;
  sport: string;
  is_active_competition_dog: boolean;
  breed: string;
  size_class: string;
};

interface Props {
  dogs: ImportableDog[];
  onImported?: (results: CompetitionResult[]) => void;
  autoFetch?: boolean;
  compact?: boolean;
}

interface ImportStatus {
  dogId: string;
  dogName: string;
  sport: string;
  status: 'pending' | 'fetching' | 'done' | 'error' | 'cached';
  count: number;
  error?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function ResultsImporter({ dogs, onImported, autoFetch = false, compact = false }: Props) {
  const { user } = useAuth();
  const [handlerName, setHandlerName] = useState<{ first: string; last: string } | null>(null);
  const [statuses, setStatuses] = useState<ImportStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  // Fetch handler name
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('handler_first_name, handler_last_name')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const first = (data as any).handler_first_name || '';
          const last = (data as any).handler_last_name || '';
          if (first || last) setHandlerName({ first, last });
        }
      });
  }, [user]);

  const importableDogs = dogs.filter(d => d.is_active_competition_dog);

  const runImport = useCallback(async (forceRefresh = false) => {
    if (!user || !handlerName || importableDogs.length === 0) return;
    setImporting(true);

    const initialStatuses: ImportStatus[] = importableDogs.map(d => ({
      dogId: d.id,
      dogName: d.name,
      sport: d.sport,
      status: 'pending',
      count: 0,
    }));
    setStatuses(initialStatuses);

    const allNewResults: CompetitionResult[] = [];

    for (const dog of importableDogs) {
      setStatuses(prev => prev.map(s => s.dogId === dog.id ? { ...s, status: 'fetching' } : s));

      try {
        const isHoopers = dog.sport === 'Hoopers';
        const isBoth = dog.sport === 'Båda';

        // Check cache first
        if (!forceRefresh) {
          const { data: cached } = await supabase
            .from('cached_dog_results')
            .select('fetched_at, results')
            .eq('dog_id', dog.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL_MS) {
            const cachedResults = (cached.results as any[]) || [];
            setStatuses(prev => prev.map(s => s.dogId === dog.id
              ? { ...s, status: 'cached', count: cachedResults.length }
              : s
            ));
            continue;
          }
        }

        let importedCount = 0;
        let dogNotFoundOnAgilitydata = false;

        // Import agility results
        if (!isHoopers || isBoth) {
          try {
            const { data, error } = await supabase.functions.invoke('search-handler-results', {
              body: { firstName: handlerName.first, lastName: handlerName.last, dogName: dog.name },
            });

            if (!error && data?.success && data.data?.results) {
              const results = data.data.results as any[];
              // Edge function returnerar search_only=true när sökningen inte
              // hittade någon hund alls på agilitydata.se — då är det inte ett
              // "0 nya"-fall utan ett "finns inte registrerad där"-fall.
              if (data.data.search_only && results.length === 0) {
                dogNotFoundOnAgilitydata = true;
              }
              // Save to competition_results
              for (const r of results) {
                const existing = await supabase
                  .from('competition_results')
                  .select('id')
                  .eq('dog_id', dog.id)
                  .eq('user_id', user.id)
                  .eq('date', r.date)
                  .eq('event_name', r.competition || '')
                  .eq('discipline', r.discipline === 'Hopp' ? 'Jumping' : 'Agility')
                  .maybeSingle();

                if (!existing.data) {
                  const { data: inserted } = await supabase.from('competition_results').insert({
                    user_id: user.id,
                    dog_id: dog.id,
                    date: r.date,
                    event_name: r.competition || 'Tävling',
                    discipline: r.discipline === 'Hopp' ? 'Jumping' : 'Agility',
                    competition_level: r.class || 'K1',
                    size_class: r.size || dog.size_class,
                    faults: r.faults || 0,
                    time_sec: r.time_sec || 0,
                    passed: r.passed || false,
                    disqualified: r.disqualified || false,
                    placement: r.placement,
                    sport: 'Agility',
                    notes: `Importerad från agilitydata.se`,
                  }).select().single();
                  if (inserted) allNewResults.push(inserted as CompetitionResult);
                  importedCount++;
                }
              }

              // Cache results
              await supabase.from('cached_dog_results').upsert({
                user_id: user.id,
                dog_id: dog.id,
                dog_name: data.data.dog_name || dog.name,
                reg_name: data.data.reg_name || '',
                reg_nr: data.data.reg_nr || '',
                breed: data.data.breed || dog.breed,
                handler: `${handlerName.first} ${handlerName.last}`,
                results: results,
                fetched_at: new Date().toISOString(),
              }, { onConflict: 'user_id,dog_id' });
            }
          } catch (e) {
            console.error('Agility import error for', dog.name, e);
          }
        }

        // Import hoopers results
        if (isHoopers || isBoth) {
          try {
            const fullName = `${handlerName.first} ${handlerName.last}`.trim();
            const { data, error } = await supabase.functions.invoke('fetch-hoopers-results', {
              body: { search_handler: fullName, search_dog: dog.name },
            });

            if (!error && data?.success && data.found) {
              for (const compResult of data.found) {
                for (const match of compResult.matches) {
                  const existing = await supabase
                    .from('competition_results')
                    .select('id')
                    .eq('dog_id', dog.id)
                    .eq('user_id', user.id)
                    .eq('date', compResult.competition?.date || '')
                    .eq('event_name', compResult.competition?.name || '')
                    .eq('sport', 'Hoopers')
                    .eq('lopp_number', match.lopp || 1)
                    .maybeSingle();

                  if (!existing.data) {
                    const { data: inserted } = await supabase.from('competition_results').insert({
                      user_id: user.id,
                      dog_id: dog.id,
                      date: compResult.competition?.date || new Date().toISOString().split('T')[0],
                      event_name: compResult.competition?.name || 'Hooperstävling',
                      organizer: compResult.competition?.club || '',
                      discipline: 'Agility',
                      competition_level: match.klass || 'Nollklass',
                      size_class: match.size === 'Small' ? 'S' : 'L',
                      faults: match.faults || 0,
                      time_sec: match.time_sec || 0,
                      passed: !match.disqualified && match.points > 0,
                      disqualified: match.disqualified || false,
                      placement: match.placement,
                      hoopers_points: match.points || 0,
                      lopp_number: match.lopp || 1,
                      sport: 'Hoopers',
                      notes: `Importerad från shoktavling.se`,
                    }).select().single();
                    if (inserted) allNewResults.push(inserted as CompetitionResult);
                    importedCount++;
                  }
                }
              }
            }
          } catch (e) {
            console.error('Hoopers import error for', dog.name, e);
          }
        }

        setStatuses(prev => prev.map(s => s.dogId === dog.id
          ? { ...s, status: 'done', count: importedCount }
          : s
        ));
      } catch (e: any) {
        setStatuses(prev => prev.map(s => s.dogId === dog.id
          ? { ...s, status: 'error', error: e.message || 'Okänt fel' }
          : s
        ));
      }
    }

    setImporting(false);
    if (allNewResults.length > 0) {
      toast.success(`Importerade ${allNewResults.length} nya resultat`);
      onImported?.(allNewResults);
    } else if (!forceRefresh) {
      // Results already cached
    }
  }, [user, handlerName, importableDogs, onImported]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !hasAutoFetched && handlerName && importableDogs.length > 0) {
      setHasAutoFetched(true);
      runImport(false);
    }
  }, [autoFetch, hasAutoFetched, handlerName, importableDogs.length, runImport]);

  if (!user) return null;

  // No handler name set
  if (!handlerName) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle size={16} className="text-amber-500" />
          <span>Ange ditt förnamn och efternamn i <a href="/installningar" className="text-primary underline">Inställningar</a> för att importera resultat automatiskt.</span>
        </div>
      </div>
    );
  }

  if (importableDogs.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="text-sm text-muted-foreground">
          Inga aktiva tävlingshundar. Markera hundar som aktiva tävlingshundar i <a href="/hundar" className="text-primary underline">Hundprofilen</a>.
        </div>
      </div>
    );
  }

  const completedCount = statuses.filter(s => s.status === 'done' || s.status === 'cached').length;
  const totalCount = statuses.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const totalImported = statuses.reduce((sum, s) => sum + s.count, 0);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => runImport(true)}
          disabled={importing}
        >
          {importing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {importing ? 'Importerar...' : 'Importera resultat'}
        </Button>
        {statuses.some(s => s.status === 'done') && (
          <Badge variant="secondary" className="text-[10px]">
            {totalImported} nya
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Download size={16} className="text-primary" />
            Importera tävlingsresultat
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Hämta resultat automatiskt från agilitydata.se och shoktavling.se
          </p>
        </div>
        <Button
          variant={importing ? 'secondary' : 'default'}
          size="sm"
          className="gap-1.5"
          onClick={() => runImport(true)}
          disabled={importing}
        >
          {importing ? (
            <><Loader2 size={14} className="animate-spin" /> Importerar...</>
          ) : (
            <><RefreshCw size={14} /> Hämta nu</>
          )}
        </Button>
      </div>

      {/* Progress */}
      {importing && (
        <div className="space-y-1.5">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">{completedCount}/{totalCount} hundar klara</p>
        </div>
      )}

      {/* Status per dog */}
      {statuses.length > 0 && (
        <div className="space-y-1">
          {statuses.map(s => (
            <div key={s.dogId} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground w-20 truncate">{s.dogName}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                s.sport === 'Hoopers' ? 'border-orange-500/50 text-orange-600 dark:text-orange-400'
                  : s.sport === 'Båda' ? 'border-purple-500/50 text-purple-600 dark:text-purple-400'
                  : 'border-blue-500/50 text-blue-600 dark:text-blue-400'
              }`}>
                {s.sport === 'Hoopers' ? '🐕' : s.sport === 'Båda' ? '🏃🐕' : '🏃'} {s.sport}
              </Badge>
              {s.status === 'pending' && <span className="text-muted-foreground">Väntar...</span>}
              {s.status === 'fetching' && <Loader2 size={12} className="animate-spin text-primary" />}
              {s.status === 'done' && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {s.count > 0 ? `${s.count} nya` : 'Inga nya'}
                </span>
              )}
              {s.status === 'cached' && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 size={12} /> Cachad ({s.count} res)
                </span>
              )}
              {s.status === 'error' && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle size={12} /> {s.error || 'Fel'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
