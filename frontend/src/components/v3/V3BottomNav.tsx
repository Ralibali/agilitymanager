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
 *
 * Mobil-polish (Fas 8):
 * - Varje tab fyller hela cellen → ≥44px touch-target (Apple HIG).
 * - Active-press scale 0.94 för taktil feedback.
 * - FAB ringfocus och tap-scale.
 * - tap-highlight-color osynlig (ingen ful blå-blink).
 */
export function V3BottomNav({ onOpenQuickActions, onOpenMore }: Props) {
  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-40 font-v3-sans",
        "bg-v3-canvas/92 backdrop-blur-xl",
        "border-t border-v3-canvas-sunken/60",
        "pb-[env(safe-area-inset-bottom,0px)]",
        "[-webkit-tap-highlight-color:transparent]",
      )}
      aria-label="Mobilnavigation"
    >
      <div className="relative grid grid-cols-5 h-[64px] max-w-md mx-auto">
        {V3_BOTTOM_PRIMARY.map((item) => (
          <BottomTab key={item.path} item={item} />
        ))}

        {/* Center-FAB slot – tap-target är knappen + paddat utrymme runtom */}
        <div className="relative grid place-items-center">
          <button
            type="button"
            onClick={onOpenQuickActions}
            aria-label="Snabbåtgärder"
            className={cn(
              "absolute -top-5 h-14 w-14 rounded-full grid place-items-center",
              "bg-v3-brand-500 text-white shadow-v3-brand",
              "transition-transform duration-[180ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:scale-[1.04] active:scale-[0.92]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-v3-brand-500/30",
            )}
          >
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>

        {V3_BOTTOM_SECONDARY.map((item) => (
          <BottomTab key={item.path} item={item} />
        ))}

        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Öppna mer-meny"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5",
            "text-v3-text-tertiary hover:text-v3-text-primary transition-colors",
            "active:scale-[0.94] active:text-v3-text-primary",
            "transition-transform duration-[120ms]",
            "focus-visible:outline-none focus-visible:bg-v3-canvas-sunken/40",
          )}
        >
          <Menu size={22} strokeWidth={1.8} />
          <span className="text-[10px] font-medium leading-none">Mer</span>
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
          "flex flex-col items-center justify-center gap-0.5",
          "transition-colors transition-transform duration-[120ms]",
          "active:scale-[0.94]",
          "focus-visible:outline-none focus-visible:bg-v3-canvas-sunken/40",
          isActive
            ? "text-v3-brand-600"
            : "text-v3-text-tertiary hover:text-v3-text-primary",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.1 : 1.8} />
          <span className="text-[10px] font-medium leading-none">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
