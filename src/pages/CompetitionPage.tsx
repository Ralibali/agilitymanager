import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { Dog, CompetitionResult, PlannedCompetition } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CheckCircle2, XCircle, Medal, ExternalLink, Calendar, CheckSquare, Square, Trash2, Plus, X, Download, FileText, Send, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { downloadPdf } from '@/lib/pdf';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import CompetitionResultsViewer from '@/components/competitions/CompetitionResultsViewer';
import { AgilityDataAttribution } from '@/components/competitions/AgilityDataAttribution';
import HistoricalResultsStats from '@/components/competitions/HistoricalResultsStats';
import ImportResultsFromUrl from '@/components/competitions/ImportResultsFromUrl';
import ClassPromotionTracker from '@/components/competitions/ClassPromotionTracker';
import HoopersPointsTracker from '@/components/competitions/HoopersPointsTracker';
import { useAuth } from '@/contexts/AuthContext';

type HistoricalDogResult = {
  dog_name: string;
  reg_name: string;
  reg_nr: string;
  breed: string;
  handler: string;
  results: {
    date: string;
    competition: string;
    discipline: string;
    class: string;
    size: string;
    placement: number | null;
    time_sec: number | null;
    faults: number | null;
    passed: boolean;
    disqualified: boolean;
  }[];
  searched_dog: string;
  dog_id: string;
  search_only?: boolean;
};

const CHECKLIST_ITEMS = [
  'Vaccinationsintyg',
  'Mätintyg',
  'Koppel & halsband',
  'Vatten & skål',
  'Godis / belöning',
  'Leksak / tuggisar',
  'Fällstol / filt',
  'Väderlämpliga kläder',
  'Ombyte & bekväma skor',
  'Laddad mobil',
];

