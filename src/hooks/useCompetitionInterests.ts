import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  readGuestInterestItems,
  setGuestInterest as setGuestInterestStorage,
  clearGuestInterestItems,
  subscribeGuestInterests,
  type GuestInterestItem,
  type GuestInterestStatus,
  type GuestSport,
} from '@/lib/guestInterestsStorage';

export type InterestStatus = GuestInterestStatus;

// Bakåtkompatibla re-exports — gamla callsites importerar dessa från useCompetitionInterests.
export function readGuestInterests(): GuestInterestItem[] {
  return readGuestInterestItems();
}

export function clearGuestInterests(): void {
  clearGuestInterestItems();
}

interface UseCompetitionInterestsResult {
  interests: Record<string, InterestStatus>;
  loading: boolean;
  setInterest: (
    competitionId: string,
    status: InterestStatus,
    meta?: { dogName?: string | null; dogClass?: string | null; sport?: GuestSport; region?: string | null },
  ) => Promise<void>;
  isGuest: boolean;
  refresh: () => Promise<void>;
}

export function useCompetitionInterests(): UseCompetitionInterestsResult {
  const { user } = useAuth();
  const [interests, setInterests] = useState<Record<string, InterestStatus>>({});
  const [loading, setLoading] = useState(true);
  const isGuest = !user;

  const loadFromGuest = useCallback(() => {
    const items = readGuestInterestItems();
    const map: Record<string, InterestStatus> = {};
    for (const it of items) map[it.competition_id] = it.status;
    setInterests(map);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      loadFromGuest();
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('competition_interests')
      .select('competition_id, status')
      .eq('user_id', user.id);
    const map: Record<string, InterestStatus> = {};
    if (data) {
      for (const row of data) {
        map[row.competition_id] = row.status as InterestStatus;
      }
    }
    setInterests(map);
    setLoading(false);
  }, [user, loadFromGuest]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Lyssna på storage-ändringar (andra flikar, samma flik, fokus, visibility) för gäster.
  useEffect(() => {
    if (user) return;
    return subscribeGuestInterests(loadFromGuest);
  }, [user, loadFromGuest]);

  const setInterest = useCallback<UseCompetitionInterestsResult['setInterest']>(
    async (competitionId, status, meta) => {
      const dogName = meta?.dogName ?? null;
      const dogClass = meta?.dogClass ?? null;

      if (!user) {
        const result = setGuestInterestStorage({
          competition_id: competitionId,
          status,
          sport: meta?.sport,
          region: meta?.region,
          class: dogClass,
          dog_name: dogName,
        });
        // Optimistisk uppdatering — subscribe-handlaren kommer också uppdatera men direktstate är snabbare
        setInterests((prev) => {
          const next = { ...prev };
          if (result === null) delete next[competitionId];
          else next[competitionId] = result;
          return next;
        });
        return;
      }

      const current = interests[competitionId];
      if (current === status) {
        await supabase
          .from('competition_interests')
          .delete()
          .eq('user_id', user.id)
          .eq('competition_id', competitionId);
        setInterests((prev) => {
          const next = { ...prev };
          delete next[competitionId];
          return next;
        });
        return;
      }
      if (current) {
        await supabase
          .from('competition_interests')
          .update({ status, dog_name: dogName, class: dogClass })
          .eq('user_id', user.id)
          .eq('competition_id', competitionId);
      } else {
        await supabase.from('competition_interests').insert({
          user_id: user.id,
          competition_id: competitionId,
          status,
          dog_name: dogName,
          class: dogClass,
        });
      }
      setInterests((prev) => ({ ...prev, [competitionId]: status }));
    },
    [user, interests],
  );

  return { interests, loading, setInterest, isGuest, refresh };
}
