import { Suspense, lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, GripHorizontal, Plus, RotateCcw, Settings2, Trash2, Undo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Desktop använder den kompletta befintliga banplaneraren.
// Mobil får en egen, tydligare touch-first vy som inte känns som desktop intryckt i telefonen.
const CoursePlannerPage = lazy(() => import("@/pages/CoursePlannerPage"));

type MobileObstacleType = "jump" | "tunnel" | "weave" | "tire" | "start" | "finish";

type MobileObstacle = {
  id: string;
  type: MobileObstacleType;
  label: string;
  icon: string;
  x: number;
  y: number;
  rotation: number;
  number?: number;
};

const MOBILE_OBSTACLE_TYPES: { type: MobileObstacleType; label: string; icon: string }[] = [
  { type: "jump", label: "Hopp", icon: "┃" },
  { type: "tunnel", label: "Tunnel", icon: "⌒" },
  { type: "weave", label: "Slalom", icon: "⫶" },
  { type: "tire", label: "Däck", icon: "◯" },
  { type: "start", label: "Start", icon: "▸" },
  { type: "finish", label: "Mål", icon: "◼" },
];

const MOBILE_START_OBSTACLES: MobileObstacle[] = [
  { id: "mobile-start", type: "start", label: "Start", icon: "▸", x: 14, y: 82, rotation: 0 },
  { id: "mobile-1", type: "jump", label: "Hopp", icon: "┃", x: 32, y: 68, rotation: 0, number: 1 },
  { id: "mobile-2", type: "tunnel", label: "Tunnel", icon: "⌒", x: 68, y: 47, rotation: 14, number: 2 },
  { id: "mobile-3", type: "weave", label: "Slalom", icon: "⫶", x: 48, y: 33, rotation: -16, number: 3 },
  { id: "mobile-finish", type: "finish", label: "Mål", icon: "◼", x: 82, y: 18, rotation: 0 },
];

export default function V3CoursePlannerPage() {
  const isMobile = useIsMobile();

  if (isMobile) return <V3MobileCoursePlanner />;

  return (
    <div className="min-h-[calc(100vh-100px)] bg-v3-canvas animate-v3-fade-in">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-6 pt-3 lg:pt-4">
        <Link
          to="/v3/courses"
          className="v3-tappable inline-flex items-center gap-1.5 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 px-3 py-1.5 text-v3-sm font-medium text-v3-text-primary shadow-v3-xs hover:border-v3-text-tertiary/40"
        >
          <ArrowLeft size={14} />
          Banor &amp; kurser
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="max-w-[1400px] mx-auto px-3 lg:px-6 py-6 space-y-3">
            <div className="v3-skeleton h-10 w-64 rounded-v3-base" />
            <div className="v3-skeleton h-[60vh] w-full rounded-v3-xl" />
          </div>
        }
      >
        <CoursePlannerPage />
      </Suspense>
    </div>
  );
}

