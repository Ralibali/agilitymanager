import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Award, Heart, Trophy, ClipboardList, ArrowRight, ClipboardCheck } from "lucide-react";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { Disclaimer } from "@/components/Disclaimer";
import type { Dog } from "@/types";

// Coach-feedback: lazy så bundle inte blåses upp
const CoachVideoAnalysis = lazy(() => import("@/components/training/CoachVideoAnalysis"));

/**
 * v3 Coach – dedikerad sida för video-feedback från certifierad coach.
 * Wrappar den befintliga `CoachVideoAnalysis`-komponenten i v3-shellen.
 */
export default function V3CoachPage() {
  const { dogs, loading } = useV3Dogs();

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <header className="space-y-2">
        <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
          Personlig coach · 50% rabatt för Pro
        </div>
        <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary inline-flex items-center gap-3">
          <GraduationCap size={32} strokeWidth={1.6} className="text-v3-brand-500" />
          Coach-feedback
        </h1>
        <p className="text-v3-base text-v3-text-secondary max-w-xl">
          Ladda upp en kort video av ett pass eller ett moment och få personlig, skriftlig
          feedback från vår certifierade coach Malin Öster inom 48 timmar.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
          <Link
            to="/v3/coach/status"
            className="inline-flex items-center gap-2 text-v3-sm text-v3-brand-500 hover:text-v3-brand-600"
          >
            <ClipboardList size={16} strokeWidth={1.8} />
            Se status för mina inskickade videor
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/v3/coach/qa"
            className="inline-flex items-center gap-2 text-v3-sm text-v3-text-secondary hover:text-v3-text-primary"
          >
            <ClipboardCheck size={16} strokeWidth={1.8} />
            QA-checklista (mobil)
          </Link>
        </div>
      </header>

      {/* Coach-presentation */}
      <section className="rounded-v3-2xl border border-v3-border bg-v3-surface-1 p-6 lg:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-12 h-12 rounded-full bg-v3-brand-500/10 flex items-center justify-center">
            <Award size={22} strokeWidth={1.6} className="text-v3-brand-500" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
              Möt din coach
            </div>
            <h2 className="font-v3-display text-[24px] lg:text-[28px] leading-tight tracking-[-0.01em] text-v3-text-primary">
              Malin Öster
            </h2>
            <p className="text-v3-sm text-v3-text-secondary mt-0.5">
              Certifierad instruktör · Agility, Hoopers & Freestyle
            </p>
          </div>
        </div>

        <div className="space-y-4 text-v3-base text-v3-text-secondary leading-relaxed">
          <p>
            Jag är uppvuxen i en hundtokig familj och har hållit på med hundsport sedan tidig
            barndom. Min första egna hund var en shetland sheepdog där fokus låg på agility –
            tillsammans tog vi oss hela vägen till SM 2014.
          </p>
          <p>
            Idag delar jag livet med två miniature american shepherds. <strong className="text-v3-text-primary">Luna (9 år)</strong> tävlar
            i klass 3 agility, avancerad klass i rallylydnad och klass 2 i freestyle. Hon
            tränas även i hoopers, lydnad och spår. <strong className="text-v3-text-primary">Vita (7 år)</strong> tränar främst hoopers och
            agility-foundation, och är ett härligt komplement med ett helt eget driv.
          </p>
          <p>
            Som utbildad instruktör har jag hållit i kurser inom bland annat agility, hoopers
            och freestyle – och min styrka ligger i att se helheten mellan förare och hund och
            ge konkret, konstruktiv feedback du faktiskt kan ta med dig till nästa pass.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-v3-xl bg-v3-surface-2 p-4 flex items-center gap-3">
            <Trophy size={18} strokeWidth={1.8} className="text-v3-brand-500 shrink-0" />
            <div className="text-v3-sm text-v3-text-primary leading-tight">
              SM-meriterad<br />
              <span className="text-v3-text-tertiary text-xs">i agility</span>
            </div>
          </div>
          <div className="rounded-v3-xl bg-v3-surface-2 p-4 flex items-center gap-3">
            <Award size={18} strokeWidth={1.8} className="text-v3-brand-500 shrink-0" />
            <div className="text-v3-sm text-v3-text-primary leading-tight">
              Utbildad instruktör<br />
              <span className="text-v3-text-tertiary text-xs">flera discipliner</span>
            </div>
          </div>
          <div className="rounded-v3-xl bg-v3-surface-2 p-4 flex items-center gap-3">
            <Heart size={18} strokeWidth={1.8} className="text-v3-brand-500 shrink-0" />
            <div className="text-v3-sm text-v3-text-primary leading-tight">
              Aktiv tävlingsförare<br />
              <span className="text-v3-text-tertiary text-xs">med två egna hundar</span>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="h-48 v3-skeleton rounded-v3-2xl" />
      ) : (
        <Suspense fallback={<div className="h-48 v3-skeleton rounded-v3-2xl" />}>
          <CoachVideoAnalysis dogs={dogs as unknown as Dog[]} />
        </Suspense>
      )}

      <Disclaimer variant="ai" />
    </div>
  );
}
