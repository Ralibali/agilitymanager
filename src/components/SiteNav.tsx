import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X, ArrowRight, ChevronDown, UserRound } from "lucide-react";
import { Paw } from "./Marquee";
import { AffiliateBanner } from "./AffiliateBanner";
import { AFFILIATE_PARTNERS } from "@/lib/affiliate";

/**
 * Huvudnavigationen är grupperad i fyra produktområden plus kontoytan, så att
 * menyn förblir liten även när produkten växer:
 *   Tävlingar · Banor · Träning · Kunskap · Mitt AgilityManager
 */
type NavGroup = {
  label: string;
  to: string;
  links: { to: string; label: string; text?: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tävlingar",
    to: "/tavlingar",
    links: [
      { to: "/tavlingar", label: "Tävlingskalender", text: "Svenska agility- och hooperstävlingar" },
      { to: "/tavlingar/favoriter", label: "Favoriter", text: "Tävlingarna du sparat" },
    ],
  },
  {
    label: "Banor",
    to: "/banplanerare",
    links: [
      { to: "/banplanerare", label: "Banplanerare", text: "Rita i meterskala — gratis, utan konto" },
      { to: "/banor", label: "Banbibliotek", text: "Färdiga banor att utgå från" },
      { to: "/delade-banor", label: "Delade banor", text: "Banor som delats med länk" },
    ],
  },
  {
    label: "Träning",
    to: "/traning",
    links: [
      { to: "/traning", label: "Min träning", text: "Planera pass och följ historiken" },
      { to: "/instruktor", label: "Instruktör", text: "Grupper, uppgifter och feedback" },
      { to: "/elev", label: "Elev", text: "Dina uppgifter från instruktören" },
    ],
  },
  {
    label: "Kunskap",
    to: "/blogg",
    links: [
      { to: "/blogg", label: "Blogg & guider", text: "Bandesign, regler och träningsupplägg" },
      { to: "/funktioner", label: "Funktioner", text: "Allt AgilityManager gör" },
      { to: "/priser", label: "Priser", text: "Banplaneraren är gratis" },
      { to: "/jamfor-hundforsakring", label: "Hundförsäkring", text: "Jämför försäkringar för din hund" },
    ],
  },
];

const ACCOUNT_LINK = { to: "/mitt-agilitymanager", label: "Mitt AgilityManager" };

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

function DesktopGroup({ group, active }: { group: NavGroup; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
          active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
        }`}
      >
        {group.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 top-full w-[19rem] pt-2">
          <ul className="overflow-hidden rounded-2xl border-2 border-ink bg-paper p-1.5 shadow-hard">
            {group.links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3.5 py-2.5 transition-colors hover:bg-ink/5"
                >
                  <span className="block text-sm font-bold text-ink">{l.label}</span>
                  {l.text ? <span className="block text-xs text-ink/55">{l.text}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Stäng mobilmenyn vid navigation — state-justering under render
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

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

  const isGroupActive = (g: NavGroup) =>
    g.links.some((l) => location.pathname === l.to || location.pathname.startsWith(`${l.to}/`));

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 transition-all duration-300">
        {AFFILIATE_PARTNERS.length ? <AffiliateBanner compact /> : (
        <Link
          to="/banplanerare"
          className="group flex h-10 items-center justify-center gap-2 border-b-2 border-ink bg-tang px-3 text-center text-[0.8rem] font-extrabold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ember hover:text-paper sm:text-[0.85rem]"
        >
          <Paw className="h-4 w-4 shrink-0" />
          <span>Banplaneraren är gratis — börja rita utan konto</span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5" />
        </Link>
        )}
        <div
          className={`border-b transition-all duration-300 ${
            scrolled
              ? "border-ink/10 bg-paper/90 backdrop-blur-md"
              : "border-transparent bg-paper/60 backdrop-blur-sm"
          }`}
        >
          <div className="mx-auto flex h-[4.25rem] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Huvudmeny">
            {NAV_GROUPS.map((g) => (
              <DesktopGroup key={g.label} group={g} active={isGroupActive(g)} />
            ))}
            <NavLink
              to={ACCOUNT_LINK.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`
              }
            >
              <UserRound className="h-4 w-4" aria-hidden /> {ACCOUNT_LINK.label}
            </NavLink>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              to="/banplanerare"
              className="pressable shadow-hard-sm hidden items-center gap-2 rounded-full bg-tang whitespace-nowrap px-4 py-2.5 text-[0.84rem] font-bold text-ink sm:inline-flex"
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

      {/* Mobil fullskärmsmeny — grupperad, ett fåtal huvudval */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink text-paper transition-all duration-500 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Meny"
        inert={!open}
        aria-hidden={!open}
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
        <nav className="flex flex-1 flex-col gap-6 px-6 pb-8 pt-2" aria-label="Mobilmeny">
          <NavLink
            to="/"
            onClick={() => setOpen(false)}
            className="border-b border-paper/10 pb-2 font-display text-3xl tracking-[0.04em] text-paper"
          >
            Hem
          </NavLink>
          {NAV_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-tang">{g.label}</p>
              <ul className="mt-2 space-y-1">
                {g.links.map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `block border-b border-paper/10 py-2 text-xl font-semibold ${
                          isActive ? "text-tang" : "text-paper/90"
                        }`
                      }
                    >
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <NavLink
            to={ACCOUNT_LINK.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-b border-paper/10 pb-2 font-display text-3xl tracking-[0.04em] text-paper"
          >
            <UserRound className="h-6 w-6" aria-hidden /> Mitt AgilityManager
          </NavLink>
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
