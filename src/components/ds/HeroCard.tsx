import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { LucideIcon } from "lucide-react";

type Variant = "inverse" | "surface" | "highlight";

interface HeroCardProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  badge?: { label: string; tone?: "pro" | "intern" | "info" | "neutral" };
  action?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: Variant;
  className?: string;
}

/**
 * Stort hero-kort för featured content (nästa tävling, premium-feature, CTA).
 * Inverse = mörk premium-känsla, surface = ljus, highlight = subtle.
 */
export function HeroCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  action,
  footer,
  variant = "inverse",
  className,
}: HeroCardProps) {
  const variantStyles: Record<Variant, string> = {
    inverse: "bg-inverse text-text-on-inverse border-transparent",
    surface: "bg-surface text-text-primary border-border-subtle",
    highlight: "bg-subtle text-text-primary border-transparent",
  };
  const eyebrowTone =
    variant === "inverse" ? "text-text-on-inverse/55" : "text-text-tertiary";
  const descTone =
    variant === "inverse" ? "text-text-on-inverse/75" : "text-text-secondary";
  const footerTone =
    variant === "inverse" ? "text-text-on-inverse/50" : "text-text-tertiary";

  return (
    <section
      className={cn(
        "rounded-ds-lg border-[0.5px] p-5 sm:p-6 flex flex-col gap-4",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className={cn("text-micro uppercase mb-1.5", eyebrowTone)}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-h2 leading-tight">{title}</h2>
          {description && (
            <p className={cn("text-small mt-1.5 max-w-[520px]", descTone)}>
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && <StatusBadge variant={badge.tone ?? "neutral"} label={badge.label} />}
          {Icon && (
            <span
              className={cn(
                "w-9 h-9 rounded-ds-md flex items-center justify-center",
                variant === "inverse"
                  ? "bg-card/8 text-text-on-inverse"
                  : "bg-subtle text-text-primary",
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </span>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
      {footer && <div className={cn("text-micro", footerTone)}>{footer}</div>}
    </section>
  );
}
