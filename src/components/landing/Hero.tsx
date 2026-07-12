import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { HeroDashboardMockup } from "./HeroDashboardMockup";
import { FadeIn } from "@/components/motion";
import { motion as fmMotion } from "framer-motion";
import { motion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { BrandPill } from "@/components/brand/BrandPill";
import { CoursePath } from "@/components/brand/CoursePath";
import { trackGrowthEvent } from "@/lib/growthEvents";

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 pb-16 md:pt-32 md:pb-24 bg-bone overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6 md:px-6 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-center">
        {/* Vänster kolumn */}
        <div>
          <FadeIn delay={0.04} duration="smooth">
            <BrandPill color="moss" dot className="mb-6">
              14 dagar Pro gratis · ingen kortuppgift
            </BrandPill>
          </FadeIn>

          <FadeIn delay={0.08} duration="slow">
            <h1 className="font-display font-medium text-5xl md:text-7xl leading-[1.0] tracking-[-0.035em]">
              <span className="sr-only">AgilityManager – träningsapp för agility och hoopers. </span>
              <span className="text-forest block" aria-hidden="true">Bli teamet</span>
              <span className="text-brand-600 block" aria-hidden="true">ni tränar för.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2} duration="slow">
            <p className="mt-6 text-base text-stone leading-relaxed max-w-prose">
              Samla träning, mål, banor och tävlingar på ett ställe. Se vad som faktiskt fungerar för din hund och få ett tydligt nästa steg inför varje pass.
            </p>
          </FadeIn>

          <FadeIn delay={0.28} duration="smooth">
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-[560px]">
              {[
                ["🐾", "Minns känslan", "Spara vad som fungerade – inte bara siffrorna."],
                ["🎯", "Träna smartare", "Se fokus och nästa steg inför varje pass."],
                ["📈", "Följ utvecklingen", "Upptäck framsteg som annars är lätta att missa."],
              ].map(([emoji, title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="text-lg">{emoji}</div>
                  <div className="text-[13px] font-medium text-forest mt-1">{title}</div>
                  <div className="text-[11px] leading-snug text-stone mt-1">{text}</div>
                </div>
              ))}
            </div>
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
            <Button
              variant="brand"
              onClick={() => {
                trackGrowthEvent("landing_cta_clicked", {
                  placement: "hero_primary",
                  destination: "signup",
                });
                navigate("/auth?mode=signup&source=landing_hero");
              }}
              className="h-12 sm:h-11"
            >
              Starta gratis – 14 dagar Pro
            </Button>
            <Button
              variant="brand-outline"
              onClick={() => {
                trackGrowthEvent("landing_cta_clicked", {
                  placement: "hero_secondary",
                  destination: "course_planner",
                });
                navigate("/banplanerare?source=landing_hero");
              }}
              className="h-12 sm:h-11"
            >
              Testa banplaneraren direkt
            </Button>
          </fmMotion.div>

          <FadeIn delay={0.55} duration="smooth">
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-stone">
              <span>Ingen kortuppgift</span>
              <span className="inline-flex items-center gap-1"><Heart size={13} className="text-brand-600" /> Gratisversion efter provperioden</span>
              <span>Byggt för svensk agility & hoopers</span>
            </div>
          </FadeIn>
        </div>

        {/* Höger kolumn – mockup med dekorativ CoursePath bakom */}
        <FadeIn
          delay={0}
          direction="left"
          distance={24}
          duration="languid"
          ease="spring"
          className="relative md:pl-4"
        >
          <div className="relative">
            <CoursePath
              variant="weave"
              className="absolute top-[-30px] right-[-20px] w-[280px] -z-10 opacity-90"
            />
            <div className="relative">
              <HeroDashboardMockup />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
