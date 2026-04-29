import { useMemo } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";
import { cn } from "@/lib/utils";
import { BrandPill } from "@/components/brand/BrandPill";

interface Props {
  dogs: V3Dog[];
  active: V3Dog | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddDog?: () => void;
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
    const months = (now.getFullYear() - b.getFullYear()) * 12 + m + (now.getDate() < b.getDate() ? -1 : 0);
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
 * Kompakt aktiv-hund-kort.
 * Tanken är att hunden ska kännas central utan att layouten blir tung.
 */
export function DogHero({ dogs, active, activeId, onSelect, onAddDog }: Props) {
  const subtitle = useMemo(() => {
    if (!active) return null;
    const parts: string[] = [];
    const age = ageFromBirthdate(active.birthdate);
    if (age) parts.push(age);
    if (active.breed) parts.push(active.breed);
    if (active.sport) parts.push(active.sport);
    return parts.join(" · ");
  }, [active]);

  if (!active) {
    return (
      <div className="rounded-2xl bg-white border border-forest/12 p-6 lg:p-8">
        <p className="text-base text-stone mb-3">
          Lägg till din första hund för att börja logga pass och resultat.
        </p>
        <button
          type="button"
          onClick={onAddDog}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-forest text-bone text-sm font-medium hover:bg-forest-soft transition-colors"
        >
          <Plus size={16} strokeWidth={1.6} />
          Lägg till hund
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Aktiv hund" className="space-y-3">
      <div className="rounded-2xl bg-white border border-forest/12 p-5 mb-2">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-16 w-16 lg:h-18 lg:w-18 rounded-xl shrink-0 overflow-hidden",
              "bg-forest grid place-items-center",
            )}
          >
            {active.photo_url ? (
              <img
                src={active.photo_url}
                alt={active.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-brand-display text-[30px] text-lime leading-none">
                {initialsOf(active.name)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-brand-display text-[28px] lg:text-[34px] leading-[1.05] tracking-[-0.02em] text-forest truncate">
              {active.name}
            </h2>
            {subtitle && (
              <p className="text-[13px] text-stone mt-1 truncate">
                {subtitle}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <BrandPill color="moss" dot>Team {active.name}</BrandPill>
              <BrandPill color="coral" dot>Varje pass räknas</BrandPill>
            </div>
          </div>

          <ChevronRight className="hidden sm:block text-stone" size={18} strokeWidth={1.6} />
        </div>
      </div>

      {/* Switcher (visa bara om > 1 hund) */}
      {dogs.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {dogs.map((d) => {
            const isActive = d.id === activeId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                aria-pressed={isActive}
                aria-label={`Välj ${d.name}`}
                className={cn(
                  "flex items-center gap-2 h-9 pl-1 pr-3 rounded-full transition-all",
                  isActive
                    ? "bg-forest text-bone"
                    : "bg-white border border-forest/12 hover:bg-bone-2",
                )}
              >
                <span
                  className={cn(
                    "h-7 w-7 rounded-full overflow-hidden grid place-items-center shrink-0",
                    isActive ? "bg-lime" : "bg-bone-2",
                  )}
                >
                  {d.photo_url ? (
                    <img src={d.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className={cn("text-[11px] font-medium", isActive ? "text-forest" : "text-stone")}>
                      {initialsOf(d.name)}
                    </span>
                  )}
                </span>
                <span className={cn("text-sm font-medium", isActive ? "text-bone" : "text-forest")}>
                  {d.name}
                </span>
              </button>
            );
          })}
          {onAddDog && (
            <button
              type="button"
              onClick={onAddDog}
              aria-label="Lägg till hund"
              className="h-9 w-9 rounded-full bg-v3-canvas-elevated border border-v3-canvas-sunken/40 grid place-items-center text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas-secondary transition-colors"
            >
              <Plus size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
