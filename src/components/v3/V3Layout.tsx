import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { V3Sidebar } from "./V3Sidebar";
import { V3BottomNav } from "./V3BottomNav";
import { V3MoreSheet } from "./V3MoreSheet";
import { V3QuickActionSheet } from "./V3QuickActionSheet";
import { V3LogTrainingSheet } from "./V3LogTrainingSheet";
import { useV3LogSheet } from "@/hooks/v3/useV3LogSheet";

function clickButtonByLabels(labels: string[]): boolean {
  if (typeof document === "undefined") return false;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("main button"));
  const normalise = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const wanted = labels.map(normalise);

  const match = buttons.find((button) => {
    const text = normalise(button.textContent ?? "");
    return wanted.some((label) => text.includes(label));
  });

  if (!match) return false;
  match.click();
  return true;
}

/**
 * Persistent v3-shell.
 * Desktop: collapsable sidebar + Outlet
 * Mobil:   Outlet + bottom-nav (5 slots, center-FAB)
 *
 * Inget i shellen byts vid navigation – bara Outlet.
 */
export function V3Layout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const { open: logOpen, setOpen: setLogOpen, close: closeLog } = useV3LogSheet();
  const location = useLocation();
  const navigate = useNavigate();
  const handledActionRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") !== "new") return;

    const key = `${location.pathname}${location.search}`;
    if (handledActionRef.current === key) return;
    handledActionRef.current = key;

    const actionLabelsByPath: { path: string; labels: string[] }[] = [
      { path: "/v3/competition", labels: ["Planera tävling", "Logga resultat"] },
      { path: "/v3/goals", labels: ["Nytt mål", "Skapa mål"] },
      { path: "/v3/health", labels: ["Ny logg"] },
      { path: "/v3/dogs", labels: ["Ny hund", "Lägg till hund"] },
    ];

    const config = actionLabelsByPath.find((item) => location.pathname === item.path);
    if (!config) return;

    const timers = [120, 350, 700].map((delay) =>
      window.setTimeout(() => {
        const clicked = clickButtonByLabels(config.labels);
        if (clicked) {
          navigate(location.pathname, { replace: true });
        }
      }, delay),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="min-h-screen bg-v3-canvas text-v3-text-primary font-v3-sans flex">
      <V3Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-24 lg:pb-0">
          <Suspense
            fallback={
              <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8">
                <div className="space-y-2">
                  <div className="v3-skeleton h-3 w-24 rounded" />
                  <div className="v3-skeleton h-10 w-2/3 rounded-v3-base" />
                </div>
                <div className="v3-skeleton h-28 rounded-v3-2xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="v3-skeleton h-[92px] rounded-v3-xl" />
                  <div className="v3-skeleton h-[92px] rounded-v3-xl" />
                  <div className="v3-skeleton h-[92px] rounded-v3-xl" />
                  <div className="v3-skeleton h-[92px] rounded-v3-xl" />
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <V3BottomNav
        onOpenQuickActions={() => setQuickOpen(true)}
        onOpenMore={() => setMoreOpen(true)}
      />
      <V3MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <V3QuickActionSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onLogTraining={() => {
          setQuickOpen(false);
          setLogOpen(true);
        }}
      />
      <V3LogTrainingSheet open={logOpen} onClose={closeLog} />
    </div>
  );
}
