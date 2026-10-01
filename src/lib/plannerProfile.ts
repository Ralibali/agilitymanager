/**
 * Lättviktsprofil för banplaneraren.
 *
 * Profilen ligger lokalt i webbläsaren och identifieras mot edge-funktionen
 * med ett slumpat edit-token. E-postadressen i sig används aldrig som
 * autentisering för en redan existerande profil.
 */
import { useCallback, useEffect, useState } from "react";

const IS_NATIVE_APP = import.meta.env.VITE_NATIVE_APP === "true";

export type PlannerProfile = {
  id: string;
  name: string;
  email: string;
  token: string;
};

const KEY = "am-planner-profile";
const EVENT = "am-planner-profile-changed";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateProfileInput(name: string, email: string): string | null {
  const n = name.trim();
  const e = email.trim();
  if (n.length < 2) return "Ange ditt namn (minst 2 tecken)";
  if (n.length > 80) return "Namnet är för långt";
  if (!EMAIL_RE.test(e)) return "Ange en giltig e-postadress";
  if (e.length > 255) return "E-postadressen är för lång";
  return null;
}

export function readProfile(): PlannerProfile | null {
  if (IS_NATIVE_APP) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlannerProfile>;
    if (!parsed?.id || !parsed?.token || !parsed?.name) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email ?? "",
      token: parsed.token,
    };
  } catch {
    return null;
  }
}

export function writeProfile(profile: PlannerProfile | null) {
  if (IS_NATIVE_APP) return;
  try {
    if (profile) localStorage.setItem(KEY, JSON.stringify(profile));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignorera */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Skapar en ny profil eller återanvänder en profil som denna webbläsare redan äger. */
export async function signInWithNameEmail(name: string, email: string): Promise<PlannerProfile> {
  if (IS_NATIVE_APP) throw new Error("Banprofiler används inte i mobilappen.");
  const invalid = validateProfileInput(name, email);
  if (invalid) throw new Error(invalid);

  const normalizedEmail = email.trim().toLowerCase();
  const localProfile = readProfile();
  const proofToken =
    localProfile?.email.trim().toLowerCase() === normalizedEmail ? localProfile.token : undefined;

  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("planner-social", {
    body: {
      action: "profile",
      name: name.trim(),
      email: normalizedEmail,
      ...(proofToken ? { token: proofToken } : {}),
    },
  });
  if (error) throw new Error("Kunde inte spara profilen just nu");
  const payload = data as { profile?: PlannerProfile; error?: string };
  if (payload?.error || !payload?.profile) throw new Error(payload?.error ?? "Kunde inte spara profilen");
  writeProfile(payload.profile);
  return payload.profile;
}

/** Anropar planner-social med profilens id + token. */
export async function plannerApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (IS_NATIVE_APP) throw new Error("Molndelning används inte i mobilappen.");
  const profile = readProfile();
  if (!profile) throw new Error("Du behöver skapa en profil först");
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("planner-social", {
    body: { action, profileId: profile.id, token: profile.token, ...payload },
  });
  if (error) throw new Error("Något gick fel, försök igen");
  const res = data as { error?: string };
  if (res?.error) throw new Error(res.error);
  return data as T;
}

export function usePlannerProfile() {
  const [profile, setProfile] = useState<PlannerProfile | null>(() => readProfile());

  useEffect(() => {
    if (IS_NATIVE_APP) return;
    const sync = () => setProfile(readProfile());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signOut = useCallback(() => writeProfile(null), []);

  return { profile, signOut, refresh: () => setProfile(readProfile()) };
}
