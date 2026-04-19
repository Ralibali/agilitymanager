import { NavLink } from "react-router-dom";
import { Plus, Menu } from "lucide-react";
import { V3_BOTTOM_PRIMARY, V3_BOTTOM_SECONDARY } from "./navConfig";
import { cn } from "@/lib/utils";

interface Props {
  onOpenQuickActions: () => void;
  onOpenMore: () => void;
}

/**
 * v3 Mobil bottom-nav: 5 slots med center-FAB.
 * Layout: [Hem] [Träning] [+ FAB] [Tävlingar] [Mer]
 * FAB är förhöjd 12px ovanför nav-baren – Strava/Whoop-liknande.
 */
export function V3BottomNav({ onOpenQuickActions, onOpenMore }: Props) {
  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-40 font-v3-sans",
        "bg-v3-canvas/92 backdrop-blur-xl",
        "border-t border-v3-canvas-sunken/60",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
      aria-label="Mobilnavigation"
    >
      <div className="relative grid grid-cols-5 h-[60px] max-w-md mx-auto">
        {V3_BOTTOM_PRIMARY.map((item) => (
          <BottomTab key={item.path} item={item} />
        ))}

        {/* Center-FAB slot */}
        <div className="relative grid place-items-center">
          <button
            type="button"
            onClick={onOpenQuickActions}
            aria-label="Snabbåtgärder"
            className={cn(
              "absolute -top-5 h-14 w-14 rounded-full grid place-items-center",
              "bg-v3-brand-500 text-white shadow-v3-brand",
              "transition-transform duration-[180ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:scale-[1.04] active:scale-[0.96]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-v3-brand-500/30",
            )}
          >
            <Plus size={24} strokeWidth={2} />
          </button>
        </div>

        {V3_BOTTOM_SECONDARY.map((item) => (
          <BottomTab key={item.path} item={item} />
        ))}

        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Öppna mer-meny"
          className="flex flex-col items-center justify-center gap-0.5 text-v3-text-tertiary hover:text-v3-text-primary transition-colors"
        >
          <Menu size={20} strokeWidth={1.6} />
          <span className="text-[10px] font-medium">Mer</span>
        </button>
      </div>
    </nav>
  );
}

function BottomTab({ item }: { item: typeof V3_BOTTOM_PRIMARY[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === "/v3"}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center gap-0.5 transition-colors",
          isActive ? "text-v3-brand-600" : "text-v3-text-tertiary hover:text-v3-text-primary",
        )
      }
    >
      <Icon size={20} strokeWidth={1.6} />
      <span className="text-[10px] font-medium">{item.label}</span>
    </NavLink>
  );
}
