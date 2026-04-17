/**
 * CoursePlannerBetaPage – Fas 9 (parallell v2)
 *
 * Helt ny banplanerare på /course-planner-beta. Befintlig /course-planner är orörd.
 * Datamodellen är identisk (saved_courses.course_data JSONB) så samma sparade banor
 * kan öppnas i båda.
 *
 * Steg 9A levererar:
 *  - Tre-kolumns layout (tools 72px + canvas + properties 280px) inom AppLayout
 *  - Topbar 52px med inline-redigerbart bannamn + autosave-status + actions
 *  - Canvas-bakgrund #F4F3EE (varm beige)
 *  - Två-nivåers grid (1m subtilt + 5m tydligare)
 *  - Skalstock i nedre vänstra hörnet (CAD-style)
 *  - Zoom-chip i nedre högra hörnet
 *  - Empty state med "Skapa din första bana"-prompt
 *
 * Kommande steg:
 *  9B – Ikon-baserad palett med SVG-silhuetter, sport-toggle, drag-from-palette
 *  9C – Properties-panel (per-hinder), mall-modal, banflyt-toggle, kontextmeny
 *  9D – Komplett shortcuts-sheet, utökad ångra (50 steg), delning, prestanda-pass
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Save, Share2, Download, MoreHorizontal, ChevronRight, ChevronLeft,
  ZoomIn, ZoomOut, Maximize2, Sparkles, ChevronDown,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PremiumGate } from '@/components/PremiumGate';
import { ObstaclePalette } from '@/components/course-planner/ObstaclePalette';
import {
  OBSTACLES,
  getObstacleIcon,
  getObstacleDef,
  type ObstacleIconKey,
  type ObstacleSport,
} from '@/components/course-planner/obstacleIcons';

/* ─────────────────────────────────────────────────────────────────────
   Konstanter (delas med befintlig course-planner-datamodell)
   ───────────────────────────────────────────────────────────────────── */

const PX_PER_METER = 20;
const GRID_STEP = PX_PER_METER;
const MARGIN = 28; // för axel-etiketter i canvas

// Default-canvas: 50×40m enligt Fas 9-spec (en standard-bana 30×40m + marginal)
const DEFAULT_CANVAS_W_M = 50;
const DEFAULT_CANVAS_H_M = 40;

/* ─────────────────────────────────────────────────────────────────────
   Topbar – 52px med breadcrumb, inline-bannamn, autosave, actions
   ───────────────────────────────────────────────────────────────────── */

interface TopbarProps {
  courseName: string;
  onCourseNameChange: (name: string) => void;
  savedAt: Date | null;
  isDirty: boolean;
  onSave: () => void;
  onExportPDF: () => void;
  onShare: () => void;
}

