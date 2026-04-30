import * as React from "react";
import { cn } from "@/lib/utils";

export type BrandPillColor = "moss" | "lime" | "coral" | "forest";

export interface BrandPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  color: BrandPillColor;
  dot?: boolean;
}

// Light: original "Varm Sand"-pills.
// Dark: tonade transparenta backar + tunna borders + ljusare text — dark-mode-grammatik.
const STYLES: Record<BrandPillColor, { wrapper: string; dot: string }> = {
  moss:   {
    wrapper: "bg-moss/45 text-moss-deep dark:bg-cyan-500/15 dark:text-cyan-300 dark:border dark:border-cyan-500/30",
    dot: "bg-lime dark:bg-cyan-500",
  },
  lime:   {
    wrapper: "bg-lime text-forest dark:bg-amber-500/15 dark:text-amber-300 dark:border dark:border-amber-500/30",
    dot: "bg-forest dark:bg-amber-500",
  },
  coral:  {
    wrapper: "bg-coral text-bone dark:bg-coral-500/15 dark:text-coral-400 dark:border dark:border-coral-500/30",
    dot: "bg-bone dark:bg-coral-500",
  },
  forest: {
    wrapper: "bg-forest text-bone dark:bg-slate-700 dark:text-slate-200 dark:border dark:border-slate-600",
    dot: "bg-lime dark:bg-amber-500",
  },
};

export function BrandPill({ color, dot = false, className, children, ...rest }: BrandPillProps) {
  const s = STYLES[color];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill-full px-3 py-1 text-[11px] font-medium leading-none",
        s.wrapper,
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn("inline-block h-[7px] w-[7px] rounded-pill-full", s.dot)} />}
      {children}
    </span>
  );
}

export default BrandPill;
