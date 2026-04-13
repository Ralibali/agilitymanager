import { Helmet } from 'react-helmet-async';
import { CompetitionSkeleton } from '@/components/SkeletonScreens';
import { ResultsImporter } from '@/components/competitions/ResultsImporter';
import { MinaTavlingar } from '@/components/competitions/MinaTavlingar';
import { useState, useEffect, useMemo } from 'react';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { Dog, CompetitionResult, PlannedCompetition } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowRight, Download, FileText, ExternalLink, Trash2, Plus, X, Send, Loader2, RefreshCw, Medal, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { downloadPdf } from '@/lib/pdf';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import CompetitionResultsViewer from '@/components/competitions/CompetitionResultsViewer';
import { AgilityDataAttribution } from '@/components/competitions/AgilityDataAttribution';
import HistoricalResultsStats from '@/components/competitions/HistoricalResultsStats';
import ImportResultsFromUrl from '@/components/competitions/ImportResultsFromUrl';
import ClassPromotionTracker from '@/components/competitions/ClassPromotionTracker';
import HoopersPointsTracker from '@/components/competitions/HoopersPointsTracker';
import { CompetitionStatsCard } from '@/components/competitions/CompetitionStatsCard';
import { CleanRunTrendChart } from '@/components/competitions/CleanRunTrendChart';
import { PerformanceTrendChart } from '@/components/competitions/PerformanceTrendChart';
import { useAuth } from '@/contexts/AuthContext';

