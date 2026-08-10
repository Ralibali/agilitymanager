import { LayoutGrid, ArrowRight } from "lucide-react";

export function GlobalPlannerRibbon() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path === "/banplanerare" || path.startsWith("/v3") || path.startsWith("/auth") || path.startsWith("/reset-password")) return null;

  return (
    <div className="relative z-[70] border-b border-emerald-300/25 bg-slate-950 px-3 py-2 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-[11px] sm:text-sm">
        <LayoutGrid className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
        <span><strong className="text-emerald-300">Gratis banplanerare:</strong> rita agility & hoopers utan konto · meterskala · bancheck · Banbanken</span>
        <a href="/banplanerare" className="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-300 hover:underline">Rita nu <ArrowRight className="h-3.5 w-3.5" /></a>
      </div>
    </div>
  );
}
