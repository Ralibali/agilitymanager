import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";
import { cn } from "@/lib/utils";

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
 * Hund-hero med stor namn-typografi i Instrument Serif + liten avatar-switcher.
 * Visar bara switcher om användaren har > 1 hund.
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
      <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-6 lg:p-8">
        <p className="text-v3-base text-v3-text-secondary mb-3">
          Lägg till din första hund för att börja logga pass och resultat.
        </p>
        <button
          type="button"
          onClick={onAddDog}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors"
        >
          <Plus size={16} strokeWidth={1.6} />
          Lägg till hund
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Aktiv hund" className="space-y-4">
      <div className="flex items-end gap-4 lg:gap-6">
        {/* Stor avatar */}
        <div
          className={cn(
            "h-20 w-20 lg:h-24 lg:w-24 rounded-v3-xl shrink-0 overflow-hidden",
            "bg-v3-brand-100 grid place-items-center",
          )}
        >
          {active.photo_url ? (
            <img
              src={active.photo_url}
              alt={active.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-v3-display text-[36px] lg:text-[42px] text-v3-brand-700 leading-none">
              {initialsOf(active.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <h2 className="font-v3-display text-[40px] lg:text-[56px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary truncate">
            {active.name}
          </h2>
          {subtitle && (
            <p className="text-v3-sm lg:text-v3-base text-v3-text-secondary mt-1 truncate">
              {subtitle}
            </p>
          )}
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
                    ? "bg-v3-brand-500/10 ring-1 ring-v3-brand-500/30"
                    : "bg-v3-canvas-elevated hover:bg-v3-canvas-secondary border border-v3-canvas-sunken/40",
                )}
              >
                <span
                  className={cn(
                    "h-7 w-7 rounded-full overflow-hidden grid place-items-center shrink-0",
                    isActive ? "bg-v3-brand-500/20" : "bg-v3-canvas-sunken",
                  )}
                >
                  {d.photo_url ? (
                    <img src={d.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className={cn("text-[11px] font-medium", isActive ? "text-v3-brand-700" : "text-v3-text-secondary")}>
                      {initialsOf(d.name)}
                    </span>
                  )}
                </span>
                <span className={cn("text-v3-sm font-medium", isActive ? "text-v3-brand-700" : "text-v3-text-primary")}>
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
