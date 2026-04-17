import { Search, Bell, Sun, Moon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { NAV_GROUPS } from "./navConfig";

/**
 * Persistent topbar (desktop ≥1024px).
 * Breadcrumb + sök-stub + notiser + theme toggle.
 * Sök är cmd+k-stub (öppnar inget ännu i Fas 2).
 */
export function TopBar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = findNavItem(location.pathname);
  const breadcrumb = current
    ? `${current.group} / ${current.label}`
    : "Översikt / Hem";

  return (
    <header className="hidden lg:flex h-[52px] items-center gap-4 px-6 bg-surface border-b-[0.5px] border-border-subtle font-sans-ds">
      <nav aria-label="Brödsmulor" className="text-small text-text-tertiary">
        {breadcrumb}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        className="flex items-center gap-2 h-8 px-3 rounded-ds-md bg-subtle text-small text-text-secondary hover:text-text-primary transition-colors min-w-[260px]"
        aria-label="Sök (cmd+k)"
      >
        <Search size={14} strokeWidth={1.5} />
        <span className="flex-1 text-left">Sök hundar, tävlingar, träningar…</span>
        <kbd className="text-[10px] text-text-tertiary border-[0.5px] border-border-default rounded-ds-sm px-1 py-0.5 font-sans-ds">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        className="h-8 w-8 flex items-center justify-center rounded-ds-md text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors relative"
        aria-label="Notiser"
      >
        <Bell size={16} strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-8 w-8 flex items-center justify-center rounded-ds-md text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
        aria-label="Växla tema"
      >
        {mounted && theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
      </button>
    </header>
  );
}

function findNavItem(pathname: string) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === pathname) return { group: group.label, label: item.label };
    }
  }
  return null;
}
