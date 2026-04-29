import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Manuell scroll-restoration eftersom vi använder vanlig <BrowserRouter>
 * (inte data router där <ScrollRestoration /> fungerar).
 *
 * - PUSH/REPLACE: scrolla till topp
 * - POP (back/forward): återställ tidigare position
 */
export function ScrollMemory() {
  const location = useLocation();
  const navType = useNavigationType();
  const positions = useRef<Map<string, number>>(new Map());
  const lastKey = useRef<string | null>(null);

  // Spara position när vi LÄMNAR en route
  useEffect(() => {
    return () => {
      if (lastKey.current) {
        positions.current.set(lastKey.current, window.scrollY);
      }
    };
  }, [location.key]);

  useEffect(() => {
    if (navType === "POP") {
      const saved = positions.current.get(location.key);
      window.scrollTo(0, saved ?? 0);
    } else {
      window.scrollTo(0, 0);
    }
    lastKey.current = location.key;
  }, [location.key, navType]);

  return null;
}
