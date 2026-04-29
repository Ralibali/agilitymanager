import { useEffect, useState, useCallback } from "react";

/**
 * Liten event-bus så vilken v3-komponent som helst kan öppna Logga pass-sheet:n
 * utan prop-drilling. V3Layout monterar listenern och styr open-state.
 */
const EVENT = "v3:open-log-sheet";

export function openV3LogSheet() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useV3LogSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  return { open, close, setOpen };
}
