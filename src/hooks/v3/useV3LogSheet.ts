import { useEffect, useState, useCallback } from "react";
import type { LogDefaults } from "@/lib/trainingRecommendations";

/**
 * Liten event-bus så vilken v3-komponent som helst kan öppna Logga pass-sheet:n
 * utan prop-drilling. V3Layout monterar listenern och styr open-state.
 *
 * Från "Dagens pass" kan man skicka med `defaults` som pre-fill:ar formuläret.
 */
const EVENT = "v3:open-log-sheet";

export function openV3LogSheet(defaults?: Partial<LogDefaults>) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { defaults } }));
}

export function useV3LogSheet() {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<Partial<LogDefaults> | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ defaults?: Partial<LogDefaults> }>).detail;
      setDefaults(detail?.defaults);
      setOpen(true);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setDefaults(undefined);
  }, []);

  return { open, close, setOpen, defaults };
}
