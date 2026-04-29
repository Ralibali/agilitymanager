import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  size?: "sm" | "md";
  className?: string;
}

/**
 * Liten pille-segmentkontroll i bg-subtle.
 * Används för filter (period, sport) – matchar tonen i StatsPage.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: Props<T>) {
  const heightClass = size === "sm" ? "h-7 px-2.5 text-micro" : "h-8 px-3 text-small";
  return (
    <div className={cn("inline-flex gap-1 bg-subtle p-0.5 rounded-ds-md", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            heightClass,
            "rounded-ds-sm font-medium transition-colors whitespace-nowrap",
            value === opt.value
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
