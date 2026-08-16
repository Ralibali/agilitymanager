// ── Delade matchningsprofiler: vänners profiler syns och kan redigeras ──
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeStore, type DogProfile, type SavedDogProfile } from "./dogMatch";

export interface FriendProfileOwner {
  userId: string;
  name: string;
  profiles: SavedDogProfile[];
}

export type FriendsState = "off" | "loading" | "ready" | "error";

/** Hämtar id:n för alla accepterade vänner. */
async function friendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, receiver_id, status")
    .eq("status", "accepted");
  if (error || !data) return [];
  return data
    .map((f) => (f.requester_id === userId ? f.receiver_id : f.requester_id))
    .filter((id): id is string => !!id && id !== userId);
}

/** Läser vänners matchningsprofiler och deras visningsnamn. */
async function fetchFriendProfiles(userId: string): Promise<FriendProfileOwner[]> {
  const ids = await friendIds(userId);
  if (ids.length === 0) return [];

  const [{ data: stores }, { data: people }] = await Promise.all([
    supabase.from("dog_match_profiles").select("user_id, store").in("user_id", ids),
    supabase.from("profiles").select("user_id, display_name").in("user_id", ids),
  ]);

  const names = new Map((people ?? []).map((p) => [p.user_id, p.display_name ?? "Vän"]));

  return (stores ?? [])
    .map((row) => {
      const store = sanitizeStore(row.store);
      if (!store) return null;
      return {
        userId: row.user_id,
        name: names.get(row.user_id) || "Vän",
        profiles: store.profiles,
      } satisfies FriendProfileOwner;
    })
    .filter((v): v is FriendProfileOwner => v !== null);
}

/** Sparar en ändrad profil tillbaka i vännens lista. */
async function patchFriendProfile(
  ownerId: string,
  profileId: string,
  patch: Partial<DogProfile>,
): Promise<SavedDogProfile[] | null> {
  const { data } = await supabase
    .from("dog_match_profiles")
    .select("store")
    .eq("user_id", ownerId)
    .maybeSingle();
  const store = sanitizeStore(data?.store);
  if (!store) return null;
  const next = {
    ...store,
    profiles: store.profiles.map((p) => (p.id === profileId ? { ...p, ...patch } : p)),
    updatedAt: Date.now(),
  };
  const { error } = await supabase
    .from("dog_match_profiles")
    .update({ store: JSON.parse(JSON.stringify(next)) })
    .eq("user_id", ownerId);
  if (error) return null;
  return next.profiles;
}

/**
 * Vänners matchningsprofiler — synliga på alla enheter man loggar in på.
 * Utan inloggning görs ingenting.
 */
export function useFriendDogProfiles() {
  const [state, setState] = useState<FriendsState>("off");
  const [owners, setOwners] = useState<FriendProfileOwner[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    setState("loading");
    try {
      setOwners(await fetchFriendProfiles(uid));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) void load(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void load(uid);
      else {
        setOwners([]);
        setState("off");
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const updateFriendProfile = useCallback(
    async (ownerId: string, profileId: string, patch: Partial<DogProfile>) => {
      const profiles = await patchFriendProfile(ownerId, profileId, patch);
      if (!profiles) return false;
      setOwners((prev) => prev.map((o) => (o.userId === ownerId ? { ...o, profiles } : o)));
      return true;
    },
    [],
  );

  const refresh = useCallback(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  return { state, owners, updateFriendProfile, refresh };
}