function Topbar({
  courseName, onCourseNameChange, savedAt, isDirty, onSave, onExportPDF, onShare,
}: TopbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(courseName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(courseName); }, [courseName]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    onCourseNameChange(trimmed || 'Obetitlad bana');
    setEditing(false);
  };

  const cancel = () => {
    setDraft(courseName);
    setEditing(false);
  };

  const statusLabel = (() => {
    if (isDirty) return 'Osparade ändringar';
    if (!savedAt) return 'Inte sparad';
    const diffMs = Date.now() - savedAt.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Sparat nyss';
    if (diffMin === 1) return 'Sparat för 1 min sedan';
    if (diffMin < 60) return `Sparat för ${diffMin} min sedan`;
    const diffH = Math.floor(diffMin / 60);
    return `Sparat för ${diffH} h sedan`;
  })();

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Brödsmulor" className="flex items-center gap-1.5 text-[12px] text-neutral-500 shrink-0">
        <Link to="/training" className="hover:text-neutral-900 transition-colors">
          Träning
        </Link>
        <ChevronRight size={12} className="text-neutral-300" />
        <span className="text-neutral-700">Banplaneraren</span>
      </nav>

      {/* Vertikal separator */}
      <div className="w-px h-5 bg-neutral-200 shrink-0" aria-hidden />

      {/* Inline-redigerbart bannamn */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') cancel();
          }}
          className="text-[15px] font-medium text-neutral-900 bg-transparent outline-none border-b border-neutral-900 px-0 py-0 min-w-[180px]"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-[15px] font-medium text-neutral-900 hover:text-neutral-700 transition-colors text-left"
          title="Klicka för att byta namn"
        >
          {courseName || 'Obetitlad bana'}
        </button>
      )}

      {/* Autosave-status */}
      <span
        className={`text-[12px] shrink-0 ${
          isDirty ? 'text-amber-600' : 'text-neutral-500'
        }`}
      >
        {statusLabel}
      </span>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Actions (höger) */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onShare}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
                aria-label="Dela"
              >
                <Share2 size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Dela bana</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onExportPDF}
                className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[13px] text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <Download size={14} />
                PDF
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Exportera som PDF</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSave}
                className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[13px] font-medium text-white bg-[#1a6b3c] hover:bg-[#155830] transition-colors"
              >
                <Save size={14} />
                Spara
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Spara bana (⌘S)</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
                aria-label="Mer"
              >
                <MoreHorizontal size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Fler alternativ</p></TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Tools placeholder borttagen – ObstaclePalette används istället (9B).
   ───────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────
   PlacedObstacle – ett hinder som finns på canvas
   ───────────────────────────────────────────────────────────────────── */

interface PlacedObstacle {
  id: string;
  key: ObstacleIconKey;
  /** Position i meter från canvas top-left. */
  xM: number;
  yM: number;
  /** Rotation i grader (0 = standard, default 0). Används i 9C. */
  rotation: number;
}

/* ─────────────────────────────────────────────────────────────────────
   Properties placeholder (höger, 280px) – fylls i steg 9C
   ───────────────────────────────────────────────────────────────────── */

interface PropertiesPanelProps {
  obstacleCount: number;
}

function PropertiesPanel({ obstacleCount }: PropertiesPanelProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Översikt – statistik */}
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500 mb-2">
          Översikt
        </h3>
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-neutral-600">Antal hinder</dt>
            <dd className="text-neutral-900 font-medium tabular-nums">{obstacleCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-600">Banlängd</dt>
            <dd className="text-neutral-400 tabular-nums">– m</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-600">Sport</dt>
            <dd className="text-neutral-900">Agility</dd>
          </div>
        </dl>
      </section>

      <div className="border-t border-neutral-100" />

      {/* Visning */}
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500 mb-2">
          Visning
        </h3>
        <p className="text-[12px] text-neutral-400">
          Toggle för banflyt, mått och nummerordning kommer i steg 9C.
        </p>
      </section>

      <div className="border-t border-neutral-100" />

      {/* Export */}
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500 mb-2">
          Export
        </h3>
        <p className="text-[12px] text-neutral-400">
          Inställningar för PDF-export (A4/A3, riktning) kommer i steg 9C.
        </p>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Canvas – beige bakgrund, två-nivåers grid, skalstock, zoom-chip
   ───────────────────────────────────────────────────────────────────── */

interface CanvasProps {
  widthM: number;
  heightM: number;
  zoom: number;
  onZoomChange: (z: number) => void;
  obstacles: PlacedObstacle[];
}

function Canvas({ widthM, heightM, zoom, onZoomChange, obstacles }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Droppable canvas – tar emot drag från ObstaclePalette via @dnd-kit.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: 'planner-canvas',
    data: { containerRef, zoom, widthM, heightM },
  });

  const canvasWidth = widthM * PX_PER_METER;
  const canvasHeight = heightM * PX_PER_METER;

  /* ─── Render ─── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const totalW = canvasWidth + MARGIN;
    const totalH = canvasHeight + MARGIN;

    // Sätt fysiska pixlar
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Yttre bakgrund (transparent – canvas-area sticker ut mot panel-bg)
    ctx.clearRect(0, 0, totalW, totalH);

    ctx.save();
    ctx.translate(MARGIN, 0);

    /* Course area – varm beige (#F4F3EE) signalerar gräs/underlag */
    ctx.fillStyle = '#F4F3EE';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    /* Subtil drop-shadow runt ytan – som ett papper på bord */
    ctx.shadowColor = 'rgba(15, 23, 18, 0.06)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.strokeStyle = 'rgba(15, 23, 18, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvasWidth - 1, canvasHeight - 1);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    /* Minor grid (1m) – mycket subtilt */
    ctx.strokeStyle = 'rgba(15, 23, 18, 0.05)';
    ctx.lineWidth = 1;
    for (let x = GRID_STEP; x < canvasWidth; x += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = GRID_STEP; y < canvasHeight; y += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
      ctx.stroke();
    }

    /* Major grid (5m) – tydligare för avståndsuppskattning */
    ctx.strokeStyle = 'rgba(15, 23, 18, 0.12)';
    ctx.lineWidth = 1;
    const majorStep = GRID_STEP * 5;
    for (let x = majorStep; x < canvasWidth; x += majorStep) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = majorStep; y < canvasHeight; y += majorStep) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
      ctx.stroke();
    }

    /* Koordinat-etiketter (i meter) – minimala */
    ctx.fillStyle = 'rgba(15, 23, 18, 0.4)';
    ctx.font = '9px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = 0; x <= canvasWidth; x += majorStep) {
      ctx.fillText(`${x / PX_PER_METER}`, x, canvasHeight + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= canvasHeight; y += majorStep) {
      ctx.fillText(`${y / PX_PER_METER}`, -4, y);
    }

    ctx.restore();
  }, [canvasWidth, canvasHeight]);

  useEffect(() => { draw(); }, [draw]);

  /* ─── Wheel-zoom (Cmd/Ctrl + scroll) ─── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      onZoomChange(Math.max(0.25, Math.min(3, zoom * delta)));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomChange]);

  const setRefs = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    setDropRef(node);
  };

  return (
    <div
      ref={setRefs}
      className={[
        'absolute inset-0 overflow-auto bg-[#ebeae5] transition-colors',
        isOver ? 'bg-[#e4ecdf]' : '',
      ].join(' ')}
      style={{ touchAction: 'none' }}
      data-canvas-w-m={widthM}
      data-canvas-h-m={heightM}
      data-canvas-zoom={zoom}
    >
      {/* Centrerad canvas-yta med padding för att kunna pannas */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: Math.max((canvasWidth + MARGIN) * zoom + 200, 100),
          height: Math.max((canvasHeight + MARGIN) * zoom + 200, 100),
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        <div className="relative" style={{ width: (canvasWidth + MARGIN) * zoom, height: (canvasHeight + MARGIN) * zoom }}>
          <canvas
            ref={canvasRef}
            style={{
              width: (canvasWidth + MARGIN) * zoom,
              height: (canvasHeight + MARGIN) * zoom,
              display: 'block',
            }}
          />
          {/* SVG-overlay med placerade hinder. Renderas i samma koordinatrymd
              som canvas-griden (MARGIN-offsetad) för perfekt alignment. */}
          <ObstaclesLayer
            obstacles={obstacles}
            zoom={zoom}
            canvasWidthPx={canvasWidth}
            canvasHeightPx={canvasHeight}
          />
        </div>
      </div>

      {/* ── Skalstock-chip (nedre vänster) – CAD-style ── */}
      <ScaleChip />

      {/* ── Zoom-chip (nedre höger) ── */}
      <ZoomChip zoom={zoom} onZoomChange={onZoomChange} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   ObstaclesLayer – SVG-overlay som ritar placerade hinder ovanpå <canvas>.
   Renderas i samma koordinatsystem (MARGIN-offsetad x,y) och skalas med zoom.
   Ikon-storlek = sizeM × PX_PER_METER × zoom; centrerad på (xM, yM).
   ───────────────────────────────────────────────────────────────────── */

