import { Suspense, useState } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNavV2 } from "./BottomNavV2";
import { MoreSheet } from "./MoreSheet";
import { PageSkeleton } from "@/components/ds";

/**
 * Persistent shell för Fas 2+.
 * Sidebar + TopBar + Outlet (desktop) / Outlet + BottomNav + MoreSheet (mobil).
 * Inget i shellen byts vid navigation – endast Outlet-innehållet.
 */
export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page text-text-primary font-sans-ds flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main className="flex-1 pb-20 lg:pb-0">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-9 py-5 lg:py-8">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <BottomNavV2 onOpenMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <ScrollRestoration />
    </div>
  );
}
