import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dog, Dumbbell, Trophy, Heart, Timer, Clock, Crown, Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserDetailModalProps {
  userId: string | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREMIUM_OPTIONS = [
  { label: '7 dagar', days: 7 },
  { label: '30 dagar', days: 30 },
  { label: 'Livstid', days: 99999 },
] as const;

export default function UserDetailModal({ userId, userName, open, onOpenChange }: UserDetailModalProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      if (!userId) return null;
      const [dogs, training, competitions, health, stopwatch, profile] = await Promise.all([
        supabase.from('dogs').select('id, name, breed, size_class, competition_level, gender, birthdate').eq('user_id', userId),
        supabase.from('training_sessions').select('id, date, type, duration_min, dog_energy').eq('user_id', userId).order('date', { ascending: false }).limit(200),
        supabase.from('competition_results').select('id, date, event_name, discipline, competition_level, passed, faults, time_sec').eq('user_id', userId).order('date', { ascending: false }).limit(200),
        supabase.from('health_logs').select('id, date, type, title').eq('user_id', userId).order('date', { ascending: false }).limit(100),
        supabase.from('stopwatch_results').select('id, date, time_ms, faults').eq('user_id', userId).order('date', { ascending: false }).limit(100),
        supabase.from('profiles').select('premium_until').eq('user_id', userId).single(),
      ]);

      const dogData = dogs.data || [];
      const trainingData = training.data || [];
      const compData = competitions.data || [];
      const healthData = health.data || [];
      const stopwatchData = stopwatch.data || [];

      const passedCount = compData.filter(c => c.passed).length;
      const totalMinutes = trainingData.reduce((s, t) => s + (t.duration_min || 0), 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTraining = trainingData.filter(t => new Date(t.date) >= thirtyDaysAgo).length;
      const recentComps = compData.filter(c => new Date(c.date) >= thirtyDaysAgo).length;

      return {
        dogs: dogData,
        trainingCount: trainingData.length,
        totalMinutes,
        recentTraining,
        competitions: compData.length,
        passedCount,
        passRate: compData.length ? Math.round((passedCount / compData.length) * 100) : 0,
        recentComps,
        healthLogs: healthData.length,
        stopwatchRuns: stopwatchData.length,
        lastTraining: trainingData[0]?.date || null,
        lastCompetition: compData[0]?.date || null,
        premiumUntil: (profile.data as any)?.premium_until || null,
      };
    },
    enabled: open && !!userId,
  });

  const grantPremiumMutation = useMutation({
    mutationFn: async (days: number) => {
      if (!userId) throw new Error('No user');
      let premiumUntil: Date;

      if (days >= 99999) {
        // Lifetime = year 2099
        premiumUntil = new Date('2099-12-31T23:59:59Z');
      } else {
        // Start from current premium_until if it's in the future, otherwise from now
        const now = new Date();
        const currentEnd = data?.premiumUntil ? new Date(data.premiumUntil) : null;
        const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
        premiumUntil = new Date(startFrom.getTime() + days * 24 * 60 * 60 * 1000);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ premium_until: premiumUntil.toISOString() } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, days) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      const label = days >= 99999 ? 'livstids' : `${days} dagars`;
      toast.success(`Gav ${userName} ${label} premium!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removePremiumMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({ premium_until: null } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      toast.success(`Tog bort manuell premium för ${userName}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const premiumActive = data?.premiumUntil && new Date(data.premiumUntil) > new Date();
  const isLifetime = data?.premiumUntil && new Date(data.premiumUntil).getFullYear() >= 2099;
  const isMutating = grantPremiumMutation.isPending || removePremiumMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="font-display text-lg">{userName || 'Användare'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-5 pb-5 max-h-[70vh]">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !data ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Kunde inte ladda data.</p>
          ) : (
            <div className="space-y-3 py-2">
              {/* Premium control */}
              <Card className="border-amber-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">Premium (admin)</span>
                    {premiumActive && (
                      <Badge variant="outline" className="text-[9px] ml-auto border-amber-500/50 text-amber-600">
                        {isLifetime ? 'Livstid' : `t.o.m. ${new Date(data.premiumUntil!).toLocaleDateString('sv-SE')}`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PREMIUM_OPTIONS.map(opt => (
                      <Button
                        key={opt.days}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isMutating}
                        onClick={() => grantPremiumMutation.mutate(opt.days)}
                      >
                        {isMutating ? <Loader2 className="h-3 w-3 animate-spin" /> : `+ ${opt.label}`}
                      </Button>
                    ))}
                    {premiumActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-destructive border-destructive/30"
                        disabled={isMutating}
                        onClick={() => removePremiumMutation.mutate()}
                      >
                        Ta bort
                      </Button>
                    )}
                  </div>
                  {premiumActive && !isLifetime && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Dagar läggs till från nuvarande slutdatum.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Activity */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Aktivitet (senaste 30 dagar)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-primary/5 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-foreground">{data.recentTraining}</p>
                      <p className="text-muted-foreground">Träningspass</p>
                    </div>
                    <div className="bg-accent/5 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-foreground">{data.recentComps}</p>
                      <p className="text-muted-foreground">Tävlingar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dogs */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Dog className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Hundar</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">{data.dogs.length} st</Badge>
                  </div>
                  {data.dogs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {data.dogs.map(d => (
                        <Badge key={d.id} variant="secondary" className="text-[9px]">
                          {d.name} · {d.breed || '–'} · {d.size_class} · {d.competition_level}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Training */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Träning</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{data.trainingCount}</p>
                      <p>Totalt</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{data.totalMinutes} min</p>
                      <p>Träningstid</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{data.lastTraining || '–'}</p>
                      <p>Senaste</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Competitions */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-foreground">Tävlingar</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{data.competitions}</p>
                      <p>Totalt</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{data.passRate}%</p>
                      <p>Godkänt</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{data.lastCompetition || '–'}</p>
                      <p>Senaste</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other */}
              <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Heart className="h-3 w-3 text-destructive" />
                      </div>
                      <p className="font-semibold text-foreground">{data.healthLogs}</p>
                      <p className="text-muted-foreground">Hälsologgar</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Timer className="h-3 w-3 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground">{data.stopwatchRuns}</p>
                      <p className="text-muted-foreground">Tidtagningar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
