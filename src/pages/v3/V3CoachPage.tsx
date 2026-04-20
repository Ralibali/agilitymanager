import { Suspense, lazy } from "react";
import { GraduationCap } from "lucide-react";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import type { Dog } from "@/types";

// Coach-feedback (Pro): lazy så bundle inte blåses upp
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
        <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
          Personlig coach · 50% rabatt för Pro
        </div>
        <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary inline-flex items-center gap-3">
          <GraduationCap size={32} strokeWidth={1.6} className="text-v3-brand-500" />
          Coach-feedback
        </h1>
        <p className="text-v3-base text-v3-text-secondary max-w-xl">
          Ladda upp en kort video av ett pass eller ett moment och få personlig feedback
          från en certifierad coach inom 48 timmar.
        </p>
      </header>

      {loading ? (
        <div className="h-48 v3-skeleton rounded-v3-2xl" />
      ) : (
        <Suspense fallback={<div className="h-48 v3-skeleton rounded-v3-2xl" />}>
          <CoachVideoAnalysis dogs={dogs as unknown as Dog[]} />
        </Suspense>
      )}
    </div>
  );
}
