import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, HelpCircle, Plus, RotateCcw, Save, Settings2, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PlannerMode = "Agility" | "Hoopers";
type PlannerObstacleType = "jump" | "long_jump" | "oxer" | "wall" | "tunnel" | "a_frame" | "dog_walk" | "seesaw" | "balance" | "weave" | "tire" | "start" | "finish" | "hoop" | "hoopers_tunnel" | "barrel" | "gate" | "handler_zone";
type PlannerObstacleSpec = { type: PlannerObstacleType; label: string; icon: string; shape: "bar" | "wide" | "long" | "circle" | "tunnel" | "zone" | "triangle"; };
type PlannerObstacle = PlannerObstacleSpec & { id: string; x: number; y: number; rotation: number; number?: number; };
type PlannerCourses = Record<PlannerMode, PlannerObstacle[]>;

const GUIDE_KEY = "am_v3_course_planner_guide_seen";
const SAVE_KEY = "am_v3_course_planner_courses";

const AGILITY_OBSTACLES: PlannerObstacleSpec[] = [
  { type: "jump", label: "Hopp", icon: "┃", shape: "bar" },
  { type: "long_jump", label: "Långhopp", icon: "═", shape: "wide" },
  { type: "oxer", label: "Oxer", icon: "‖", shape: "wide" },
  { type: "wall", label: "Muren", icon: "▬", shape: "wide" },
  { type: "tunnel", label: "Tunnel", icon: "⌒", shape: "tunnel" },
  { type: "a_frame", label: "A-hinder", icon: "△", shape: "triangle" },
  { type: "dog_walk", label: "Brygga", icon: "━", shape: "long" },
  { type: "seesaw", label: "Vipp", icon: "⏤", shape: "long" },
  { type: "balance", label: "Balans", icon: "─", shape: "long" },
  { type: "weave", label: "Slalom", icon: "⫶", shape: "long" },
  { type: "tire", label: "Däck", icon: "◯", shape: "circle" },
  { type: "start", label: "Start", icon: "▸", shape: "bar" },
  { type: "finish", label: "Mål", icon: "◼", shape: "bar" },
];

const HOOPERS_OBSTACLES: PlannerObstacleSpec[] = [
  { type: "hoop", label: "Hoop", icon: "⌒", shape: "wide" },
  { type: "hoopers_tunnel", label: "Tunnel", icon: "▬", shape: "tunnel" },
  { type: "barrel", label: "Tunna", icon: "●", shape: "circle" },
  { type: "gate", label: "Staket", icon: "╫", shape: "wide" },
  { type: "handler_zone", label: "Zon", icon: "☐", shape: "zone" },
  { type: "start", label: "Start", icon: "▸", shape: "bar" },
  { type: "finish", label: "Mål", icon: "◼", shape: "bar" },
];

function getObstacleTypes(mode: PlannerMode) { return mode === "Hoopers" ? HOOPERS_OBSTACLES : AGILITY_OBSTACLES; }
function getDefaultTool(mode: PlannerMode): PlannerObstacleType { return mode === "Hoopers" ? "hoop" : "jump"; }
function getObstacleSpec(mode: PlannerMode, type: PlannerObstacleType) { return getObstacleTypes(mode).find((item) => item.type === type) ?? getObstacleTypes(mode)[0]; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function pointToPercent(event: React.PointerEvent<HTMLElement>, element: HTMLElement) { const rect = element.getBoundingClientRect(); return { x: clamp(((event.clientX - rect.left) / rect.width) * 100, 5, 95), y: clamp(((event.clientY - rect.top) / rect.height) * 100, 5, 95) }; }

function makeStartObstacles(mode: PlannerMode): PlannerObstacle[] {
  if (mode === "Hoopers") {
    const start = HOOPERS_OBSTACLES.find((o) => o.type === "start")!;
    const finish = HOOPERS_OBSTACLES.find((o) => o.type === "finish")!;
    return [{ ...start, id: "hoopers-start", x: 14, y: 82, rotation: 0 }, { ...finish, id: "hoopers-finish", x: 84, y: 18, rotation: 0 }];
  }
  const start = AGILITY_OBSTACLES.find((o) => o.type === "start")!;
  const finish = AGILITY_OBSTACLES.find((o) => o.type === "finish")!;
  return [{ ...start, id: "agility-start", x: 14, y: 82, rotation: 0 }, { ...finish, id: "agility-finish", x: 84, y: 18, rotation: 0 }];
}

function makeInitialCourses(): PlannerCourses {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlannerCourses>;
      return { Agility: parsed.Agility?.length ? parsed.Agility : makeStartObstacles("Agility"), Hoopers: parsed.Hoopers?.length ? parsed.Hoopers : makeStartObstacles("Hoopers") };
    }
  } catch { /* ignore */ }
  return { Agility: makeStartObstacles("Agility"), Hoopers: makeStartObstacles("Hoopers") };
}

