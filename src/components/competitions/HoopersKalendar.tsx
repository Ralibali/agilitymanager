import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, MapPin, ExternalLink, Calendar as CalendarIcon, Filter, Star, CheckCircle2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useCompetitionInterests, type InterestStatus } from '@/hooks/useCompetitionInterests';
import type { Dog } from '@/types';

interface HoopersCompetition {
  id: string;
  competition_id: string;
  competition_name: string;
  date: string | null;
  location: string;
  county: string;
  club_name: string;
  organizer: string;
  type: string;
  classes: string[];
  lopp_per_class: Record<string, number>;
  price_per_lopp: string;
  registration_opens: string | null;
  registration_closes: string | null;
  registration_status: string;
  contact_person?: string;
  contact_email?: string;
  judge: string;
  source_url: string;
  extra_info: string;
  fetched_at: string;
}

const HOOPERS_CLASS_FILTERS = [
  { key: 'Startklass', label: 'Startklass' },
  { key: 'Klass 1', label: 'Klass 1' },
  { key: 'Klass 2', label: 'Klass 2' },
  { key: 'Klass 3', label: 'Klass 3' },
];

const TYPE_FILTERS = [
  { key: 'Officiell', label: 'Officiella' },
  { key: 'Inofficiell', label: 'Inofficiella' },
];

const COUNTIES = [
  'Blekinge län', 'Dalarnas län', 'Gotlands län', 'Gävleborgs län', 'Hallands län',
  'Jämtlands län', 'Jönköpings län', 'Kalmar län', 'Kronobergs län', 'Norrbottens län',
  'Skåne län', 'Stockholms län', 'Södermanlands län', 'Uppsala län', 'Värmlands län',
  'Västerbottens län', 'Västernorrlands län', 'Västmanlands län', 'Västra Götalands län',
  'Örebro län', 'Östergötlands län',
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const days = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function regStatusColor(status: string): string {
  if (status === 'Öppen') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'Stängd') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
}

interface Props {
  dogs: Dog[];
  selectedDogId: string | null;
}

