/**
 * ObstaclePalette – vänsterkolumn (72px) i CoursePlannerBetaPage.
 *
 * Innehåller:
 *  - Sport-toggle överst (Agility / Hoopers) – två segment, kompakt.
 *  - Vertikalt scrollbar lista med kategori-rubriker (mikrotypografi)
 *    och draggable hinder-knappar (40×40 cells).
 *  - Tooltip per hinder med namn + tangentbordsgenväg.
 *  - Drag-and-drop via @dnd-kit/core (`useDraggable`). Drop-target hanteras
 *    av canvas i parent.
 */
import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  OBSTACLES,
  type ObstacleSport,
  type ObstacleDef,
  type ObstacleIconKey,
  getObstacleIcon,
} from './obstacleIcons';

export interface ObstaclePaletteProps {
  sport: ObstacleSport;
  onSportChange: (s: ObstacleSport) => void;
  /** Hinder som "armerats" för klick-att-placera. Null = inget armerat. */
  armedKey?: ObstacleIconKey | null;
  /** Toggla armerat hinder. Skickar null när användaren klickar på samma igen. */
  onArm?: (key: ObstacleIconKey | null) => void;
}

/* ─────────────────────────────────────────────────────────────────────
   Sport-toggle – två 32px-segment
   ───────────────────────────────────────────────────────────────────── */

function SportToggle({
  sport,
  onSportChange,
}: {
  sport: ObstacleSport;
  onSportChange: (s: ObstacleSport) => void;
}) {
  return (
    <div
      className="mx-auto mt-3 mb-4 flex w-[56px] flex-col gap-0.5 rounded-md bg-neutral-100 p-0.5"
      role="tablist"
      aria-label="Sport"
    >
      {(['agility', 'hoopers'] as const).map((s) => {
        const active = sport === s;
        return (
          <button
            key={s}
            role="tab"
            aria-selected={active}
            onClick={() => onSportChange(s)}
            className={[
              'h-7 w-full rounded-[4px] text-[10px] font-medium uppercase tracking-[0.06em] transition-colors',
              active
                ? 'bg-white text-[#1a6b3c] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-neutral-500 hover:text-neutral-800',
            ].join(' ')}
            title={s === 'agility' ? 'Agility (A)' : 'Hoopers (H)'}
          >
            {s === 'agility' ? 'AG' : 'HO'}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Draggable obstacle button – 40×40 ikon, drar in på canvas
   ───────────────────────────────────────────────────────────────────── */

function PaletteItem({
  def, armed, onArm,
}: {
  def: ObstacleDef;
  armed: boolean;
  onArm: (key: ObstacleIconKey | null) => void;
}) {
  const Icon = getObstacleIcon(def.key);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${def.key}`,
    data: { source: 'palette', obstacleKey: def.key },
  });

  // Vi vill stödja både drag (befintligt) och klick (nytt). @dnd-kit's
  // PointerSensor med activationConstraint distance:8 i parent gör att korta
  // klick utan rörelse INTE startar drag → onClick triggas normalt.
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArm(armed ? null : def.key);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={handleClick}
            className={[
              'mx-auto flex h-10 w-10 items-center justify-center rounded-md border transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6b3c]/30',
              'cursor-grab active:cursor-grabbing',
              armed
                ? 'bg-[#1a6b3c] border-[#1a6b3c] text-white shadow-[0_0_0_2px_rgba(26,107,60,0.2)]'
                : 'bg-white border-black/[0.06] text-neutral-700 hover:border-black/[0.16] hover:text-[#1a6b3c]',
              isDragging ? 'opacity-30' : '',
            ].join(' ')}
            aria-label={`${def.label} – klicka för att placera, dra för att placera direkt`}
            aria-pressed={armed}
          >
            <Icon size={22} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-neutral-900 text-white border-neutral-900 text-[11px] py-1 px-2"
        >
          <span>{def.label}</span>
          <kbd className="ml-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-white/20 px-1 text-[9px] font-mono">
            {def.shortcut}
          </kbd>
          {armed && (
            <div className="text-[9px] text-white/60 mt-0.5">Klicka på banan för att placera</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Hela paletten
   ───────────────────────────────────────────────────────────────────── */

export function ObstaclePalette({
  sport, onSportChange, armedKey = null, onArm,
}: ObstaclePaletteProps) {
  // Filtrera per sport, gruppera per kategori, behåll original­ordning från OBSTACLES.
  const grouped = useMemo(() => {
    const filtered = OBSTACLES.filter((o) => o.sport.includes(sport));
    const groups: Record<string, ObstacleDef[]> = {};
    const order: string[] = [];
    for (const o of filtered) {
      if (!groups[o.category]) {
        groups[o.category] = [];
        order.push(o.category);
      }
      groups[o.category].push(o);
    }
    return order.map((cat) => ({ category: cat, items: groups[cat] }));
  }, [sport]);

  const noop = (_k: ObstacleIconKey | null) => { /* no-op om parent inte skickar onArm */ };

  return (
    <div className="flex flex-col">
      <SportToggle sport={sport} onSportChange={onSportChange} />

      <div className="space-y-4 pb-6">
        {grouped.map((group) => (
          <section key={group.category}>
            <h3 className="mb-1.5 text-center text-[9px] font-medium uppercase tracking-[0.1em] text-neutral-400">
              {group.category}
            </h3>
            <div className="flex flex-col gap-1">
              {group.items.map((def) => (
                <PaletteItem
                  key={def.key}
                  def={def}
                  armed={armedKey === def.key}
                  onArm={onArm ?? noop}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