function download(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function V3CoursePlannerPage() {
  const [mode, setMode] = useState<PlannerMode>("Agility");
  const [selectedTool, setSelectedTool] = useState<PlannerObstacleType>("jump");
  const [selectedId, setSelectedId] = useState<string | null>("agility-start");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [courses, setCourses] = useState<PlannerCourses>(() => makeInitialCourses());
  const [mobilePanel, setMobilePanel] = useState<"obstacles" | "tools">("obstacles");
  const [showGuide, setShowGuide] = useState(false);

  const obstacles = courses[mode];
  const obstacleTypes = useMemo(() => getObstacleTypes(mode), [mode]);
  const selected = useMemo(() => obstacles.find((item) => item.id === selectedId) ?? null, [obstacles, selectedId]);
  const nextNumber = obstacles.filter((item) => item.number).length + 1;
  const setObstacles = (updater: PlannerObstacle[] | ((items: PlannerObstacle[]) => PlannerObstacle[])) => {
    setCourses((prev) => ({ ...prev, [mode]: typeof updater === "function" ? updater(prev[mode]) : updater }));
  };

  useEffect(() => { try { if (window.localStorage.getItem(GUIDE_KEY) !== "1") setShowGuide(true); } catch { setShowGuide(true); } }, []);
  const closeGuide = () => { try { window.localStorage.setItem(GUIDE_KEY, "1"); } catch { /* ignore */ } setShowGuide(false); };

  const switchMode = (nextMode: PlannerMode) => {
    if (nextMode === mode) return;
    const nextList = courses[nextMode]?.length ? courses[nextMode] : makeStartObstacles(nextMode);
    setMode(nextMode);
    setSelectedTool(getDefaultTool(nextMode));
    setSelectedId(nextList.find((item) => item.number)?.id ?? nextList[0]?.id ?? null);
    setDraggingId(null);
    setMobilePanel("obstacles");
  };

  const addObstacle = (type: PlannerObstacleType = selectedTool) => {
    const spec = getObstacleSpec(mode, type);
    const withNumber = spec.type !== "start" && spec.type !== "finish" && spec.type !== "handler_zone";
    const next: PlannerObstacle = { ...spec, id: `${mode.toLowerCase()}-${spec.type}-${crypto.randomUUID?.() ?? Date.now()}`, x: 14 + ((obstacles.length * 11) % 72), y: 18 + ((obstacles.length * 9) % 66), rotation: spec.type.includes("tunnel") ? 18 : 0, number: withNumber ? nextNumber : undefined };
    setObstacles((items) => [...items, next]);
    setSelectedId(next.id);
    setSelectedTool(spec.type);
    setMobilePanel("obstacles");
  };

  const moveSelected = (dx: number, dy: number) => { if (!selectedId) return; setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, x: clamp(item.x + dx, 5, 95), y: clamp(item.y + dy, 5, 95) } : item)); };
  const rotateSelected = () => { if (!selectedId) return; setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, rotation: (item.rotation + 15) % 360 } : item)); };
  const deleteSelected = () => { if (!selectedId) return; setObstacles((items) => items.filter((item) => item.id !== selectedId)); setSelectedId(null); setDraggingId(null); };
  const reset = () => { const start = makeStartObstacles(mode); setObstacles(start); setSelectedId(start[0]?.id ?? null); setSelectedTool(getDefaultTool(mode)); setDraggingId(null); toast.success(`${mode}-banan återställd`); };
  const updateObstaclePosition = (id: string, x: number, y: number) => { setObstacles((items) => items.map((item) => item.id === id ? { ...item, x, y } : item)); };
  const handleFieldPointerMove = (event: React.PointerEvent<HTMLDivElement>) => { if (!draggingId) return; event.preventDefault(); const point = pointToPercent(event, event.currentTarget); updateObstaclePosition(draggingId, point.x, point.y); };
  const saveCourses = () => { window.localStorage.setItem(SAVE_KEY, JSON.stringify(courses)); toast.success("Banan sparades på den här enheten"); };
  const exportCourse = () => { download(`bana-${mode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ mode, obstacles, exportedAt: new Date().toISOString() }, null, 2)); toast.success("Banan exporterades"); };

  return (
    <div className="min-h-[100dvh] bg-[#f7f6f0] text-v3-text-primary pb-[92px] lg:pb-8 animate-v3-fade-in">
      <header className="sticky top-0 z-30 bg-[#f7f6f0]/92 backdrop-blur-xl border-b border-black/5 px-3 lg:px-8 pt-3 pb-2 lg:py-4">
        <div className="max-w-[1500px] mx-auto flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto v3-mobile-scroll">
            <Link to="/v3/courses" className="h-11 w-11 rounded-v3-base bg-white border border-black/8 shadow-v3-xs grid place-items-center text-v3-text-secondary shrink-0"><ArrowLeft size={20} strokeWidth={1.8} /></Link>
            <button type="button" onClick={() => { setMobilePanel("obstacles"); addObstacle(); }} className="h-11 px-4 rounded-v3-base bg-white border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium shrink-0"><Plus size={17} className="text-v3-brand-600" /> Hinder</button>
            <button type="button" onClick={() => setMobilePanel((panel) => panel === "tools" ? "obstacles" : "tools")} className={cn("h-11 px-4 rounded-v3-base border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium shrink-0", mobilePanel === "tools" ? "bg-v3-brand-600 text-white" : "bg-white")}><Settings2 size={16} className={mobilePanel === "tools" ? "text-white" : "text-v3-brand-600"} /> Verktyg</button>
            <button type="button" onClick={() => setShowGuide(true)} className="h-11 px-4 rounded-v3-base bg-white border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium shrink-0"><HelpCircle size={16} className="text-v3-brand-600" /> Guide</button>
          </div>
          <div className="grid grid-cols-2 rounded-v3-base bg-white border border-black/8 p-1 shadow-v3-xs lg:w-[260px] lg:ml-auto">{(["Agility", "Hoopers"] as const).map((item) => <button key={item} type="button" onClick={() => switchMode(item)} className={cn("h-10 rounded-v3-sm text-v3-sm font-semibold transition-all", mode === item ? "bg-v3-brand-600 text-white shadow-v3-xs" : "text-v3-text-secondary hover:bg-v3-canvas")}>{item}</button>)}</div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-3 lg:px-8 py-3 lg:py-6 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:gap-5 lg:items-start">
        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3 lg:p-5 lg:order-1">
          <div className="flex items-start gap-2 mb-3 lg:mb-5"><span className="h-9 w-9 rounded-full bg-v3-brand-500/10 text-v3-brand-700 grid place-items-center shrink-0"><CheckCircle2 size={17} /></span><div className="min-w-0"><h1 className="font-v3-display text-[22px] lg:text-[30px] leading-tight text-v3-text-primary">Bygg din bana</h1><p className="text-v3-sm text-v3-text-tertiary mt-0.5">Läge: <strong>{mode}</strong>. Välj hinder, dra dem på planen och spara eller exportera när du är klar.</p></div></div>
          <div className="hidden lg:block rounded-v3-xl bg-v3-brand-500/10 border border-v3-brand-500/15 p-4 text-v3-sm text-v3-text-secondary"><strong className="block text-v3-text-primary mb-1">Hinder i {mode}</strong>{mode === "Hoopers" ? "Hoop, tunnel, tunna, staket, zon, start och mål." : "Hopp, långhopp, oxer, muren, tunnel, A-hinder, brygga, vipp, balans, slalom, däck, start och mål."}</div>
        </section>

        <section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-2 lg:p-4 lg:order-2"><GrassField obstacles={obstacles} selectedId={selectedId} draggingId={draggingId} onSelect={(id, type) => { setSelectedId(id); setSelectedTool(type); }} onStartDrag={(id) => { setSelectedId(id); setDraggingId(id); }} onPointerMove={handleFieldPointerMove} onPointerUp={() => setDraggingId(null)} /></section>

        <aside className="space-y-3 lg:order-3">
          <section className={cn("rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3 lg:p-4", mobilePanel === "tools" && "hidden lg:block")}>
            <div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="font-v3-display text-v3-xl text-v3-text-primary">{mode}-hinder</h2><p className="text-v3-xs text-v3-text-tertiary">Tryck för att lägga till. Dra sedan på planen.</p></div>{selected && <span className="rounded-full bg-v3-brand-500/10 px-3 py-1 text-v3-xs font-medium text-v3-brand-700">Valt: {selected.label}</span>}</div>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">{obstacleTypes.map((item) => { const isActive = selectedTool === item.type; return <button key={item.type} type="button" onClick={() => addObstacle(item.type)} className={cn("min-h-[68px] rounded-v3-xl border p-2 text-center transition-all", isActive ? "bg-v3-brand-500/10 border-v3-brand-500/25 text-v3-brand-800" : "bg-v3-canvas border-v3-canvas-sunken/50 text-v3-text-secondary hover:border-v3-brand-500/30")}><span className="block text-[21px] leading-none">{item.icon}</span><span className="block mt-1.5 text-[11px] font-semibold leading-tight">{item.label}</span></button>; })}</div>
          </section>

          <section className={cn("rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-3 lg:p-4", mobilePanel !== "tools" && "hidden lg:block")}>
            <div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="font-v3-display text-v3-xl text-v3-text-primary">Verktyg</h2><p className="text-v3-xs text-v3-text-tertiary">Finjustera valt hinder.</p></div>{selected && <span className="rounded-full bg-v3-brand-500/10 px-3 py-1 text-v3-xs font-medium text-v3-brand-700">{selected.label}</span>}</div>
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2"><button type="button" onClick={() => moveSelected(0, -3)} disabled={!selected} className="mobile-tool-btn">↑</button><button type="button" onClick={() => moveSelected(-3, 0)} disabled={!selected} className="mobile-tool-btn">←</button><button type="button" onClick={() => moveSelected(3, 0)} disabled={!selected} className="mobile-tool-btn">→</button><button type="button" onClick={() => moveSelected(0, 3)} disabled={!selected} className="mobile-tool-btn">↓</button><button type="button" onClick={rotateSelected} disabled={!selected} className="mobile-tool-btn col-span-2"><RotateCcw size={15} /> Rotera</button><button type="button" onClick={deleteSelected} disabled={!selected} className="mobile-tool-btn text-coral"><Trash2 size={15} /> Ta bort</button><button type="button" onClick={reset} className="mobile-tool-btn"><Undo2 size={15} /> Återställ</button></div>
          </section>

          <section className="rounded-[22px] bg-v3-text-primary text-white shadow-v3-sm p-4"><h2 className="font-v3-display text-v3-xl">Spara och dela</h2><p className="text-v3-sm text-white/65 mt-1">Spara banan på enheten eller exportera den som fil.</p><div className="grid grid-cols-2 gap-2 mt-4"><button type="button" onClick={saveCourses} className="mobile-tool-btn bg-white text-v3-text-primary"><Save size={15} /> Spara</button><button type="button" onClick={exportCourse} className="mobile-tool-btn bg-white text-v3-text-primary"><Download size={15} /> Export</button></div></section>
        </aside>
      </main>
      {showGuide && <PlannerGuide onClose={closeGuide} />}
    </div>
  );
}

function GrassField({ obstacles, selectedId, draggingId, onSelect, onStartDrag, onPointerMove, onPointerUp }: { obstacles: PlannerObstacle[]; selectedId: string | null; draggingId: string | null; onSelect: (id: string, type: PlannerObstacleType) => void; onStartDrag: (id: string) => void; onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void; onPointerUp: () => void }) {
  return <div className="relative rounded-[20px] overflow-hidden border border-[#d7e3ca] bg-[#77a856] shadow-inner"><div onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className={cn("relative h-[58vh] min-h-[440px] max-h-[620px] lg:h-[calc(100vh-190px)] lg:min-h-[640px] lg:max-h-[840px] select-none overflow-hidden", draggingId ? "cursor-grabbing" : "cursor-default")} style={{ backgroundColor: "#78a957", backgroundImage: "radial-gradient(circle at 18px 18px, rgba(255,255,255,.08) 1px, transparent 1.8px), linear-gradient(rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,.09), rgba(25,77,36,.10))", backgroundSize: "20px 20px, 68px 68px, 68px 68px, 100% 100%", touchAction: "none" }}><div className="absolute left-3 top-3 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm pointer-events-none">1 ruta = 1 meter</div><div className="absolute right-3 top-3 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hidden sm:block pointer-events-none">Dra hinder</div><div className="absolute left-3 bottom-3 right-3 flex items-end justify-between text-white/90 text-[11px] font-semibold pointer-events-none"><span>0 m</span><span className="inline-flex items-center gap-2"><span className="h-px w-16 bg-white/80" />5 m</span></div><div className="absolute left-3 top-14 bottom-10 w-px bg-white/70 pointer-events-none" /><div className="absolute left-3 bottom-10 right-3 h-px bg-white/70 pointer-events-none" />{obstacles.map((obstacle) => <PlannerObstacleButton key={obstacle.id} obstacle={obstacle} selected={obstacle.id === selectedId} dragging={obstacle.id === draggingId} onSelect={() => onSelect(obstacle.id, obstacle.type)} onStartDrag={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); onSelect(obstacle.id, obstacle.type); onStartDrag(obstacle.id); }} />)}</div></div>;
}

function PlannerObstacleButton({ obstacle, selected, dragging, onSelect, onStartDrag }: { obstacle: PlannerObstacle; selected: boolean; dragging: boolean; onSelect: () => void; onStartDrag: (event: React.PointerEvent<HTMLButtonElement>) => void }) {
  const size = getObstacleSize(obstacle.shape);
  return <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerDown={onStartDrag} className={cn("absolute grid place-items-center bg-white/92 border shadow-[0_8px_16px_rgba(24,64,33,.20)] transition-transform cursor-grab active:cursor-grabbing touch-none", selected ? "border-white ring-3 ring-white/40 scale-105 z-20" : "border-white/70 z-10", dragging && "scale-110 shadow-[0_16px_26px_rgba(24,64,33,.28)]", size)} style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%`, transform: `translate(-50%, -50%) rotate(${obstacle.rotation}deg)` }} aria-label={obstacle.label}><span className={cn("leading-none font-bold pointer-events-none", obstacle.shape === "circle" || obstacle.shape === "triangle" ? "text-[17px] text-v3-brand-700" : "text-[18px] text-v3-brand-800")}>{obstacle.icon}</span>{obstacle.number && <span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-v3-brand-600 text-white text-[10px] font-bold grid place-items-center shadow-v3-xs pointer-events-none">{obstacle.number}</span>}</button>;
}

