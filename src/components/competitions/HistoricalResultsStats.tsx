import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { DogAvatar } from '@/components/DogAvatar';
import type { Dog } from '@/types';

interface DogHistoricalData {
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
}

interface Props {
  historicalResults: DogHistoricalData[];
  getDog: (id: string) => Dog | undefined;
}

export default function HistoricalResultsStats({ historicalResults, getDog }: Props) {
  const [expandedDog, setExpandedDog] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {historicalResults.map((dogData, i) => {
        const matchedDog = getDog(dogData.dog_id);
        const r = dogData.results || [];
        const hasResults = r.length > 0;

        // Summary stats
        const totalStarts = r.length;
        const cleanRuns = r.filter(x => x.faults === 0 && x.passed && !x.disqualified).length;
        const passed = r.filter(x => x.passed && !x.disqualified).length;
        const dqs = r.filter(x => x.disqualified).length;
        const placements = r.filter(x => x.placement && x.placement <= 3);
        const passRate = totalStarts > 0 ? Math.round((passed / totalStarts) * 100) : 0;
        const cleanRate = totalStarts > 0 ? Math.round((cleanRuns / totalStarts) * 100) : 0;

        // Results by class for chart
        const byClass: Record<string, { starts: number; passed: number; clean: number }> = {};
        for (const x of r) {
          const cls = x.class || 'Okänd';
          if (!byClass[cls]) byClass[cls] = { starts: 0, passed: 0, clean: 0 };
          byClass[cls].starts++;
          if (x.passed && !x.disqualified) byClass[cls].passed++;
          if (x.faults === 0 && x.passed && !x.disqualified) byClass[cls].clean++;
        }
        const classChartData = Object.entries(byClass).map(([cls, d]) => ({
          name: cls,
          Starter: d.starts,
          Godkända: d.passed,
          Felfria: d.clean,
        }));

        // Monthly trend (last 12 entries by date)
        const sorted = [...r].sort((a, b) => a.date.localeCompare(b.date));
        const monthMap: Record<string, { total: number; passed: number }> = {};
        for (const x of sorted) {
          const month = x.date.substring(0, 7); // YYYY-MM
          if (!monthMap[month]) monthMap[month] = { total: 0, passed: 0 };
          monthMap[month].total++;
          if (x.passed && !x.disqualified) monthMap[month].passed++;
        }
        const trendData = Object.entries(monthMap).slice(-12).map(([m, d]) => ({
          name: m.substring(5), // MM
          Godkända: d.passed,
          Totalt: d.total,
        }));

        const isExpanded = expandedDog === i;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl shadow-card border border-border overflow-hidden"
          >
            {/* Dog header */}
            <button
              onClick={() => setExpandedDog(isExpanded ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
            >
              {matchedDog && <DogAvatar dog={matchedDog} size="sm" />}
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-semibold text-foreground text-sm">
                  {dogData.dog_name || dogData.searched_dog}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {dogData.breed && <span>{dogData.breed}</span>}
                  {dogData.reg_nr && <span>· {dogData.reg_nr}</span>}
                </div>
              </div>
              {hasResults && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">{totalStarts} starter</span>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              )}
            </button>

            {/* Stats cards - always visible if results exist */}
            {hasResults && (
              <div className="grid grid-cols-4 gap-2 px-4 pb-3">
                <StatCard icon={<Target size={14} />} label="Starter" value={totalStarts} color="text-primary" />
                <StatCard icon={<Trophy size={14} />} label="Godkänd" value={`${passRate}%`} color="text-success" />
                <StatCard icon={<TrendingUp size={14} />} label="Felfria" value={`${cleanRate}%`} color="text-accent" />
                <StatCard icon={<BarChart3 size={14} />} label="Topp 3" value={placements.length} color="text-warning" />
              </div>
            )}

            {/* Expanded details */}
            {isExpanded && hasResults && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-4 space-y-4"
              >
                {/* Class breakdown chart */}
                {classChartData.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Per klass</h5>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classChartData} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                          />
                          <Bar dataKey="Starter" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="Godkända" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="Felfria" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Monthly trend */}
                {trendData.length > 1 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Trend per månad</h5>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="Totalt" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="Godkända" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* DQ stats if any */}
                {dqs > 0 && (
                  <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2">
                    <span className="text-xs text-destructive font-medium">{dqs} diskningar</span>
                    <span className="text-[11px] text-muted-foreground">({Math.round((dqs / totalStarts) * 100)}% av alla starter)</span>
                  </div>
                )}

                {/* Result table */}
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Alla resultat</h5>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary/60">
                          <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Datum</th>
                          <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Arrangör</th>
                          <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Klass</th>
                          <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Fel</th>
                          <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">m/s</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Plac.</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Res.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((row, j) => (
                          <tr key={j} className={`border-t border-border/50 ${j % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                            <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{row.date}</td>
                            <td className="px-2 py-1.5 text-foreground max-w-[120px] truncate">{row.competition}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{row.class || '-'}</td>
                            <td className={`px-2 py-1.5 text-right ${row.faults && row.faults > 0 ? 'text-destructive font-medium' : 'text-success'}`}>
                              {row.faults ?? 0}
                            </td>
                            <td className="px-2 py-1.5 text-right text-foreground">{row.time_sec ?? '-'}</td>
                            <td className="px-2 py-1.5 text-center">
                              {row.placement ? (
                                <span className={row.placement <= 3 ? 'font-bold text-accent' : 'text-muted-foreground'}>
                                  {row.placement <= 3 ? '🏆 ' : ''}{row.placement}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {row.disqualified ? '❌' : row.passed ? '✅' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* No results */}
            {!hasResults && (
              <div className="px-4 pb-4">
                <p className="text-xs text-muted-foreground">
                  {dogData.search_only ? 'Hund hittad, men resultathistorik kunde inte laddas.' : 'Inga resultat hittades på agilitydata.se.'}
                </p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-2 text-center">
      <div className={`flex justify-center mb-0.5 ${color}`}>{icon}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
