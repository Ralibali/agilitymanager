import * as React from "react";
import { cn } from "@/lib/utils";

export type BrandPillColor = "moss" | "lime" | "coral" | "forest";

export interface BrandPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  color: BrandPillColor;
  dot?: boolean;
}

const STYLES: Record<BrandPillColor, { wrapper: string; dot: string }> = {
  moss:   { wrapper: "bg-moss/45 text-moss-deep", dot: "bg-lime" },
  lime:   { wrapper: "bg-lime text-forest",        dot: "bg-forest" },
  coral:  { wrapper: "bg-coral text-bone",         dot: "bg-bone" },
  forest: { wrapper: "bg-forest text-bone",        dot: "bg-lime" },
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
