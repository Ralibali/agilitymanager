import { useState, useEffect } from 'react';
import { AgilityDataAttribution } from '@/components/competitions/AgilityDataAttribution';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TavlingsKalendar } from '@/components/competitions/TavlingsKalendar';
import { HoopersKalendar } from '@/components/competitions/HoopersKalendar';
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
  const [sportMode, setSportMode] = useState<'agility' | 'hoopers'>('agility');

  useEffect(() => {
    if (!user) return;
    supabase.from('dogs').select('*').eq('user_id', user.id).order('name').then(({ data }) => {
      setDogs(data || []);
    });
  }, [user]);

  // Auto-switch sport when dog is selected
  const selectedDog = dogs.find(d => d.id === selectedDogId);
  useEffect(() => {
    if (selectedDog) {
      setSportMode(selectedDog.sport === 'Hoopers' ? 'hoopers' : 'agility');
    }
  }, [selectedDog]);

  return (
    <PageContainer
      title="Tävlingskalender"
      subtitle="Hitta och planera tävlingar"
      action={<NotificationBell />}
    >
      {/* Sport toggle */}
      <div className="flex rounded-lg overflow-hidden border mb-4">
        <button
          onClick={() => setSportMode('agility')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            sportMode === 'agility'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-secondary'
          }`}
        >
          🏃 Agility
        </button>
        <button
          onClick={() => setSportMode('hoopers')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            sportMode === 'hoopers'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-secondary'
          }`}
        >
          🐕 Hoopers
        </button>
      </div>

      {sportMode === 'agility' ? (
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
            <DogPicker dogs={dogs.filter(d => d.sport === 'Agility')} selectedDogId={selectedDogId} onSelect={setSelectedDogId} />
            <div className="mt-3">
              <TavlingsKalendar dogs={dogs.filter(d => d.sport === 'Agility')} selectedDogId={selectedDogId} />
            </div>
          </TabsContent>
          <TabsContent value="recommended">
            <RecommendedCompetitions dogs={dogs.filter(d => d.sport === 'Agility')} />
          </TabsContent>
          <TabsContent value="mine">
            <MinaTavlingar />
          </TabsContent>
          <TabsContent value="log">
            <TavlingsLogg dogs={dogs} />
          </TabsContent>
          <AgilityDataAttribution />
        </Tabs>
      ) : (
        <div>
          <DogPicker dogs={dogs.filter(d => d.sport === 'Hoopers')} selectedDogId={selectedDogId} onSelect={setSelectedDogId} />
          <div className="mt-3">
            <HoopersKalendar dogs={dogs} selectedDogId={selectedDogId} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
