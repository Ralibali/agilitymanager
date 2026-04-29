import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global scroll-restoration för publika rutter.
 *
 * - Vid path-byte: scrolla till topp (smooth om motion tillåts).
 * - Vid hash-länk (#anchor): scrolla till elementet.
 * - Hoppar över "samma path olika query" så filter-uppdateringar inte hoppar.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [pathname, hash]);

  return null;
}
