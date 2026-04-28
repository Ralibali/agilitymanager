import { useState, useEffect } from 'react';
import { stripHtml } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';
import type { Competition, CompetitionInterest } from '@/types/competitions';

interface HoopersComp {
  id: string;
  competition_id: string;
  competition_name: string | null;
  date: string | null;
  location: string;
  club_name: string | null;
  source_url: string;
  registration_closes: string | null;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

type MergedInterest = CompetitionInterest & {
  competition?: Competition;
  hoopersCompetition?: HoopersComp;
  sport: 'agility' | 'hoopers';
};

export function MinaTavlingar() {
  const { user } = useAuth();
  const [interests, setInterests] = useState<MergedInterest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: intData } = await supabase
        .from('competition_interests')
        .select('*')
        .eq('user_id', user.id);

      if (!intData || intData.length === 0) {
        setInterests([]);
        setLoading(false);
        return;
      }

      const compIds = intData.map((i: any) => i.competition_id);

      // Fetch from both agility and hoopers tables in parallel
      const [agilityRes, hoopersRes] = await Promise.all([
        supabase.from('competitions').select('*').in('id', compIds),
        supabase.from('hoopers_competitions').select('id, competition_id, competition_name, date, location, club_name, source_url, registration_closes').in('id', compIds),
      ]);

      const agilityMap = new Map((agilityRes.data || []).map((c: any) => [c.id, c]));
      const hoopersMap = new Map((hoopersRes.data || []).map((c: any) => [c.id, c]));

      const merged: MergedInterest[] = intData.map((i: any) => {
        const agilityComp = agilityMap.get(i.competition_id) as Competition | undefined;
        const hoopersComp = hoopersMap.get(i.competition_id) as HoopersComp | undefined;
        return {
          ...(i as CompetitionInterest),
          competition: agilityComp,
          hoopersCompetition: hoopersComp,
          sport: hoopersComp ? 'hoopers' as const : 'agility' as const,
        };
      });

      setInterests(merged);
      setLoading(false);
    };
    load();
  }, [user]);

  const interested = interests.filter(i => i.status === 'interested');
  const registered = interests.filter(i => i.status === 'registered');

  if (loading) {
    return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const renderCard = (item: MergedInterest, type: 'interested' | 'registered') => {
    const isHoopers = item.sport === 'hoopers';
    const comp = item.competition;
    const hComp = item.hoopersCompetition;

    // Get unified fields
    const dateStr = isHoopers ? hComp?.date : comp?.date_start;
    const clubName = isHoopers ? (hComp?.club_name || '') : stripHtml(comp?.club_name || '');
    const compName = isHoopers ? (hComp?.competition_name || 'Hooperstävling') : stripHtml(comp?.competition_name || '');
    const location = isHoopers ? (hComp?.location || '') : (comp?.location || '');
    const regDeadline = isHoopers ? hComp?.registration_closes : comp?.last_registration_date;
    const linkUrl = isHoopers ? hComp?.source_url : 'https://agilitydata.se/taevlingar/';

    if (!comp && !hComp) return null;

    const daysToReg = daysUntil(regDeadline || null);
    const daysToComp = daysUntil(dateStr || null);

    return (
      <div key={item.id} className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="text-lg font-bold font-display text-primary">
                {formatDateShort(dateStr || null)}
              </div>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${isHoopers ? 'border-orange-500/50 text-orange-600 dark:text-orange-400' : 'border-blue-500/50 text-blue-600 dark:text-blue-400'}`}>
                {isHoopers ? '🐕 Hoopers' : '🏃 Agility'}
              </Badge>
            </div>
            <div className="font-semibold text-sm">{clubName}</div>
            <div className="text-xs text-muted-foreground">{compName}</div>
            <div className="text-xs text-muted-foreground mt-1">{location}</div>
          </div>
          {type === 'interested'
            ? <Star size={20} className="fill-yellow-400 text-yellow-400" />
            : <CheckCircle2 size={20} className="fill-green-500 text-green-500" />}
        </div>

        {type === 'interested' && (
          <div className="mt-3 space-y-1">
            {item.dog_name && <div className="text-xs font-medium">🐕 {item.dog_name}{item.class ? ` · ${item.class}` : ''}</div>}
            {daysToReg !== null && daysToReg > 0 && daysToReg <= 7 && (
              <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                <AlertTriangle size={12} /> Stänger om {daysToReg} dagar
              </div>
            )}
            {daysToReg !== null && daysToReg <= 0 && (
              <div className="text-xs text-destructive font-medium">Anmälan stängd</div>
            )}
            {daysToReg !== null && daysToReg > 0 && linkUrl && (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7 mt-1">
                  Anmäl mig <ExternalLink size={10} />
                </Button>
              </a>
            )}
          </div>
        )}

        {type === 'registered' && (
          <div className="mt-3 space-y-1">
            {daysToComp !== null && daysToComp > 0 && (
              <div className="text-xs text-muted-foreground">Tävling om {daysToComp} dagar</div>
            )}
            {item.dog_name && <div className="text-xs">Hund: {item.dog_name}</div>}
            {item.class && <div className="text-xs">Klass: {item.class}</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <Tabs defaultValue="interested">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="interested" className="gap-1 text-xs">
          <Star size={14} /> Intresserad ({interested.length})
        </TabsTrigger>
        <TabsTrigger value="registered" className="gap-1 text-xs">
          <CheckCircle2 size={14} /> Anmäld ({registered.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="interested">
        {interested.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Inga stjärnmärkta tävlingar ännu. Markera tävlingar med ⭐️ i kalendern!
          </p>
        ) : (
          <div className="space-y-3">{interested.map(i => renderCard(i, 'interested'))}</div>
        )}
      </TabsContent>

      <TabsContent value="registered">
        {registered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Inga anmälda tävlingar ännu. Markera tävlingar med ✅ i kalendern!
          </p>
        ) : (
          <div className="space-y-3">{registered.map(i => renderCard(i, 'registered'))}</div>
        )}
      </TabsContent>
    </Tabs>
  );
}
