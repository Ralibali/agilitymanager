import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { V3_NAV_GROUPS, type V3NavItem } from "./navConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/components/layout/useIsAdmin";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "v3-sidebar-collapsed";

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
        "bg-v3-canvas border-r border-v3-canvas-sunken/60",
        "transition-[width] duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[64px]" : "w-[252px]",
      )}
      aria-label="Huvudnavigation"
      data-collapsed={collapsed}
    >
      <div className={cn("flex items-center h-14 px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-v3-base bg-v3-brand-500 grid place-items-center shrink-0 shadow-v3-sm">
              <span className="font-v3-display text-[17px] leading-none text-white">A</span>
            </div>
            <span className="font-v3-display text-[17px] text-v3-text-primary truncate">
              Agility<span className="text-v3-text-tertiary">manager</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandera meny" : "Fäll ihop meny"}
          className={cn(
            "h-8 w-8 grid place-items-center rounded-v3-base text-v3-text-tertiary",
            "hover:bg-v3-canvas-sunken/60 hover:text-v3-text-primary transition-colors",
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

      <div className="px-2 pb-3 pt-2 border-t border-v3-canvas-sunken/60">
        <button
          type="button"
          onClick={() => navigate("/v3/settings")}
          aria-label="Inställningar"
          className={cn(
            "w-full flex items-center gap-2.5 rounded-v3-base px-2 py-2",
            "hover:bg-v3-canvas-sunken/60 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-v3-brand-500 text-white grid place-items-center text-[13px] font-medium shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <div className="text-v3-sm font-medium text-v3-text-primary truncate capitalize">
                {displayName}
              </div>
              <div className="text-v3-xs text-v3-text-tertiary">Gratis · uppgradera när du vill</div>
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
        <div className="px-2.5 pt-1 pb-1.5 text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary/80">
          {label}
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
                    "flex items-center gap-2.5 rounded-v3-base text-v3-sm transition-colors",
                    "h-9 px-2.5",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-v3-brand-500/10 text-v3-brand-700 shadow-v3-xs"
                      : "text-v3-text-secondary hover:bg-v3-canvas-sunken/60 hover:text-v3-text-primary",
                  )
                }
              >
                <Icon size={16} strokeWidth={1.6} className="shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.badge === "pro" && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-v3-brand-100 text-v3-brand-700">
                    Pro
                  </span>
                )}
                {!collapsed && item.badge === "intern" && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-v3-accent-prestation/15 text-v3-accent-prestation">
                    Intern
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
