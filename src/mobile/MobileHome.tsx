import { ArrowRight, FolderOpen, LayoutGrid } from "lucide-react";
import { Link } from "react-router";

const SHORTCUTS = [
  { to: "/banor", icon: LayoutGrid, title: "Banbibliotek", text: "Färdiga banor för agility och hoopers att öppna och anpassa." },
  { to: "/mina-banor", icon: FolderOpen, title: "Mina banor", text: "Dina lokalt sparade banor, redo att öppna och fortsätta med." },
] as const;

export default function MobileHome() {
  return (
    <main className="mobile-home">
      <section className="mobile-home__hero">
        <p className="mobile-kicker"><span aria-hidden="true" /> Agility & hoopers</p>
        <h1>Ut på<br /><span>planen.</span></h1>
        <p className="mobile-home__intro">Rita banor för agility och hoopers. Placera hinder, finjustera banlinjen och exportera din bana.</p>
        <Link to="/banplanerare" className="mobile-primary-action">
          Öppna banplaneraren <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <p className="mobile-home__hint">Banutkastet sparas automatiskt på din enhet.</p>
        <svg className="mobile-home__course" viewBox="0 0 140 150" fill="none" aria-hidden="true">
          <path d="M28 135C28 110 107 124 110 92S33 78 35 50 101 37 101 13" stroke="currentColor" strokeWidth="4" strokeDasharray="7 8" strokeLinecap="round" />
          <path d="M14 116H44M18 106V126M40 106V126M93 76H123M97 66V86M119 66V86M22 32H52M26 22V42M48 22V42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </section>

      <section className="mobile-home__section" aria-labelledby="mobile-get-started">
        <div className="mobile-section-heading">
          <h2 id="mobile-get-started">Börja med en bana</h2>
        </div>
        <div className="mobile-shortcuts">
          {SHORTCUTS.map(({ to, icon: Icon, title, text }) => (
            <Link to={to} key={to} className="mobile-shortcut">
              <span className="mobile-shortcut__icon"><Icon size={23} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
              <ArrowRight className="mobile-shortcut__arrow" size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
