import { NavLink } from "react-router-dom";
import { NAV_GROUPS } from "./navConfig";
import { useIsAdmin } from "./useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/ds";
import { cn } from "@/lib/utils";

/**
 * Persistent vänster-sidebar (desktop ≥1024px).
 * 240px bred, mörk yta, grupperad navigation.
 * Renderas EN gång i AppLayout – stannar mellan routes.
 */
export function Sidebar() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  }));

  // System-gruppen ska sitta längst ner
  const systemIndex = groups.findIndex((g) => g.label === "System");
  const topGroups = groups.filter((_, i) => i !== systemIndex);
  const systemGroup = systemIndex >= 0 ? groups[systemIndex] : null;

  const initials = (user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] h-screen sticky top-0 bg-inverse text-text-on-inverse font-sans-ds"
      aria-label="Huvudnavigation"
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-ds-sm bg-brand-500 flex items-center justify-center">
          <span className="text-[13px] font-medium text-white">A</span>
        </div>
        <span className="text-[14px] font-medium text-text-on-inverse">AgilityManager</span>
      </div>

      {/* Topp-grupper */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {topGroups.map((group) => (
          <NavGroupBlock key={group.label} label={group.label} items={group.items} />
        ))}
      </nav>

      {/* System-gruppen längst ner */}
      {systemGroup && systemGroup.items.length > 0 && (
        <div className="px-2 pb-2">
          <NavGroupBlock label={systemGroup.label} items={systemGroup.items} />
        </div>
      )}

      {/* User-kort */}
      <div className="px-3 py-3 border-t-[0.5px] border-text-on-inverse/10">
        <button
          type="button"
          className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-ds-sm hover:bg-white/[0.06] transition-colors"
          aria-label="Användarmeny"
        >
          <div className="h-7 w-7 rounded-full bg-brand-500 flex items-center justify-center text-[12px] font-medium text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[12px] font-medium text-text-on-inverse truncate">
              {user?.email ?? "Inte inloggad"}
            </div>
            <div className="text-[10px] text-text-on-inverse/60">Gratis</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

function NavGroupBlock({ label, items }: { label: string; items: typeof NAV_GROUPS[number]["items"] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        className="px-2.5 pt-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-text-on-inverse/35"
      >
        {label}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/v2"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] transition-colors",
                    isActive
                      ? "bg-brand-500/15 text-text-on-inverse"
                      : "text-text-on-inverse/70 hover:bg-white/[0.06] hover:text-text-on-inverse",
                  )
                }
              >
                <Icon size={14} strokeWidth={1.5} className="shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge === "pro" && (
                  <StatusBadge variant="pro" label="Pro" className="bg-white/10 text-text-on-inverse" />
                )}
                {item.badge === "intern" && (
                  <StatusBadge variant="intern" label="Intern" />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
