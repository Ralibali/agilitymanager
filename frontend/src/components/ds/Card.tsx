import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "inverse" | "highlight";

interface DSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** Extra padding-tight option for KPI-cards */
  tight?: boolean;
}

/**
 * Fas 1 designsystem – Card primitive.
 * Flat, 0.5px border, no shadows. Variants: default | inverse | highlight.
 */
export const DSCard = React.forwardRef<HTMLDivElement, DSCardProps>(
  ({ className, variant = "default", tight = false, ...props }, ref) => {
    const base = "rounded-ds-lg transition-colors";
    const padding = tight ? "px-4 py-3.5" : "px-5 py-4";
    const variants: Record<Variant, string> = {
      default: "bg-surface text-text-primary border-[0.5px] border-border-subtle",
      inverse: "bg-inverse text-text-on-inverse border-[0.5px] border-transparent",
      highlight: "bg-subtle text-text-primary border-[0.5px] border-transparent",
    };
    return (
      <div
        ref={ref}
        className={cn(base, padding, variants[variant], className)}
        {...props}
      />
    );
  },
);
DSCard.displayName = "DSCard";
