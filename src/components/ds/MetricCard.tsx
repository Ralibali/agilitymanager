import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Variant = "default" | "highlight" | "inverse";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  icon?: LucideIcon;
  action?: React.ReactNode;
  variant?: Variant;
  className?: string;
}

/**
 * KPI-kort: liten grå label + stort värde + valfri hint/trend/ikon.
 * Variant default = bg-subtle utan border, highlight = bg-surface med border, inverse = mörkt.
 */
export function MetricCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  action,
  variant = "default",
  className,
}: MetricCardProps) {
  const variantStyles: Record<Variant, string> = {
    default: "bg-subtle text-text-primary",
    highlight: "bg-surface text-text-primary border-[0.5px] border-border-subtle",
    inverse: "bg-inverse text-text-on-inverse",
  };

  const labelTone =
    variant === "inverse" ? "text-text-on-inverse/60" : "text-text-secondary";
  const hintTone =
    variant === "inverse" ? "text-text-on-inverse/55" : "text-text-tertiary";

  const trendColor =
    trend?.direction === "up"
      ? "text-semantic-success"
      : trend?.direction === "down"
      ? "text-semantic-danger"
      : "text-text-tertiary";

  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
      ? ArrowDownRight
      : null;

  return (
    <div
      className={cn(
        "rounded-ds-md px-4 py-3.5 flex flex-col gap-1 transition-colors",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-small", labelTone)}>{label}</span>
        {Icon && <Icon className="w-4 h-4 opacity-60" strokeWidth={1.5} />}
      </div>
      <div className="text-[22px] font-medium leading-tight tabular-nums">{value}</div>
      {(hint || trend || action) && (
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className={cn("text-small flex items-center gap-1", hintTone)}>
            {trend && TrendIcon && (
              <span className={cn("flex items-center gap-0.5", trendColor)}>
                <TrendIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {trend.label}
              </span>
            )}
            {hint && <span>{hint}</span>}
          </div>
          {action}
        </div>
      )}
    </div>
  );
}
