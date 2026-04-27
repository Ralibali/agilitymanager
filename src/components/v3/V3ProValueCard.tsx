import { ArrowRight, BarChart3, FileDown, Lock, Save, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ProValue = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const DEFAULT_VALUES: ProValue[] = [
  { icon: Save, title: "Spara mer", text: "Behåll banor, pass och planering på ett ställe." },
  { icon: FileDown, title: "Exportera", text: "Ta ut banor, resultat och rapporter när du behöver dela." },
  { icon: BarChart3, title: "Se mönster", text: "Få tydligare statistik och smartare insikter över tid." },
];

export function V3ProValueCard({
  title = "Få ut mer av AgilityManager",
  description = "När du använder appen mer blir värdet större: spara, exportera, analysera och följ utvecklingen över tid.",
  ctaLabel = "Se vad som ingår",
  onClick,
  values = DEFAULT_VALUES,
  compact = false,
}: {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onClick?: () => void;
  values?: ProValue[];
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-v3-2xl bg-v3-text-primary text-white border border-v3-text-primary/10 shadow-v3-sm v3-mobile-no-overflow",
        compact ? "p-4" : "p-4 sm:p-5 lg:p-6",
      )}
    >
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-v3-brand-500/25 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] font-medium text-white/55">
            <Lock size={13} strokeWidth={1.8} /> Pro-värde
          </div>
          <h2 className="font-v3-display text-[24px] sm:text-v3-2xl lg:text-[30px] leading-tight mt-1 break-words">{title}</h2>
          <p className="text-v3-sm lg:text-v3-base text-white/68 mt-2 leading-relaxed break-words">{description}</p>
        </div>
        {onClick && (
          <button
            type="button"
            onClick={onClick}
            className="shrink-0 inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-v3-base bg-white px-5 text-v3-sm font-medium text-v3-text-primary hover:bg-white/90 transition-colors"
          >
            {ctaLabel} <ArrowRight size={15} />
          </button>
        )}
      </div>
      {!compact && (
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
          {values.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-v3-xl border border-white/10 bg-white/[0.06] p-4 min-w-0">
                <div className="h-9 w-9 rounded-full bg-white/10 grid place-items-center mb-3 text-v3-brand-300">
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <h3 className="text-v3-sm font-medium text-white break-words">{item.title}</h3>
                <p className="text-v3-xs text-white/58 mt-1 leading-relaxed break-words">{item.text}</p>
              </div>
            );
          })}
        </div>
      )}
      <Sparkles size={120} className="absolute -bottom-10 -right-8 text-white/[0.035]" strokeWidth={1.2} />
    </section>
  );
}
