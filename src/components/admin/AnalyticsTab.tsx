import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Globe, Megaphone, ArrowRight, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SignupSource {
  id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
  created_at: string;
}

export default function AnalyticsTab() {
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['admin-signup-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signup_sources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SignupSource[];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Aggregate by source
  const bySource = new Map<string, number>();
  const byMedium = new Map<string, number>();
  const byCampaign = new Map<string, number>();

  for (const s of sources) {
    const src = s.utm_source || (s.referrer ? new URL(s.referrer).hostname : 'direkt');
    bySource.set(src, (bySource.get(src) || 0) + 1);
    const med = s.utm_medium || 'okänd';
    byMedium.set(med, (byMedium.get(med) || 0) + 1);
    if (s.utm_campaign) {
      byCampaign.set(s.utm_campaign, (byCampaign.get(s.utm_campaign) || 0) + 1);
    }
  }

  const sortedSources = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const sortedMediums = [...byMedium.entries()].sort((a, b) => b[1] - a[1]);
  const sortedCampaigns = [...byCampaign.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{sources.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spårade registreringar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{bySource.size}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unika källor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{byCampaign.size}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kampanjer</p>
          </CardContent>
        </Card>
      </div>

      {/* Sources breakdown */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Trafikkällor</h3>
          </div>
          {sortedSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen data ännu.</p>
          ) : (
            sortedSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate">{source}</span>
                <Badge variant="secondary" className="text-xs">{count}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Medium breakdown */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Medium</h3>
          </div>
          {sortedMediums.map(([medium, count]) => (
            <div key={medium} className="flex items-center justify-between">
              <span className="text-sm text-foreground truncate">{medium}</span>
              <Badge variant="secondary" className="text-xs">{count}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Campaigns */}
      {sortedCampaigns.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Kampanjer</h3>
            </div>
            {sortedCampaigns.map(([campaign, count]) => (
              <div key={campaign} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate">{campaign}</span>
                <Badge variant="secondary" className="text-xs">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent signups */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Senaste registreringar</h3>
          </div>
          {sources.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="shrink-0">{s.utm_source || 'direkt'}</Badge>
                {s.utm_campaign && <span className="text-muted-foreground truncate">{s.utm_campaign}</span>}
              </div>
              <span className="text-muted-foreground shrink-0">
                {new Date(s.created_at).toLocaleDateString('sv-SE')}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
