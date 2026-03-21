import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dog, Dumbbell, Trophy, Heart, Timer, Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserDetailModalProps {
  userId: string | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserDetailModal({ userId, userName, open, onOpenChange }: UserDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      if (!userId) return null;
      const [dogs, training, competitions, health, stopwatch] = await Promise.all([
        supabase.from('dogs').select('id, name, breed, size_class, competition_level, gender, birthdate').eq('user_id', userId),
        supabase.from('training_sessions').select('id, date, type, duration_min, dog_energy').eq('user_id', userId).order('date', { ascending: false }).limit(200),
        supabase.from('competition_results').select('id, date, event_name, discipline, competition_level, passed, faults, time_sec').eq('user_id', userId).order('date', { ascending: false }).limit(200),
        supabase.from('health_logs').select('id, date, type, title').eq('user_id', userId).order('date', { ascending: false }).limit(100),
        supabase.from('stopwatch_results').select('id, date, time_ms, faults').eq('user_id', userId).order('date', { ascending: false }).limit(100),
      ]);

      const dogData = dogs.data || [];
      const trainingData = training.data || [];
      const compData = competitions.data || [];
      const healthData = health.data || [];
      const stopwatchData = stopwatch.data || [];

      const passedCount = compData.filter(c => c.passed).length;
      const totalMinutes = trainingData.reduce((s, t) => s + (t.duration_min || 0), 0);

      // Activity: last 30 days
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
      };
    },
    enabled: open && !!userId,
  });

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