function V3MobileCoursePlanner() {
  const [mode, setMode] = useState<"Agility" | "Hoopers">("Agility");
  const [selectedTool, setSelectedTool] = useState<MobileObstacleType>("jump");
  const [selectedId, setSelectedId] = useState<string | null>("mobile-1");
  const [obstacles, setObstacles] = useState<MobileObstacle[]>(MOBILE_START_OBSTACLES);

  const selected = useMemo(() => obstacles.find((item) => item.id === selectedId) ?? null, [obstacles, selectedId]);
  const nextNumber = obstacles.filter((item) => item.number).length + 1;

  const addObstacle = (type: MobileObstacleType = selectedTool) => {
    const spec = MOBILE_OBSTACLE_TYPES.find((item) => item.type === type) ?? MOBILE_OBSTACLE_TYPES[0];
    const withNumber = type !== "start" && type !== "finish";
    const next: MobileObstacle = {
      id: `${type}-${Date.now()}`,
      type,
      label: spec.label,
      icon: spec.icon,
      x: 18 + ((obstacles.length * 13) % 64),
      y: 22 + ((obstacles.length * 11) % 56),
      rotation: type === "tunnel" ? 18 : 0,
      number: withNumber ? nextNumber : undefined,
    };
    setObstacles((items) => [...items, next]);
    setSelectedId(next.id);
    setSelectedTool(type);
  };

  const moveSelected = (dx: number, dy: number) => {
    if (!selectedId) return;
    setObstacles((items) =>
      items.map((item) =>
        item.id === selectedId
          ? { ...item, x: Math.min(92, Math.max(8, item.x + dx)), y: Math.min(92, Math.max(8, item.y + dy)) }
          : item,
      ),
    );
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    setObstacles((items) => items.map((item) => (item.id === selectedId ? { ...item, rotation: (item.rotation + 15) % 360 } : item)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setObstacles((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const reset = () => {
    setObstacles(MOBILE_START_OBSTACLES);
    setSelectedId("mobile-1");
    setSelectedTool("jump");
  };

  const handleFieldTap = (event: React.MouseEvent<HTMLDivElement>) => {
    const field = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - field.left) / field.width) * 100;
    const y = ((event.clientY - field.top) / field.height) * 100;
    if (selectedId) {
      setObstacles((items) => items.map((item) => (item.id === selectedId ? { ...item, x: Math.min(92, Math.max(8, x)), y: Math.min(92, Math.max(8, y)) } : item)));
      return;
    }
    addObstacle(selectedTool);
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7f6f0] text-v3-text-primary pb-[92px] animate-v3-fade-in">
      <header className="sticky top-0 z-30 bg-[#f7f6f0]/92 backdrop-blur-xl border-b border-black/5 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Link to="/v3/courses" className="h-11 w-11 rounded-v3-base bg-white border border-black/8 shadow-v3-xs grid place-items-center text-v3-text-secondary">
            <ArrowLeft size={20} strokeWidth={1.8} />
          </Link>
          <button type="button" onClick={() => addObstacle()} className="h-11 px-4 rounded-v3-base bg-white border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium">
            <Plus size={17} className="text-v3-brand-600" /> Hinder
          </button>
          <button type="button" onClick={rotateSelected} className="h-11 px-4 rounded-v3-base bg-white border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium">
            <Settings2 size={16} className="text-v3-brand-600" /> Verktyg
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 rounded-v3-base bg-white border border-black/8 p-1 shadow-v3-xs">
          {(["Agility", "Hoopers"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={cn("h-10 rounded-[calc(theme(borderRadius.v3-base)-4px)] text-v3-sm font-semibold transition-all", mode === item ? "bg-v3-brand-600 text-white shadow-v3-xs" : "text-v3-text-secondary")}>{item}</button>
          ))}
        </div>
      </header>

      <main className="px-3 py-3 space-y-3">
        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3">
          <div className="flex items-start gap-2 mb-3">
            <span className="h-9 w-9 rounded-full bg-v3-brand-500/10 text-v3-brand-700 grid place-items-center shrink-0"><CheckCircle2 size={17} /></span>
            <div className="min-w-0">
              <h1 className="font-v3-display text-[22px] leading-tight text-v3-text-primary">Placera hinder på planen</h1>
              <p className="text-v3-sm text-v3-text-tertiary mt-0.5">Tryck i gräset för att flytta valt hinder. Välj nytt hinder längst ner.</p>
            </div>
          </div>

          <div className="relative rounded-[20px] overflow-hidden border border-[#d7e3ca] bg-[#77a856] shadow-inner">
            <div
              role="button"
              tabIndex={0}
              onClick={handleFieldTap}
              className="relative h-[58vh] min-h-[440px] max-h-[620px] touch-none select-none overflow-hidden"
              style={{
                backgroundColor: "#78a957",
                backgroundImage:
                  "radial-gradient(circle at 18px 18px, rgba(255,255,255,.08) 1px, transparent 1.8px), linear-gradient(rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,.09), rgba(25,77,36,.10))",
                backgroundSize: "18px 18px, 64px 64px, 64px 64px, 100% 100%",
              }}
            >
              <div className="absolute left-3 top-3 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">1 ruta = 1 meter</div>
              <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between text-white/90 text-[11px] font-semibold pointer-events-none">
                <span>0 m</span>
                <span className="inline-flex items-center gap-2"><span className="h-px w-16 bg-white/80" />5 m</span>
              </div>
              <div className="absolute left-3 top-14 bottom-10 w-px bg-white/70 pointer-events-none" />
              <div className="absolute left-3 bottom-10 right-3 h-px bg-white/70 pointer-events-none" />

              {obstacles.map((obstacle) => (
                <MobileObstacleButton
                  key={obstacle.id}
                  obstacle={obstacle}
                  selected={obstacle.id === selectedId}
                  onSelect={(e) => {
                    e.stopPropagation();
                    setSelectedId(obstacle.id);
                    setSelectedTool(obstacle.type);
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3">
          <div className="flex items-center justify-center pb-2"><span className="h-1 w-10 rounded-full bg-black/15" /></div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Hinder</h2>
              <p className="text-v3-xs text-v3-text-tertiary">Tryck för att lägga till på planen.</p>
            </div>
            {selected && <span className="rounded-full bg-v3-brand-500/10 px-3 py-1 text-v3-xs font-medium text-v3-brand-700">Valt: {selected.label}</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MOBILE_OBSTACLE_TYPES.map((item) => {
              const isActive = selectedTool === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addObstacle(item.type)}
                  className={cn("min-h-[78px] rounded-v3-xl border p-2 text-center transition-all", isActive ? "bg-v3-brand-500/10 border-v3-brand-500/25 text-v3-brand-800" : "bg-v3-canvas border-v3-canvas-sunken/50 text-v3-text-secondary")}
                >
                  <span className="block text-[24px] leading-none">{item.icon}</span>
                  <span className="block mt-2 text-v3-xs font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3">
          <div className="grid grid-cols-4 gap-2">
            <button type="button" onClick={() => moveSelected(0, -4)} disabled={!selected} className="mobile-tool-btn">↑</button>
            <button type="button" onClick={() => moveSelected(-4, 0)} disabled={!selected} className="mobile-tool-btn">←</button>
            <button type="button" onClick={() => moveSelected(4, 0)} disabled={!selected} className="mobile-tool-btn">→</button>
            <button type="button" onClick={() => moveSelected(0, 4)} disabled={!selected} className="mobile-tool-btn">↓</button>
            <button type="button" onClick={rotateSelected} disabled={!selected} className="mobile-tool-btn col-span-2"><RotateCcw size={15} /> Rotera</button>
            <button type="button" onClick={deleteSelected} disabled={!selected} className="mobile-tool-btn text-red-600"><Trash2 size={15} /> Ta bort</button>
            <button type="button" onClick={reset} className="mobile-tool-btn"><Undo2 size={15} /> Ångra</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function MobileObstacleButton({ obstacle, selected, onSelect }: { obstacle: MobileObstacle; selected: boolean; onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  const isTunnel = obstacle.type === "tunnel";
  const isWeave = obstacle.type === "weave";
  const isTire = obstacle.type === "tire";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "absolute grid place-items-center bg-white/92 border shadow-[0_10px_20px_rgba(24,64,33,.22)] transition-all",
        selected ? "border-white ring-4 ring-white/40 scale-110 z-20" : "border-white/70 z-10",
        isTunnel ? "h-12 w-20 rounded-full" : isWeave ? "h-10 w-24 rounded-full" : isTire ? "h-14 w-14 rounded-full" : "h-12 w-12 rounded-xl",
      )}
      style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%`, transform: `translate(-50%, -50%) rotate(${obstacle.rotation}deg)` }}
      aria-label={obstacle.label}
    >
      <span className={cn("leading-none font-bold", isTunnel ? "text-[28px] text-v3-brand-700" : isWeave ? "text-[24px] text-v3-brand-700" : "text-[23px] text-v3-text-primary")}>{obstacle.icon}</span>
      {obstacle.number && <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-v3-brand-600 text-white text-[11px] font-bold grid place-items-center shadow-v3-xs">{obstacle.number}</span>}
    </button>
  );
}
