import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X, ArrowRight } from "lucide-react";
import { Paw } from "./Marquee";

export const NAV_LINKS = [
  { to: "/funktioner", label: "Funktioner" },
  { to: "/banplanerare", label: "Banplanerare" },
  { to: "/banor", label: "Banbibliotek" },
  { to: "/tavlingar", label: "Tävlingar" },
  { to: "/priser", label: "100% gratis" },
];

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="AgilityManager – startsida">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-tang text-ink shadow-hard-sm transition-transform duration-300 group-hover:rotate-[-8deg]">
        <Paw className="h-5 w-5" />
      </span>
      <span className={`font-display text-[1.45rem] leading-none tracking-[0.05em] ${dark ? "text-paper" : "text-ink"}`}>
        Agility<span className="text-forest">Manager</span>
      </span>
    </Link>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "" : ""
        }`}
      >
        {/* Gratis-bandet — planeraren är alltid stjärnan */}
        <Link
          to="/banplanerare"
          className="group flex h-10 items-center justify-center gap-2 border-b-2 border-ink bg-tang px-3 text-center text-[0.8rem] font-extrabold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ember hover:text-paper sm:text-[0.85rem]"
        >
          <Paw className="h-4 w-4 shrink-0" />
          <span>Banplaneraren är 100% gratis — för alltid</span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5" />
        </Link>
        <div
          className={`border-b transition-all duration-300 ${
            scrolled
              ? "border-ink/10 bg-paper/90 backdrop-blur-md"
              : "border-transparent bg-paper/60 backdrop-blur-sm"
          }`}
        >
          <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Huvudmeny">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-[0.92rem] font-semibold transition-colors ${
                    isActive ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              to="/banplanerare"
              className="pressable shadow-hard-sm hidden items-center gap-2 rounded-full bg-tang px-5 py-2.5 text-[0.92rem] font-bold text-ink sm:inline-flex"
            >
              Rita gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-paper lg:hidden"
              aria-label="Öppna meny"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Mobil fullskärmsmeny */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-ink text-paper transition-all duration-500 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Meny"
      >
        <div className="flex h-[4.25rem] items-center justify-between px-4 sm:px-6">
          <Logo dark />
          <button
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border-2 border-paper/40"
            aria-label="Stäng meny"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-1 px-6" aria-label="Mobilmeny">
          {[{ to: "/", label: "Hem" }, ...NAV_LINKS].map((l, i) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `border-b border-paper/10 py-4 font-display text-5xl tracking-[0.04em] transition-all duration-500 ${
                  open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                } ${isActive ? "text-tang" : "text-paper hover:text-tang"}`
              }
              style={{ transitionDelay: `${120 + i * 60}ms` }}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 pb-10">
          <Link
            to="/banplanerare"
            className="pressable pressable-light shadow-hard-paper flex items-center justify-center gap-2 rounded-full bg-tang px-6 py-4 text-lg font-bold text-ink"
          >
            Öppna banplaneraren — gratis <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </>
  );
}
