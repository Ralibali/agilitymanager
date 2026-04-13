import { useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { CompetitionResult } from '@/types';

interface Props {
  results: CompetitionResult[];
}

export function CleanRunTrendChart({ results }: Props) {
  const data = useMemo(() => {
    if (results.length < 2) return [];

    const sorted = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      pct: Math.round((clean / total) * 100),
      clean,
      total,
      avgTime: times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null,
    }));
  }, [results]);

  if (data.length < 2) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-display font-semibold text-sm text-foreground mb-3">
        📈 Nollrundsandel & snittid över tid
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'pct') return [`${value}% (${props.payload.clean}/${props.payload.total})`, 'Nollrundsandel'];
              if (name === 'avgTime') return [`${value}s`, 'Snittid'];
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px' }}
            formatter={(value: string) => {
              if (value === 'pct') return 'Nollrundsandel';
              if (value === 'avgTime') return 'Snittid';
              return value;
            }}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="pct"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="time"
            type="monotone"
            dataKey="avgTime"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: 'hsl(var(--accent))' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
