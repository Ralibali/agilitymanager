import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultEntry {
  placement: number | null;
  handler_name: string;
  dog_name: string;
  time_sec: number | null;
  faults: number | null;
  size_class: string;
  passed: boolean;
  disqualified: boolean;
}

interface CompetitionResults {
  competition_name: string;
  date: string;
  total_starters: number;
  results: ResultEntry[];
  source_url: string;
  fetched_at: string;
}

interface Props {
  url: string;
  friendNames?: string[];
  autoFetch?: boolean;
}

export default function CompetitionResultsViewer({ url, friendNames = [], autoFetch = false }: Props) {
  const [data, setData] = useState<CompetitionResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('fetch-competition-results', {
        body: { url },
      });
      if (err) throw new Error(err.message);
      if (!res?.success) throw new Error(res?.error || 'Okänt fel');
      setData(res.data);
    } catch (e: any) {
      setError(e.message || 'Kunde inte hämta resultat');
    } finally {
      setLoading(false);
    }
  };

  const friendNamesLower = useMemo(() => friendNames.map(n => n.toLowerCase()), [friendNames]);

  const isFriend = (handlerName: string) => {
    const lower = handlerName.toLowerCase();
    return friendNamesLower.some(fn => lower.includes(fn) || fn.includes(lower));
  };

  const sizeClasses = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.results.map(r => r.size_class).filter(s => s && s !== '-'));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.results;
    if (sizeFilter !== 'all') {
      list = list.filter(r => r.size_class === sizeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.handler_name.toLowerCase().includes(q) ||
        r.dog_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, sizeFilter, search]);

  // Summary stats
  const summary = useMemo(() => {
    if (!data || data.results.length === 0) return null;
    const passed = data.results.filter(r => r.passed && !r.disqualified).length;
    const dq = data.results.filter(r => r.disqualified).length;
    const times = data.results.filter(r => r.time_sec).map(r => r.time_sec!);
    const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : null;
    return { passed, dq, avgTime, total: data.results.length };
  }, [data]);

  // Error state
  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
        <AlertTriangle size={24} className="mx-auto mb-2 text-destructive" />
        <p className="text-sm text-foreground font-medium mb-1">Kunde inte hämta resultat just nu.</p>
        <p className="text-xs text-muted-foreground mb-3">Försök igen om en stund eller visa direkt på agilitydata.se</p>
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchResults} className="gap-1">
            <RefreshCw size={14} /> Försök igen
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1">
              agilitydata.se <ExternalLink size={12} />
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // Not yet loaded
  if (!data && !loading) {
    return (
      <Button size="sm" variant="outline" onClick={fetchResults} className="gap-1.5 w-full">
        <Search size={14} /> Hämta resultat från agilitydata.se
      </Button>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="text-center py-6">
        <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Hämtar resultat...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-card rounded-xl p-3 shadow-card border border-border">
        <h4 className="font-semibold text-foreground text-sm mb-2">{data.competition_name}</h4>
        {summary && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{summary.total} starter</span>
            <span className="text-success">{summary.passed} godkända</span>
            {summary.dq > 0 && <span className="text-destructive">{summary.dq} diskade</span>}
            {summary.avgTime && <span>Snittid: {summary.avgTime}s</span>}
          </div>
        )}
        {/* Attribution */}
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Källa: agilitydata.se
          </span>
          <a href={data.source_url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
            Visa på agilitydata.se <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* Expand button */}
      {data.results.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>Dölj resultatlista <ChevronUp size={14} /></>
          ) : (
            <>Visa alla {data.total_starters} starter <ChevronDown size={14} /></>
          )}
        </Button>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Sök förare eller hund..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              {sizeClasses.length > 1 && (
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue placeholder="Alla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    {sizeClasses.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Results table */}
            <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Förare</th>
                      <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Hund</th>
                      <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Tid</th>
                      <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Fel</th>
                      <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">🏆</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const friend = isFriend(r.handler_name);
                      return (
                        <tr
                          key={i}
                          className={`border-b border-border/50 last:border-0 ${
                            friend ? 'bg-success/5' : i % 2 === 0 ? '' : 'bg-secondary/20'
                          }`}
                          style={friend ? { borderLeft: '3px solid hsl(var(--success))' } : undefined}
                        >
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {r.placement || '-'}
                          </td>
                          <td className="px-2 py-1.5 text-foreground font-medium">
                            <div className="flex items-center gap-1">
                              {r.handler_name}
                              {friend && (
                                <span className="text-[9px] bg-success/20 text-success px-1 py-0.5 rounded-full font-normal whitespace-nowrap">
                                  🐾 Kompis
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-foreground">{r.dog_name}</td>
                          <td className="px-2 py-1.5 text-right text-foreground">
                            {r.time_sec ? `${r.time_sec}s` : '-'}
                          </td>
                          <td className={`px-2 py-1.5 text-right ${r.faults && r.faults > 0 ? 'text-destructive' : 'text-success'}`}>
                            {r.faults ?? '-'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {r.disqualified ? '❌' : r.passed ? '✅' : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted-foreground">
                          Inga resultat matchar sökningen
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* No global search notice */}
            <div className="mt-3 text-center">
              <a
                href="https://agilitydata.se"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                🔍 Sök resultat på agilitydata.se <ExternalLink size={10} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
