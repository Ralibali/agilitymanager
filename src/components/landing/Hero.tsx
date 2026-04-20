import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HeroDashboardMockup } from "./HeroDashboardMockup";
import { FadeIn, MagneticButton } from "@/components/motion";
import { motion as fmMotion } from "framer-motion";
import { motion } from "@/lib/motion";

const trackEvent = (name: string) => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.flock) window.flock(name);
};

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 bg-page font-sans-ds overflow-hidden">
      <div className="max-w-[1180px] mx-auto px-5 md:px-12 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-center">
        {/* Vänster kolumn – sekventiell reveal */}
        <div>
          <FadeIn delay={0.04} duration="smooth">
            <span className="inline-flex items-center px-2.5 py-1 rounded-pill bg-brand-50 text-brand-900 text-[11px] uppercase tracking-[0.08em] mb-6">
              Byggd av svenska tävlingsförare
            </span>
          </FadeIn>

          <FadeIn delay={0.08} duration="slow">
            <h1 className="text-[40px] sm:text-[48px] md:text-[56px] leading-[1.05] tracking-[-0.025em] font-medium">
              <span className="text-brand-600 block">Träna smartare.</span>
              <span className="text-text-primary block">Tävla bättre.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2} duration="slow">
            <p className="mt-5 text-[16px] leading-[1.6] text-text-secondary max-w-[520px]">
              Sveriges enda tränings- och tävlingsapp för agility och hoopers. Med
              inbyggd coach, tävlingskalender från Agida och AI-insikter baserat
              på dina pass.
            </p>
          </FadeIn>

          <fmMotion.div
            className="mt-7 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: motion.duration.smooth,
              delay: 0.4,
              ease: motion.ease.spring,
            }}
            style={{ willChange: "opacity, transform" }}
          >
            <MagneticButton
              onClick={() => {
                trackEvent("hero_primary_cta_click");
                navigate("/auth?mode=signup");
              }}
              className="h-12 sm:h-11 w-full sm:w-auto px-5 inline-flex items-center justify-center gap-1.5 rounded-ds-md bg-brand-600 text-white text-[15px] sm:text-[14px] font-medium hover:bg-brand-900 transition-colors active:scale-[0.98] [-webkit-tap-highlight-color:transparent]"
              strength={5}
            >
              Kom igång gratis <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            <a
              href="#features"
              onClick={() => trackEvent("hero_secondary_cta_click")}
              className="h-12 sm:h-11 w-full sm:w-auto px-5 inline-flex items-center justify-center rounded-ds-md border border-border-default text-text-primary text-[15px] sm:text-[14px] font-medium hover:bg-subtle transition-colors active:scale-[0.98] [-webkit-tap-highlight-color:transparent]"
            >
              Se hur det fungerar
            </a>
          </fmMotion.div>

          <FadeIn delay={0.55} duration="smooth">
            <p className="mt-5 text-[12px] text-text-tertiary">
              <span className="text-amber-500" aria-hidden>★★★★★</span> Inga kort
              krävs · Gratis för 1 hund · Pro från 99 kr/mån
            </p>
          </FadeIn>
        </div>

        {/* Höger kolumn – mockup, parallell med rubriken */}
        <FadeIn
          delay={0}
          direction="left"
          distance={24}
          duration="languid"
          ease="spring"
          className="relative md:pl-4"
        >
          <HeroDashboardMockup />
        </FadeIn>
      </div>
    </section>
  );
}
