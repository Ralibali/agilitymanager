import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { HeroDashboardMockup } from "./HeroDashboardMockup";
import { FadeIn, MagneticButton } from "@/components/motion";
import { motion as fmMotion } from "framer-motion";
import { motion } from "@/lib/motion";

const trackEvent = (name: string) => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.flock) window.flock(name);
};

/**
 * Soft UI hero – matchar v3-dashboardens lugna premium-känsla.
 * Varm off-white bakgrund, gröna accenter, tunna borders, mjuka shadows.
 */
export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 bg-page font-sans-ds overflow-hidden">
      {/* Mjuk gradient-glow bakom */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand-500/8 blur-3xl" />
        <div className="absolute top-44 -left-24 h-80 w-80 rounded-full bg-amber-200/15 blur-3xl" />
      </div>

      <div className="relative max-w-[1180px] mx-auto px-5 md:px-12 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-center">
        {/* Vänster kolumn */}
        <div>
          <FadeIn delay={0.04} duration="smooth">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-900 text-[11px] uppercase tracking-[0.08em] mb-6 border border-brand-600/10">
              <Sparkles size={13} /> Lugnt, premium, svensk agility & hoopers
            </span>
          </FadeIn>

          <FadeIn delay={0.08} duration="slow">
            <h1 className="text-[40px] sm:text-[52px] md:text-[64px] leading-[1.02] tracking-[-0.035em] font-medium">
              <span className="text-text-primary block">Din träning.</span>
              <span className="text-brand-600 block">Lugnare, tydligare.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2} duration="slow">
            <p className="mt-6 text-[17px] leading-[1.7] text-text-secondary max-w-[540px]">
              AgilityManager samlar pass, mål, banor och tävlingar i en lugn vy. Ingen stress – bara tydlig riktning för dig och din hund.
            </p>
          </FadeIn>

          <fmMotion.div
            className="mt-8 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: motion.duration.smooth,
              delay: 0.32,
              ease: motion.ease.spring,
            }}
            style={{ willChange: "opacity, transform" }}
          >
            <MagneticButton
              onClick={() => {
                trackEvent("hero_primary_cta_click");
                navigate("/auth?mode=signup");
              }}
              className="h-12 sm:h-11 w-full sm:w-auto px-6 inline-flex items-center justify-center gap-1.5 rounded-ds-md bg-brand-600 text-white text-[15px] sm:text-[14px] font-medium hover:bg-brand-900 transition-colors active:scale-[0.98] [-webkit-tap-highlight-color:transparent] shadow-lg shadow-brand-600/20"
              strength={5}
            >
              Kom igång gratis <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            <button
              type="button"
              onClick={() => {
                trackEvent("hero_free_planner_cta_click");
                navigate("/banplanerare");
              }}
              className="h-12 sm:h-11 w-full sm:w-auto px-6 inline-flex items-center justify-center rounded-ds-md border border-border-default bg-white/80 text-text-primary text-[15px] sm:text-[14px] font-medium hover:bg-subtle transition-colors active:scale-[0.98] [-webkit-tap-highlight-color:transparent]"
            >
              Gratis banplanerare
            </button>
          </fmMotion.div>

          <FadeIn delay={0.5} duration="smooth">
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-text-tertiary">
              <span>
                <span className="text-amber-500" aria-hidden>★★★★★</span> Inga kort krävs
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart size={13} className="text-brand-600" /> Gratis för 1 hund
              </span>
              <span>Byggt för svensk agility & hoopers</span>
            </div>
          </FadeIn>
        </div>

        {/* Höger kolumn – dashboard-mockup med mjuk halo */}
        <FadeIn
          delay={0}
          direction="left"
          distance={24}
          duration="languid"
          ease="spring"
          className="relative md:pl-4"
        >
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-500/15 via-transparent to-amber-200/20 blur-2xl" />
            <div className="relative">
              <HeroDashboardMockup />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
