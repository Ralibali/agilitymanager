import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar as CalendarIcon, Filter, Star, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Dog } from '@/types';
import type { Competition } from '@/types/competitions';

const AGILITY_CLASS_FILTERS = [
  { key: 'Klass 1', label: 'Klass 1', match: ['Ag1', 'Hp1', 'Ho1', 'Klass 1', '1'] },
  { key: 'Klass 2', label: 'Klass 2', match: ['Ag2', 'Hp2', 'Ho2', 'Klass 2', '2'] },
  { key: 'Klass 3', label: 'Klass 3', match: ['Ag3', 'Hp3', 'Ho3', 'Klass 3', '3'] },
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

function regStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-muted text-muted-foreground';
  const s = status.toLowerCase();
  if (s.includes('öppen') || s === 'open') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (s.includes('stängd') || s.includes('closed')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
}

interface Props {
  competitions: Competition[];
  dogs: Dog[];
  selectedDogId: string | null;
}

export function AgilityKalendar({ competitions, dogs, selectedDogId }: Props) {
  const { user } = useAuth();
  const [classFilters, setClassFilters] = useState<Set<string>>(new Set());
  const [countyFilter, setCountyFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [interests, setInterests] = useState<Record<string, 'interested' | 'registered'>>({});
  const [loading, setLoading] = useState(true);

  const selectedDog = useMemo(() => dogs.find(d => d.id === selectedDogId), [dogs, selectedDogId]);

  // Load user interests
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from('competition_interests')
      .select('competition_id, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, 'interested' | 'registered'> = {};
          data.forEach((d: any) => { map[d.competition_id] = d.status; });
          setInterests(map);
        }
        setLoading(false);
      });
  }, [user]);

  const toggleInterest = async (comp: Competition, targetStatus: 'interested' | 'registered') => {
    if (!user) {
      toast.error('Logga in för att markera tävlingar');
      return;
    }
    const current = interests[comp.id];

    if (current === targetStatus) {
      await supabase.from('competition_interests').delete().eq('user_id', user.id).eq('competition_id', comp.id);
      setInterests(prev => { const next = { ...prev }; delete next[comp.id]; return next; });
      toast.success(targetStatus === 'interested' ? 'Intresse borttaget' : 'Anmälan borttagen');
      return;
    }

    const dog = selectedDog || dogs.find(d => d.sport === 'Agility' || d.sport === 'Båda');
    const dogName = dog?.name || null;
    const dogClass = dog?.competition_level || null;

    if (current) {
      await supabase.from('competition_interests').update({ status: targetStatus }).eq('user_id', user.id).eq('competition_id', comp.id);
    } else {
      await supabase.from('competition_interests').insert({
        user_id: user.id,
        competition_id: comp.id,
        status: targetStatus,
        dog_name: dogName,
        class: dogClass,
      });
    }
    setInterests(prev => ({ ...prev, [comp.id]: targetStatus }));
    toast.success(targetStatus === 'interested' ? '⭐ Markerad som intresserad' : '✅ Markerad som anmäld');
  };

  const filtered = useMemo(() => {
    return competitions.filter(comp => {
      const allClasses = [
        ...(comp.classes_agility ?? []),
        ...(comp.classes_hopp ?? []),
        ...(comp.classes_other ?? []),
      ];
      // Class filter
      if (classFilters.size > 0) {
        const matchSet = new Set<string>();
        AGILITY_CLASS_FILTERS.forEach(f => {
          if (classFilters.has(f.key)) f.match.forEach(m => matchSet.add(m.toLowerCase()));
        });
        const hasMatch = allClasses.some(c => matchSet.has(c.toLowerCase()));
        if (!hasMatch) return false;
      }
      // County filter (matches against location)
      if (countyFilter) {
        const location = (comp.location || '').toLowerCase();
        const target = countyFilter.toLowerCase();
        if (!location.includes(target)) return false;
      }
      return true;
    });
  }, [competitions, classFilters, countyFilter]);

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
            {(classFilters.size > 0 || countyFilter) && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                {classFilters.size + (countyFilter ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">{filtered.length} tävlingar</span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card border rounded-xl p-3 mb-3 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Klass</div>
            <div className="flex flex-wrap gap-1.5">
              {AGILITY_CLASS_FILTERS.map(f => (
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

          {(classFilters.size > 0 || countyFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-full"
              onClick={() => { setClassFilters(new Set()); setCountyFilter(null); }}
            >
              Rensa filter
            </Button>
          )}
        </div>
      )}

      {/* Selected dog info */}
      {selectedDog && (selectedDog.sport === 'Agility' || selectedDog.sport === 'Båda') && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3 text-xs text-primary">
          🐕 Visar tävlingar för <strong>{selectedDog.name}</strong> — {selectedDog.competition_level}, {selectedDog.size_class}
        </div>
      )}

      {/* Competition list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Inga kommande agility-tävlingar hittades</p>
          <p className="text-xs mt-1">Prova att ändra filter</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(comp => {
            const allClasses = [
              ...(comp.classes_agility ?? []),
              ...(comp.classes_hopp ?? []),
              ...(comp.classes_other ?? []),
            ];
            const isOfficial = !comp.status_code || comp.status_code === 'official' || comp.status_code === 'officiell';
            return (
              <div
                key={comp.id}
                className="bg-card border rounded-xl overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Date */}
                      <div className="text-[11px] font-medium text-primary mb-0.5">
                        {formatDate(comp.date_start)}
                      </div>

                      {/* Name */}
                      <div className="font-semibold text-sm truncate">
                        {comp.competition_name || comp.club_name || 'Tävling'}
                      </div>

                      {/* Location */}
                      {comp.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin size={11} />
                          <span>{comp.location}</span>
                        </div>
                      )}

                      {/* Club */}
                      {comp.club_name && comp.club_name !== comp.competition_name && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {comp.club_name}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Type badge */}
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          isOfficial
                            ? 'border-green-500/50 text-green-700 dark:text-green-400'
                            : 'border-muted-foreground/30 text-muted-foreground'
                        }`}
                      >
                        {isOfficial ? 'Officiell' : 'Inofficiell'}
                      </Badge>

                      {/* Registration status */}
                      {comp.status && (
                        <Badge className={`text-[9px] px-1.5 py-0 ${regStatusColor(comp.status)}`}>
                          {comp.status}
                        </Badge>
                      )}

                      {/* Source link */}
                      {comp.source_url && (
                        <a
                          href={comp.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-tertiary hover:text-text-primary"
                          aria-label="Öppna källa"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Classes */}
                  {allClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {allClasses.slice(0, 8).map((cls, i) => (
                        <Badge key={`${cls}-${i}`} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {cls}
                        </Badge>
                      ))}
                      {allClasses.length > 8 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{allClasses.length - 8}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Interest action row */}
                {user && (
                  <div className="flex items-center gap-2 px-3 pb-2.5 -mt-1">
                    <button
                      onClick={() => toggleInterest(comp, 'interested')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                        interests[comp.id] === 'interested'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Star size={13} className={interests[comp.id] === 'interested' ? 'fill-amber-500 text-amber-500' : ''} />
                      {interests[comp.id] === 'interested' ? 'Intresserad' : 'Intresse'}
                    </button>
                    <button
                      onClick={() => toggleInterest(comp, 'registered')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                        interests[comp.id] === 'registered'
                          ? 'text-white'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                      style={interests[comp.id] === 'registered' ? { background: '#1a6b3c' } : {}}
                    >
                      <CheckCircle2 size={13} className={interests[comp.id] === 'registered' ? 'fill-white text-white' : ''} />
                      {interests[comp.id] === 'registered' ? 'Anmäld ✓' : 'Anmäld'}
                    </button>
                    {interests[comp.id] && selectedDog && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        🐕 {selectedDog.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
