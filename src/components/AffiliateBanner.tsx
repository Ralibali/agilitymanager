import { ArrowUpRight } from "lucide-react";
import { AFFILIATE_PARTNERS } from "@/lib/affiliate";

/** Text creatives: no third-party scripts, pixels, cookies or layout-shifting images. */
export function AffiliateBanner({ compact = false }: { compact?: boolean }) {
  if (!AFFILIATE_PARTNERS.length) return null;

  return (
    <aside aria-label="Annons från våra partners" className="shrink-0 border-b border-forest/20 bg-forest text-white print:hidden">
      <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 ${compact ? "h-10" : "min-h-12 py-2"}`}>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em]">Annons</span>
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
          {AFFILIATE_PARTNERS.map((partner) => (
            <a key={partner.id} href={partner.bannerUrl} target="_blank" rel="sponsored noopener noreferrer"
              aria-label={`${partner.name} – ${partner.description} (annons, öppnas i ny flik)`}
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/30 px-3 text-xs font-semibold transition-colors hover:bg-white/15 focus-visible:outline-white">
              <span>{partner.name}</span>
              {!compact ? <span className="hidden font-normal text-white/85 sm:inline">· {partner.description}</span> : null}
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
