import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { CompetitionResult } from '@/types';

interface Props {
  results: CompetitionResult[];
}

export function CleanRunTrendChart({ results }: Props) {
  const data = useMemo(() => {
    if (results.length < 2) return [];

    // Sort by date ascending
    const sorted = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by month
    const monthly: Record<string, { total: number; clean: number }> = {};
    for (const r of sorted) {
      const key = r.date.slice(0, 7); // YYYY-MM
      if (!monthly[key]) monthly[key] = { total: 0, clean: 0 };
      monthly[key].total++;
      if (r.passed && r.faults === 0 && !r.disqualified) monthly[key].clean++;
    }

    return Object.entries(monthly).map(([month, { total, clean }]) => ({
      month: month.slice(2).replace('-', '/'), // "24/03"
      pct: Math.round((clean / total) * 100),
      clean,
      total,
    }));
  }, [results]);

  if (data.length < 2) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-display font-semibold text-sm text-foreground mb-3">
        📈 Nollrundsandel över tid
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, _name: string, props: any) => [
              `${value}% (${props.payload.clean}/${props.payload.total})`,
              'Nollrundsandel',
            ]}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