/** Strip HTML tags from API strings to prevent XSS / ugly rendering */
const stripHtml = (str: string | null | undefined): string =>
  (str ?? '').replace(/<[^>]*>/g, '').trim();

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
  const [allResults, setAllResults] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [sportFilter, setSportFilter] = useState<'Alla' | 'Agility' | 'Hoopers'>('Alla');
  const [dogFilter, setDogFilter] = useState<string | null>(null);
  const [disciplineFilter, setDisciplineFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'competitions' | 'results' | 'mine' | 'checklist'>('competitions');
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
    try { const saved = localStorage.getItem('custom-checklist'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');
  const [shareResult, setShareResult] = useState<CompetitionResult | null>(null);
  const { user } = useAuth();

  const uniqueDogs = useMemo(() => {
    const seen = new Set<string>();
    return dogs.filter((dog) => { if (seen.has(dog.id)) return false; seen.add(dog.id); return true; });
  }, [dogs]);
  const hasHoopersDog = useMemo(() => dogs.some(d => d.sport === 'Hoopers' || d.sport === 'Båda'), [dogs]);

  const refresh = async () => {
    const [d, r, p] = await Promise.all([store.getDogs(), store.getCompetitions(), store.getPlanned()]);
    setDogs(d);
    setAllResults(r);
    setResults(r.filter(res => res.sport !== 'Hoopers'));
    setHoopersResults(r.filter(res => res.sport === 'Hoopers'));
    setPlanned(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('hoopers_competitions')
        .select('id, competition_name, date, location, club_name, classes, source_url, type')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(20);
      if (data) setUpcomingHoopers(data);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: interests } = await supabase.from('competition_interests').select('id, competition_id, status, dog_name').eq('user_id', user.id);
      if (!interests?.length) return;
      const compIds = [...new Set(interests.map(i => i.competition_id))];
      const { data: comps } = await supabase.from('competitions').select('id, competition_name, date_start, location, source_url').in('id', compIds);
      if (!comps) return;
      const compMap = new Map(comps.map(c => [c.id, c]));
      setInterestedComps(
        interests.filter(i => compMap.has(i.competition_id)).map(i => ({ ...i, comp: compMap.get(i.competition_id)! }))
          .filter(i => i.comp.date_start && new Date(i.comp.date_start) >= new Date())
          .sort((a, b) => new Date(a.comp.date_start!).getTime() - new Date(b.comp.date_start!).getTime())
      );
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: friendships } = await supabase.from('friendships').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      if (!friendships?.length) return;
      const friendIds = friendships.map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id);
      const { data: profiles } = await supabase.from('profiles').select('display_name').in('user_id', friendIds);
      if (profiles) setFriendNames(profiles.map(p => p.display_name).filter(Boolean) as string[]);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('handler_first_name, handler_last_name').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        const first = (data as any).handler_first_name || '';
        const last = (data as any).handler_last_name || '';
        if (first || last) setHandlerName({ first, last });
      }
    });
  }, [user]);

  const fetchHistoricalResults = async (forceRefresh = false) => {
    if (!handlerName || !user || uniqueDogs.length === 0) return;
    setHistoricalFetched(true);
    setHistoricalLoading(true);
    setHistoricalError(null);
    setHistoricalResults([]);
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const upsertHistoricalResult = (nextResult: HistoricalDogResult) => {
      setHistoricalResults((prev) => {
        const next = prev.filter((item) => item.dog_id !== nextResult.dog_id);
        next.push(nextResult);
        return uniqueDogs.map((dog) => next.find((item) => item.dog_id === dog.id)).filter(Boolean) as HistoricalDogResult[];
      });
    };
    const fetchForDog = async (dog: Dog) => {
      if (!forceRefresh) {
        const { data: cached } = await supabase.from('cached_dog_results').select('*').eq('dog_id', dog.id).eq('user_id', user.id).maybeSingle();
        if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL_MS) {
          const result: HistoricalDogResult = { dog_name: cached.dog_name, reg_name: cached.reg_name, reg_nr: cached.reg_nr, breed: cached.breed, handler: cached.handler, results: cached.results as any[], searched_dog: dog.name, dog_id: dog.id };
          upsertHistoricalResult(result);
          return result;
        }
      }
      const { data, error } = await supabase.functions.invoke('search-handler-results', { body: { firstName: handlerName.first, lastName: handlerName.last, dogName: dog.name } });
      if (error || !data?.success || !data.data) return null;
      const result: HistoricalDogResult = { ...data.data, searched_dog: dog.name, dog_id: dog.id };
      upsertHistoricalResult(result);
      await supabase.from('cached_dog_results').upsert({ user_id: user.id, dog_id: dog.id, dog_name: result.dog_name, reg_name: result.reg_name, reg_nr: result.reg_nr, breed: result.breed, handler: result.handler, results: result.results as any, fetched_at: new Date().toISOString() }, { onConflict: 'user_id,dog_id' });
      return result;
    };
    Promise.allSettled(uniqueDogs.map(fetchForDog)).then(() => setHistoricalLoading(false));
  };

  useEffect(() => {
    if (!handlerName || !user || uniqueDogs.length === 0 || historicalFetched) return;
    fetchHistoricalResults();
  }, [handlerName, user, uniqueDogs, historicalFetched]);

  useEffect(() => {
    if (results.length === 0) return;
    (async () => {
      const eventNames = [...new Set(results.map(r => r.event_name))];
      const { data: comps } = await supabase.from('competitions').select('id, competition_name, part_key, date_start').or(eventNames.map(n => `competition_name.ilike.%${n.replace(/[%_]/g, '')}%`).join(','));
      if (!comps?.length) return;
      const urlMap: Record<string, string> = {};
      for (const r of results) {
        const match = comps.find(c => {
          const cName = stripHtml(c.competition_name).toLowerCase();
          const rName = r.event_name.toLowerCase().trim();
          return cName.includes(rName) || rName.includes(cName.split(' ')[0]);
        });
        if (match?.part_key) urlMap[r.id] = `https://agilitydata.se/taevlingar/lopplista/?id=${match.part_key}`;
      }
      setCompetitionUrlMap(urlMap);
    })();
  }, [results]);

  const getDog = (id: string) => dogs.find(d => d.id === id);
  const toggleCheck = (item: string) => {
    setCheckedItems(prev => { const next = new Set(prev); if (next.has(item)) next.delete(item); else next.add(item); return next; });
  };
  const handleDeletePlanned = async (id: string) => {
    await supabase.from('planned_competitions').delete().eq('id', id);
    toast.success('Raderad');
    refresh();
  };

  if (loading) return <CompetitionSkeleton />;

  const upcoming = planned.filter(p => new Date(p.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = planned.filter(p => new Date(p.date) < new Date());
  const sportFilteredResults = sportFilter === 'Hoopers' ? hoopersResults : sportFilter === 'Agility' ? results : allResults;
  const disciplineFiltered = disciplineFilter ? sportFilteredResults.filter(r => r.discipline === disciplineFilter) : sportFilteredResults;
  const filteredResults = dogFilter ? disciplineFiltered.filter(r => r.dog_id === dogFilter) : disciplineFiltered;

  const activeCompCount = upcoming.length + interestedComps.length;
  const currentYear = new Date().getFullYear();

  const tabs = [
    { id: 'competitions' as const, label: 'Tävlingar' },
    { id: 'results' as const, label: 'Resultat' },
    { id: 'mine' as const, label: 'Mina' },
    { id: 'checklist' as const, label: 'Checklista' },
  ];

  return (
    <>
      <Helmet>
        <title>Tävlingar & Resultat | AgilityManager</title>
        <meta name="description" content="Planera tävlingar, följ starter, importera resultat och se historik för agility och hoopers i samma vy." />
        <link rel="canonical" href="https://agilitymanager.se/competition" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        id="main-content"
        className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto"
      >
        {/* PAGE HEADER */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="font-display text-foreground" style={{ fontSize: 26, fontWeight: 400 }}>
              Tävlingar & Resultat
            </h1>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>
              Säsong {currentYear} · {activeCompCount} anmälning{activeCompCount !== 1 ? 'ar' : ''} aktiv{activeCompCount !== 1 ? 'a' : ''}
            </p>
          </div>
          {results.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
              <button
                onClick={() => {
                  const rows = results.map(r => {
                    const dog = getDog(r.dog_id);
                    return { Datum: r.date, Hund: dog?.name ?? '', Tävling: stripHtml(r.event_name), Arrangör: r.organizer, Gren: r.discipline, Klass: r.competition_level, Storlek: r.size_class, 'Tid (s)': r.time_sec, Fel: r.faults, 'Banlängd (m)': r.course_length_m ?? '', Placering: r.placement ?? '', Godkänd: r.passed ? 'Ja' : 'Nej', Diskad: r.disqualified ? 'Ja' : 'Nej', Noteringar: r.notes };
                  });
                  downloadCsv(rows, `tavlingsresultat-${format(new Date(), 'yyyy-MM-dd')}.csv`);
                }}
                className="px-2.5 py-1.5 text-xs font-medium bg-white border text-foreground flex items-center gap-1"
                style={{ borderRadius: 10, borderColor: 'rgba(0,0,0,0.12)' }}
              >
                <Download size={12} /> CSV
              </button>
              <button
                onClick={() => {
                  const headers = ['Datum', 'Hund', 'Tävling', 'Gren', 'Klass', 'Tid', 'Fel', 'Plac.', 'Godkänd', 'Noteringar'];
                  const pdfRows = results.map(r => {
                    const dog = getDog(r.dog_id);
                    return [r.date, dog?.name ?? '', stripHtml(r.event_name), r.discipline, r.competition_level, String(r.time_sec), String(r.faults), r.placement != null ? String(r.placement) : '-', r.passed ? 'Ja' : 'Nej', r.notes];
                  });
                  downloadPdf({ title: 'Tävlingsresultat', subtitle: `${results.length} starter – exporterad ${format(new Date(), 'yyyy-MM-dd')}`, headers, rows: pdfRows, filename: `tavlingsresultat-${format(new Date(), 'yyyy-MM-dd')}.pdf`, landscape: true });
                }}
                className="px-2.5 py-1.5 text-xs font-medium bg-white border text-foreground flex items-center gap-1"
                style={{ borderRadius: 10, borderColor: 'rgba(0,0,0,0.12)' }}
              >
                <FileText size={12} /> PDF
              </button>
            </div>
          )}
        </div>

        {/* Add competition button */}
        {dogs.length > 0 && (
          <div className="mb-4 mt-2">
            <AddCompetitionDialog dogs={dogs} onAdded={refresh} />
          </div>
        )}

        {/* SPORT FILTER CHIPS */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {(['Alla', 'Agility', 'Hoopers'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className="px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                borderRadius: 40,
                background: sportFilter === s ? '#111' : '#fff',
                color: sportFilter === s ? '#fff' : '#111',
                border: sportFilter === s ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)',
              }}
            >
              {s === 'Alla' ? '🏆 Alla' : s === 'Agility' ? '🏃 Agility' : '🐕 Hoopers'}
            </button>
          ))}
        </div>

        {/* TABS */}
        <div className="flex border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 pb-2.5 text-xs font-medium text-center transition-colors relative"
              style={{
                color: activeTab === tab.id ? '#1a6b3c' : '#999',
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="compTabUnderline"
                  className="absolute bottom-0 left-2 right-2"
                  style={{ height: 2, background: '#1a6b3c', borderRadius: 1 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* TAB: Tävlingar */}
        {activeTab === 'competitions' && (
          <div className="space-y-4">
            {/* Agida banner */}
            {sportFilter !== 'Hoopers' && (
              <a
                href="https://www.agida.se"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 transition-opacity hover:opacity-90"
                style={{
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #e8f4ed, #d4ecdf)',
                  border: '1px solid rgba(26,107,60,0.2)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-lg"
                  style={{ background: '#1a6b3c' }}
                >
                  📅
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">Hitta tävlingar på Agida</div>
                  <div className="text-xs" style={{ color: '#666' }}>Se kommande agilitytävlingar i hela Sverige</div>
                </div>
                <ArrowRight size={16} style={{ color: '#1a6b3c' }} />
              </a>
            )}

            {/* SHoK banner */}
            {sportFilter !== 'Agility' && (hasHoopersDog || sportFilter === 'Hoopers') && (
              <a
                href="https://shoktavling.se/?page=tavlingar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 transition-opacity hover:opacity-90"
                style={{
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #fdf0e8, #fce4d2)',
                  border: '1px solid rgba(200,93,30,0.2)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-lg"
                  style={{ background: '#c85d1e' }}
                >
                  🐕
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">Hitta tävlingar på SHoK</div>
                  <div className="text-xs" style={{ color: '#666' }}>Se kommande hoopers-tävlingar på shoktavling.se</div>
                </div>
                <ArrowRight size={16} style={{ color: '#c85d1e' }} />
              </a>
            )}

            {/* Upcoming agility competitions */}
            {sportFilter !== 'Hoopers' && (
              <>
                <h3 className="text-sm font-semibold text-foreground">Kommande tävlingar</h3>
                {upcoming.length === 0 && interestedComps.length === 0 ? (
                  <div
                    className="text-center py-8 px-4"
                    style={{ borderRadius: 16, border: '2px dashed rgba(0,0,0,0.1)' }}
                  >
                    <div className="text-3xl mb-2">🐾</div>
                    <div className="text-sm font-semibold text-foreground mb-1">Inga fler anmälningar</div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Kolla in Agida för att hitta nästa tävling att anmäla dig till!
                    </p>
                    <a
                      href="https://www.agida.se"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium inline-flex items-center gap-1"
                      style={{ color: '#1a6b3c' }}
                    >
                      Sök tävlingar på Agida <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((p, i) => {
                      const dog = getDog(p.dog_id);
                      const daysLeft = differenceInDays(new Date(p.date), new Date());
                      return (
                        <CompCard
                          key={p.id}
                          index={i}
                          color="#1a6b3c"
                          date={format(new Date(p.date), 'd MMMM yyyy', { locale: sv })}
                          daysLeft={daysLeft}
                          name={stripHtml(p.event_name)}
                          location={p.location}
                          status={p.status}
                          statusColor="#c85d1e"
                          dogName={dog?.name}
                          onDelete={() => handleDeletePlanned(p.id)}
                        />
                      );
                    })}

                    {interestedComps.map((ic, i) => {
                      const daysLeft = differenceInDays(new Date(ic.comp.date_start!), new Date());
                      const statusLabel = ic.status === 'registered' ? 'Anmäld' : 'Intresserad';
                      return (
                        <CompCard
                          key={ic.id}
                          index={upcoming.length + i}
                          color={ic.status === 'registered' ? '#1a6b3c' : '#c85d1e'}
                          date={format(new Date(ic.comp.date_start!), 'd MMMM yyyy', { locale: sv })}
                          daysLeft={daysLeft}
                          name={stripHtml(ic.comp.competition_name)}
                          location={stripHtml(ic.comp.location)}
                          status={statusLabel}
                          statusColor={ic.status === 'registered' ? '#1a6b3c' : '#c85d1e'}
                          dogName={ic.dog_name ?? undefined}
                          sourceUrl={ic.comp.source_url ?? undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Upcoming hoopers */}
            {sportFilter !== 'Agility' && (hasHoopersDog || sportFilter === 'Hoopers') && (
              <>
                <h3 className="text-sm font-semibold text-foreground mt-4">Kommande hoopers-tävlingar</h3>
                {upcomingHoopers.length === 0 ? (
                  <div
                    className="text-center py-8 px-4"
                    style={{ borderRadius: 16, border: '2px dashed rgba(0,0,0,0.1)' }}
                  >
                    <div className="text-3xl mb-2">🐾</div>
                    <div className="text-sm font-semibold text-foreground mb-1">Inga kommande hoopers-tävlingar</div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Kolla SHoK för att hitta nästa hoopers-tävling!
                    </p>
                    <a
                      href="https://shoktavling.se/?page=tavlingar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium inline-flex items-center gap-1"
                      style={{ color: '#c85d1e' }}
                    >
                      Sök tävlingar på SHoK <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingHoopers.map((comp, i) => {
                      const daysLeft = comp.date ? differenceInDays(new Date(comp.date), new Date()) : null;
                      return (
                        <CompCard
                          key={comp.id}
                          index={i}
                          color="#c85d1e"
                          date={comp.date ? format(new Date(comp.date), 'd MMMM yyyy', { locale: sv }) : ''}
                          daysLeft={daysLeft}
                          name={stripHtml(comp.competition_name) || 'Hoopers-tävling'}
                          location={stripHtml(comp.location)}
                          classes={comp.classes ?? undefined}
                          clubName={stripHtml(comp.club_name)}
                          type={comp.type ?? undefined}
                          sourceUrl={comp.source_url ?? undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Past planned */}
            {past.length > 0 && sportFilter !== 'Hoopers' && (
              <>
                <h3 className="text-sm font-semibold text-foreground mt-4">Tidigare planerade</h3>
                <div className="space-y-2">
                  {past.map(p => (
                    <div key={p.id} className="bg-white p-3 opacity-60 flex items-center justify-between"
                      style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
                      <div>
                        <div className="font-medium text-foreground text-sm">{stripHtml(p.event_name)}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(p.date), 'd MMM yyyy', { locale: sv })}</div>
                      </div>
                      <button onClick={() => handleDeletePlanned(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: Mina */}
        {activeTab === 'mine' && <MinaTavlingar />}

        {/* TAB: Resultat */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">Resultat ({filteredResults.length})</h3>
            </div>

            {/* Dog filter */}
            {dogs.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setDogFilter(null)} className="px-4 py-2 text-xs font-medium transition-all"
                  style={{ borderRadius: 40, background: !dogFilter ? '#111' : '#fff', color: !dogFilter ? '#fff' : '#111', border: !dogFilter ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)' }}>
                  Alla hundar
                </button>
                {dogs.map(dog => (
                  <button key={dog.id} onClick={() => setDogFilter(dogFilter === dog.id ? null : dog.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all"
                    style={{ borderRadius: 40, background: dogFilter === dog.id ? '#111' : '#fff', color: dogFilter === dog.id ? '#fff' : '#111', border: dogFilter === dog.id ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)' }}>
                    <DogAvatar dog={dog} size="xs" />{dog.name}
                  </button>
                ))}
              </div>
            )}

            {/* Discipline filter */}
            <div className="flex gap-2 flex-wrap">
              {[{ value: null, label: 'Alla grenar' }, { value: 'Agility', label: 'Agility' }, { value: 'Jumping', label: 'Hopp' }, { value: 'Nollklass', label: 'Nollklass' }].map(opt => (
                <button key={opt.label} onClick={() => setDisciplineFilter(disciplineFilter === opt.value ? null : opt.value)}
                  className="px-4 py-2 text-xs font-medium transition-all"
                  style={{ borderRadius: 40, background: disciplineFilter === opt.value ? '#111' : '#fff', color: disciplineFilter === opt.value ? '#fff' : '#111', border: disciplineFilter === opt.value ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)' }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <CompetitionStatsCard results={filteredResults} dogs={dogs} />
            <CleanRunTrendChart results={filteredResults} />
            <PerformanceTrendChart results={filteredResults} dogs={dogs} />

            <ResultsImporter dogs={dogs} onImported={() => refresh()} autoFetch />
            {sportFilter !== 'Hoopers' && <ClassPromotionTracker results={results} dogs={dogs} />}
            {sportFilter === 'Hoopers' && <HoopersPointsTracker dogs={dogs} />}

            {filteredResults.length === 0 ? (
              <div className="text-center py-8 px-4" style={{ borderRadius: 16, border: '2px dashed rgba(0,0,0,0.1)' }}>
                <div className="text-3xl mb-2">🐾</div>
                <div className="text-sm font-semibold text-foreground mb-1">Inga tävlingsresultat ännu</div>
                <p className="text-xs text-muted-foreground mb-3">Logga ditt första resultat för att börja spåra framsteg!</p>
                {dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : <p className="text-sm text-muted-foreground">Lägg till en hund först!</p>}
              </div>
            ) : (
              (() => {
                const byYear: Record<number, CompetitionResult[]> = {};
                for (const r of filteredResults) { const yr = new Date(r.date).getFullYear(); (byYear[yr] ||= []).push(r); }
                const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

                const getResultBadge = (r: CompetitionResult) => {
                  if (r.disqualified) return { label: 'Diskad', bg: '#fde8e8', color: '#dc2626' };
                  if (r.passed && r.faults === 0) return { label: 'Nollrunda', bg: '#e8f4ed', color: '#1a6b3c' };
                  if (r.faults > 0) return { label: `${r.faults} fel`, bg: '#fdf0e8', color: '#c85d1e' };
                  return { label: 'Godkänd', bg: '#e8f4ed', color: '#1a6b3c' };
                };

                return years.map(year => (
                  <div key={year}>
                    <h4 className="text-sm font-semibold text-foreground mb-2 mt-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium" style={{ borderRadius: 40, background: '#e8f4ed', color: '#1a6b3c' }}>{year}</span>
                      <span className="text-xs text-muted-foreground font-normal">({byYear[year].length} starter)</span>
                    </h4>
                    <div className="space-y-3">
                      {byYear[year].map((r, i) => {
                        const dog = getDog(r.dog_id);
                        const matchedUrl = competitionUrlMap[r.id];
                        const badge = getResultBadge(r);
                        return (
                          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            className="bg-white p-4"
                            style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
                            <div className="flex items-start gap-3">
                              {dog && <DogAvatar dog={dog} size="sm" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="font-semibold text-foreground text-sm truncate">{stripHtml(r.event_name)}</h3>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-[10px] font-semibold px-2 py-0.5" style={{ borderRadius: 10, background: badge.bg, color: badge.color }}>
                                      {badge.label}
                                    </span>
                                    <button onClick={() => setShareResult(r)} className="p-1 rounded-full hover:bg-secondary" title="Dela resultat">
                                      <Send size={14} className="text-muted-foreground" />
                                    </button>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(r.date), 'd MMM yyyy', { locale: sv })} · {r.discipline} · {r.size_class} · {r.competition_level}
                                  {r.lopp_number && ` · Lopp ${r.lopp_number}`}
                                </div>
                                {r.organizer && <div className="text-xs text-muted-foreground">{stripHtml(r.organizer)}</div>}
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                  {r.time_sec > 0 && <span className="text-foreground font-medium">{r.time_sec}s</span>}
                                  {r.hoopers_points != null && r.hoopers_points > 0 && <span className="font-medium" style={{ color: '#1a6b3c' }}>{r.hoopers_points}p</span>}
                                  {r.placement && <span className="flex items-center gap-0.5 font-medium" style={{ color: '#c85d1e' }}><Medal size={12} /> #{r.placement}</span>}
                                </div>
                                {r.notes && <p className="mt-1.5 text-xs text-muted-foreground">{r.notes}</p>}
                                {matchedUrl && (
                                  <div className="mt-3 pt-2 border-t border-border">
                                    <CompetitionResultsViewer url={matchedUrl} friendNames={friendNames} autoFetch />
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            )}

            {/* Historical results */}
            {handlerName && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">🔍 Historiska resultat — {handlerName.first} {handlerName.last}</h3>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={historicalLoading} onClick={() => fetchHistoricalResults(true)}>
                    <RefreshCw size={12} className={historicalLoading ? 'animate-spin' : ''} />
                    {historicalFetched ? 'Uppdatera' : 'Hämta resultat'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Sökta från agilitydata.se baserat på ditt förarnamn och dina hundar.</p>
                {historicalLoading && (
                  <div className="text-center py-4">
                    <Loader2 size={18} className="mx-auto mb-1 animate-spin" style={{ color: '#1a6b3c' }} />
                    <p className="text-xs text-muted-foreground">Söker resultat på agilitydata.se ({historicalResults.length}/{uniqueDogs.length} hundar klara)...</p>
                  </div>
                )}
                {historicalError && (
                  <div className="bg-destructive/10 border border-destructive/20 p-3 text-center" style={{ borderRadius: 16 }}>
                    <p className="text-xs text-muted-foreground">{historicalError}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => fetchHistoricalResults(true)}>Försök igen</Button>
                  </div>
                )}
                {!historicalLoading && !historicalError && historicalResults.length === 0 && historicalFetched && (
                  <p className="text-xs text-muted-foreground text-center py-3">Inga historiska resultat hittades. Kontrollera att ditt förarnamn stämmer i Inställningar.</p>
                )}
                {historicalResults.length > 0 && <HistoricalResultsStats historicalResults={historicalResults} getDog={getDog} />}
                <div className="mt-3">
                  <ImportResultsFromUrl dogs={uniqueDogs} userId={user!.id} onImported={(result) => { setHistoricalResults(prev => { const next = prev.filter(r => r.dog_id !== result.dog_id); next.push(result); return next; }); setHistoricalFetched(true); }} />
                </div>
                <div className="mt-2"><AgilityDataAttribution sourceUrl="https://agilitydata.se/resultat/soek-hund/" /></div>
              </div>
            )}

            {!handlerName && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">💡 Ange ditt förarnamn i Inställningar för att automatiskt hitta dina resultat från agilitydata.se</p>
                <ImportResultsFromUrl dogs={uniqueDogs} userId={user!.id} onImported={(result) => { setHistoricalResults(prev => { const next = prev.filter(r => r.dog_id !== result.dog_id); next.push(result); return next; }); setHistoricalFetched(true); }} />
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Hämta resultatlista från agilitydata.se</h3>
              <form onSubmit={e => { e.preventDefault(); const trimmed = externalResultUrl.trim(); if (!trimmed) return; if (!trimmed.includes('agilitydata.se')) { toast.error('Ange en länk från agilitydata.se'); return; } setActiveExternalUrl(trimmed); }} className="flex gap-2 mb-3">
                <Input value={externalResultUrl} onChange={e => setExternalResultUrl(e.target.value)} placeholder="Klistra in länk från agilitydata.se..." className="h-8 text-xs flex-1" />
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Hämta</Button>
              </form>
              {activeExternalUrl && <CompetitionResultsViewer url={activeExternalUrl} friendNames={friendNames} />}
              <AgilityDataAttribution sourceUrl={activeExternalUrl || 'https://agilitydata.se'} />
            </div>
          </div>
        )}

        {/* TAB: Checklist */}
        {activeTab === 'checklist' && (
          <div className="bg-white p-4" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <h3 className="font-semibold text-foreground mb-3">Checklista inför tävling</h3>
            <div className="space-y-2">
              {[...CHECKLIST_ITEMS, ...customItems].map(item => (
                <div key={item} className="flex items-center gap-2.5 w-full">
                  <button onClick={() => toggleCheck(item)} className="flex items-center gap-2.5 flex-1 text-left py-1">
                    {checkedItems.has(item)
                      ? <CheckSquare size={18} style={{ color: '#1a6b3c' }} className="flex-shrink-0" />
                      : <Square size={18} className="text-muted-foreground flex-shrink-0" />}
                    <span className={`text-sm ${checkedItems.has(item) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                  </button>
                  {customItems.includes(item) && (
                    <button onClick={() => { const updated = customItems.filter(ci => ci !== item); setCustomItems(updated); localStorage.setItem('custom-checklist', JSON.stringify(updated)); const next = new Set(checkedItems); next.delete(item); setCheckedItems(next); }} className="text-muted-foreground hover:text-destructive p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const trimmed = newItem.trim(); if (!trimmed) return; if ([...CHECKLIST_ITEMS, ...customItems].includes(trimmed)) { toast.error('Finns redan i listan'); return; } const updated = [...customItems, trimmed]; setCustomItems(updated); localStorage.setItem('custom-checklist', JSON.stringify(updated)); setNewItem(''); }} className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
              <Plus size={18} className="text-muted-foreground flex-shrink-0" />
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Lägg till egen punkt..." className="h-8 text-sm" />
            </form>
            <div className="mt-3 pt-3 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">{checkedItems.size}/{CHECKLIST_ITEMS.length + customItems.length} klart</span>
              {checkedItems.size > 0 && (
                <button onClick={() => setCheckedItems(new Set())} className="text-xs ml-3" style={{ color: '#1a6b3c' }}>Rensa alla</button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {shareResult && (
        <ShareToFriendDialog
          open={!!shareResult}
          onOpenChange={(open) => !open && setShareResult(null)}
          sharedType="result"
          sharedId={shareResult.id}
          sharedData={{
            event_name: stripHtml(shareResult.event_name),
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

/* Reusable competition card component */
function CompCard({
  index, color, date, daysLeft, name, location, status, statusColor,
  dogName, sourceUrl, onDelete, classes, clubName, type,
}: {
  index: number;
  color: string;
  date: string;
  daysLeft: number | null;
  name: string;
  location?: string;
  status?: string;
  statusColor?: string;
  dogName?: string;
  sourceUrl?: string;
  onDelete?: () => void;
  classes?: string[];
  clubName?: string;
  type?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white overflow-hidden"
      style={{
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Colored header strip */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: color }}>
        <span className="text-white text-xs font-medium">{date}</span>
        {daysLeft !== null && (
          <span
            className="text-xs font-medium px-2 py-0.5"
            style={{ borderRadius: 40, background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            {daysLeft} dagar kvar
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h4 className="font-semibold text-foreground text-sm mb-1">{name}</h4>
        {location && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            📍 {location}
          </div>
        )}
        {clubName && (
          <div className="text-xs text-muted-foreground mb-2">{clubName}</div>
        )}

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {status && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5"
              style={{ borderRadius: 10, background: statusColor === '#1a6b3c' ? '#e8f4ed' : '#fdf0e8', color: statusColor }}
            >
              {status}
            </span>
          )}
          {type && (
            <span
              className="text-[10px] font-medium px-2 py-0.5"
              style={{ borderRadius: 10, background: type === 'Officiell' ? '#e8f4ed' : '#f2f0ed', color: type === 'Officiell' ? '#1a6b3c' : '#666' }}
            >
              {type}
            </span>
          )}
          {classes && classes.map(c => (
            <span key={c} className="text-[10px] px-1.5 py-0.5 font-medium" style={{ borderRadius: 10, background: '#e8f4ed', color: '#1a6b3c' }}>
              {c}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {dogName && <span className="text-xs text-muted-foreground">🐾 {dogName}</span>}
          {!dogName && <span />}
          <div className="flex items-center gap-2">
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: '#1a6b3c' }}
              >
                Se detaljer <ArrowRight size={12} />
              </a>
            )}
            {onDelete && (
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
