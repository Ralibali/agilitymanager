import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { motion as M } from "@/lib/motion";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#features", label: "Funktioner" },
  { href: "/banplanerare", label: "Gratis banplanerare", external: true },
  { href: "#coach", label: "Coach" },
  { href: "#hoopers", label: "Hoopers" },
  { href: "#pricing", label: "Priser" },
  { href: "/blogg", label: "Blogg", external: true },
];

const trackEvent = (name: string) => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.flock) window.flock(name);
};

/** Underline-sweep länk – hover-animation från vänster→höger */
function NavLinkSweep({
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) {
  return (
    <a
      {...props}
      className={cn(
        "relative text-[13px] text-stone hover:text-forest transition-colors",
        "after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-full",
        "after:bg-forest after:origin-left after:scale-x-0 hover:after:scale-x-100",
        "after:transition-transform after:duration-[240ms] after:ease-[cubic-bezier(0.4,0,0.2,1)]",
        props.className,
      )}
    >
      {children}
    </a>
  );
}

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
        "bg-bone/80 backdrop-blur-sm border-b",
        scrolled ? "border-forest/8" : "border-transparent",
      )}
    >
      <div className="max-w-6xl mx-auto h-full px-6 md:px-6 flex items-center justify-between">
        {/* Logo + easter-egg wiggle */}
        <Link
          to="/"
          className="group flex items-center gap-2 shrink-0"
          aria-label="AgilityManager startsida"
        >
          <span
            aria-hidden
            className="w-7 h-7 rounded-ds-sm bg-forest flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:group-hover:[transform:rotate(-3deg)_scale(1.06)]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <path
                d="M4 17 C 8 9, 16 9, 20 17"
                stroke="#B5F94A"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="4" cy="17" r="1.6" fill="#B5F94A" />
              <circle cx="20" cy="17" r="1.6" fill="#B5F94A" />
            </svg>
          </span>
          <span className="text-[15px] tracking-tight text-forest transition-colors group-hover:text-forest-soft">
            agility<span className="font-normal opacity-60">manager</span>
          </span>
        </Link>

        {/* Desktop nav – sweep underline */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Huvudmeny">
          {NAV_LINKS.map((l) =>
            l.external ? (
              <NavLinkSweep
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(l.href);
                }}
              >
                {l.label}
              </NavLinkSweep>
            ) : (
              <NavLinkSweep key={l.href} href={l.href}>
                {l.label}
              </NavLinkSweep>
            ),
          )}
        </nav>

        {/* Desktop CTAs – tap-scale + sub-hover lift */}
        <div className="hidden md:flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: M.duration.fast, ease: M.ease.smooth }}
            onClick={() => goAuth("login", "nav_login_click")}
            className="h-9 px-3 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Logga in
          </motion.button>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: M.duration.fast, ease: M.ease.smooth }}
            onClick={() => goAuth("signup", "nav_cta_click")}
            className="h-9 px-4 text-[13px] rounded-ds-md bg-brand-600 text-white hover:bg-brand-900 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_-2px_rgba(26,107,60,0.35)]"
          >
            Kom igång gratis
          </motion.button>
        </div>

        {/* Mobile toggle – ≥44px target */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={{ duration: M.duration.fast }}
          className="md:hidden flex items-center justify-center h-11 w-11 -mr-2 text-text-primary [-webkit-tap-highlight-color:transparent] rounded-md focus-visible:outline-none focus-visible:bg-subtle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={mobileOpen}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mobileOpen ? "x" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: M.duration.fast, ease: M.ease.smooth }}
              className="block"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile dropdown – slide-in + stagger */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: M.duration.base, ease: M.ease.smooth }}
            className="md:hidden absolute top-16 inset-x-0 bg-page border-b border-border-subtle font-sans-ds overflow-hidden"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: M.stagger.tight } },
              }}
              className="px-5 py-4 flex flex-col gap-1"
              aria-label="Mobilmeny"
            >
              {NAV_LINKS.map((l) => (
                <motion.div
                  key={l.href}
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: M.duration.base, ease: M.ease.out }}
                >
                  {l.external ? (
                    <Link
                      to={l.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center min-h-[48px] py-3 text-[15px] text-text-primary [-webkit-tap-highlight-color:transparent] active:bg-subtle/60 -mx-2 px-2 rounded-md transition-colors"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center min-h-[48px] py-3 text-[15px] text-text-primary [-webkit-tap-highlight-color:transparent] active:bg-subtle/60 -mx-2 px-2 rounded-md transition-colors"
                    >
                      {l.label}
                    </a>
                  )}
                </motion.div>
              ))}
              <div className="h-px bg-border-subtle my-2" />
              <motion.button
                variants={{
                  hidden: { opacity: 0, x: -8 },
                  visible: { opacity: 1, x: 0 },
                }}
                onClick={() => goAuth("login", "nav_login_click")}
                className="flex items-center text-left min-h-[48px] py-3 text-[15px] text-text-secondary [-webkit-tap-highlight-color:transparent] active:bg-subtle/60 -mx-2 px-2 rounded-md transition-colors"
              >
                Logga in
              </motion.button>
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 4 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => goAuth("signup", "nav_cta_click")}
                className="mt-2 h-12 rounded-ds-md bg-brand-600 text-white text-[15px] font-medium [-webkit-tap-highlight-color:transparent] active:bg-brand-900 transition-colors"
              >
                Kom igång gratis
              </motion.button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
