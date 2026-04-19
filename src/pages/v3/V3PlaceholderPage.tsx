import { useLocation } from "react-router-dom";
import { V3_NAV_GROUPS } from "@/components/v3/navConfig";

/**
 * Tillfällig placeholder för v3-rutter (Fas 2).
 * Visar route-namn + en mjuk demo-yta så vi kan navigera och testa shellen.
 * Byts ut i Fas 3+ mot riktiga sidor.
 */
export default function V3PlaceholderPage() {
  const { pathname } = useLocation();
  const all = V3_NAV_GROUPS.flatMap((g) => g.items);
  const item = all.find((i) => i.path === pathname);
  const label = item?.label ?? "v3";

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-8 lg:py-12">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary mb-2">
          v3 · {label}
        </div>
        <h1 className="font-v3-display text-[40px] lg:text-[56px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
          {label}
        </h1>
        <p className="text-v3-base text-v3-text-secondary mt-3 max-w-xl">
          Den här sidan är en placeholder i nya v3-shellen. Sidebar, bottom-nav och plus-FAB
          ska kännas precis rätt – navigera runt och testa.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "Sidebar collapse", desc: "Klicka pilen längst upp till höger i sidebaren." },
          { title: "Mobil bottom-nav", desc: "Krymp fönstret. Plusknappen öppnar snabbåtgärder." },
          { title: "Mer-sheet", desc: "Tryck på 'Mer' längst till höger i mobilnavet." },
          { title: "Snabbgenvägar", desc: "Plus-knappen ska kännas central – Strava-aktig." },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-v3-xl bg-v3-canvas-elevated p-5 shadow-v3-xs border border-v3-canvas-sunken/40"
          >
            <div className="text-v3-sm font-medium text-v3-text-primary">{c.title}</div>
            <div className="text-v3-sm text-v3-text-secondary mt-1">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
