import type { ReactNode } from "react";
import { Reveal, RisingWords } from "./Reveal";

export function PageHero({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b-2 border-ink pt-[6.5rem]">
      <div className="field-grid pointer-events-none absolute inset-0 [background-size:56px_56px]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:pb-20 lg:pt-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-[0.16em] shadow-hard-sm">
            <span className="h-2 w-2 rounded-full bg-tang" />
            {kicker}
          </span>
        </Reveal>
        <h1 className="mt-6 max-w-4xl font-display text-6xl leading-[0.92] tracking-[0.01em] sm:text-8xl">
          <RisingWords text={title} startDelay={120} />
        </h1>
        {children && (
          <Reveal delay={400}>
            <div className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">{children}</div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
