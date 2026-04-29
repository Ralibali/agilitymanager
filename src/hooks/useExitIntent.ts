import { useEffect, useRef } from 'react';

const SESSION_KEY = 'am.exit_intent.fired';

interface UseExitIntentOptions {
  enabled: boolean;
  onTrigger: () => void;
  /** Min idle-tid (ms) på sidan innan exit-intent får trigga */
  minDwellMs?: number;
}

/**
 * Triggar callback när användare verkar lämna sidan.
 * - Desktop: musen åker upp över top-edge
 * - Mobil: snabb scroll uppåt nära toppen (proxy för "tillbaka"-gest)
 * Bara en gång per session.
 */
export function useExitIntent({ enabled, onTrigger, minDwellMs = 8000 }: UseExitIntentOptions) {
  const firedRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    const mountedAt = Date.now();
    let lastScrollY = window.scrollY;

    const fire = () => {
      if (firedRef.current) return;
      if (Date.now() - mountedAt < minDwellMs) return;
      firedRef.current = true;
      sessionStorage.setItem(SESSION_KEY, '1');
      onTriggerRef.current();
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) fire();
    };

    const onScroll = () => {
      const y = window.scrollY;
      // mobil-proxy: snabb scroll uppåt nära toppen
      if (y < 100 && lastScrollY - y > 80) fire();
      lastScrollY = y;
    };

    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled, minDwellMs]);
}
