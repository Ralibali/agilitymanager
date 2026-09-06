/**
 * Banplaneraren v2 — tillförlitlig lokal sparning av utkastet.
 *
 * Autosparningen får aldrig ljuga: om localStorage är fullt, avstängt eller
 * blockerat av webbläsarens sekretessläge ska planeraren säga det rakt ut och
 * erbjuda en väg vidare (försök igen / exportera JSON). Banan ligger kvar i
 * minnet oavsett — den här modulen kastar aldrig.
 */

export type DraftSaveFailure = "quota" | "blocked" | "serialize" | "unknown";

export type DraftSaveResult =
  | { ok: true }
  | { ok: false; reason: DraftSaveFailure; message: string };

const MESSAGES: Record<DraftSaveFailure, string> = {
  quota: "Webbläsarens lagring är full — banan finns kvar här, men sparas inte.",
  blocked: "Webbläsaren tillåter inte lokal lagring — banan finns kvar här, men sparas inte.",
  serialize: "Banan kunde inte omvandlas för sparning.",
  unknown: "Banan kunde inte sparas i den här webbläsaren.",
};

function classify(err: unknown): DraftSaveFailure {
  const e = err as { name?: string; code?: number } | null;
  const name = e?.name ?? "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || e?.code === 22 || e?.code === 1014) {
    return "quota";
  }
  if (name === "SecurityError" || name === "TypeError" || name === "ReferenceError") return "blocked";
  return "unknown";
}

export interface StorageLike {
  setItem(key: string, value: string): void;
}

/** Sparar utkastet. Returnerar alltid ett resultat — kastar aldrig. */
export function saveDraftToStorage(
  key: string,
  draft: unknown,
  storage?: StorageLike | null,
): DraftSaveResult {
  let text: string;
  try {
    text = JSON.stringify(draft);
  } catch {
    return { ok: false, reason: "serialize", message: MESSAGES.serialize };
  }
  let store: StorageLike | null | undefined = storage;
  if (store === undefined) {
    try {
      store = typeof localStorage !== "undefined" ? localStorage : null;
    } catch (err) {
      const reason = classify(err);
      return { ok: false, reason, message: MESSAGES[reason] };
    }
  }
  if (!store) return { ok: false, reason: "blocked", message: MESSAGES.blocked };
  try {
    store.setItem(key, text);
    return { ok: true };
  } catch (err) {
    const reason = classify(err);
    return { ok: false, reason, message: MESSAGES[reason] };
  }
}

export type DraftSaveState = "idle" | "saving" | "saved" | "error";

/** Text som visas för användaren — samma ordval i hela gränssnittet. */
export function draftSaveStatusLabel(state: DraftSaveState): string {
  switch (state) {
    case "saving": return "Sparar…";
    case "saved": return "Sparad i den här webbläsaren";
    case "error": return "Kunde inte spara";
    default: return "Autosparas lokalt";
  }
}
