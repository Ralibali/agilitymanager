import { CalendarDays, LayoutGrid, NotebookPen, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";
import { mobileSection } from "./navigation";
import type { MobileSection } from "./navigation";

const TABS = [
  { section: "courses", to: "/banor", label: "Banor", icon: LayoutGrid },
  { section: "competitions", to: "/tavlingar", label: "Tävlingar", icon: CalendarDays },
  { section: "training", to: "/traning", label: "Träning", icon: NotebookPen },
  { section: "account", to: "/mitt-agilitymanager", label: "Mitt", icon: UserRound },
] as const;

const SECTION_LINKS: Record<MobileSection, { to: string; label: string }[]> = {
  courses: [
    { to: "/banor", label: "Banbibliotek" },
    { to: "/banplanerare", label: "Rita bana" },
    { to: "/delade-banor", label: "Delade banor" },
  ],
  competitions: [
    { to: "/tavlingar", label: "Kalender" },
    { to: "/tavlingar/favoriter", label: "Favoriter" },
    { to: "/resultat", label: "Resultat" },
    { to: "/klubbar", label: "Klubbar" },
  ],
  training: [
    { to: "/traning", label: "Träningspass" },
    { to: "/instruktor", label: "Instruktör" },
    { to: "/elev", label: "Elev" },
  ],
  account: [
    { to: "/mitt-agilitymanager", label: "Konto" },
    { to: "/integritet", label: "Integritet" },
    { to: "/radera-konto", label: "Radera konto" },
  ],
  knowledge: [
    { to: "/blogg", label: "Guider" },
    { to: "/funktioner", label: "Funktioner" },
    { to: "/priser", label: "Priser" },
  ],
};

export function MobileSectionNavigation() {
  const { pathname } = useLocation();
  const section = mobileSection(pathname);
  if (!section || pathname === "/banplanerare") return null;

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
