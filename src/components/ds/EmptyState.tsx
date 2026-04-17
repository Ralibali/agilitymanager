import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DSEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Fas 1 empty state – ikon, rubrik, beskrivning, valfri CTA.
 * Ingen prickad ram, ingen emoji – platt nordisk stil.
 */
export function DSEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: DSEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-ds-md bg-subtle text-text-secondary">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-h2 text-text-primary mb-1.5 font-sans-ds">{title}</h3>
      {description && (
        <p className="text-body text-text-secondary max-w-[320px] mb-5 font-sans-ds">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
