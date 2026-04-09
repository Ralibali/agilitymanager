import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Users, Loader2, Trash2, Shield, Dog, Dumbbell, Trophy, Heart, Timer,
  Search, Eye, CalendarDays, MessageCircle, BarChart3, Gift
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { PageContainer } from '@/components/PageContainer';
import UserDetailModal from '@/components/admin/UserDetailModal';
import SupportTicketsTab from '@/components/admin/SupportTicketsTab';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import ReferralStatsTab from '@/components/admin/ReferralStatsTab';

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Check admin
  const { data: isAdmin, isLoading: checkLoading } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profiles, dogs, training, competitions, health, stopwatch] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('dogs').select('id', { count: 'exact' }),
        supabase.from('training_sessions').select('id', { count: 'exact' }),
        supabase.from('competition_results').select('id', { count: 'exact' }),
        supabase.from('health_logs').select('id', { count: 'exact' }),
        supabase.from('stopwatch_results').select('id', { count: 'exact' }),
      ]);
      return {
        user_count: profiles.count || 0,
        dog_count: dogs.count || 0,
        training_count: training.count || 0,
        competition_count: competitions.count || 0,
        health_count: health.count || 0,
        stopwatch_count: stopwatch.count || 0,
      };
    },
    enabled: !!isAdmin,
  });

  // Users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!isAdmin,
  });

  // Delete user profile
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] });
      toast({ title: 'Användarprofil raderad' });
    },
    onError: (err: any) => toast({ title: 'Fel', description: err.message, variant: 'destructive' }),
  });

  if (checkLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Shield className="h-12 w-12 text-destructive/50" />
          <h2 className="font-display text-xl text-foreground">Åtkomst nekad</h2>
          <p className="text-sm text-muted-foreground">Du har inte behörighet att se denna sida.</p>
        </div>
      </PageContainer>
    );
  }

  const filteredUsers = userSearch
    ? users.filter((u: any) =>
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">Hantera användare och se statistik</p>
          </div>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Users, value: stats.user_count, label: 'Användare', color: 'text-primary', bg: 'bg-primary/10' },
              { icon: Dog, value: stats.dog_count, label: 'Hundar', color: 'text-accent', bg: 'bg-accent/10' },
              { icon: Dumbbell, value: stats.training_count, label: 'Träningar', color: 'text-primary', bg: 'bg-primary/10' },
              { icon: Trophy, value: stats.competition_count, label: 'Tävlingar', color: 'text-accent', bg: 'bg-accent/10' },
              { icon: Heart, value: stats.health_count, label: 'Hälsologgar', color: 'text-destructive', bg: 'bg-destructive/10' },
              { icon: Timer, value: stats.stopwatch_count, label: 'Tidtagningar', color: 'text-primary', bg: 'bg-primary/10' },
            ].map(({ icon: Icon, value, label, color, bg }, i) => (
              <Card key={i}>
                <CardContent className="p-3 text-center">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-1`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto rounded-xl">
            <TabsTrigger value="users" className="text-xs sm:text-sm gap-1 rounded-lg flex-1">
              <Users className="h-3.5 w-3.5" /> Användare
            </TabsTrigger>
            <TabsTrigger value="support" className="text-xs sm:text-sm gap-1 rounded-lg flex-1">
              <MessageCircle className="h-3.5 w-3.5" /> Support
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm gap-1 rounded-lg flex-1">
              <BarChart3 className="h-3.5 w-3.5" /> Analys
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs sm:text-sm gap-1 rounded-lg flex-1">
              <Gift className="h-3.5 w-3.5" /> Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök användare..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 rounded-xl h-10"
              />
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !filteredUsers.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Inga användare hittades.</p>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u: any) => (
                  <Card key={u.id}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(u.display_name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.display_name || 'Namnlös'}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-2.5 w-2.5" />
                              {new Date(u.created_at).toLocaleDateString('sv-SE')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary/60 hover:text-primary"
                            onClick={() => setSelectedUser(u)}
                            title="Visa detaljer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-display">Radera användare?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Detta raderar profilen för <strong>{u.display_name}</strong> permanent.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                  onClick={() => deleteUserMutation.mutate(u.user_id)}
                                >
                                  Radera
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="support">
            <SupportTicketsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="referrals">
            <ReferralStatsTab />
          </TabsContent>
        </Tabs>

        <UserDetailModal
          userId={selectedUser?.user_id || null}
          userName={selectedUser?.display_name || 'Namnlös'}
          open={!!selectedUser}
          onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
        />
      </div>
    </PageContainer>
  );
}
