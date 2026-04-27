import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, HelpCircle, Plus, RotateCcw, Save, Settings2, Trash2, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type PlannerMode = "Agility" | "Hoopers";
type PlannerObstacleType = "jump" | "tunnel" | "weave" | "tire" | "start" | "finish" | "hoop" | "barrel" | "gate";

type PlannerObstacle = {
  id: string;
  type: PlannerObstacleType;
  label: string;
  icon: string;
  x: number;
  y: number;
  rotation: number;
  number?: number;
};

const GUIDE_KEY = "am_v3_course_planner_guide_seen";

const AGILITY_OBSTACLES: { type: PlannerObstacleType; label: string; icon: string }[] = [
  { type: "jump", label: "Hopp", icon: "┃" },
  { type: "tunnel", label: "Tunnel", icon: "⌒" },
  { type: "weave", label: "Slalom", icon: "⫶" },
  { type: "tire", label: "Däck", icon: "◯" },
  { type: "start", label: "Start", icon: "▸" },
  { type: "finish", label: "Mål", icon: "◼" },
];

const HOOPERS_OBSTACLES: { type: PlannerObstacleType; label: string; icon: string }[] = [
  { type: "hoop", label: "Hoop", icon: "∩" },
  { type: "tunnel", label: "Tunnel", icon: "⌒" },
  { type: "barrel", label: "Tunna", icon: "●" },
  { type: "gate", label: "Staket", icon: "▱" },
  { type: "start", label: "Start", icon: "▸" },
  { type: "finish", label: "Mål", icon: "◼" },
];

const AGILITY_START_OBSTACLES: PlannerObstacle[] = [
  { id: "planner-start", type: "start", label: "Start", icon: "▸", x: 14, y: 82, rotation: 0 },
  { id: "planner-1", type: "jump", label: "Hopp", icon: "┃", x: 32, y: 68, rotation: 0, number: 1 },
  { id: "planner-2", type: "tunnel", label: "Tunnel", icon: "⌒", x: 68, y: 47, rotation: 14, number: 2 },
  { id: "planner-3", type: "weave", label: "Slalom", icon: "⫶", x: 48, y: 33, rotation: -16, number: 3 },
  { id: "planner-finish", type: "finish", label: "Mål", icon: "◼", x: 82, y: 18, rotation: 0 },
];

const HOOPERS_START_OBSTACLES: PlannerObstacle[] = [
  { id: "planner-hoopers-start", type: "start", label: "Start", icon: "▸", x: 14, y: 82, rotation: 0 },
  { id: "planner-hoopers-1", type: "hoop", label: "Hoop", icon: "∩", x: 31, y: 69, rotation: 0, number: 1 },
  { id: "planner-hoopers-2", type: "barrel", label: "Tunna", icon: "●", x: 61, y: 55, rotation: 0, number: 2 },
  { id: "planner-hoopers-3", type: "tunnel", label: "Tunnel", icon: "⌒", x: 46, y: 34, rotation: -12, number: 3 },
  { id: "planner-hoopers-finish", type: "finish", label: "Mål", icon: "◼", x: 82, y: 18, rotation: 0 },
];

function getObstacleTypes(mode: PlannerMode) {
  return mode === "Hoopers" ? HOOPERS_OBSTACLES : AGILITY_OBSTACLES;
}

function getStartObstacles(mode: PlannerMode) {
  return mode === "Hoopers" ? HOOPERS_START_OBSTACLES : AGILITY_START_OBSTACLES;
}

function getDefaultTool(mode: PlannerMode): PlannerObstacleType {
  return mode === "Hoopers" ? "hoop" : "jump";
}

function getObstacleSpec(mode: PlannerMode, type: PlannerObstacleType) {
  return getObstacleTypes(mode).find((item) => item.type === type) ?? getObstacleTypes(mode)[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointToPercent(event: React.PointerEvent<HTMLElement>, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 6, 94),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 6, 94),
  };
}

