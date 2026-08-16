// ── Synk av matchningsprofiler mot kontot, så de följer med mellan enheter ──
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  readProfileStore,
  sanitizeStore,
  writeProfileStore,
  type DogProfileStore,
} from "./dogMatch";

export type SyncState = "off" | "syncing" | "synced" | "error";

/** Sant om profillistan bara innehåller en orörd standardprofil. */
export function isEmptyStore(store: DogProfileStore): boolean {
  return (
    store.profiles.length === 1 &&
    store.profiles[0].name.trim() === "" &&
    typeof store.updatedAt !== "number"
  );
}

/**
 * Väljer vilken version som ska gälla när lokalt och konto skiljer sig.
 * Nyaste ändringen vinner; en tom lokal lista ger alltid plats åt kontots.
 */
export function pickWinner(
  local: DogProfileStore,
  remote: DogProfileStore | null,
): { winner: DogProfileStore; source: "local" | "remote" } {
  if (!remote) return { winner: local, source: "local" };
  if (isEmptyStore(local)) return { winner: remote, source: "remote" };
  const localAt = local.updatedAt ?? 0;
  const remoteAt = remote.updatedAt ?? 0;
  return remoteAt > localAt
    ? { winner: remote, source: "remote" }
    : { winner: local, source: "local" };
}

async function fetchRemote(userId: string): Promise<DogProfileStore | null> {
  const { data, error } = await supabase
    .from("dog_match_profiles")
    .select("store")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return sanitizeStore(data.store);
}

async function pushRemote(userId: string, store: DogProfileStore): Promise<void> {
  await supabase.from("dog_match_profiles").upsert(
    {
      user_id: userId,
      store: JSON.parse(JSON.stringify(store)),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Håller matchningsprofilerna i takt med kontot.
 * Utan inloggning görs ingenting — profilerna fungerar ändå lokalt.
 */
export function useDogProfileSync(): { state: SyncState } {
  const [state, setState] = useState<SyncState>("off");
  const userIdRef = useRef<string | null>(null);
  const lastPushedRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    const syncFor = async (userId: string) => {
      setState("syncing");
      try {
        const local = readProfileStore();
        const remote = await fetchRemote(userId);
        if (cancelled) return;
        const { winner, source } = pickWinner(local, remote);
        if (source === "remote") {
          writeProfileStore(winner, { keepTimestamp: true });
        } else {
          const toPush = { ...winner, updatedAt: winner.updatedAt ?? Date.now() };
          writeProfileStore(toPush, { keepTimestamp: true });
          await pushRemote(userId, toPush);
        }
        lastPushedRef.current = JSON.stringify(readProfileStore());
        if (!cancelled) setState("synced");
      } catch {
        if (!cancelled) setState("error");
      }
    };

    const handleLocalChange = () => {
      const userId = userIdRef.current;
      if (!userId) return;
      const current = readProfileStore();
      const snapshot = JSON.stringify(current);
      if (snapshot === lastPushedRef.current) return;
      lastPushedRef.current = snapshot;
      setState("syncing");
      pushRemote(userId, current)
        .then(() => !cancelled && setState("synced"))
        .catch(() => !cancelled && setState("error"));
    };

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id ?? null;
      userIdRef.current = userId;
      if (userId) void syncFor(userId);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      const changed = userId !== userIdRef.current;
      userIdRef.current = userId;
      if (!userId) {
        setState("off");
        return;
      }
      if (changed) void syncFor(userId);
    });

    window.addEventListener("am:dog-profile", handleLocalChange);
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("am:dog-profile", handleLocalChange);
    };
  }, []);

  return { state };
}
