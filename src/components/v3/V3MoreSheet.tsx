import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { V3_NAV_GROUPS } from "./navConfig";
import { useIsAdmin } from "@/components/layout/useIsAdmin";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const GROUP_HELP: Record<string, string> = {
  Dagligt: "Det du använder oftast under veckan.",
  "Min hund": "Följ hundens hälsa, utveckling och lärande.",
  Verktyg: "Praktiska hjälpmedel inför pass och bana.",
  Socialt: "Träna och följ utveckling tillsammans med andra.",
  System: "Profil, konto och administrativa val.",
};

/**
 * Bottom-sheet "Mer" – visar alla nav-items grupperade.
 * Mobil-only. Trigger från V3BottomNav.
 */
export function V3MoreSheet({ open, onClose }: Props) {
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const groups = V3_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[60] font-v3-sans lg:hidden" role="dialog" aria-modal="true" aria-label="Mer-meny">
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-v3-text-primary/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto",
          "bg-v3-canvas-elevated rounded-t-v3-2xl shadow-v3-xl",
          "pb-[env(safe-area-inset-bottom,16px)] animate-v3-sheet-in",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1 sticky top-0 bg-v3-canvas-elevated z-10">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>
        <div className="flex items-start justify-between px-5 pt-1 pb-4">
          <div>
            <h2 className="font-v3-display text-[24px] text-v3-text-primary">Mer</h2>
            <p className="text-v3-sm text-v3-text-secondary mt-1">
              Hitta fler funktioner utan att tappa fokus från dagens träning.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="h-8 w-8 grid place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/60 hover:text-v3-text-primary transition-colors shrink-0"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>
        <div className="px-3 pb-3 space-y-5">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <div className="px-2 pb-2">
                <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary/80">
                  {g.label}
                </div>
                {GROUP_HELP[g.label] && (
                  <p className="text-v3-xs text-v3-text-tertiary mt-0.5">
                    {GROUP_HELP[g.label]}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/v3"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex flex-col items-center gap-2 p-3 rounded-v3-lg transition-colors min-h-[92px]",
                          isActive
                            ? "bg-v3-brand-500/10"
                            : "hover:bg-v3-canvas-secondary active:bg-v3-canvas-sunken/50",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={cn(
                              "h-11 w-11 rounded-v3-lg grid place-items-center transition-colors",
                              isActive
                                ? "bg-v3-brand-500/15 text-v3-brand-700"
                                : "bg-v3-canvas-sunken/60 text-v3-text-secondary",
                            )}
                          >
                            <Icon size={18} strokeWidth={1.6} />
                          </div>
                          <span
                            className={cn(
                              "text-[11px] font-medium text-center leading-tight",
                              isActive ? "text-v3-brand-700" : "text-v3-text-primary",
                            )}
                          >
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-v3-brand-100 text-v3-brand-700">
                              {item.badge === "intern" ? "Intern" : "Pro"}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
