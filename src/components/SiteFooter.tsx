import { Link } from "react-router";
import { Paw } from "./Marquee";

const COLS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Verktyget",
    links: [
      { to: "/banplanerare", label: "Banplaneraren" },
      { to: "/funktioner", label: "Funktioner" },
      { to: "/banor", label: "Banbibliotek" },
      { to: "/priser", label: "Allt är gratis" },
    ],
  },
  {
    title: "Community",
    links: [
      { to: "/tavlingar", label: "Tävlingskalender" },
      { to: "/banor", label: "Färdiga banor" },
      { to: "/priser", label: "Nyhetsbrevet" },
      { to: "/banplanerare", label: "Dela en bana" },
    ],
  },
  {
    title: "Sporter",
    links: [
      { to: "/banplanerare", label: "Agility" },
      { to: "/banplanerare?sport=hoopers", label: "Hoopers" },
      { to: "/tavlingar", label: "Tävla" },
      { to: "/", label: "Träna" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-tang text-ink">
                <Paw className="h-5 w-5" />
              </span>
              <span className="font-display text-2xl tracking-[0.05em]">
                Agility<span className="text-tang">Manager</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm leading-relaxed text-paper/60">
              Sportens gratisverktyg — banplanerare, banbibliotek och
              tävlingskalender för agility och hoopers. Rita fritt, dela mot din e-post.
            </p>
            <Link
              to="/banplanerare"
              className="pressable pressable-light shadow-hard-paper mt-7 inline-flex items-center gap-2 rounded-full bg-tang px-6 py-3.5 font-bold text-ink"
            >
              Börja rita — helt gratis
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLS.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-paper/40">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-[0.95rem] font-medium text-paper/75 transition-colors hover:text-tang"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 select-none overflow-hidden" aria-hidden>
          <div className="whitespace-nowrap font-display text-[19vw] leading-[0.85] tracking-[0.02em] text-paper/[0.07] lg:text-[13rem]">
            AGILITYMANAGER
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-paper/10 pt-6 text-sm text-paper/45 sm:flex-row sm:items-center">
          <p>© 2026 AgilityManager · Redesignkoncept</p>
          <div className="flex gap-5">
            <span className="cursor-pointer transition-colors hover:text-paper">Integritet</span>
            <span className="cursor-pointer transition-colors hover:text-paper">Cookies</span>
            <span className="cursor-pointer transition-colors hover:text-paper">Villkor</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
