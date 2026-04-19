import { Link } from "react-router-dom";

const COLS = [
  {
    title: "Produkt",
    links: [
      { label: "Funktioner", href: "/#features" },
      { label: "Coach", href: "/#coach" },
      { label: "Priser", href: "/#pricing" },
      { label: "Blogg", href: "/blog" },
      { label: "Försäkringsjämförelse", href: "/insurance" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Kontakt", href: "mailto:info@auroramedia.se", external: true },
      { label: "Integritetspolicy", href: "/privacy" },
      { label: "Cookiepolicy", href: "/cookies" },
    ],
  },
  {
    title: "Sport",
    links: [
      { label: "Om agility", href: "/agility" },
      { label: "Om hoopers", href: "/hoopers" },
      { label: "Hoopers-regler", href: "/hoopers/rules" },
      { label: "SAgiK", href: "https://www.sagik.se", external: true },
      { label: "SHoK", href: "https://www.shok.se", external: true },
      { label: "Agidadata.se", href: "https://www.agilitydata.se", external: true },
      { label: "SKK", href: "https://www.skk.se", external: true },
    ],
  },
];

export function LandingFooterV2() {
  return (
    <footer className="bg-inverse text-text-on-inverse font-sans-ds">
      <div className="max-w-[1180px] mx-auto px-5 md:px-12 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] uppercase tracking-[0.08em] text-text-on-inverse/60 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-text-on-inverse/85 hover:text-text-on-inverse transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        to={l.href}
                        className="text-[13px] text-text-on-inverse/85 hover:text-text-on-inverse transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-text-on-inverse/60 mb-4">
              Följ
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://www.instagram.com/agilitymanager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[13px] text-text-on-inverse/85 hover:text-text-on-inverse transition-all duration-[180ms] hover:scale-[1.08] origin-left"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/agilitymanager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[13px] text-text-on-inverse/85 hover:text-text-on-inverse transition-all duration-[180ms] hover:scale-[1.08] origin-left"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>


        <div className="border-t border-text-on-inverse/10 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-6 h-6 rounded-ds-sm bg-text-on-inverse/10 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                <path
                  d="M4 17 C 8 9, 16 9, 20 17"
                  stroke="hsl(var(--brand-500))"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="4" cy="17" r="1.6" fill="hsl(var(--brand-500))" />
                <circle cx="20" cy="17" r="1.6" fill="hsl(var(--brand-500))" />
              </svg>
            </span>
            <span className="text-[13px] text-text-on-inverse/85">
              agilitymanager · Träna smartare. Tävla bättre.
            </span>
          </div>
          <p className="text-[12px] text-text-on-inverse/50">
            © {new Date().getFullYear()} AgilityManager · En produkt från Aurora
            Media AB
          </p>
        </div>
      </div>
    </footer>
  );
}
