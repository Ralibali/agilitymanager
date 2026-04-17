import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Funktioner" },
  { href: "#coach", label: "Coach" },
  { href: "#hoopers", label: "Hoopers" },
  { href: "#pricing", label: "Priser" },
  { href: "/blog", label: "Blogg", external: true },
];

const trackEvent = (name: string) => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.flock) window.flock(name);
};

export function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goAuth = (mode: "login" | "signup", track: string) => {
    trackEvent(track);
    navigate(mode === "login" ? "/auth" : "/auth?mode=signup");
    setMobileOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 h-16 transition-colors duration-200",
        scrolled
          ? "bg-page/80 backdrop-blur-md border-b border-border-subtle"
          : "bg-transparent",
      )}
    >
      <div className="max-w-[1180px] mx-auto h-full px-5 md:px-12 flex items-center justify-between font-sans-ds">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
          aria-label="AgilityManager startsida"
        >
          <span
            aria-hidden
            className="w-7 h-7 rounded-ds-sm bg-inverse flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
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
          <span className="text-[15px] tracking-tight text-text-primary">
            agilitymanager
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Huvudmeny">
          {NAV_LINKS.map((l) =>
            l.external ? (
              <Link
                key={l.href}
                to={l.href}
                className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => goAuth("login", "nav_login_click")}
            className="h-9 px-3 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Logga in
          </button>
          <button
            onClick={() => goAuth("signup", "nav_cta_click")}
            className="h-9 px-4 text-[13px] rounded-ds-md bg-brand-600 text-white hover:bg-brand-900 transition-colors"
          >
            Kom igång gratis
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 -mr-2 text-text-primary"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-page border-b border-border-subtle font-sans-ds">
          <nav className="px-5 py-4 flex flex-col gap-1" aria-label="Mobilmeny">
            {NAV_LINKS.map((l) =>
              l.external ? (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-[14px] text-text-primary"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-[14px] text-text-primary"
                >
                  {l.label}
                </a>
              ),
            )}
            <div className="h-px bg-border-subtle my-2" />
            <button
              onClick={() => goAuth("login", "nav_login_click")}
              className="text-left py-2.5 text-[14px] text-text-secondary"
            >
              Logga in
            </button>
            <button
              onClick={() => goAuth("signup", "nav_cta_click")}
              className="mt-1 h-11 rounded-ds-md bg-brand-600 text-white text-[14px]"
            >
              Kom igång gratis
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
