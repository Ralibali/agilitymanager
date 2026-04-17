import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { MOBILE_PRIMARY_NAV } from "./navConfig";
import { cn } from "@/lib/utils";

interface BottomNavV2Props {
  onOpenMore: () => void;
}

/**
 * Mobil bottom nav – 5 slots: 4 primär + Mer.
 * Renderas en gång i AppLayout. Mer öppnar bottom sheet via state i shell.
 */
export function BottomNavV2({ onOpenMore }: BottomNavV2Props) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t-[0.5px] border-border-subtle pb-[env(safe-area-inset-bottom,0px)] font-sans-ds"
      aria-label="Mobilnavigation"
    >
      <ul className="grid grid-cols-5 h-16">
        {MOBILE_PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/v2"}
                className={({ isActive }) =>
                  cn(
                    "h-full flex flex-col items-center justify-center gap-0.5 transition-colors",
                    isActive ? "text-brand-500" : "text-text-tertiary",
                  )
                }
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            className="h-full w-full flex flex-col items-center justify-center gap-0.5 text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Öppna mer-meny"
          >
            <Menu size={20} strokeWidth={1.5} />
            <span className="text-[10px]">Mer</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