export function HoopersKalendar({ dogs, selectedDogId }: Props) {
  const { user } = useAuth();
  const { interests, setInterest, isGuest } = useCompetitionInterests();
  const [competitions, setCompetitions] = useState<HoopersCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classFilters, setClassFilters] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [countyFilter, setCountyFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cycleStatus = async (comp: HoopersCompetition, target: InterestStatus) => {
    const dog = selectedDog || dogs.find(d => d.sport === 'Hoopers' || d.sport === 'Båda');
    await setInterest(comp.id, target, { dogName: dog?.name || null, dogClass: dog?.hoopers_level || null });
  };

  // Auto-filter based on selected dog's hoopers level
  const selectedDog = useMemo(() => dogs.find(d => d.id === selectedDogId), [dogs, selectedDogId]);

  useEffect(() => {
    if (selectedDog && selectedDog.sport === 'Hoopers') {
      const level = selectedDog.hoopers_level;
      setClassFilters(new Set([level]));
    } else {
      setClassFilters(new Set());
    }
  }, [selectedDog]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Inloggade kan läsa fulla tabellen (med kontaktuppgifter), gäster läser publik vy
    const query = user
      ? supabase.from('hoopers_competitions').select('*')
      : supabase.from('hoopers_competitions_public').select('*');

    const { data, error } = await query
      .gte('date', today)
      .order('date', { ascending: true });

    if (data) {
      setCompetitions(data as unknown as HoopersCompetition[]);
    }

    if (error) {
      console.error('Error fetching hoopers competitions:', error);
    }

    // If no data and inloggad, trigger a scrape
    if ((!data || data.length === 0) && user) {
      await handleRefresh(true);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async (silent = false) => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-hoopers-competitions', {
        method: 'POST',
      });
      if (error) throw error;
      if (!silent) {
        toast.success(`Uppdaterade ${data?.count || 0} hoopers-tävlingar`);
      }
      await fetchData();
    } catch (err) {
      console.error('Refresh error:', err);
      if (!silent) {
        toast.error('Kunde inte uppdatera tävlingar');
      }
    } finally {
      setRefreshing(false);
    }
  };


  const filtered = useMemo(() => {
    return competitions.filter(comp => {
      // Class filter
      if (classFilters.size > 0) {
        const hasMatchingClass = comp.classes.some(c => classFilters.has(c));
        if (!hasMatchingClass) return false;
      }
      // Type filter
      if (typeFilter && comp.type !== typeFilter) return false;
      // County filter
      if (countyFilter && comp.county !== countyFilter) return false;
      return true;
    });
  }, [competitions, classFilters, typeFilter, countyFilter]);

  const toggleClassFilter = (key: string) => {
    setClassFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1 text-xs"
          >
            <Filter size={13} /> Filter
            {(classFilters.size > 0 || typeFilter || countyFilter) && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{classFilters.size + (typeFilter ? 1 : 0) + (countyFilter ? 1 : 0)}</Badge>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">{filtered.length} tävlingar</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => handleRefresh()} disabled={refreshing} className="gap-1 text-xs">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Uppdatera
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card border rounded-xl p-3 mb-3 space-y-2">
          {/* Class filters */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Klass</div>
            <div className="flex flex-wrap gap-1.5">
              {HOOPERS_CLASS_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => toggleClassFilter(f.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    classFilters.has(f.key)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filters */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Typ</div>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(typeFilter === f.key ? null : f.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* County filter */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Län</div>
            <select
              value={countyFilter || ''}
              onChange={e => setCountyFilter(e.target.value || null)}
              className="w-full text-xs bg-secondary border-none rounded-lg px-2 py-1.5"
            >
              <option value="">Alla län</option>
              {COUNTIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(classFilters.size > 0 || typeFilter || countyFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-full"
              onClick={() => { setClassFilters(new Set()); setTypeFilter(null); setCountyFilter(null); }}
            >
              Rensa filter
            </Button>
          )}
        </div>
      )}

      {/* Selected dog info */}
      {selectedDog && selectedDog.sport === 'Hoopers' && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3 text-xs text-primary">
          🐕 Visar tävlingar för <strong>{selectedDog.name}</strong> — {selectedDog.hoopers_level}, {selectedDog.hoopers_size}
        </div>
      )}

      {/* Competition list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Inga kommande hoopers-tävlingar hittades</p>
          <p className="text-xs mt-1">Prova att ändra filter eller uppdatera</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(comp => (
            <div
              key={comp.id}
              className="bg-card border rounded-xl overflow-hidden transition-shadow hover:shadow-md"
            >
              <button
                className="w-full text-left p-3"
                onClick={() => setExpanded(expanded === comp.id ? null : comp.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Date */}
                    <div className="text-[11px] font-medium text-primary mb-0.5">
                      {formatDate(comp.date)}
                    </div>

                    {/* Name */}
                    <div className="font-semibold text-sm truncate">
                      {comp.competition_name || 'Hooperstävling'}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin size={11} />
                      <span>{comp.location}{comp.county ? `, ${comp.county}` : ''}</span>
                    </div>

                    {/* Club */}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {comp.club_name}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {/* Type badge */}
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        comp.type === 'Officiell'
                          ? 'border-green-500/50 text-green-700 dark:text-green-400'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      }`}
                    >
                      {comp.type}
                    </Badge>

                    {/* Registration status */}
                    {comp.registration_status && (
                      <Badge className={`text-[9px] px-1.5 py-0 ${regStatusColor(comp.registration_status)}`}>
                        {comp.registration_status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Classes */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {comp.classes.map(cls => (
                    <Badge key={cls} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {cls}
                      {comp.lopp_per_class && comp.lopp_per_class[cls] ? ` (${comp.lopp_per_class[cls]} lopp)` : ''}
                    </Badge>
                  ))}
                </div>
              </button>

              {/* Interest action row — visas även för gäster (sparas i localStorage) */}
              {(() => {
                const status = interests[comp.id];
                const isPast = comp.date ? new Date(comp.date + 'T23:59:59') < new Date() : false;
                return (
                  <div className="flex items-center gap-2 px-3 pb-2.5 -mt-1 flex-wrap">
                    <button
                      onClick={() => cycleStatus(comp, 'interested')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                        status === 'interested'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Star size={13} className={status === 'interested' ? 'fill-amber-500 text-amber-500' : ''} />
                      {status === 'interested' ? 'Intresserad' : 'Intresse'}
                    </button>
                    <button
                      onClick={() => cycleStatus(comp, 'registered')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                        status === 'registered'
                          ? 'text-white'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                      style={status === 'registered' ? { background: '#1a6b3c' } : {}}
                    >
                      <CheckCircle2 size={13} className={status === 'registered' ? 'fill-white text-white' : ''} />
                      {status === 'registered' ? 'Anmäld ✓' : 'Anmäld'}
                    </button>
                    {(isPast || status === 'done') && (
                      <button
                        onClick={() => cycleStatus(comp, 'done')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                          status === 'done'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        }`}
                      >
                        <CheckCheck size={13} className={status === 'done' ? 'text-blue-600' : ''} />
                        {status === 'done' ? 'Klar' : 'Klar?'}
                      </button>
                    )}
                    {status && selectedDog && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        🐕 {selectedDog.name}
                      </span>
                    )}
                    {isGuest && status && (
                      <span className="w-full text-[10px] text-muted-foreground">
                        Sparad lokalt. <Link to="/auth" className="text-primary underline">Logga in</Link> för att synka.
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Expanded details */}
              {expanded === comp.id && (
                <div className="px-3 pb-3 pt-0 border-t space-y-1.5 text-xs text-muted-foreground">
                  {comp.organizer && comp.organizer !== comp.club_name && (
                    <div>Anordnare: {comp.organizer}</div>
                  )}
                  {comp.judge && <div>Domare: {comp.judge}</div>}
                  {comp.price_per_lopp && <div>Pris/lopp: {comp.price_per_lopp}</div>}
                  {comp.registration_opens && <div>Anmälan öppnar: {comp.registration_opens}</div>}
                  {comp.registration_closes && <div>Anmälan stänger: {comp.registration_closes}</div>}
                  {comp.contact_person && <div>Kontakt: {comp.contact_person}</div>}
                  {comp.contact_email && (
                    <div>E-post: <a href={`mailto:${comp.contact_email}`} className="text-primary underline">{comp.contact_email}</a></div>
                  )}
                  <div className="pt-1">
                    <a
                      href={comp.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink size={11} /> Visa på shoktavling.se
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attribution */}
      <div className="mt-4 text-center text-[10px] text-muted-foreground/60">
        Tävlingsdata från <a href="https://shoktavling.se" target="_blank" rel="noopener noreferrer" className="underline">shoktavling.se</a> — Svenska Hoopersklubben (SHoK)
      </div>
    </div>
  );
}
