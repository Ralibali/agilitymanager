import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Home, ArrowRight } from "lucide-react";
import { motion as M, prefersReducedMotion } from "@/lib/motion";

const POPULAR = [
  { label: "Blogg", to: "/blogg" },
  { label: "Raser", to: "/raser" },
  { label: "Tävlingar", to: "/tavlingar" },
  { label: "Om agility", to: "/om-agility" },
];

const NotFound = () => {
  const location = useLocation();
  const reduced = prefersReducedMotion();

  useEffect(() => {
    // Logged for internal debugging only — no user data exposed
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Sidan hittades inte – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="relative min-h-screen flex items-center justify-center bg-background px-5 overflow-hidden">
        {/* Soft floating gradient bobs (decorative) */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 1.2, ease: M.ease.smooth }}
          className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)",
          }}
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1.2, ease: M.ease.smooth, delay: 0.1 }}
          className="pointer-events-none absolute -bottom-32 -right-24 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent) / 0.16), transparent 70%)",
          }}
        />

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: M.duration.smooth, ease: M.ease.out }}
          className="relative text-center max-w-md"
        >
          {/* 404-tecken med en lekfull spring */}
          <motion.p
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: M.duration.slow,
              ease: M.ease.snap,
              delay: 0.05,
            }}
            className="text-[88px] leading-none font-display font-bold text-primary mb-3 select-none"
          >
            4
            <motion.span
              aria-hidden
              animate={
                reduced
                  ? undefined
                  : { rotate: [0, -8, 8, -4, 0] }
              }
              transition={
                reduced
                  ? undefined
                  : {
                      duration: 2.4,
                      repeat: Infinity,
                      repeatDelay: 1.2,
                      ease: M.ease.smooth,
                    }
              }
              className="inline-block origin-bottom"
            >
              0
            </motion.span>
            4
          </motion.p>

          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: M.duration.base,
              ease: M.ease.out,
              delay: 0.15,
            }}
            className="text-xl font-display font-semibold text-foreground mb-2"
          >
            Sidan hittades inte
          </motion.h1>
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: M.duration.base,
              ease: M.ease.out,
              delay: 0.2,
            }}
            className="text-sm text-muted-foreground mb-7"
          >
            Sidan du letar efter finns inte eller har flyttats.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: M.duration.base,
              ease: M.ease.out,
              delay: 0.25,
            }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-ds-md bg-primary text-primary-foreground text-sm font-medium transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.4)] active:scale-[0.97]"
            >
              <Home size={16} />
              Tillbaka till startsidan
            </Link>
          </motion.div>

          {/* Populära länkar – staggered chips */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: M.stagger.tight, delayChildren: 0.4 },
              },
            }}
            className="mt-10"
          >
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-3">
              Populära sidor
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR.map((p) => (
                <motion.div
                  key={p.to}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{
                    duration: M.duration.base,
                    ease: M.ease.out,
                  }}
                >
                  <Link
                    to={p.to}
                    className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card text-[12px] text-foreground transition-all duration-[180ms] hover:border-primary/40 hover:text-primary hover:-translate-y-px"
                  >
                    {p.label}
                    <ArrowRight
                      size={12}
                      className="transition-transform duration-[180ms] group-hover:translate-x-0.5"
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default NotFound;
