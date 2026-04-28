// Guest interest storage (localStorage) for users who are NOT logged in.
// Keeps the same shape as the DB-backed competition_interests rows so we can
// migrate them on login.

const KEY = 'am.guest.interests.v1';
const EVENT = 'am:guest-interests-changed';

export type GuestInterestStatus = 'interested' | 'registered' | 'done';

export interface GuestInterest {
  competition_id: string;
  status: GuestInterestStatus;
  dog_name?: string | null;
  class?: string | null;
  updated_at: string;
}

export function readGuestInterests(): Record<string, GuestInterest> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeGuestInterests(map: Record<string, GuestInterest>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore quota */
  }
}

export function setGuestInterest(
  competitionId: string,
  status: GuestInterestStatus,
  meta?: { dog_name?: string | null; class?: string | null }
) {
  const map = readGuestInterests();
  map[competitionId] = {
    competition_id: competitionId,
    status,
    dog_name: meta?.dog_name ?? null,
    class: meta?.class ?? null,
    updated_at: new Date().toISOString(),
  };
  writeGuestInterests(map);
}

export function removeGuestInterest(competitionId: string) {
  const map = readGuestInterests();
  delete map[competitionId];
  writeGuestInterests(map);
}

export function clearGuestInterests() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeGuestInterests(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) handler();
  });
  return () => {
    window.removeEventListener(EVENT, handler);
  };
}

export const GUEST_INTERESTS_KEY = KEY;
export const GUEST_INTERESTS_EVENT = EVENT;
