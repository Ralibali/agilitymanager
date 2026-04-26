import { useMemo } from "react";
import { Sparkles, Heart } from "lucide-react";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";
import { cn } from "@/lib/utils";

interface Props {
  dog: V3Dog;
  dogs: V3Dog[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function ageFromBirthdate(birthdate: string | null): string | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  if (years < 1) {
    const months =
      (now.getFullYear() - b.getFullYear()) * 12 +
      m +
      (now.getDate() < b.getDate() ? -1 : 0);
    return `${Math.max(months, 0)} mån`;
  }
  return `${years} år`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  return (parts[0][0] ?? "?").toUpperCase();
}

/**
 * Kompakt hundkort enligt nya dashboard-specen:
 * avatar + namn + ålder/ras/gren + två små badges.
 * Multi-hund: liten switcher under.
 */
export function V3DogStrip({ dog, dogs, activeId, onSelect }: Props) {
  const meta = useMemo(() => {
    const parts: string[] = [];
    const age = ageFromBirthdate(dog.birthdate);
    if (age) parts.push(age);
    if (dog.breed) parts.push(dog.breed);
    if (dog.sport) parts.push(dog.sport);
    return parts.join(" · ");
  }, [dog]);

  return (
    <section
      aria-label="Aktiv hund"
      className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 p-4 lg:p-5 shadow-v3-xs"
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-v3-xl shrink-0 overflow-hidden bg-v3-brand-100 grid place-items-center">
          {dog.photo_url ? (
            <img
              src={dog.photo_url}
              alt={dog.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-v3-display text-[24px] lg:text-[28px] text-v3-brand-700 leading-none">
              {initialsOf(dog.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-v3-display text-[22px] lg:text-[26px] leading-tight tracking-[-0.02em] text-v3-text-primary truncate">
            {dog.name}
          </h2>
          {meta && (
            <p className="text-v3-sm text-v3-text-secondary truncate mt-0.5">
              {meta}
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <Badge icon={Sparkles} label={`Team ${dog.name}`} tone="brand" />
          <Badge icon={Heart} label="Varje pass räknas" tone="warm" />
        </div>
      </div>

      {/* mobile badges */}
      <div className="flex sm:hidden items-center gap-1.5 mt-3">
        <Badge icon={Sparkles} label={`Team ${dog.name}`} tone="brand" />
        <Badge icon={Heart} label="Varje pass räknas" tone="warm" />
      </div>

      {dogs.length > 1 && (
        <div className="mt-4 pt-4 border-t border-v3-canvas-sunken/50 flex items-center gap-1.5 flex-wrap">
          {dogs.map((d) => {
            const isActive = d.id === activeId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                aria-pressed={isActive}
                className={cn(
                  "h-8 px-3 rounded-full text-v3-xs font-medium transition-all",
                  isActive
                    ? "bg-v3-brand-500/12 text-v3-brand-700 ring-1 ring-v3-brand-500/30"
                    : "bg-v3-canvas-secondary text-v3-text-secondary hover:text-v3-text-primary",
                )}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Badge({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Sparkles;
  label: string;
  tone: "brand" | "warm";
}) {
  const tones = {
    brand: "bg-v3-brand-500/10 text-v3-brand-700",
    warm: "bg-v3-accent-prestation/10 text-v3-accent-prestation-text",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium leading-none",
        tones[tone],
      )}
    >
      <Icon size={11} strokeWidth={1.8} />
      <span className="truncate max-w-[120px]">{label}</span>
    </span>
  );
}
