import { useEffect, useState, useCallback } from "react";
import type { LogDefaults, LogContext } from "@/lib/trainingRecommendations";

/**
 * Liten event-bus så vilken v3-komponent som helst kan öppna Logga pass-sheet:n
 * utan prop-drilling. V3Layout monterar listenern och styr open-state.
 *
 * Öppningen accepterar antingen:
 *  - `openV3LogSheet(defaults)` (bakåtkompatibelt), eller
 *  - `openV3LogSheet({ defaults, context })` för att t.ex. skicka med
 *    banplanerar-kontext. `context` är transient (UI/analytics) och sparas
 *    inte i DB.
 */
const EVENT = "v3:open-log-sheet";

export interface OpenV3LogSheetOptions {
  defaults?: Partial<LogDefaults>;
  context?: LogContext;
}

function isOptionsObject(input: unknown): input is OpenV3LogSheetOptions {
  if (!input || typeof input !== "object") return false;
  const rec = input as Record<string, unknown>;
  // Ett options-objekt har `defaults` eller `context` som egen nyckel.
  if ("defaults" in rec || "context" in rec) return true;
  return false;
}

export function openV3LogSheet(input?: Partial<LogDefaults> | OpenV3LogSheetOptions): void {
  let detail: OpenV3LogSheetOptions;
  if (isOptionsObject(input)) {
    detail = input;
  } else {
    detail = { defaults: input };
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

export function useV3LogSheet() {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<Partial<LogDefaults> | undefined>(undefined);
  const [context, setContext] = useState<LogContext | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenV3LogSheetOptions>).detail;
      setDefaults(detail?.defaults);
      setContext(detail?.context);
      setOpen(true);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setDefaults(undefined);
    setContext(undefined);
  }, []);

  return { open, close, setOpen, defaults, context };
}