function getObstacleSize(shape: PlannerObstacleSpec["shape"]) { if (shape === "long") return "h-8 w-24 lg:h-9 lg:w-28 rounded-full"; if (shape === "wide") return "h-8 w-16 lg:h-9 lg:w-20 rounded-lg"; if (shape === "tunnel") return "h-9 w-16 lg:h-10 lg:w-20 rounded-full"; if (shape === "circle") return "h-10 w-10 lg:h-11 lg:w-11 rounded-full"; if (shape === "zone") return "h-16 w-16 lg:h-20 lg:w-20 rounded-lg bg-white/40 border-dashed"; if (shape === "triangle") return "h-10 w-10 lg:h-11 lg:w-11 rounded-lg"; return "h-9 w-9 lg:h-10 lg:w-10 rounded-lg"; }

function PlannerGuide({ onClose }: { onClose: () => void }) { return <div className="fixed inset-0 z-[80] bg-v3-text-primary/45 backdrop-blur-sm px-4 py-6 flex items-center justify-center"><section className="w-full max-w-md rounded-[26px] bg-white shadow-v3-xl border border-black/10 overflow-hidden animate-v3-fade-up"><div className="p-5 border-b border-black/5 flex items-start justify-between gap-3"><div><div className="text-[11px] tracking-[0.1em] font-semibold text-v3-text-tertiary">Snabbguide</div><h2 className="font-v3-display text-[28px] leading-tight text-v3-text-primary mt-1">Så bygger du en bana</h2></div><button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-v3-canvas grid place-items-center text-v3-text-secondary hover:bg-v3-canvas-sunken"><X size={18} /></button></div><div className="p-5 space-y-3"><GuideStep number="1" title="Välj Agility eller Hoopers" text="Varje läge sparas separat, så din agilitybana ligger kvar när du växlar till Hoopers." /><GuideStep number="2" title="Lägg till hinder" text="Tryck på Hinder eller välj ett hinderkort i panelen." /><GuideStep number="3" title="Dra på gräset" text="Håll inne på ett hinder och dra det till rätt plats på planen." /><GuideStep number="4" title="Spara eller exportera" text="Spara banan på enheten eller ladda ner den som fil." /></div><div className="p-5 pt-0"><button type="button" onClick={onClose} className="w-full h-12 rounded-v3-base bg-v3-brand-600 text-white text-v3-sm font-semibold shadow-v3-sm hover:bg-v3-brand-700 transition-colors">Jag fattar – börja rita</button></div></section></div>; }
function GuideStep({ number, title, text }: { number: string; title: string; text: string }) { return <div className="flex gap-3 rounded-v3-xl bg-v3-canvas p-3"><span className="h-8 w-8 rounded-full bg-v3-brand-500/10 text-v3-brand-700 text-v3-sm font-bold grid place-items-center shrink-0">{number}</span><div><h3 className="text-v3-sm font-semibold text-v3-text-primary">{title}</h3><p className="text-v3-sm text-v3-text-secondary mt-0.5 leading-relaxed">{text}</p></div></div>; }