export default function CompetitionPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [interestedComps, setInterestedComps] = useState<{ id: string; competition_id: string; status: string; dog_name: string | null; comp: { competition_name: string | null; date_start: string | null; location: string | null; source_url: string | null } }[]>([]);
  const [upcomingHoopers, setUpcomingHoopers] = useState<{ id: string; competition_name: string | null; date: string | null; location: string | null; club_name: string | null; classes: string[] | null; source_url: string | null; type: string | null }[]>([]);
  const [hoopersResults, setHoopersResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendNames, setFriendNames] = useState<string[]>([]);
  const [externalResultUrl, setExternalResultUrl] = useState('');
  const [activeExternalUrl, setActiveExternalUrl] = useState<string | null>(null);
  const [competitionUrlMap, setCompetitionUrlMap] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [handlerName, setHandlerName] = useState<{ first: string; last: string } | null>(null);
  const [historicalResults, setHistoricalResults] = useState<HistoricalDogResult[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [historicalFetched, setHistoricalFetched] = useState(false);
  const [customItems, setCustomItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom-checklist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');
  const [shareResult, setShareResult] = useState<CompetitionResult | null>(null);
  const { user } = useAuth();
  const uniqueDogs = useMemo(() => {
    const seen = new Set<string>();
    return dogs.filter((dog) => {
      if (seen.has(dog.id)) return false;
      seen.add(dog.id);
      return true;
    });
  }, [dogs]);
  const hasHoopersDog = useMemo(() => dogs.some(d => d.sport === 'Hoopers'), [dogs]);
  
  const refresh = async () => {
    const [d, r, p] = await Promise.all([
      store.getDogs(),
      store.getCompetitions(),
      store.getPlanned(),
    ]);
    setDogs(d);
    setResults(r);
    setPlanned(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  // Fetch competitions the user has shown interest in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: interests } = await supabase
        .from('competition_interests')
        .select('id, competition_id, status, dog_name')
        .eq('user_id', user.id);
      if (!interests?.length) return;

      const compIds = [...new Set(interests.map(i => i.competition_id))];
      const { data: comps } = await supabase
        .from('competitions')
        .select('id, competition_name, date_start, location, source_url')
        .in('id', compIds);

      if (!comps) return;
      const compMap = new Map(comps.map(c => [c.id, c]));

      setInterestedComps(
        interests
          .filter(i => compMap.has(i.competition_id))
          .map(i => ({
            ...i,
            comp: compMap.get(i.competition_id)!,
          }))
          .filter(i => i.comp.date_start && new Date(i.comp.date_start) >= new Date())
          .sort((a, b) => new Date(a.comp.date_start!).getTime() - new Date(b.comp.date_start!).getTime())
      );
    })();
  }, [user]);

  // Fetch friend display names for highlighting
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      if (!friendships?.length) return;
      
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.receiver_id : f.requester_id
      );
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('display_name')
        .in('user_id', friendIds);
      
      if (profiles) {
        setFriendNames(profiles.map(p => p.display_name).filter(Boolean) as string[]);
      }
    })();
  }, [user]);

  // Fetch handler name from profile
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
          if (first || last) {
            setHandlerName({ first, last });
          }
        }
      });
  }, [user]);

  // Fetch historical results - reusable function
  const fetchHistoricalResults = async (forceRefresh = false) => {
    if (!handlerName || !user || uniqueDogs.length === 0) return;
    setHistoricalFetched(true);
    setHistoricalLoading(true);
    setHistoricalError(null);
    setHistoricalResults([]);

    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    const upsertHistoricalResult = (nextResult: HistoricalDogResult) => {
      setHistoricalResults((prev) => {
        const next = prev.filter((item) => item.dog_id !== nextResult.dog_id);
        next.push(nextResult);
        return uniqueDogs
          .map((dog) => next.find((item) => item.dog_id === dog.id))
          .filter(Boolean) as HistoricalDogResult[];
      });
    };

    const fetchForDog = async (dog: Dog) => {
      // 1. Check cache (skip if force refresh)
      if (!forceRefresh) {
        const { data: cached } = await supabase
          .from('cached_dog_results')
          .select('*')
          .eq('dog_id', dog.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL_MS) {
          const result: HistoricalDogResult = {
            dog_name: cached.dog_name,
            reg_name: cached.reg_name,
            reg_nr: cached.reg_nr,
            breed: cached.breed,
            handler: cached.handler,
            results: cached.results as any[],
            searched_dog: dog.name,
            dog_id: dog.id,
          };
          upsertHistoricalResult(result);
          return result;
        }
      }

      // 2. Scrape from agilitydata.se
      const { data, error } = await supabase.functions.invoke('search-handler-results', {
        body: { firstName: handlerName.first, lastName: handlerName.last, dogName: dog.name },
      });

      if (error || !data?.success || !data.data) {
        console.error('Search error for', dog.name, error);
        return null;
      }

      const result: HistoricalDogResult = { ...data.data, searched_dog: dog.name, dog_id: dog.id };
      upsertHistoricalResult(result);

      // 3. Save to cache (upsert)
      await supabase.from('cached_dog_results').upsert(
        {
          user_id: user.id,
          dog_id: dog.id,
          dog_name: result.dog_name,
          reg_name: result.reg_name,
          reg_nr: result.reg_nr,
          breed: result.breed,
          handler: result.handler,
          results: result.results as any,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,dog_id' }
      );

      return result;
    };

    Promise.allSettled(uniqueDogs.map(fetchForDog)).then(() => {
      setHistoricalLoading(false);
    });
  };

  // Auto-search historical results on mount
  useEffect(() => {
    if (!handlerName || !user || uniqueDogs.length === 0 || historicalFetched) return;
    fetchHistoricalResults();
  }, [handlerName, user, uniqueDogs, historicalFetched]);

  // Match logged results against competitions table to find agilitydata URLs
  useEffect(() => {
    if (results.length === 0) return;
    (async () => {
      const eventNames = [...new Set(results.map(r => r.event_name))];
      const { data: comps } = await supabase
        .from('competitions')
        .select('id, competition_name, part_key, date_start')
        .or(eventNames.map(n => `competition_name.ilike.%${n.replace(/[%_]/g, '')}%`).join(','));
      
      if (!comps?.length) return;
      
      const urlMap: Record<string, string> = {};
      for (const r of results) {
        // Find best match by name similarity and date
        const match = comps.find(c => {
          const cName = (c.competition_name || '').toLowerCase().replace(/<[^>]*>/g, '').trim();
          const rName = r.event_name.toLowerCase().trim();
          return cName.includes(rName) || rName.includes(cName.split(' ')[0]);
        });
        if (match?.part_key) {
          urlMap[r.id] = `https://agilitydata.se/taevlingar/lopplista/?id=${match.part_key}`;
        }
      }
      setCompetitionUrlMap(urlMap);
    })();
  }, [results]);

  const getDog = (id: string) => dogs.find(d => d.id === id);

  const toggleCheck = (item: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  };

  const handleDeletePlanned = async (id: string) => {
    await supabase.from('planned_competitions').delete().eq('id', id);
    toast.success('Raderad');
    refresh();
  };

  if (loading) return <PageContainer title="Tävling"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  const upcoming = planned.filter(p => new Date(p.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = planned.filter(p => new Date(p.date) < new Date());

  return (
    <>
    <Helmet>
      <title>Tävlingsresultat Agility – Följ pinnar och klass | AgilityManager</title>
      <meta name="description" content="Logga dina agilitytävlingar, håll koll på pinnar per klass och följ din väg mot agilitychampionat. För klass 1, 2 och 3." />
      <link rel="canonical" href="https://agilitymanager.se/tavlingsresultat" />
    </Helmet>
    <PageContainer
      title="Tävling"
      action={
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const rows = results.map(r => {
                  const dog = getDog(r.dog_id);
                  return {
                    Datum: r.date,
                    Hund: dog?.name ?? '',
                    Tävling: r.event_name,
                    Arrangör: r.organizer,
                    Gren: r.discipline,
                    Klass: r.competition_level,
                    Storlek: r.size_class,
                    'Tid (s)': r.time_sec,
                    Fel: r.faults,
                    'Banlängd (m)': r.course_length_m ?? '',
                    Placering: r.placement ?? '',
                    Godkänd: r.passed ? 'Ja' : 'Nej',
                    Diskad: r.disqualified ? 'Ja' : 'Nej',
                    Noteringar: r.notes,
                  };
                });
                downloadCsv(rows, `tavlingsresultat-${format(new Date(), 'yyyy-MM-dd')}.csv`);
              }}
            >
              <Download size={14} /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const headers = ['Datum', 'Hund', 'Tävling', 'Gren', 'Klass', 'Tid', 'Fel', 'Plac.', 'Godkänd', 'Noteringar'];
                const pdfRows = results.map(r => {
                  const dog = getDog(r.dog_id);
                  return [
                    r.date, dog?.name ?? '', r.event_name,
                    r.discipline, r.competition_level,
                    String(r.time_sec), String(r.faults),
                    r.placement != null ? String(r.placement) : '-',
                    r.passed ? 'Ja' : 'Nej',
                    r.notes,
                  ];
                });
                downloadPdf({
                  title: 'Tävlingsresultat',
                  subtitle: `${results.length} starter – exporterad ${format(new Date(), 'yyyy-MM-dd')}`,
                  headers,
                  rows: pdfRows,
                  filename: `tavlingsresultat-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
                  landscape: true,
                });
              }}
            >
              <FileText size={14} /> PDF
            </Button>
            </>
          )}
          {dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : null}
        </div>
      }
    >
      <Tabs defaultValue="calendar" className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="flex-1 text-xs">Kalender</TabsTrigger>
          <TabsTrigger value="results" className="flex-1 text-xs">Resultat ({results.length})</TabsTrigger>
          {hasHoopersDog && <TabsTrigger value="hoopers" className="flex-1 text-xs">Hoopers</TabsTrigger>}
          <TabsTrigger value="checklist" className="flex-1 text-xs">Checklista</TabsTrigger>
        </TabsList>

        {/* Calendar tab */}
        <TabsContent value="calendar" className="mt-3">
          {/* Agida link */}
          <a
            href="https://www.agida.se"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 hover:bg-primary/10 transition-colors"
          >
            <Calendar size={18} className="text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Hitta tävlingar på Agida</div>
              <div className="text-xs text-muted-foreground">Se kommande agilitytävlingar i hela Sverige</div>
            </div>
            <ExternalLink size={14} className="text-muted-foreground" />
          </a>

          {/* Upcoming */}
          <h3 className="font-display font-semibold text-foreground text-sm mb-2">Kommande tävlingar</h3>
          {upcoming.length === 0 && interestedComps.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">Inga kommande tävlingar.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {upcoming.map((p, i) => {
                const dog = getDog(p.dog_id);
                const daysLeft = differenceInDays(new Date(p.date), new Date());
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-3 shadow-card border-l-4 border-accent">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {dog && <DogAvatar dog={dog} size="sm" />}
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{p.event_name}</h4>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(p.date), 'd MMMM yyyy', { locale: sv })}
                            {p.location && ` · ${p.location}`}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-primary">{daysLeft} dagar kvar</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{p.status}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeletePlanned(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Interested / registered competitions from calendar */}
              {interestedComps.map((ic, i) => {
                const daysLeft = differenceInDays(new Date(ic.comp.date_start!), new Date());
                const statusLabel = ic.status === 'registered' ? 'Anmäld' : 'Intresserad';
                const borderColor = ic.status === 'registered' ? 'border-primary' : 'border-orange-400';
                return (
                  <motion.div key={ic.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (upcoming.length + i) * 0.03 }}
                    className={`bg-card rounded-xl p-3 shadow-card border-l-4 ${borderColor}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{ic.comp.competition_name || 'Tävling'}</h4>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(ic.comp.date_start!), 'd MMMM yyyy', { locale: sv })}
                          {ic.comp.location && ` · ${ic.comp.location}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-primary">{daysLeft} dagar kvar</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${ic.status === 'registered' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-700'}`}>{statusLabel}</span>
                          {ic.dog_name && <span className="text-xs text-muted-foreground">🐾 {ic.dog_name}</span>}
                        </div>
                      </div>
                      {ic.comp.source_url && (
                        <a href={ic.comp.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <>
              <h3 className="font-display font-semibold text-foreground text-sm mb-2 mt-4">Tidigare planerade</h3>
              <div className="space-y-2">
                {past.map(p => (
                  <div key={p.id} className="bg-card rounded-xl p-3 shadow-card opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">{p.event_name}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(p.date), 'd MMM yyyy', { locale: sv })}</div>
                      </div>
                      <button onClick={() => handleDeletePlanned(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Results tab */}
        <TabsContent value="results" className="mt-3">
          <ClassPromotionTracker results={results} dogs={dogs} />
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Inga tävlingsresultat ännu.</p>
              {dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : <p className="text-sm">Lägg till en hund först!</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => {
                const dog = getDog(r.dog_id);
                const matchedUrl = competitionUrlMap[r.id];
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      {dog && <DogAvatar dog={dog} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-semibold text-foreground text-sm">{r.event_name}</h3>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setShareResult(r)} className="p-1 rounded-full hover:bg-secondary" title="Dela resultat">
                              <Send size={14} className="text-muted-foreground" />
                            </button>
                            {r.passed ? <CheckCircle2 size={18} className="text-success flex-shrink-0" /> : <XCircle size={18} className="text-destructive flex-shrink-0" />}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(r.date), 'd MMM yyyy', { locale: sv })} · {r.discipline} · {r.size_class} · {r.competition_level}
                        </div>
                        {r.organizer && <div className="text-xs text-muted-foreground">{r.organizer}</div>}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-foreground font-medium">{r.time_sec}s</span>
                          <span className={r.faults > 0 ? 'text-destructive' : 'text-success'}>{r.faults} fel</span>
                          {r.placement && <span className="flex items-center gap-0.5 text-accent font-medium"><Medal size={12} /> #{r.placement}</span>}
                        </div>
                        {r.notes && <p className="mt-1.5 text-xs text-muted-foreground">{r.notes}</p>}
                        
                        {/* Auto-matched results from agilitydata.se */}
                        {matchedUrl && (
                          <div className="mt-3 pt-2 border-t border-border">
                            <CompetitionResultsViewer
                              url={matchedUrl}
                              friendNames={friendNames}
                              autoFetch
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Historical results from agilitydata.se */}
          {handlerName && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-semibold text-foreground text-sm">
                  🔍 Historiska resultat — {handlerName.first} {handlerName.last}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={historicalLoading}
                  onClick={() => fetchHistoricalResults(true)}
                >
                  <RefreshCw size={12} className={historicalLoading ? 'animate-spin' : ''} />
                  {historicalFetched ? 'Uppdatera' : 'Hämta resultat'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sökta från agilitydata.se baserat på ditt förarnamn och dina hundar.
              </p>
              
              {historicalLoading && (
                <div className="text-center py-4">
                  <Loader2 size={18} className="mx-auto mb-1 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Söker resultat på agilitydata.se ({historicalResults.length}/{uniqueDogs.length} hundar klara)...
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Det kan ta upp till 30 sekunder</p>
                </div>
              )}

              {historicalError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{historicalError}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => fetchHistoricalResults(true)}>
                    Försök igen
                  </Button>
                </div>
              )}

              {!historicalLoading && !historicalError && historicalResults.length === 0 && historicalFetched && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Inga historiska resultat hittades. Kontrollera att ditt förarnamn stämmer i Inställningar.
                </p>
              )}

              {historicalResults.length > 0 && (
                <HistoricalResultsStats
                  historicalResults={historicalResults}
                  getDog={getDog}
                />
              )}

              {/* URL import */}
              <div className="mt-3">
                <ImportResultsFromUrl
                  dogs={uniqueDogs}
                  userId={user!.id}
                  onImported={(result) => {
                    setHistoricalResults(prev => {
                      const next = prev.filter(r => r.dog_id !== result.dog_id);
                      next.push(result);
                      return next;
                    });
                    setHistoricalFetched(true);
                  }}
                />
              </div>

              <div className="mt-2">
                <AgilityDataAttribution sourceUrl="https://agilitydata.se/resultat/soek-hund/" />
              </div>
            </div>
          )}

          {!handlerName && (
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-2">
                💡 Ange ditt förarnamn i Inställningar för att automatiskt hitta dina resultat från agilitydata.se
              </p>
            </div>
          )}

          {/* External results from agilitydata.se */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="font-display font-semibold text-foreground text-sm mb-3">
              Hämta resultatlista från agilitydata.se
            </h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                const trimmed = externalResultUrl.trim();
                if (!trimmed) return;
                if (!trimmed.includes('agilitydata.se')) {
                  toast.error('Ange en länk från agilitydata.se');
                  return;
                }
                setActiveExternalUrl(trimmed);
              }}
              className="flex gap-2 mb-3"
            >
              <Input
                value={externalResultUrl}
                onChange={e => setExternalResultUrl(e.target.value)}
                placeholder="Klistra in länk från agilitydata.se..."
                className="h-8 text-xs flex-1"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                Hämta
              </Button>
            </form>

            {activeExternalUrl && (
              <CompetitionResultsViewer
                url={activeExternalUrl}
                friendNames={friendNames}
              />
            )}

            <AgilityDataAttribution sourceUrl={activeExternalUrl || 'https://agilitydata.se'} />
          </div>
        </TabsContent>

        {/* Checklist tab */}
        {/* Hoopers tab */}
        {hasHoopersDog && (
          <TabsContent value="hoopers" className="mt-3">
            <HoopersPointsTracker dogs={dogs} />
          </TabsContent>
        )}

        <TabsContent value="checklist" className="mt-3">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <h3 className="font-display font-semibold text-foreground mb-3">Checklista inför tävling</h3>
            <div className="space-y-2">
              {[...CHECKLIST_ITEMS, ...customItems].map(item => (
                <div key={item} className="flex items-center gap-2.5 w-full">
                  <button
                    onClick={() => toggleCheck(item)}
                    className="flex items-center gap-2.5 flex-1 text-left py-1"
                  >
                    {checkedItems.has(item)
                      ? <CheckSquare size={18} className="text-primary flex-shrink-0" />
                      : <Square size={18} className="text-muted-foreground flex-shrink-0" />}
                    <span className={`text-sm ${checkedItems.has(item) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item}
                    </span>
                  </button>
                  {customItems.includes(item) && (
                    <button
                      onClick={() => {
                        const updated = customItems.filter(ci => ci !== item);
                        setCustomItems(updated);
                        localStorage.setItem('custom-checklist', JSON.stringify(updated));
                        const next = new Set(checkedItems);
                        next.delete(item);
                        setCheckedItems(next);
                      }}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom item */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newItem.trim();
                if (!trimmed) return;
                if ([...CHECKLIST_ITEMS, ...customItems].includes(trimmed)) {
                  toast.error('Finns redan i listan');
                  return;
                }
                const updated = [...customItems, trimmed];
                setCustomItems(updated);
                localStorage.setItem('custom-checklist', JSON.stringify(updated));
                setNewItem('');
              }}
              className="flex items-center gap-2 mt-4 pt-3 border-t border-border"
            >
              <Plus size={18} className="text-muted-foreground flex-shrink-0" />
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Lägg till egen punkt..."
                className="h-8 text-sm"
              />
            </form>

            <div className="mt-3 pt-3 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">
                {checkedItems.size}/{CHECKLIST_ITEMS.length + customItems.length} klart
              </span>
              {checkedItems.size > 0 && (
                <button onClick={() => setCheckedItems(new Set())} className="text-xs text-primary ml-3">
                  Rensa alla
                </button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>

    {shareResult && (
      <ShareToFriendDialog
        open={!!shareResult}
        onOpenChange={(open) => !open && setShareResult(null)}
        sharedType="result"
        sharedId={shareResult.id}
        sharedData={{
          event_name: shareResult.event_name,
          date: shareResult.date,
          discipline: shareResult.discipline,
          level: shareResult.competition_level,
          time: `${shareResult.time_sec}s`,
          faults: shareResult.faults,
          passed: shareResult.passed,
          placement: shareResult.placement,
        }}
      />
    )}
    </>
  );
}
