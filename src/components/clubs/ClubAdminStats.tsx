import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Dumbbell, Users, TrendingUp, Crown, Dog, Clock, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface MemberStats {
  userId: string;
  displayName: string;
  dogCount: number;
  trainingThisMonth: number;
  trainingTotal: number;
  lastActive: string | null;
}

interface ClubAdminStatsProps {
  clubId: string;
  memberUserIds: string[];
  profiles: Record<string, string>;
  isAdmin: boolean;
}

export default function ClubAdminStats({ clubId, memberUserIds, profiles, isAdmin }: ClubAdminStatsProps) {
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (memberUserIds.length === 0) { setLoading(false); return; }

    const fetchStats = async () => {
      // Fetch dogs per member
      const { data: dogs } = await supabase
        .from('dogs')
        .select('user_id')
        .in('user_id', memberUserIds);

      // Fetch training sessions
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('user_id, date')
        .in('user_id', memberUserIds);

      const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];

      const stats: MemberStats[] = memberUserIds.map(uid => {
        const userDogs = (dogs || []).filter(d => d.user_id === uid);
        const userSessions = (sessions || []).filter(s => s.user_id === uid);
        const thisMonth = userSessions.filter(s => s.date >= monthStart);
        const sorted = [...userSessions].sort((a, b) => b.date.localeCompare(a.date));

        return {
          userId: uid,
          displayName: profiles[uid] || 'Anonym',
          dogCount: userDogs.length,
          trainingThisMonth: thisMonth.length,
          trainingTotal: userSessions.length,
          lastActive: sorted[0]?.date || null,
        };
      });

      setMemberStats(stats.sort((a, b) => b.trainingThisMonth - a.trainingThisMonth));
      setLoading(false);
    };

    fetchStats();
  }, [memberUserIds, profiles]);

  const totalSessionsThisMonth = useMemo(() =>
    memberStats.reduce((s, m) => s + m.trainingThisMonth, 0), [memberStats]);

  const totalSessionsAllTime = useMemo(() =>
    memberStats.reduce((s, m) => s + m.trainingTotal, 0), [memberStats]);

  const avgPerMember = useMemo(() =>
    memberStats.length > 0 ? (totalSessionsThisMonth / memberStats.length).toFixed(1) : '0', [memberStats, totalSessionsThisMonth]);

  const activeMembers = useMemo(() =>
    memberStats.filter(m => {
      if (!m.lastActive) return false;
      return new Date(m.lastActive) >= subDays(new Date(), 30);
    }).length, [memberStats]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Ange en e-postadress'); return; }
    try {
      await supabase.functions.invoke('club-notify', {
        body: {
          club_id: clubId,
          title: 'Du har blivit inbjuden!',
          message: `Du har blivit inbjuden att gå med i klubben. Gå till AgilityManager för att acceptera.`,
          recipient_email: inviteEmail.trim(),
        },
      });
      toast.success(`Inbjudan skickad till ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteOpen(false);
    } catch {
      toast.error('Kunde inte skicka inbjudan');
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Laddar statistik...</div>;

  const leaderboardData = memberStats.slice(0, 10).map(m => ({
    name: m.displayName.split(' ')[0] || '?',
    pass: m.trainingThisMonth,
  }));

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <Dumbbell size={16} className="text-primary mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{totalSessionsThisMonth}</div>
          <div className="text-[10px] text-muted-foreground">Pass denna mån</div>
        </div>
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <TrendingUp size={16} className="text-success mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{avgPerMember}</div>
          <div className="text-[10px] text-muted-foreground">Snitt/medlem</div>
        </div>
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <Users size={16} className="text-accent mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{activeMembers}/{memberStats.length}</div>
          <div className="text-[10px] text-muted-foreground">Aktiva (30d)</div>
        </div>
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <Trophy size={16} className="text-warning mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{totalSessionsAllTime}</div>
          <div className="text-[10px] text-muted-foreground">Totalt alla pass</div>
        </div>
      </div>

      {/* Invite by email (admin only) */}
      {isAdmin && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-1">
              <Mail size={14} /> Bjud in via e-post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Bjud in medlem</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="namn@exempel.se"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <Button onClick={handleInvite} className="w-full">Skicka inbjudan</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Leaderboard chart */}
      {leaderboardData.some(d => d.pass > 0) && (
        <div className="bg-card rounded-xl p-4 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
            <Crown size={16} className="text-accent" /> Topplista (denna månad)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={leaderboardData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="pass" name="Träningspass" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Member list with stats */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
          <Users size={16} /> Medlemsöversikt
        </h3>
        {memberStats.map((m, i) => (
          <motion.div
            key={m.userId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="bg-card rounded-xl p-3 shadow-card"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {i < 3 && <span className="text-xs">{['🥇', '🥈', '🥉'][i]}</span>}
                <span className="text-sm font-medium text-foreground">{m.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                  <Dog size={8} /> {m.dogCount}
                </Badge>
                {m.lastActive && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock size={9} /> {format(new Date(m.lastActive), 'd/M', { locale: sv })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={Math.min((m.trainingThisMonth / 20) * 100, 100)} className="h-1.5 flex-1" />
              <span className="text-[10px] font-semibold text-foreground w-12 text-right">{m.trainingThisMonth} pass</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
