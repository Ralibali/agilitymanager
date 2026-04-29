import { useState, useEffect, useMemo } from 'react';
import { stripHtml } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, CheckCircle2, ExternalLink, AlertTriangle, Flag } from 'lucide-react';
import type { Competition } from '@/types/competitions';
import { useCompetitionInterests, type InterestStatus } from '@/hooks/useCompetitionInterests';
import { readGuestInterestItems, type GuestInterestItem } from '@/lib/guestInterestsStorage';

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

interface MergedItem {
  competition_id: string;
  status: InterestStatus;
  dog_name: string | null;
  class: string | null;
  competition?: Competition;
  hoopersCompetition?: HoopersComp;
  sport: 'agility' | 'hoopers';
}

export function MinaTavlingar() {
  const { user } = useAuth();
  // Delad intresse-hook — funkar för både inloggad och gäst
  const { interests } = useCompetitionInterests();

  const [competitionsById, setCompetitionsById] = useState<Map<string, Competition>>(new Map());
  const [hoopersById, setHoopersById] = useState<Map<string, HoopersComp>>(new Map());
  const [dbMeta, setDbMeta] = useState<Map<string, { dog_name: string | null; class: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);

  // Lista av alla competition_ids vi har intresse för
  const interestIds = useMemo(() => Object.keys(interests), [interests]);

  // För inloggade — hämta meta (dog_name, class) från DB. För gäster — läs från localStorage.
  useEffect(() => {
    if (user) {
      (async () => {
        const { data } = await supabase
          .from('competition_interests')
          .select('competition_id, dog_name, class')
          .eq('user_id', user.id);
        const map = new Map<string, { dog_name: string | null; class: string | null }>();
        (data || []).forEach((r: any) => map.set(r.competition_id, { dog_name: r.dog_name ?? null, class: r.class ?? null }));
        setDbMeta(map);
      })();
    } else {
      const items: GuestInterestItem[] = readGuestInterestItems();
      const map = new Map<string, { dog_name: string | null; class: string | null }>();
      items.forEach((it) => map.set(it.competition_id, { dog_name: it.dog_name ?? null, class: it.class ?? null }));
      setDbMeta(map);
    }
  }, [user, interests]);

  // Hämta tävlingsdata för relevanta id:n. Inloggade får full hoopers-tabell, gäster får publik vy.
  useEffect(() => {
    if (interestIds.length === 0) {
      setCompetitionsById(new Map());
      setHoopersById(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);

    const hoopersTable = user ? 'hoopers_competitions' : 'hoopers_competitions_public';

    Promise.all([
      supabase.from('competitions').select('*').in('id', interestIds),
      supabase
        .from(hoopersTable as 'hoopers_competitions')
        .select('id, competition_id, competition_name, date, location, club_name, source_url, registration_closes')
        .in('id', interestIds),
    ]).then(([agilityRes, hoopersRes]) => {
      const aMap = new Map<string, Competition>();
      (agilityRes.data || []).forEach((c: any) => aMap.set(c.id, c as Competition));
      setCompetitionsById(aMap);

      const hMap = new Map<string, HoopersComp>();
      (hoopersRes.data || []).forEach((c: any) => hMap.set(c.id, c as HoopersComp));
      setHoopersById(hMap);

      setLoading(false);
    });
  }, [interestIds.join('|'), user]);

  const merged: MergedItem[] = useMemo(() => {
    return interestIds
      .map((id) => {
        const status = interests[id];
        if (!status) return null;
        const meta = dbMeta.get(id);
        const agility = competitionsById.get(id);
        const hoopers = hoopersById.get(id);
        if (!agility && !hoopers) return null;
        return {
          competition_id: id,
          status,
          dog_name: meta?.dog_name ?? null,
          class: meta?.class ?? null,
          competition: agility,
          hoopersCompetition: hoopers,
          sport: hoopers ? ('hoopers' as const) : ('agility' as const),
        } as MergedItem;
      })
      .filter((x): x is MergedItem => x !== null);
  }, [interestIds, interests, dbMeta, competitionsById, hoopersById]);

  const interested = merged.filter((i) => i.status === 'interested');
  const registered = merged.filter((i) => i.status === 'registered');
  const done = merged.filter((i) => i.status === 'done');

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const renderCard = (item: MergedItem, type: InterestStatus) => {
    const isHoopers = item.sport === 'hoopers';
    const comp = item.competition;
    const hComp = item.hoopersCompetition;

    const dateStr = isHoopers ? hComp?.date : comp?.date_start;
    const clubName = isHoopers ? (hComp?.club_name || '') : stripHtml(comp?.club_name || '');
    const compName = isHoopers ? (hComp?.competition_name || 'Hooperstävling') : stripHtml(comp?.competition_name || '');
    const location = isHoopers ? (hComp?.location || '') : (comp?.location || '');
    const regDeadline = isHoopers ? hComp?.registration_closes : comp?.last_registration_date;
    const linkUrl = isHoopers ? hComp?.source_url : 'https://agilitydata.se/taevlingar/';

    if (!comp && !hComp) return null;

    const daysToReg = daysUntil(regDeadline || null);
    const daysToComp = daysUntil(dateStr || null);

    const StatusIcon =
      type === 'interested' ? Star : type === 'registered' ? CheckCircle2 : Flag;
    const statusIconClass =
      type === 'interested'
        ? 'fill-yellow-400 text-yellow-400'
        : type === 'registered'
          ? 'fill-green-500 text-green-500'
          : 'fill-primary text-primary';

    return (
      <div key={item.competition_id} className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="text-lg font-bold font-display text-primary">
                {formatDateShort(dateStr || null)}
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${
                  isHoopers
                    ? 'border-orange-500/50 text-orange-600 dark:text-orange-400'
                    : 'border-blue-500/50 text-blue-600 dark:text-blue-400'
                }`}
              >
                {isHoopers ? '🐕 Hoopers' : '🏃 Agility'}
              </Badge>
            </div>
            <div className="font-semibold text-sm">{clubName}</div>
            <div className="text-xs text-muted-foreground">{compName}</div>
            <div className="text-xs text-muted-foreground mt-1">{location}</div>
          </div>
          <StatusIcon size={20} className={statusIconClass} />
        </div>

        {type === 'interested' && (
          <div className="mt-3 space-y-1">
            {item.dog_name && (
              <div className="text-xs font-medium">
                🐕 {item.dog_name}
                {item.class ? ` · ${item.class}` : ''}
              </div>
            )}
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

        {type === 'done' && (
          <div className="mt-3 space-y-1">
            {item.dog_name && <div className="text-xs">Hund: {item.dog_name}</div>}
            {item.class && <div className="text-xs">Klass: {item.class}</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <Tabs defaultValue="interested">
      <TabsList className="w-full grid grid-cols-3 mb-4">
        <TabsTrigger value="interested" className="gap-1 text-xs">
          <Star size={14} /> Intresserad ({interested.length})
        </TabsTrigger>
        <TabsTrigger value="registered" className="gap-1 text-xs">
          <CheckCircle2 size={14} /> Anmäld ({registered.length})
        </TabsTrigger>
        <TabsTrigger value="done" className="gap-1 text-xs">
          <Flag size={14} /> Genomförd ({done.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="interested">
        {interested.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Inga stjärnmärkta tävlingar ännu. Markera tävlingar med ⭐️ i kalendern!
          </p>
        ) : (
          <div className="space-y-3">{interested.map((i) => renderCard(i, 'interested'))}</div>
        )}
      </TabsContent>

      <TabsContent value="registered">
        {registered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Inga anmälda tävlingar ännu. Markera tävlingar med ✅ i kalendern!
          </p>
        ) : (
          <div className="space-y-3">{registered.map((i) => renderCard(i, 'registered'))}</div>
        )}
      </TabsContent>

      <TabsContent value="done">
        {done.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Inga genomförda tävlingar markerade ännu.
          </p>
        ) : (
          <div className="space-y-3">{done.map((i) => renderCard(i, 'done'))}</div>
        )}
      </TabsContent>
    </Tabs>
  );
}
