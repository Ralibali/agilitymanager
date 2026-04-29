import { useCallback, useEffect, useRef, useState } from 'react';
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
import { getGuestInterestsSyncEnabled } from '@/lib/guestInterestsSyncPref';

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
  const mergedForUserRef = useRef<string | null>(null);

  const loadFromGuest = useCallback(() => {
    const items = readGuestInterestItems();
    const map: Record<string, InterestStatus> = {};
    for (const it of items) map[it.competition_id] = it.status;
    setInterests(map);
    setLoading(false);
  }, []);

  /** Synka eventuella lokala gästmarkeringar in i kontot vid inloggning. */
  const mergeGuestIntoAccount = useCallback(async (userId: string) => {
    if (!getGuestInterestsSyncEnabled()) return;
    // Alla statusar (interested, registered, done) synkas nu — DB tillåter alla tre.
    const items = readGuestInterestItems();
    if (items.length === 0) {
      clearGuestInterestItems();
      return;
    }

    const rows = items.map((it) => ({
      user_id: userId,
      competition_id: it.competition_id,
      status: it.status,
      dog_name: it.dog_name,
      class: it.class,
    }));
    // upsert kräver unik (user_id, competition_id) — lägg till markeringar som inte
    // redan finns; befintliga rader skrivs över med gästens status.
    const { error } = await supabase
      .from('competition_interests')
      .upsert(rows, { onConflict: 'user_id,competition_id' });
    if (!error) {
      clearGuestInterestItems();
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      loadFromGuest();
      return;
    }
    setLoading(true);
    if (mergedForUserRef.current !== user.id) {
      mergedForUserRef.current = user.id;
      await mergeGuestIntoAccount(user.id);
    }
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
  }, [user, loadFromGuest, mergeGuestIntoAccount]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Lyssna på storage-ändringar (andra flikar, samma flik, fokus, visibility) för gäster.
  useEffect(() => {
    if (user) return;
    return subscribeGuestInterests(loadFromGuest);
  }, [user, loadFromGuest]);

  // Live-synk mellan flikar för inloggade — annan flik skriver en signal,
  // denna flik kör refresh() så HoopersKalendar och övriga vyer uppdateras.
  useEffect(() => {
    if (!user) return;
    const KEY = `competition_interests_signal:${user.id}`;
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) void refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user, refresh]);

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

      // Optimistisk lokal uppdatering — sync till DB sker nedan
      const previousState = interests;
      if (current === status) {
        setInterests((prev) => {
          const next = { ...prev };
          delete next[competitionId];
          return next;
        });
      } else {
        setInterests((prev) => ({ ...prev, [competitionId]: status }));
      }

      try {
        if (current === status) {
          const { error } = await supabase
            .from('competition_interests')
            .delete()
            .eq('user_id', user.id)
            .eq('competition_id', competitionId);
          if (error) throw error;
        } else if (current) {
          const { error } = await supabase
            .from('competition_interests')
            .update({ status, dog_name: dogName, class: dogClass })
            .eq('user_id', user.id)
            .eq('competition_id', competitionId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('competition_interests').insert({
            user_id: user.id,
            competition_id: competitionId,
            status,
            dog_name: dogName,
            class: dogClass,
          });
          if (error) throw error;
        }
        broadcastInterestChange(user.id);
      } catch (err) {
        // Rollback vid fel
        setInterests(previousState);
        throw err;
      }
    },
    [user, interests],
  );

  return { interests, loading, setInterest, isGuest, refresh };
}

function broadcastInterestChange(userId: string) {
  try {
    localStorage.setItem(`competition_interests_signal:${userId}`, String(Date.now()));
  } catch {
    // ignore (private mode etc.)
  }
}
