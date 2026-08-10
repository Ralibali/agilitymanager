import { Link, useLocation } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

/** Persistent discovery surface for the free course planner across public pages. */
export function PlannerPromoBar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/v3") || pathname === "/banplanerare" || pathname.startsWith("/auth")) return null;

  return (
    <div className="sticky top-0 z-[60] border-b border-primary/20 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex min-h-11 max-w-7xl items-center justify-center gap-2 px-3 py-2 text-center text-xs sm:text-sm">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <span><strong>Gratis banplanerare:</strong> rita agilitybanor direkt i webbläsaren – utan konto.</span>
        <Link to="/banplanerare" className="inline-flex shrink-0 items-center gap-1 font-bold underline underline-offset-2 hover:no-underline">
          Rita nu <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
