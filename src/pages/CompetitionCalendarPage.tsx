import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TavlingsKalendar } from '@/components/competitions/TavlingsKalendar';
import { MinaTavlingar } from '@/components/competitions/MinaTavlingar';
import { TavlingsLogg } from '@/components/competitions/TavlingsLogg';
import { NotificationBell } from '@/components/competitions/NotificationBell';
import { DogPicker } from '@/components/competitions/DogPicker';
import { RecommendedCompetitions } from '@/components/competitions/RecommendedCompetitions';
import { Calendar, Star, ClipboardList, Sparkles } from 'lucide-react';
import type { Dog } from '@/types';

export default function CompetitionCalendarPage() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('dogs').select('*').eq('user_id', user.id).order('name').then(({ data }) => {
      setDogs(data || []);
    });
  }, [user]);

  return (
    <PageContainer
      title="Tävlingskalender"
      subtitle="Hitta och planera tävlingar"
      action={<NotificationBell />}
    >
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="calendar" className="gap-1 text-xs">
            <Calendar size={14} /> Kalender
          </TabsTrigger>
          <TabsTrigger value="recommended" className="gap-1 text-xs">
            <Sparkles size={14} /> Tips
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-1 text-xs">
            <Star size={14} /> Mina
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1 text-xs">
            <ClipboardList size={14} /> Logg
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <DogPicker dogs={dogs} selectedDogId={selectedDogId} onSelect={setSelectedDogId} />
          <div className="mt-3">
            <TavlingsKalendar dogs={dogs} selectedDogId={selectedDogId} />
          </div>
        </TabsContent>
        <TabsContent value="recommended">
          <RecommendedCompetitions dogs={dogs} />
        </TabsContent>
        <TabsContent value="mine">
          <MinaTavlingar />
        </TabsContent>
        <TabsContent value="log">
          <TavlingsLogg dogs={dogs} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
