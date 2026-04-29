import { useEffect, useState, useCallback } from "react";
import {
  readConsent,
  saveConsent,
  acceptAll,
  rejectAll,
  clearConsent,
  CONSENT_EVENT,
  type ConsentState,
} from "@/lib/cookieConsent";

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(() => readConsent());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ConsentState | null;
      setConsent(detail);
    };
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  const update = useCallback((partial: { analytics: boolean; marketing: boolean }) => {
    return saveConsent(partial);
  }, []);

  return {
    consent,
    hasDecided: consent !== null,
    acceptAll,
    rejectAll,
    update,
    reset: clearConsent,
  };
}
