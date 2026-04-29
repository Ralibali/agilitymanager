import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DogAvatar } from '@/components/DogAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Dumbbell, TrendingUp, Target, BarChart3, Gauge, XCircle, CheckCircle, Award, Lock } from 'lucide-react';
import { format, startOfWeek, subWeeks, eachWeekOfInterval, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';

const DOG_COLORS = ['hsl(221, 79%, 48%)', 'hsl(16, 100%, 55%)', 'hsl(142, 60%, 40%)', 'hsl(280, 60%, 50%)', 'hsl(45, 90%, 50%)'];

const PIN_REQUIREMENTS: Record<string, { agility: number; hopp: number }> = {
  'K1': { agility: 3, hopp: 3 },
  'K2': { agility: 3, hopp: 3 },
  'K3': { agility: 10, hopp: 3 },
};

export default function FriendStatsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friendName, setFriendName] = useState<string>('');
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    if (!userId || !user) return;

    const load = async () => {
      setLoading(true);

      // Get friend's profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, show_results_to_friends, show_competitions_to_friends')
        .eq('user_id', userId)
        .single();

      setFriendName(profile?.display_name || 'Kompis');

      // Load friend's dogs (RLS will filter based on friendship)
      const { data: dogsData } = await supabase
        .from('dogs')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (!dogsData || dogsData.length === 0) {
        setNoAccess(true);
        setLoading(false);
        return;
      }

      setDogs(dogsData);

      // Load friend's training
      const { data: trainingData } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      setTraining(trainingData || []);

      // Load friend's competition results (RLS checks show_results_to_friends)
      const { data: compData } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      setCompetitions(compData || []);
      setLoading(false);
    };

    load();
  }, [userId, user]);

  // Overview stats
  const overviewStats = useMemo(() => {
    const now = new Date();
    const thisMonth = training.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalMin = training.reduce((s, t) => s + t.duration_min, 0);
    const passRate = competitions.length > 0
      ? Math.round(competitions.filter(c => c.passed).length / competitions.length * 100) : 0;
    return { monthTrainings: thisMonth.length, passRate, totalHours: Math.round(totalMin / 60) };
  }, [training, competitions]);

  // Training frequency
  const freqData = useMemo(() => {
    if (training.length === 0) return [];
    const now = new Date();
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11);
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });
    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return {
        week: format(weekStart, 'd/M', { locale: sv }),
        total: training.filter(t => {
          const d = parseISO(t.date);
          return d >= weekStart && d < weekEnd;
        }).length,
      };
    });
  }, [training]);

  // Competition stats
  const compStats = useMemo(() => {
    if (competitions.length === 0) return null;
    const total = competitions.length;
    const disqualified = competitions.filter(c => c.disqualified).length;
    const approved = total - disqualified;
    const passed = competitions.filter(c => c.passed).length;
    const cleanRuns = competitions.filter(c => c.faults === 0 && !c.disqualified).length;
    const avgFaults = competitions.reduce((s, c) => s + c.faults, 0) / total;
    const withSpeed = competitions.filter(c => c.course_length_m && c.course_length_m > 0 && Number(c.time_sec) > 0);
    const avgSpeed = withSpeed.length > 0
      ? withSpeed.reduce((s, c) => s + (c.course_length_m! / Number(c.time_sec)), 0) / withSpeed.length : null;
    return [
      { icon: <CheckCircle size={16} className="text-green-500" />, label: 'Godkända', value: `${Math.round(approved / total * 100)}%`, sub: `${approved}/${total}` },
      { icon: <Target size={16} className="text-primary" />, label: 'Nollade', value: `${Math.round(cleanRuns / total * 100)}%`, sub: `${cleanRuns}/${total}` },
      { icon: <Trophy size={16} className="text-accent" />, label: 'Pinnar', value: `${passed}`, sub: `${Math.round(passed / total * 100)}%` },
      { icon: <XCircle size={16} className="text-destructive" />, label: 'Disk', value: `${disqualified}`, sub: `${Math.round(disqualified / total * 100)}%` },
      { icon: <BarChart3 size={16} className="text-muted-foreground" />, label: 'Snitt fel', value: avgFaults.toFixed(1), sub: '' },
      { icon: <Gauge size={16} className="text-amber-500" />, label: 'm/s', value: avgSpeed ? avgSpeed.toFixed(2) : '–', sub: '' },
    ];
  }, [competitions]);

  // Pin counter
  const pinData = useMemo(() => {
    return dogs.filter(d => d.is_active_competition_dog).map(dog => {
      const dc = competitions.filter(c => c.dog_id === dog.id);
      const agilityPins = dc.filter(c => c.passed && c.discipline === 'Agility' && c.competition_level === dog.competition_level).length;
      const hoppPins = dc.filter(c => c.passed && c.discipline === 'Jumping' && c.competition_level === dog.jumping_level).length;
      const agilityReq = PIN_REQUIREMENTS[dog.competition_level];
      const hoppReq = PIN_REQUIREMENTS[dog.jumping_level];
      return { dog, agilityPins, hoppPins, agilityReq, hoppReq };
    });
  }, [dogs, competitions]);

  const nextClass = (level: string) => {
    const map: Record<string, string> = { 'Nollklass': 'K1', 'K1': 'K2', 'K2': 'K3', 'K3': 'Champion' };
    return map[level] || level;
  };

  const chartStyle = { fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };

  if (loading) {
    return (
      <PageContainer title="Kompis statistik">
        <div className="text-center py-20 text-muted-foreground">Laddar...</div>
      </PageContainer>
    );
  }

  if (noAccess) {
    return (
      <PageContainer title="Kompis statistik">
        <div className="text-center py-20 space-y-4">
          <Lock size={48} className="mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">Kunde inte visa statistik för denna kompis.</p>
          <p className="text-sm text-muted-foreground">Antingen är ni inte kompisar, eller så har personen stängt av delning.</p>
          <Button variant="outline" onClick={() => navigate('/friends')}>
            <ArrowLeft size={14} className="mr-1" /> Tillbaka
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Helmet>
        <title>{friendName}s statistik — AgilityManager</title>
      </Helmet>
      <PageContainer
        title={`${friendName}s statistik`}
        action={
          <Button variant="ghost" size="icon" onClick={() => navigate('/friends')}>
            <ArrowLeft size={18} />
          </Button>
        }
      >
        {/* Overview */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-card p-3 rounded-xl shadow-card text-center">
            <Dumbbell size={18} className="text-primary mx-auto mb-1" />
            <div className="text-xl font-bold font-display text-foreground">{overviewStats.monthTrainings}</div>
            <div className="text-[10px] text-muted-foreground">Träningar/mån</div>
          </div>
          <div className="bg-card p-3 rounded-xl shadow-card text-center">
            <Trophy size={18} className="text-accent mx-auto mb-1" />
            <div className="text-xl font-bold font-display text-foreground">{overviewStats.passRate}%</div>
            <div className="text-[10px] text-muted-foreground">Pinnar</div>
          </div>
          <div className="bg-card p-3 rounded-xl shadow-card text-center">
            <TrendingUp size={18} className="text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold font-display text-foreground">{overviewStats.totalHours}h</div>
            <div className="text-[10px] text-muted-foreground">Total träning</div>
          </div>
        </div>

        {/* Dogs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {dogs.map(dog => (
            <div key={dog.id} className="flex flex-col items-center min-w-[60px]">
              <DogAvatar dog={dog} size="sm" />
              <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[60px]">{dog.name}</span>
            </div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 text-xs">Översikt</TabsTrigger>
            <TabsTrigger value="training" className="flex-1 text-xs">Träning</TabsTrigger>
            <TabsTrigger value="competitions" className="flex-1 text-xs">Tävling</TabsTrigger>
            <TabsTrigger value="journey" className="flex-1 text-xs">Klassresa</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-4">
            {compStats && (
              <div className="grid grid-cols-3 gap-2">
                {compStats.map((s, i) => (
                  <div key={i} className="bg-card p-3 rounded-xl shadow-card">
                    <div className="flex items-center gap-1.5 mb-1">
                      {s.icon}
                      <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
                    </div>
                    <div className="text-lg font-bold font-display text-foreground">{s.value}</div>
                    {s.sub && <div className="text-[10px] text-muted-foreground">{s.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            {freqData.length > 0 && (
              <div className="bg-card rounded-xl p-4 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                  <Dumbbell size={16} className="text-primary" /> Träningsfrekvens (12 veckor)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={freqData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={chartStyle} />
                    <Bar dataKey="total" name="Pass" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="training" className="mt-3">
            {freqData.length > 0 ? (
              <div className="bg-card rounded-xl p-4 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                  <Dumbbell size={16} className="text-primary" /> Träningsfrekvens
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={freqData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={chartStyle} />
                    <Bar dataKey="total" name="Pass" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga träningspass att visa.</p>
            )}
          </TabsContent>

          <TabsContent value="competitions" className="mt-3">
            {compStats ? (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {compStats.map((s, i) => (
                  <div key={i} className="bg-card p-3 rounded-xl shadow-card">
                    <div className="flex items-center gap-1.5 mb-1">
                      {s.icon}
                      <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
                    </div>
                    <div className="text-lg font-bold font-display text-foreground">{s.value}</div>
                    {s.sub && <div className="text-[10px] text-muted-foreground">{s.sub}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga tävlingsresultat att visa.</p>
            )}

            {competitions.length === 0 && compStats === null && (
              <div className="text-center py-8 space-y-2">
                <Lock size={32} className="mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {friendName} har inte aktiverat delning av tävlingsresultat.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="journey" className="mt-3">
            {pinData.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                  <Award size={18} className="text-accent" /> Klassresa
                </h3>
                {pinData.map(({ dog, agilityPins, hoppPins, agilityReq, hoppReq }) => (
                  <div key={dog.id} className="bg-card rounded-xl p-4 shadow-card space-y-3">
                    <div className="flex items-center gap-3">
                      <DogAvatar dog={dog} size="sm" />
                      <div>
                        <div className="font-medium text-foreground text-sm">{dog.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Agility: {dog.competition_level} · Hopp: {dog.jumping_level}
                        </div>
                      </div>
                    </div>
                    {agilityReq && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            Agility {dog.competition_level} → {nextClass(dog.competition_level)}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {agilityPins}/{agilityReq.agility} pinnar
                          </span>
                        </div>
                        <Progress value={Math.min((agilityPins / agilityReq.agility) * 100, 100)} className="h-2" />
                      </div>
                    )}
                    {hoppReq && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            Hopp {dog.jumping_level} → {nextClass(dog.jumping_level)}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {hoppPins}/{hoppReq.hopp} pinnar
                          </span>
                        </div>
                        <Progress value={Math.min((hoppPins / hoppReq.hopp) * 100, 100)} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga aktiva tävlingshundar.</p>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