export default function V3CoursePlannerPage() {
  const [mode, setMode] = useState<PlannerMode>("Agility");
  const [selectedTool, setSelectedTool] = useState<PlannerObstacleType>("jump");
  const [selectedId, setSelectedId] = useState<string | null>("planner-1");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [obstacles, setObstacles] = useState<PlannerObstacle[]>(AGILITY_START_OBSTACLES);
  const [mobilePanel, setMobilePanel] = useState<"obstacles" | "tools">("obstacles");
  const [showGuide, setShowGuide] = useState(false);

  const obstacleTypes = useMemo(() => getObstacleTypes(mode), [mode]);
  const selected = useMemo(() => obstacles.find((item) => item.id === selectedId) ?? null, [obstacles, selectedId]);
  const nextNumber = obstacles.filter((item) => item.number).length + 1;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(GUIDE_KEY) !== "1") setShowGuide(true);
    } catch {
      setShowGuide(true);
    }
  }, []);

  const closeGuide = () => {
    try {
      window.localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
    setShowGuide(false);
  };

  const switchMode = (nextMode: PlannerMode) => {
    if (nextMode === mode) return;
    const defaultTool = getDefaultTool(nextMode);
    const start = getStartObstacles(nextMode);
    setMode(nextMode);
    setSelectedTool(defaultTool);
    setObstacles(start);
    setSelectedId(start.find((item) => item.number)?.id ?? start[0]?.id ?? null);
    setDraggingId(null);
    setMobilePanel("obstacles");
  };

  const addObstacle = (type: PlannerObstacleType = selectedTool) => {
    const spec = getObstacleSpec(mode, type);
    const withNumber = type !== "start" && type !== "finish";
    const next: PlannerObstacle = {
      id: `${type}-${Date.now()}`,
      type: spec.type,
      label: spec.label,
      icon: spec.icon,
      x: 18 + ((obstacles.length * 13) % 64),
      y: 22 + ((obstacles.length * 11) % 56),
      rotation: type === "tunnel" ? 18 : 0,
      number: withNumber ? nextNumber : undefined,
    };
    setObstacles((items) => [...items, next]);
    setSelectedId(next.id);
    setSelectedTool(spec.type);
    setMobilePanel("obstacles");
  };

  const moveSelected = (dx: number, dy: number) => {
    if (!selectedId) return;
    setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, x: clamp(item.x + dx, 6, 94), y: clamp(item.y + dy, 6, 94) } : item));
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, rotation: (item.rotation + 15) % 360 } : item));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setObstacles((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setDraggingId(null);
  };

  const reset = () => {
    const start = getStartObstacles(mode);
    setObstacles(start);
    setSelectedId(start.find((item) => item.number)?.id ?? start[0]?.id ?? null);
    setSelectedTool(getDefaultTool(mode));
    setDraggingId(null);
  };

  const updateObstaclePosition = (id: string, x: number, y: number) => {
    setObstacles((items) => items.map((item) => item.id === id ? { ...item, x, y } : item));
  };

  const handleFieldPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    event.preventDefault();
    const point = pointToPercent(event, event.currentTarget);
    updateObstaclePosition(draggingId, point.x, point.y);
  };

  const handleFieldPointerUp = () => setDraggingId(null);

  return (
    <div className="min-h-[100dvh] bg-[#f7f6f0] text-v3-text-primary pb-[92px] lg:pb-8 animate-v3-fade-in">
      <header className="sticky top-0 z-30 bg-[#f7f6f0]/92 backdrop-blur-xl border-b border-black/5 px-3 lg:px-8 pt-3 pb-2 lg:py-4">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto v3-mobile-scroll">
            <Link to="/v3/courses" className="h-11 w-11 rounded-v3-base bg-white border border-black/8 shadow-v3-xs grid place-items-center text-v3-text-secondary shrink-0">
              <ArrowLeft size={20} strokeWidth={1.8} />
            </Link>
            <button type="button" onClick={() => { setMobilePanel("obstacles"); addObstacle(); }} className="h-11 px-4 rounded-v3-base bg-white border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium shrink-0">
              <Plus size={17} className="text-v3-brand-600" /> Hinder
            </button>
            <button type="button" onClick={() => setMobilePanel((panel) => panel === "tools" ? "obstacles" : "tools")} className={cn("h-11 px-4 rounded-v3-base border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium shrink-0", mobilePanel === "tools" ? "bg-v3-brand-600 text-white" : "bg-white")}>
              <Settings2 size={16} className={mobilePanel === "tools" ? "text-white" : "text-v3-brand-600"} /> Verktyg
            </button>
            <button type="button" onClick={() => setShowGuide(true)} className="h-11 px-4 rounded-v3-base bg-white border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium shrink-0">
              <HelpCircle size={16} className="text-v3-brand-600" /> Guide
            </button>
          </div>

          <div className="grid grid-cols-2 rounded-v3-base bg-white border border-black/8 p-1 shadow-v3-xs lg:w-[260px] lg:ml-auto">
            {(["Agility", "Hoopers"] as const).map((item) => (
              <button key={item} type="button" onClick={() => switchMode(item)} className={cn("h-10 rounded-v3-sm text-v3-sm font-semibold transition-all", mode === item ? "bg-v3-brand-600 text-white shadow-v3-xs" : "text-v3-text-secondary hover:bg-v3-canvas")}>{item}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 lg:px-8 py-3 lg:py-6 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_260px] lg:gap-5 lg:items-start">
        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3 lg:p-5 lg:order-1">
          <div className="flex items-start gap-2 mb-3 lg:mb-5">
            <span className="h-9 w-9 rounded-full bg-v3-brand-500/10 text-v3-brand-700 grid place-items-center shrink-0"><CheckCircle2 size={17} /></span>
            <div className="min-w-0">
              <h1 className="font-v3-display text-[22px] lg:text-[30px] leading-tight text-v3-text-primary">Dra hinder på planen</h1>
              <p className="text-v3-sm text-v3-text-tertiary mt-0.5">Läge: <strong>{mode}</strong>. Dra hindren direkt på gräset och använd Verktyg för finjustering.</p>
            </div>
          </div>

          <div className="hidden lg:block rounded-v3-xl bg-v3-brand-500/10 border border-v3-brand-500/15 p-4 text-v3-sm text-v3-text-secondary">
            <strong className="block text-v3-text-primary mb-1">{mode === "Hoopers" ? "Hoopers-läge" : "Agility-läge"}</strong>
            {mode === "Hoopers" ? "Du får hoopers-hinder som hoop, tunna, tunnel och staket." : "Du får agilityhinder som hopp, tunnel, slalom och däck."}
          </div>
        </section>

        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-2 lg:p-4 lg:order-2">
          <GrassField
            obstacles={obstacles}
            selectedId={selectedId}
            draggingId={draggingId}
            onSelect={(id, type) => { setSelectedId(id); setSelectedTool(type); }}
            onStartDrag={(id) => { setSelectedId(id); setDraggingId(id); }}
            onPointerMove={handleFieldPointerMove}
            onPointerUp={handleFieldPointerUp}
          />
        </section>

        <aside className="space-y-3 lg:order-3">
          <section className={cn("rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3 lg:p-4", mobilePanel === "tools" && "hidden lg:block")}>
            <div className="flex items-center justify-center pb-2 lg:hidden"><span className="h-1 w-10 rounded-full bg-black/15" /></div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-v3-display text-v3-xl text-v3-text-primary">{mode}-hinder</h2>
                <p className="text-v3-xs text-v3-text-tertiary">Tryck för att lägga till. Dra sedan på planen.</p>
              </div>
              {selected && <span className="rounded-full bg-v3-brand-500/10 px-3 py-1 text-v3-xs font-medium text-v3-brand-700">Valt: {selected.label}</span>}
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
              {obstacleTypes.map((item) => {
                const isActive = selectedTool === item.type;
                return (
                  <button key={item.type} type="button" onClick={() => addObstacle(item.type)} className={cn("min-h-[68px] lg:min-h-[74px] rounded-v3-xl border p-2 text-center transition-all", isActive ? "bg-v3-brand-500/10 border-v3-brand-500/25 text-v3-brand-800" : "bg-v3-canvas border-v3-canvas-sunken/50 text-v3-text-secondary hover:border-v3-brand-500/30")}> 
                    <span className="block text-[21px] leading-none">{item.icon}</span>
                    <span className="block mt-1.5 text-v3-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={cn("rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3 lg:p-4", mobilePanel !== "tools" && "hidden lg:block")}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Verktyg</h2>
                <p className="text-v3-xs text-v3-text-tertiary">Finjustera valt hinder.</p>
              </div>
              {selected && <span className="rounded-full bg-v3-brand-500/10 px-3 py-1 text-v3-xs font-medium text-v3-brand-700">{selected.label}</span>}
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
              <button type="button" onClick={() => moveSelected(0, -3)} disabled={!selected} className="mobile-tool-btn">↑</button>
              <button type="button" onClick={() => moveSelected(-3, 0)} disabled={!selected} className="mobile-tool-btn">←</button>
              <button type="button" onClick={() => moveSelected(3, 0)} disabled={!selected} className="mobile-tool-btn">→</button>
              <button type="button" onClick={() => moveSelected(0, 3)} disabled={!selected} className="mobile-tool-btn">↓</button>
              <button type="button" onClick={rotateSelected} disabled={!selected} className="mobile-tool-btn col-span-2"><RotateCcw size={15} /> Rotera</button>
              <button type="button" onClick={deleteSelected} disabled={!selected} className="mobile-tool-btn text-red-600"><Trash2 size={15} /> Ta bort</button>
              <button type="button" onClick={reset} className="mobile-tool-btn"><Undo2 size={15} /> Ångra</button>
            </div>
          </section>

          <section className="hidden lg:block rounded-[22px] bg-v3-text-primary text-white shadow-v3-sm p-4">
            <h2 className="font-v3-display text-v3-xl">Spara och dela</h2>
            <p className="text-v3-sm text-white/65 mt-1">Nästa steg blir att koppla den här nya vyn till sparade banor och export.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" className="mobile-tool-btn bg-white text-v3-text-primary"><Save size={15} /> Spara</button>
              <button type="button" className="mobile-tool-btn bg-white text-v3-text-primary"><Download size={15} /> Export</button>
            </div>
          </section>
        </aside>
      </main>

      {showGuide && <PlannerGuide onClose={closeGuide} />}
    </div>
  );
}

function GrassField({ obstacles, selectedId, draggingId, onSelect, onStartDrag, onPointerMove, onPointerUp }: { obstacles: PlannerObstacle[]; selectedId: string | null; draggingId: string | null; onSelect: (id: string, type: PlannerObstacleType) => void; onStartDrag: (id: string) => void; onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void; onPointerUp: () => void }) {
  return (
    <div className="relative rounded-[20px] overflow-hidden border border-[#d7e3ca] bg-[#77a856] shadow-inner">
      <div
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn("relative h-[58vh] min-h-[440px] max-h-[620px] lg:h-[calc(100vh-190px)] lg:min-h-[640px] lg:max-h-[840px] select-none overflow-hidden", draggingId ? "cursor-grabbing" : "cursor-default")}
        style={{
          backgroundColor: "#78a957",
          backgroundImage: "radial-gradient(circle at 18px 18px, rgba(255,255,255,.08) 1px, transparent 1.8px), linear-gradient(rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,.09), rgba(25,77,36,.10))",
          backgroundSize: "20px 20px, 68px 68px, 68px 68px, 100% 100%",
          touchAction: "none",
        }}
      >
        <div className="absolute left-3 top-3 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm pointer-events-none">1 ruta = 1 meter</div>
        <div className="absolute right-3 top-3 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hidden sm:block pointer-events-none">Dra hinder</div>
        <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between text-white/90 text-[11px] font-semibold pointer-events-none"><span>0 m</span><span className="inline-flex items-center gap-2"><span className="h-px w-16 bg-white/80" />5 m</span></div>
        <div className="absolute left-3 top-14 bottom-10 w-px bg-white/70 pointer-events-none" />
        <div className="absolute left-3 bottom-10 right-3 h-px bg-white/70 pointer-events-none" />
        {obstacles.map((obstacle) => (
          <PlannerObstacleButton
            key={obstacle.id}
            obstacle={obstacle}
            selected={obstacle.id === selectedId}
            dragging={obstacle.id === draggingId}
            onSelect={() => onSelect(obstacle.id, obstacle.type)}
            onStartDrag={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              onSelect(obstacle.id, obstacle.type);
              onStartDrag(obstacle.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PlannerObstacleButton({ obstacle, selected, dragging, onSelect, onStartDrag }: { obstacle: PlannerObstacle; selected: boolean; dragging: boolean; onSelect: () => void; onStartDrag: (event: React.PointerEvent<HTMLButtonElement>) => void }) {
  const isTunnel = obstacle.type === "tunnel";
  const isWeave = obstacle.type === "weave";
  const isTire = obstacle.type === "tire";
  const isHoop = obstacle.type === "hoop";
  const isBarrel = obstacle.type === "barrel";
  const isGate = obstacle.type === "gate";
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      onPointerDown={onStartDrag}
      className={cn("absolute grid place-items-center bg-white/92 border shadow-[0_8px_16px_rgba(24,64,33,.20)] transition-transform cursor-grab active:cursor-grabbing touch-none", selected ? "border-white ring-3 ring-white/40 scale-105 z-20" : "border-white/70 z-10", dragging && "scale-110 shadow-[0_16px_26px_rgba(24,64,33,.28)]", isTunnel ? "h-9 w-16 lg:h-10 lg:w-18 rounded-full" : isWeave || isGate ? "h-8 w-20 lg:h-9 lg:w-24 rounded-full" : isTire || isHoop || isBarrel ? "h-10 w-10 lg:h-11 lg:w-11 rounded-full" : "h-9 w-9 lg:h-10 lg:w-10 rounded-lg")}
      style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%`, transform: `translate(-50%, -50%) rotate(${obstacle.rotation}deg)` }}
      aria-label={obstacle.label}
    >
      <span className={cn("leading-none font-bold pointer-events-none", isTunnel ? "text-[21px] text-v3-brand-700" : isWeave || isGate ? "text-[20px] text-v3-brand-700" : isHoop || isBarrel ? "text-[17px] text-v3-brand-700" : "text-[18px] text-v3-text-primary")}>{obstacle.icon}</span>
      {obstacle.number && <span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-v3-brand-600 text-white text-[10px] font-bold grid place-items-center shadow-v3-xs pointer-events-none">{obstacle.number}</span>}
    </button>
  );
}

function PlannerGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-v3-text-primary/45 backdrop-blur-sm px-4 py-6 flex items-center justify-center">
      <section className="w-full max-w-md rounded-[26px] bg-white shadow-v3-xl border border-black/10 overflow-hidden animate-v3-fade-up">
        <div className="p-5 border-b border-black/5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-v3-text-tertiary">Snabbguide</div>
            <h2 className="font-v3-display text-[28px] leading-tight text-v3-text-primary mt-1">Så bygger du en bana</h2>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-v3-canvas grid place-items-center text-v3-text-secondary hover:bg-v3-canvas-sunken"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <GuideStep number="1" title="Välj Agility eller Hoopers" text="Läget byter hinderutbud och startbana." />
          <GuideStep number="2" title="Lägg till hinder" text="Tryck på Hinder eller välj ett hinderkort i panelen." />
          <GuideStep number="3" title="Dra på gräset" text="Håll inne på ett hinder och dra det till rätt plats på planen." />
          <GuideStep number="4" title="Öppna Verktyg" text="Använd Verktyg för att rotera, finjustera, ta bort eller återställa banan." />
        </div>
        <div className="p-5 pt-0"><button type="button" onClick={onClose} className="w-full h-12 rounded-v3-base bg-v3-brand-600 text-white text-v3-sm font-semibold shadow-v3-sm hover:bg-v3-brand-700 transition-colors">Jag fattar – börja rita</button></div>
      </section>
    </div>
  );
}

function GuideStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3 rounded-v3-xl bg-v3-canvas p-3"><span className="h-8 w-8 rounded-full bg-v3-brand-500/10 text-v3-brand-700 text-v3-sm font-bold grid place-items-center shrink-0">{number}</span><div><h3 className="text-v3-sm font-semibold text-v3-text-primary">{title}</h3><p className="text-v3-sm text-v3-text-secondary mt-0.5 leading-relaxed">{text}</p></div></div>;
}
