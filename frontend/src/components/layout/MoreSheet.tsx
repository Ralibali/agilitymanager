import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { useEffect } from "react";
import { NAV_GROUPS } from "./navConfig";
import { useIsAdmin } from "./useIsAdmin";
import { StatusBadge } from "@/components/ds";
import { cn } from "@/lib/utils";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Mobil bottom sheet med samma grupperade nav som desktop-sidebaren.
 * Slide-up 200ms ease-out. Stängs automatiskt vid navigation.
 * Detta är INTE en route – det är state i shell.
 */
export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const { isAdmin } = useIsAdmin();

  // Stäng på Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lås body-scroll när öppen
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 bg-inverse/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mer-meny"
        className={cn(
          "lg:hidden fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-[20px] font-sans-ds",
          "transition-transform duration-200 ease-out",
          "max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* Handle + close */}
        <div className="sticky top-0 bg-surface pt-3 pb-2 px-4 flex items-center justify-between">
          <div className="absolute left-1/2 top-2 -translate-x-1/2 h-1 w-10 rounded-full bg-border-default" />
          <span className="text-h2">Mer</span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-ds-md hover:bg-subtle text-text-secondary"
            aria-label="Stäng"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-4 py-2 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary px-1 pb-1.5">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === "/dashboard"}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-2.5 py-2.5 rounded-ds-md text-body transition-colors",
                            isActive
                              ? "bg-brand-50 text-brand-900"
                              : "text-text-primary hover:bg-subtle",
                          )
                        }
                      >
                        <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge === "pro" && <StatusBadge variant="pro" label="Pro" />}
                        {item.badge === "intern" && <StatusBadge variant="intern" label="Intern" />}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
