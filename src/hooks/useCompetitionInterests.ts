import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type InterestStatus = 'interested' | 'registered' | 'done';

interface GuestInterest {
  competition_id: string;
  status: InterestStatus;
  dog_name: string | null;
  class: string | null;
  created_at: string;
}

const GUEST_KEY = 'am.guest.interests.v1';

function readGuest(): GuestInterest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuest(items: GuestInterest[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('am:guest-interests-changed'));
  } catch {
    /* ignore quota errors */
  }
}

export function readGuestInterests(): GuestInterest[] {
  return readGuest();
}

export function clearGuestInterests(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_KEY);
  window.dispatchEvent(new CustomEvent('am:guest-interests-changed'));
}

interface UseCompetitionInterestsResult {
  interests: Record<string, InterestStatus>;
  loading: boolean;
  setInterest: (
    competitionId: string,
    status: InterestStatus,
    meta?: { dogName?: string | null; dogClass?: string | null },
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
    const items = readGuest();
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

  useEffect(() => {
    if (user) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_KEY) loadFromGuest();
    };
    const onCustom = () => loadFromGuest();
    window.addEventListener('storage', onStorage);
    window.addEventListener('am:guest-interests-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('am:guest-interests-changed', onCustom);
    };
  }, [user, loadFromGuest]);

  const setInterest = useCallback<UseCompetitionInterestsResult['setInterest']>(
    async (competitionId, status, meta) => {
      const dogName = meta?.dogName ?? null;
      const dogClass = meta?.dogClass ?? null;

      if (!user) {
        const items = readGuest();
        const existing = items.findIndex((i) => i.competition_id === competitionId);
        let next: GuestInterest[];
        if (existing >= 0 && items[existing].status === status) {
          next = items.filter((_, idx) => idx !== existing);
        } else if (existing >= 0) {
          next = items.map((it, idx) =>
            idx === existing ? { ...it, status, dog_name: dogName, class: dogClass } : it,
          );
        } else {
          next = [
            ...items,
            {
              competition_id: competitionId,
              status,
              dog_name: dogName,
              class: dogClass,
              created_at: new Date().toISOString(),
            },
          ];
        }
        writeGuest(next);
        const map: Record<string, InterestStatus> = {};
        for (const it of next) map[it.competition_id] = it.status;
        setInterests(map);
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
