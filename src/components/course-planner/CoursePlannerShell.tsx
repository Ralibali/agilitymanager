/**
 * CoursePlannerShell – Fas 9A
 *
 * Tre-kolumns arbetsyta för banplaneraren:
 * [Tools 72px] [Canvas flex-grow] [Properties 280px (kollapsbar)]
 *
 * Sitter inuti AppLayout (som har 240px sidebar). Använder break-out-teknik
 * (w-screen + negativa marginaler) för att rymma hela bredden trots
 * AppLayouts max-w-[1200px] container.
 *
 * Topbar (52px) ligger ovanför tre-kolumnsraden.
 *
 * Slots:
 *  - topbar: innehåll i 52px topbar (bannamn, status, actions)
 *  - tools:  vänster verktygskolumn
 *  - properties: höger kontextpanel
 *  - children: canvas-yta (mitten, flex-grow)
 */

import { ReactNode, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CoursePlannerShellProps {
  topbar: ReactNode;
  tools: ReactNode;
  properties: ReactNode;
  children: ReactNode;
  /** Standard: panel öppen. Sätt false för att starta kollapsad. */
  defaultPropertiesOpen?: boolean;
}

export function CoursePlannerShell({
  topbar,
  tools,
  properties,
  children,
  defaultPropertiesOpen = true,
}: CoursePlannerShellProps) {
  const [propertiesOpen, setPropertiesOpen] = useState(defaultPropertiesOpen);

  return (
    /* Break-out ur AppLayouts max-w-[1200px] container.
       Vi tar full viewport-bredd minus app-sidebar (240px på lg).
       Höjd: viewport - topbar (~64px) - eventuell padding. */
    <div
      className="relative -mx-4 lg:-mx-9 -my-5 lg:-my-8"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      <div className="flex h-full flex-col bg-[#f4f3ee]">
        {/* ── Topbar (52px) ── */}
        <div
          className="flex h-[52px] items-center gap-3 border-b border-border/[0.06] bg-card px-4 shrink-0"
          style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
        >
          {topbar}
        </div>

        {/* ── Tre-kolumns arbetsyta ── */}
        <div className="flex flex-1 min-h-0">
          {/* Tools (vänster, 72px) */}
          <aside
            className="w-[72px] shrink-0 border-r bg-background overflow-y-auto"
            style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
          >
            {tools}
          </aside>

          {/* Canvas (mitten, flex-grow) */}
          <main className="flex-1 min-w-0 relative overflow-hidden">
            {children}
          </main>

          {/* Properties (höger, 280px – kollapsbar) */}
          {propertiesOpen ? (
            <aside
              className="w-[280px] shrink-0 border-l bg-card overflow-y-auto relative"
              style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
            >
              {/* Stäng-knapp */}
              <button
                onClick={() => setPropertiesOpen(false)}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
                aria-label="Stäng panel"
                title="Stäng panel"
              >
                <ChevronRight size={16} />
              </button>
              {properties}
            </aside>
          ) : (
            /* Kollapsad strip (24px) med expand-pil */
            <button
              onClick={() => setPropertiesOpen(true)}
              className="w-6 shrink-0 border-l bg-card hover:bg-neutral-50 flex items-center justify-center transition-colors"
              style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
              aria-label="Öppna panel"
              title="Öppna panel"
            >
              <ChevronLeft size={14} className="text-neutral-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
