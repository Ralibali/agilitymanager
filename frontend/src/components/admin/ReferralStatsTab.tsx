import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Gift, Users, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ReferralStatsTab() {
  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['admin-referral-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-referral'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name');
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  const profileMap = new Map(profiles.map(p => [p.user_id, p.display_name || 'Okänd']));

  const totalReferrals = rewards.length;
  const converted = rewards.filter(r => r.referred_converted_at).length;
  const totalDaysGranted = rewards.reduce((sum, r) => sum + (r.days_granted || 0), 0);
  const conversionRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0;

  // Top referrers
  const referrerCounts = new Map<string, number>();
  for (const r of rewards) {
    referrerCounts.set(r.referrer_id, (referrerCounts.get(r.referrer_id) || 0) + 1);
  }
  const topReferrers = [...referrerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ name: profileMap.get(id) || id.slice(0, 8), referrals: count }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users size={20} className="mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Totalt referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp size={20} className="mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{converted}</p>
            <p className="text-xs text-muted-foreground">Konverterade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift size={20} className="mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalDaysGranted}</p>
            <p className="text-xs text-muted-foreground">Dagar utdelade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award size={20} className="mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Konverteringsgrad</p>
          </CardContent>
        </Card>
      </div>

      {topReferrers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-display font-semibold text-foreground mb-3">Bästa ambassadörer</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topReferrers}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Bar dataKey="referrals" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Referrals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
