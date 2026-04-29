import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@/components/PageContainer';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import TrainingGoals from '@/components/training/TrainingGoals';
import AchievementsGrid from '@/components/AchievementsGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GoalsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([store.getDogs(), store.getTraining(), store.getCompetitions()]).then(([d, t, c]) => {
      setDogs(d); setTraining(t); setCompetitions(c); setLoading(false);
    });
  }, []);

  if (loading) return <PageContainer title="Mål & Utmaningar"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <>
      <Helmet>
        <title>Mål & Utmaningar – AgilityManager</title>
        <meta name="description" content="Sätt träningsmål, spåra framsteg och lås upp achievements i AgilityManager." />
        <link rel="canonical" href="https://agilitymanager.se/goals" />
      </Helmet>
      <PageContainer title="Mål & Utmaningar" subtitle="Sätt mål och lås upp badges">
        <Tabs defaultValue="goals" className="mb-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="goals">🎯 Mål</TabsTrigger>
            <TabsTrigger value="achievements">🏅 Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="mt-3">
            <TrainingGoals dogs={dogs} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-3">
            <AchievementsGrid dogs={dogs} training={training} competitions={competitions} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
