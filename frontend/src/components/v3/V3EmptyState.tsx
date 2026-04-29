import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type V3Action = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  icon?: LucideIcon;
};

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: V3Action[];
  accent?: "traning" | "tavlings" | "prestation" | "halsa" | "brand";
  className?: string;
  illustration?: React.ReactNode;
};

const ACCENT_BG: Record<NonNullable<Props["accent"]>, string> = {
  traning: "bg-v3-accent-traning/10 text-v3-accent-traning",
  tavlings: "bg-v3-accent-tavlings/10 text-v3-accent-tavlings",
  prestation: "bg-v3-accent-prestation/10 text-v3-accent-prestation",
  halsa: "bg-v3-accent-halsa/10 text-v3-accent-halsa",
  brand: "bg-v3-brand-100 text-v3-brand-700",
};

/**
 * V3 EmptyState – generisk tom-vy för alla v3-sidor.
 * Använd `accent` för färgkodad ikon-bubbla, `actions` för 1–2 CTA.
 */
export function V3EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  accent = "brand",
  className,
  illustration,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/60 p-8 lg:p-10 text-center animate-v3-fade-up",
        className,
      )}
    >
      <div className="max-w-sm mx-auto space-y-4">
        {illustration ? (
          <div className="flex justify-center">{illustration}</div>
        ) : Icon ? (
          <div
            className={cn(
              "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center",
              ACCENT_BG[accent],
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
        ) : null}

        <div className="space-y-2">
          <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">{title}</h3>
          {description && (
            <p className="text-v3-sm text-v3-text-secondary leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {actions.map((a, i) => {
              const ActionIcon = a.icon;
              const isPrimary = (a.variant ?? (i === 0 ? "primary" : "secondary")) === "primary";
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className={cn(
                    "inline-flex items-center gap-2 h-10 px-4 rounded-v3-base text-v3-sm font-medium v3-tappable v3-focus-ring",
                    isPrimary
                      ? "bg-v3-brand-500 text-white hover:bg-v3-brand-600 shadow-v3-sm"
                      : "bg-v3-canvas-secondary border border-v3-canvas-sunken text-v3-text-primary",
                  )}
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4" />}
                  {a.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
