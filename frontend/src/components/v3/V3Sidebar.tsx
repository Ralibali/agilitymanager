import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { V3_NAV_GROUPS, type V3NavItem } from "./navConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/components/layout/useIsAdmin";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "v3-sidebar-collapsed";

function toSentence(label: string): string {
  if (!label) return label;
  const lower = label.toLocaleLowerCase("sv-SE");
  return lower.charAt(0).toLocaleUpperCase("sv-SE") + lower.slice(1);
}

export function V3Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  };

  const groups = V3_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  })).filter((g) => g.items.length > 0);

  const systemIndex = groups.findIndex((g) => g.label === "System");
  const topGroups = systemIndex >= 0 ? groups.filter((_, i) => i !== systemIndex) : groups;
  const systemGroup = systemIndex >= 0 ? groups[systemIndex] : null;

  const initials = (user?.email ?? "?").slice(0, 1).toUpperCase();
  const displayName = (user?.email ?? "Förare").split("@")[0] || "Förare";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 shrink-0 font-v3-sans",
        "bg-bone border-r border-forest/8",
        "transition-[width] duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[64px]" : "w-[252px]",
      )}
      aria-label="Huvudnavigation"
      data-collapsed={collapsed}
    >
      <div className={cn("flex items-center h-14 px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-forest grid place-items-center shrink-0">
              <span className="font-brand-display font-medium text-[17px] leading-none text-lime">A</span>
            </div>
            <span className="font-brand-display text-[17px] text-forest truncate">
              agility<span className="opacity-60">manager</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandera meny" : "Fäll ihop meny"}
          className={cn(
            "h-8 w-8 grid place-items-center rounded-md text-stone",
            "hover:bg-bone-2 hover:text-forest transition-colors",
          )}
        >
          {collapsed ? <ChevronsRight size={16} strokeWidth={1.6} /> : <ChevronsLeft size={16} strokeWidth={1.6} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-5">
        {topGroups.map((g) => (
          <V3NavGroupBlock key={g.label} label={g.label} items={g.items} collapsed={collapsed} />
        ))}
      </nav>

      {systemGroup && (
        <div className="px-2 pb-2">
          <V3NavGroupBlock label={systemGroup.label} items={systemGroup.items} collapsed={collapsed} />
        </div>
      )}

      <div className="px-2 pb-3 pt-2 border-t border-forest/8">
        <button
          type="button"
          onClick={() => navigate("/v3/settings")}
          aria-label="Inställningar"
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg px-2 py-2",
            "bg-bone-2 hover:bg-bone-2/80 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-forest text-bone grid place-items-center text-[13px] font-medium shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-medium text-forest truncate capitalize">
                {displayName}
              </div>
              <div className="text-[11px] text-stone">Gratis · uppgradera när du vill</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

function V3NavGroupBlock({ label, items, collapsed }: { label: string; items: V3NavItem[]; collapsed: boolean }) {
  return (
    <div>
      {!collapsed && (
        <div className="px-2.5 pt-1 pb-1.5 text-[11px] tracking-[0.04em] font-medium text-stone">
          {toSentence(label)}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/v3"}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-2.5 rounded-md text-sm transition-colors",
                    "h-9 px-3",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "text-forest font-medium"
                      : "text-forest hover:bg-bone-2",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[4px] rounded-full bg-lime"
                      />
                    )}
                    <Icon size={16} strokeWidth={1.6} className="shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge === "pro" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-lime text-forest">
                        Pro
                      </span>
                    )}
                    {!collapsed && item.badge === "intern" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-coral text-bone">
                        Intern
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
