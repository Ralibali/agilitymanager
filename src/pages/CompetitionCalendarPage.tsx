import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TavlingsKalendar } from '@/components/competitions/TavlingsKalendar';
import { MinaTavlingar } from '@/components/competitions/MinaTavlingar';
import { TavlingsLogg } from '@/components/competitions/TavlingsLogg';
import { NotificationBell } from '@/components/competitions/NotificationBell';
import { Calendar, Star, ClipboardList } from 'lucide-react';
import type { Dog } from '@/types';

export default function CompetitionCalendarPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);

  useEffect(() => {
    supabase.from('dogs').select('*').order('name').then(({ data }) => {
      setDogs(data || []);
    });
  }, []);

  return (
    <PageContainer
      title="Tävlingskalender"
      subtitle="Hitta och planera tävlingar"
      action={<NotificationBell />}
    >
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="calendar" className="gap-1 text-xs">
            <Calendar size={14} /> Kalender
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-1 text-xs">
            <Star size={14} /> Mina
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1 text-xs">
            <ClipboardList size={14} /> Logg
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <TavlingsKalendar />
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
