import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Brand foundation: enkel statistik-cell.
 * Använder brand-tokens (font-brand-display, text-stone, lime/coral) som lagts till i fas 1.
 */
export interface StatTileTrend {
  value: string;
  direction: "up" | "down";
}

export interface StatTileProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  trend?: StatTileTrend;
  size?: "sm" | "md" | "lg";
}

const VALUE_SIZE: Record<NonNullable<StatTileProps["size"]>, string> = {
  sm: "text-[18px]",
  md: "text-[24px]",
  lg: "text-[32px]",
};

export function StatTile({
  label,
  value,
  unit,
  trend,
  size = "md",
  className,
  ...rest
}: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...rest}>
      <span className="text-[11px] text-stone uppercase tracking-[0.04em]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-brand-display font-medium tabular leading-none",
            "tracking-[-0.02em] text-forest",
            VALUE_SIZE[size],
          )}
        >
          {value}
          {unit ? <span className="ml-1 text-stone text-[0.6em] font-normal">{unit}</span> : null}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center rounded-pill-full px-2 py-0.5 text-[11px] font-medium leading-none",
              trend.direction === "up" ? "bg-lime text-forest" : "bg-coral text-bone",
            )}
          >
            {trend.direction === "up" ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatTile;
