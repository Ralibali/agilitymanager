import { Search, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { NAV_GROUPS } from "./navConfig";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

/**
 * Persistent topbar (desktop ≥1024px).
 * Breadcrumb + global sök (cmd+k) + notiser.
 */
export function TopBar() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl+K för att öppna sökningen globalt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-ds-md bg-subtle text-small text-text-secondary hover:text-text-primary transition-colors min-w-[260px]"
        aria-label="Sök (cmd+k)"
      >
        <Search size={14} strokeWidth={1.5} />
        <span className="flex-1 text-left">Sök hundar, tävlingar, träningar…</span>
        <kbd className="text-[10px] text-text-tertiary border-[0.5px] border-border-default rounded-ds-sm px-1 py-0.5 font-sans-ds">
          ⌘K
        </kbd>
      </button>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <button
        type="button"
        className="h-8 w-8 flex items-center justify-center rounded-ds-md text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors relative"
        aria-label="Notiser"
      >
        <Bell size={16} strokeWidth={1.5} />
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
