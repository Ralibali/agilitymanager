import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { V3Sidebar } from "./V3Sidebar";
import { V3BottomNav } from "./V3BottomNav";
import { V3MoreSheet } from "./V3MoreSheet";
import { V3QuickActionSheet } from "./V3QuickActionSheet";
import { V3LogTrainingSheet } from "./V3LogTrainingSheet";
import { useV3LogSheet } from "@/hooks/v3/useV3LogSheet";

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

  return (
    <div className="min-h-screen bg-v3-canvas text-v3-text-primary font-v3-sans flex">
      <V3Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-24 lg:pb-0">
          <Suspense fallback={<div className="p-8 text-v3-text-tertiary text-v3-sm">Laddar…</div>}>
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