interface ObstaclesLayerProps {
  obstacles: PlacedObstacle[];
  zoom: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
}

function ObstaclesLayer({ obstacles, zoom, canvasWidthPx, canvasHeightPx }: ObstaclesLayerProps) {
  return (
    <svg
      className="pointer-events-none absolute"
      style={{
        left: MARGIN * zoom,
        top: 0,
        width: canvasWidthPx * zoom,
        height: canvasHeightPx * zoom,
      }}
      aria-hidden
    >
      {obstacles.map((o) => {
        const def = getObstacleDef(o.key);
        if (!def) return null;
        const Icon = getObstacleIcon(o.key);
        // Visningsstorlek: ta största sidan i meter och skala upp så ikonen syns,
        // men minst 18px för läsbarhet på låg zoom.
        const sizePx = Math.max(18, Math.max(def.sizeM.w, def.sizeM.h) * PX_PER_METER * zoom);
        const cx = o.xM * PX_PER_METER * zoom;
        const cy = o.yM * PX_PER_METER * zoom;
        return (
          <g key={o.id} transform={`translate(${cx - sizePx / 2}, ${cy - sizePx / 2}) rotate(${o.rotation} ${sizePx / 2} ${sizePx / 2})`}>
            <Icon size={sizePx} className="text-[#1a6b3c]" />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Skalstock: liten ruta med "├── 5m ──┤" ─── */
function ScaleChip() {
  return (
    <div
      className="absolute bottom-3 left-3 bg-white border border-black/[0.08] rounded-md px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1.5 pointer-events-none"
      aria-hidden
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-neutral-600 font-medium">5 m</span>
        <svg width="40" height="6" viewBox="0 0 40 6" fill="none" aria-hidden>
          <path d="M1 1 V5 M1 3 H39 M39 1 V5" stroke="rgb(82, 82, 82)" strokeWidth="1" strokeLinecap="square" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Zoom-chip: aktuell nivå + +/- knappar + fit ─── */
interface ZoomChipProps {
  zoom: number;
  onZoomChange: (z: number) => void;
}

function ZoomChip({ zoom, onZoomChange }: ZoomChipProps) {
  const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white border border-black/[0.08] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.04)] pointer-events-auto">
      <button
        onClick={() => onZoomChange(Math.max(0.25, zoom * 0.8))}
        className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 rounded-l-md transition-colors"
        aria-label="Zooma ut"
        title="Zooma ut"
      >
        <ZoomOut size={13} />
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-2 h-7 text-[11px] font-medium text-neutral-700 tabular-nums hover:bg-neutral-50 transition-colors flex items-center gap-1"
        >
          {Math.round(zoom * 100)}%
          <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute bottom-full right-0 mb-1 bg-white border border-black/[0.08] rounded-md shadow-md py-1 min-w-[80px]">
            {ZOOM_LEVELS.map((z) => (
              <button
                key={z}
                onClick={() => { onZoomChange(z); setOpen(false); }}
                className={`w-full px-3 py-1 text-[11px] text-left hover:bg-neutral-50 transition-colors tabular-nums ${
                  Math.abs(zoom - z) < 0.01 ? 'text-[#1a6b3c] font-medium' : 'text-neutral-700'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
            <div className="border-t border-neutral-100 my-1" />
            <button
              onClick={() => { onZoomChange(1); setOpen(false); }}
              className="w-full px-3 py-1 text-[11px] text-left text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <Maximize2 size={11} />
              Anpassa till skärm
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onZoomChange(Math.min(3, zoom * 1.25))}
        className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 rounded-r-md transition-colors"
        aria-label="Zooma in"
        title="Zooma in"
      >
        <ZoomIn size={13} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Empty state – visas över canvas innan första hindret placerats
   ───────────────────────────────────────────────────────────────────── */

function EmptyStatePrompt({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="bg-white/85 backdrop-blur-sm border border-black/[0.06] rounded-2xl px-6 py-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] text-center max-w-[320px] pointer-events-auto">
        <h2 className="text-[16px] font-medium text-neutral-900 mb-1">
          Skapa din första bana
        </h2>
        <p className="text-[13px] text-neutral-500 mb-4 leading-snug">
          Dra hinder från paletten till banan, eller börja från en mall.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled
            className="h-8 text-[12px] gap-1.5"
            title="Kommer i steg 9C"
          >
            <Sparkles size={12} />
            Välj mall
          </Button>
          <Button
            size="sm"
            onClick={onDismiss}
            className="h-8 text-[12px] bg-[#1a6b3c] hover:bg-[#155830] text-white"
          >
            Starta från tomt
          </Button>
        </div>
        <p className="text-[10px] text-neutral-400 mt-3">
          Tips: dra ett hinder från vänster meny för att börja.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Huvudkomponent
   ───────────────────────────────────────────────────────────────────── */

export default function CoursePlannerBetaPage() {
  // State
  const [courseName, setCourseName] = useState('Obetitlad bana');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [, forceTick] = useState(0);

  // 9B-state
  const [sport, setSport] = useState<ObstacleSport>('agility');
  const [obstacles, setObstacles] = useState<PlacedObstacle[]>([]);
  const [emptyDismissed, setEmptyDismissed] = useState(false);
  const [activeDragKey, setActiveDragKey] = useState<ObstacleIconKey | null>(null);

  // dnd-kit sensors – litet aktiveringsavstånd så att klick på toggle inte triggar drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Tickar autosave-status varje 30s så "Sparat för X min sedan" uppdateras
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Markera som dirty när bannamn ändras
  const handleNameChange = (name: string) => {
    if (name !== courseName) {
      setCourseName(name);
      setIsDirty(true);
    }
  };

  // Stub-actions – riktiga handlers kommer i 9C/9D
  const handleSave = () => {
    setSavedAt(new Date());
    setIsDirty(false);
  };
  const handleExportPDF = () => {
    alert('PDF-export kommer i steg 9C');
  };
  const handleShare = () => {
    alert('Delning kommer i steg 9D');
  };

  /* ─── DnD-handlers: palett → canvas ─── */
  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { source?: string; obstacleKey?: ObstacleIconKey } | undefined;
    if (data?.source === 'palette' && data.obstacleKey) {
      setActiveDragKey(data.obstacleKey);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragKey(null);
    const data = e.active.data.current as { source?: string; obstacleKey?: ObstacleIconKey } | undefined;
    if (!data || data.source !== 'palette' || !data.obstacleKey) return;
    if (e.over?.id !== 'planner-canvas') return;

    // Översätt drop-position (viewport) → canvas-koordinater (meter).
    const overData = e.over.data.current as
      | { containerRef?: React.RefObject<HTMLDivElement>; zoom?: number; widthM?: number; heightM?: number }
      | undefined;
    const container = overData?.containerRef?.current;
    const z = overData?.zoom ?? 1;
    const wM = overData?.widthM ?? DEFAULT_CANVAS_W_M;
    const hM = overData?.heightM ?? DEFAULT_CANVAS_H_M;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const activator = e.activatorEvent as PointerEvent;
    const px = (activator?.clientX ?? 0) + e.delta.x - rect.left + container.scrollLeft;
    const py = (activator?.clientY ?? 0) + e.delta.y - rect.top + container.scrollTop;

    // Subtrahera centrering-padding (100px på vardera sida) och MARGIN
    const innerW = (wM * PX_PER_METER + MARGIN) * z;
    const innerH = (hM * PX_PER_METER + MARGIN) * z;
    const canvasOffsetX = Math.max((container.clientWidth - innerW) / 2, 100);
    const canvasOffsetY = Math.max((container.clientHeight - innerH) / 2, 100);
    const xPx = (px - canvasOffsetX - MARGIN * z) / z;
    const yPx = (py - canvasOffsetY) / z;

    const xM = Math.max(0, Math.min(wM, xPx / PX_PER_METER));
    const yM = Math.max(0, Math.min(hM, yPx / PX_PER_METER));

    setObstacles((prev) => [
      ...prev,
      {
        id: `${data.obstacleKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        key: data.obstacleKey!,
        xM,
        yM,
        rotation: 0,
      },
    ]);
    setIsDirty(true);
  };

  // Cmd/Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Helmet>
        <title>Banplaneraren (Beta) – AgilityManager</title>
        <meta name="description" content="Ny version av banplaneraren med tre-kolumns arbetsyta, ikon-baserad palett och CAD-style canvas." />
      </Helmet>

      <PremiumGate fullPage featureName="Banplaneraren">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className="relative -mx-4 lg:-mx-9 -my-5 lg:-my-8"
            style={{ height: 'calc(100vh - 64px)' }}
          >
            <div className="flex h-full flex-col bg-[#f4f3ee]">
              <div
                className="flex h-[52px] items-center gap-3 border-b bg-white px-4 shrink-0"
                style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
              >
                <Topbar
                  courseName={courseName}
                  onCourseNameChange={handleNameChange}
                  savedAt={savedAt}
                  isDirty={isDirty}
                  onSave={handleSave}
                  onExportPDF={handleExportPDF}
                  onShare={handleShare}
                />
              </div>

              <div className="flex flex-1 min-h-0">
                <aside
                  className="w-[72px] shrink-0 border-r bg-[#fafaf7] overflow-y-auto"
                  style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
                >
                  <ObstaclePalette sport={sport} onSportChange={setSport} />
                </aside>

                <main className="flex-1 min-w-0 relative overflow-hidden">
                  <Canvas
                    widthM={DEFAULT_CANVAS_W_M}
                    heightM={DEFAULT_CANVAS_H_M}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    obstacles={obstacles}
                  />
                  <EmptyStatePrompt
                    visible={obstacles.length === 0 && !emptyDismissed}
                    onDismiss={() => setEmptyDismissed(true)}
                  />
                </main>

                {propertiesOpen ? (
                  <aside
                    className="w-[280px] shrink-0 border-l bg-white overflow-y-auto relative"
                    style={{ borderColor: 'rgba(15, 23, 18, 0.08)' }}
                  >
                    <button
                      onClick={() => setPropertiesOpen(false)}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
                      aria-label="Stäng panel"
                      title="Stäng panel"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <PropertiesPanel obstacleCount={obstacles.length} />
                  </aside>
                ) : (
                  <button
                    onClick={() => setPropertiesOpen(true)}
                    className="w-6 shrink-0 border-l bg-white hover:bg-neutral-50 flex items-center justify-center transition-colors"
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

          <DragOverlay dropAnimation={null}>
            {activeDragKey ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white border border-black/[0.16] shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-[#1a6b3c]">
                {(() => {
                  const Icon = getObstacleIcon(activeDragKey);
                  return <Icon size={28} />;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </PremiumGate>
    </>
  );
}
