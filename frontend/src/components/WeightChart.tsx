import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Dog } from '@/types';

type WeightEntry = {
  date: string;
  weight_kg: number | null;
  dog_id: string;
};

type Props = {
  logs: WeightEntry[];
  dogs: Dog[];
};

export function WeightChart({ logs, dogs }: Props) {
  const chartData = useMemo(() => {
    const weightLogs = logs
      .filter(l => l.weight_kg !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (weightLogs.length === 0) return { data: [], dogIds: [] };

    const dogIds = [...new Set(weightLogs.map(l => l.dog_id))];
    const dateMap = new Map<string, Record<string, number>>();

    for (const log of weightLogs) {
      const key = log.date;
      if (!dateMap.has(key)) dateMap.set(key, {});
      dateMap.get(key)![log.dog_id] = log.weight_kg!;
    }

    const data = Array.from(dateMap.entries()).map(([date, weights]) => ({
      date,
      label: format(new Date(date), 'd MMM yy', { locale: sv }),
      ...weights,
    }));

    return { data, dogIds };
  }, [logs]);

  if (chartData.data.length === 0) {
    return null;
  }

  const getDogName = (id: string) => dogs.find(d => d.id === id)?.name || 'Hund';
  const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(152, 60%, 42%)', 'hsl(270, 60%, 55%)'];

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground text-sm mb-3">Viktutveckling</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit=" kg" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [`${value} kg`, getDogName(name)]}
              labelFormatter={(label) => label}
            />
            {chartData.dogIds.map((dogId, i) => (
              <Line
                key={dogId}
                type="monotone"
                dataKey={dogId}
                name={dogId}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[i % colors.length] }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {chartData.dogIds.length > 1 && (
        <div className="flex gap-3 mt-2 justify-center">
          {chartData.dogIds.map((id, i) => (
            <div key={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
              {getDogName(id)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
