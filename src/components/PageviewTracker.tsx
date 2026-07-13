import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '@/lib/analytics';

/**
 * Fires a Plausible SPA pageview on every route change.
 *
 * Plausibles standard-script skickar en pageview vid initial laddning. Vi hoppar
 * därför över den första renderingen så vi inte får en dubblett, och skickar
 * sedan `plausible('pageview')` när pathname eller search ändras.
 */
export function PageviewTracker() {
  const location = useLocation();
  const isFirst = useRef(true);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${location.pathname}${location.search}`;
    if (isFirst.current) {
      isFirst.current = false;
      lastKey.current = key;
      return;
    }
    if (lastKey.current === key) return;
    lastKey.current = key;
    trackPageview();
  }, [location.pathname, location.search]);

  return null;
}
