import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function V3Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[1380px] 2xl:max-w-[1540px] mx-auto px-5 lg:px-10 2xl:px-14 py-6 lg:py-9 space-y-5 animate-v3-fade-in", className)}>
      {children}
    </div>
  );
}

export function V3PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-5 lg:p-7 shadow-v3-xs",
        dark
          ? "bg-v3-text-primary border-v3-text-primary/10 text-white"
          : "bg-v3-canvas-elevated border-v3-canvas-sunken/40 text-v3-text-primary",
      )}
    >
      <div className={cn("absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl", dark ? "bg-v3-brand-500/25" : "bg-v3-brand-500/10")} />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className={cn("inline-flex items-center gap-2 text-[10px] tracking-[0.04em] font-medium", dark ? "text-white/60" : "text-v3-text-tertiary")}>
            {Icon && <Icon size={13} strokeWidth={1.8} />}
            {eyebrow}
          </div>
          <h1 className={cn("font-v3-display text-[34px] lg:text-[46px] leading-[1.03] tracking-[-0.035em] mt-2", dark ? "text-white" : "text-v3-text-primary")}>
            {title}
          </h1>
          {description && (
            <p className={cn("text-v3-base lg:text-v3-lg max-w-2xl mt-2 leading-relaxed", dark ? "text-white/68" : "text-v3-text-secondary")}>
              {description}
            </p>
          )}
        </div>
        {children && <div className="shrink-0 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}

export function V3PrimaryButton({ children, onClick, icon: Icon }: { children: ReactNode; onClick?: () => void; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}

export function V3SecondaryButton({ children, onClick, icon: Icon }: { children: ReactNode; onClick?: () => void; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas-elevated text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors"
    >
      {Icon && <Icon size={15} strokeWidth={1.8} />}
      {children}
    </button>
  );
}

export function V3Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 shadow-v3-xs", className)}>
      {children}
    </section>
  );
}

export function V3SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">{title}</h2>
        {description && <p className="text-v3-sm text-v3-text-secondary mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function V3MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "green",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "green" | "warm" | "neutral";
}) {
  const toneClass = {
    green: "bg-v3-brand-500/10 text-v3-brand-700",
    warm: "bg-orange-100 text-orange-700",
    neutral: "bg-v3-canvas-sunken/70 text-v3-text-secondary",
  }[tone];

  return (
    <V3Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">{label}</div>
        {Icon && (
          <div className={cn("h-9 w-9 rounded-full grid place-items-center", toneClass)}>
            <Icon size={16} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <div className="font-v3-display text-[34px] leading-none mt-2 text-v3-text-primary tabular-nums">{value}</div>
      {sub && <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>}
    </V3Card>
  );
}
