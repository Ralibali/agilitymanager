import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import type { CompetitionResult } from '@/types';
import type { Tables } from '@/integrations/supabase/types';
import { DogAvatar } from '@/components/DogAvatar';

type Dog = Tables<'dogs'>;

interface Props {
  results: CompetitionResult[];
  dogs: Dog[];
}

export function PerformanceTrendChart({ results, dogs }: Props) {
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = results;
    if (selectedDog) list = list.filter(r => r.dog_id === selectedDog);
    if (selectedLevel) list = list.filter(r => r.competition_level === selectedLevel);
    return list;
  }, [results, selectedDog, selectedLevel]);

  const data = useMemo(() => {
    if (filtered.length < 2) return [];

    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthly: Record<string, { total: number; clean: number; times: number[] }> = {};
    for (const r of sorted) {
      const key = r.date.slice(0, 7);
      if (!monthly[key]) monthly[key] = { total: 0, clean: 0, times: [] };
      monthly[key].total++;
      if (r.passed && r.faults === 0 && !r.disqualified) monthly[key].clean++;
      if (r.time_sec > 0 && !r.disqualified) monthly[key].times.push(Number(r.time_sec));
    }

    return Object.entries(monthly).map(([month, { total, clean, times }]) => ({
      month: month.slice(2).replace('-', '/'),
      cleanPct: Math.round((clean / total) * 100),
      clean,
      total,
      avgTime: times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null,
      bestTime: times.length > 0 ? Math.round(Math.min(...times) * 10) / 10 : null,
    }));
  }, [filtered]);

  if (results.length < 2) return null;

  const uniqueDogs = [...new Set(results.map(r => r.dog_id))];
  const showDogFilter = uniqueDogs.length > 1;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-display font-semibold text-sm text-foreground">
          📈 Prestationstrend
        </h3>
        {showDogFilter && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedDog(null)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                !selectedDog
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Alla
            </button>
            {dogs.filter(d => uniqueDogs.includes(d.id)).map(dog => (
              <button
                key={dog.id}
                onClick={() => setSelectedDog(selectedDog === dog.id ? null : dog.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  selectedDog === dog.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <DogAvatar dog={dog} size="xs" />
                {dog.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {data.length < 2 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Behöver minst 2 månaders data för att visa trend.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="pct"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              yAxisId="time"
              orientation="right"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}s`}
            />
            <ReferenceLine yAxisId="pct" y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'cleanPct') return [`${value}%`, 'Nollrundsandel'];
                if (name === 'avgTime') return [`${value}s`, 'Snittid'];
                if (name === 'bestTime') return [`${value}s`, 'Bästa tid'];
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={(value: string) => {
                if (value === 'cleanPct') return 'Nollrundsandel';
                if (value === 'avgTime') return 'Snittid';
                if (value === 'bestTime') return 'Bästa tid';
                return value;
              }}
            />
            <Bar
              yAxisId="pct"
              dataKey="cleanPct"
              fill="hsl(var(--success) / 0.3)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="time"
              type="monotone"
              dataKey="avgTime"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              yAxisId="time"
              type="monotone"
              dataKey="bestTime"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: 'hsl(var(--accent))' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
