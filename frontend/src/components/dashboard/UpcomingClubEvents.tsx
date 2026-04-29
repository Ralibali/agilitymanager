import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ClubEvent {
  id: string;
  title: string;
  date: string;
  event_type: string;
  club_id: string;
  club_name?: string;
}

const eventTypeLabel: Record<string, string> = {
  training: 'Träning',
  competition: 'Tävling',
  social: 'Socialt',
};

const eventTypeColor: Record<string, string> = {
  training: 'text-primary',
  competition: 'text-accent',
  social: 'text-muted-foreground',
};

export const UpcomingClubEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ClubEvent[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchEvents = async () => {
      // Get user's accepted club memberships
      const { data: memberships } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (!memberships?.length) return;

      const clubIds = memberships.map(m => m.club_id);

      // Get upcoming events from those clubs
      const { data: eventsData } = await supabase
        .from('club_events')
        .select('id, title, date, event_type, club_id')
        .in('club_id', clubIds)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(3);

      if (!eventsData?.length) return;

      // Get club names
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id, name')
        .in('id', clubIds);

      const clubMap = new Map(clubs?.map(c => [c.id, c.name]) ?? []);

      setEvents(eventsData.map(e => ({
        ...e,
        club_name: clubMap.get(e.club_id) ?? '',
      })));
    };

    fetchEvents();
  }, [user?.id]);

  if (events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-4 rounded-xl shadow-card mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">Klubbevent</span>
        </div>
        <button onClick={() => navigate('/app/clubs')} className="text-xs text-primary flex items-center gap-0.5">
          Klubbar <ArrowRight size={12} />
        </button>
      </div>
      <div className="space-y-2.5">
        {events.map(event => (
          <div key={event.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calendar size={14} className={eventTypeColor[event.event_type] ?? 'text-primary'} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {format(new Date(event.date), 'd MMM HH:mm', { locale: sv })}
                <span className="mx-1">·</span>
                <span className={eventTypeColor[event.event_type] ?? ''}>{eventTypeLabel[event.event_type] ?? event.event_type}</span>
                <span className="mx-1">·</span>
                {event.club_name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
