import { useState } from "react";
import { ArrowRight, CalendarDays, Heart, LayoutGrid, NotebookPen, PenLine, Trophy } from "lucide-react";
import { Link } from "react-router";
import { loadTraining } from "@/features/training/trainingPlans";

const SHORTCUTS = [
  { to: "/banor", icon: LayoutGrid, title: "Hitta en bana", text: "Agility och hoopers, från nollklass och uppåt." },
  { to: "/tavlingar", icon: CalendarDays, title: "Nästa tävling", text: "Sök i den svenska tävlingskalendern." },
  { to: "/traning", icon: NotebookPen, title: "Planera träning", text: "Sätt ett mål och följ upp varje pass." },
  { to: "/tavlingar/favoriter", icon: Heart, title: "Dina favoriter", text: "Samla tävlingarna du vill hålla koll på." },
] as const;

function readNextSession() {
  try {
    const next = loadTraining().filter((session) => !session.completed)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
    return { next, error: false };
  } catch {
    return { next: null, error: true };
  }
}

export default function MobileHome() {
  const [training] = useState(readNextSession);
  const next = training.next;

  return (
    <main className="mobile-home">
      <section className="mobile-home__hero">
        <p className="mobile-kicker"><span aria-hidden="true" /> Agility & hoopers</p>
        <h1>Ut på<br /><span>planen.</span></h1>
        <p className="mobile-home__intro">Från första hindret till nästa tävling. Rita banor, planera pass och samla det som är ditt.</p>
        <Link to="/banplanerare" className="mobile-primary-action">
          <PenLine size={20} aria-hidden="true" /> Rita en bana <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <p className="mobile-home__hint">Banplaneraren är gratis och fungerar utan konto.</p>
        <svg className="mobile-home__course" viewBox="0 0 140 150" fill="none" aria-hidden="true">
          <path d="M28 135C28 110 107 124 110 92S33 78 35 50 101 37 101 13" stroke="currentColor" strokeWidth="4" strokeDasharray="7 8" strokeLinecap="round" />
          <path d="M14 116H44M18 106V126M40 106V126M93 76H123M97 66V86M119 66V86M22 32H52M26 22V42M48 22V42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </section>

      <section className="mobile-home__section" aria-labelledby="mobile-get-started">
        <div className="mobile-section-heading">
          <h2 id="mobile-get-started">Vad vill du göra?</h2>
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

      <section className="mobile-home__section" aria-labelledby="mobile-next-session">
        <div className="mobile-section-heading">
          <h2 id="mobile-next-session">Din träning</h2>
          <Link to="/traning">Alla pass <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <Link className="mobile-training-card" to="/traning">
          <NotebookPen size={24} aria-hidden="true" />
          <div>
            {next ? (
              <>
                <p className="mobile-training-card__label">Planerat pass · {new Date(`${next.date}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}</p>
                <h3>{next.title}</h3>
                <p>{next.dog ? `${next.dog} · ` : ""}{next.goal}</p>
              </>
            ) : (
              <>
                <h3>{training.error ? "Öppna dina träningspass" : "Ett mål för nästa pass"}</h3>
                <p>{training.error ? "Sparade pass kunde inte läsas. Öppna träningen för att hantera dem." : "Välj vad ni ska öva, koppla en bana och spara tankarna efteråt."}</p>
              </>
            )}
          </div>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </section>

      <section className="mobile-home__more" aria-label="Mer i AgilityManager">
        <Link to="/resultat"><Trophy size={19} aria-hidden="true" /> Resultat & meriter <ArrowRight size={18} aria-hidden="true" /></Link>
        <Link to="/blogg">Guider för agility & hoopers <ArrowRight size={18} aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
