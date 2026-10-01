import { LayoutGrid, PenLine, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";
import { mobileSection } from "./navigation";
import type { MobileSection } from "./navigation";

const TABS = [
  { section: "planner", to: "/banplanerare", label: "Rita", icon: PenLine },
  { section: "library", to: "/banor", label: "Banor", icon: LayoutGrid },
  { section: "account", to: "/mitt-agilitymanager", label: "Mitt", icon: UserRound },
] as const;

const SECTION_LINKS: Record<MobileSection, { to: string; label: string }[]> = {
  planner: [],
  library: [
    { to: "/banor", label: "Banbibliotek" },
    { to: "/delade-banor", label: "Delade banor" },
  ],
  account: [
    { to: "/mitt-agilitymanager", label: "Konto" },
    { to: "/integritet", label: "Integritet" },
    { to: "/radera-konto", label: "Radera konto" },
  ],
};

export function MobileSectionNavigation() {
  const { pathname } = useLocation();
  const section = mobileSection(pathname);
  if (!section || !SECTION_LINKS[section].length) return null;

  return (
    <nav className="mobile-section-navigation" aria-label="Sidor i det här området">
      {SECTION_LINKS[section].map(({ to, label }) => {
        const active = pathname === to;
        return (
          <Link key={to} to={to} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function MobileNavigation() {
  const { pathname } = useLocation();
  const section = mobileSection(pathname);

  return (
    <nav className="mobile-navigation" aria-label="Appens huvudmeny">
      <div className="mobile-navigation__inner">
        {TABS.map(({ section: tabSection, to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={section === tabSection ? "mobile-tab mobile-tab--active" : "mobile-tab"}
            aria-current={section === tabSection ? "page" : undefined}
          >
            <Icon size={23} strokeWidth={section === tabSection ? 2.5 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
