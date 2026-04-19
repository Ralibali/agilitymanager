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
          "pb-[env(safe-area-inset-bottom,16px)] animate-in slide-in-from-bottom duration-300",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1 sticky top-0 bg-v3-canvas-elevated">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <h2 className="font-v3-display text-[22px] text-v3-text-primary">Mer</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="h-8 w-8 grid place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/60 hover:text-v3-text-primary transition-colors"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>
        <div className="px-3 pb-3 space-y-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary/80">
                {g.label}
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
                          "flex flex-col items-center gap-2 p-3 rounded-v3-lg transition-colors",
                          isActive
                            ? "bg-v3-brand-500/10"
                            : "hover:bg-v3-canvas-secondary",
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
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
