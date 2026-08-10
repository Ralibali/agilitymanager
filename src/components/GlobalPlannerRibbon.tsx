import { useEffect, useState } from "react";
import { LayoutGrid, ArrowRight } from "lucide-react";

const NAVIGATION_EVENT = "agilitymanager:navigation";
let historyPatched = false;

function patchHistoryEvents() {
  if (historyPatched || typeof window === "undefined") return;
  historyPatched = true;

  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = ((...args: Parameters<History[typeof method]>) => {
      const result = original(...args);
      window.dispatchEvent(new Event(NAVIGATION_EVENT));
      return result;
    }) as History[typeof method];
  }
}

export function GlobalPlannerRibbon() {
  const [path, setPath] = useState(() => typeof window === "undefined" ? "/" : window.location.pathname);

  useEffect(() => {
    patchHistoryEvents();
    const syncPath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    window.addEventListener(NAVIGATION_EVENT, syncPath);
    return () => {
      window.removeEventListener("popstate", syncPath);
      window.removeEventListener(NAVIGATION_EVENT, syncPath);
    };
  }, []);

  if (path === "/banplanerare" || path.startsWith("/v3") || path.startsWith("/auth") || path.startsWith("/reset-password")) return null;

  return (
    <div className="relative z-[70] border-b border-emerald-300/25 bg-slate-950 px-3 py-2 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-[11px] sm:text-sm">
        <LayoutGrid className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
        <span><strong className="text-emerald-300">Hela banplaneraren är gratis:</strong> agility + hoopers · meterskala · regelcheck · PDF · 3D · inget konto för att börja</span>
        <a href="/banplanerare" className="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-300 hover:underline">Rita nu <ArrowRight className="h-3.5 w-3.5" /></a>
      </div>
    </div>
  );
}