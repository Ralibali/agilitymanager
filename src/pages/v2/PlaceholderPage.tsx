import { useLocation } from "react-router-dom";
import { NAV_GROUPS } from "@/components/layout/navConfig";

/**
 * Tom placeholder för alla 14 v2-routes.
 * Visar bara route-namn + grupp så vi kan verifiera att navigation fungerar
 * utan att shellen flimrar. Innehåll fylls i Fas 3+.
 */
export default function PlaceholderPage() {
  const location = useLocation();
  const match = findItem(location.pathname);

  return (
    <div className="space-y-3">
      <p className="text-micro text-text-tertiary uppercase">{match?.group ?? "Placeholder"}</p>
      <h1 className="text-h1">{match?.label ?? location.pathname}</h1>
      <p className="text-body text-text-secondary max-w-[480px]">
        Tom placeholder. Innehåll byggs i kommande fas.
      </p>
    </div>
  );
}

function findItem(pathname: string) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === pathname) return { group: group.label, label: item.label };
    }
  }
  return null;
}
