import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral"
  | "pro"
  | "intern";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  label: string;
}

const variantStyles: Record<Variant, string> = {
  success: "bg-brand-50 text-brand-900",
  warning: "bg-amber-50 text-amber-900",
  info: "bg-[hsl(212_71%_54%/0.12)] text-[hsl(212_71%_30%)]",
  danger: "bg-[hsl(0_57%_41%/0.10)] text-semantic-danger",
  neutral: "bg-subtle text-text-secondary",
  pro: "bg-inverse text-text-on-inverse",
  intern: "bg-amber-500 text-white",
};

export function StatusBadge({
  variant = "neutral",
  label,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-ds-sm px-1.5 py-0.5 text-micro uppercase font-sans-ds",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
