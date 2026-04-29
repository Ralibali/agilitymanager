import { useEffect, useMemo, useState, type PointerEvent, type ReactNode } from "react";
import jsPDF from "jspdf";
import { ArrowLeft, Download, Eraser, FileText, FolderOpen, Grid3X3, Hash, HelpCircle, Maximize2, Minimize2, MousePointer2, Move, PanelLeftClose, PanelLeftOpen, Pencil, RotateCcw, Save, Settings2, Trash2, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PlannerMode = "Agility" | "Hoopers";
type ToolMode = "select" | "draw" | "erase" | "number" | "measure";
type Shape = "bar" | "wide" | "long" | "circle" | "tunnel" | "zone" | "triangle";
type ObstacleType = "jump" | "long_jump" | "oxer" | "wall" | "tunnel" | "a_frame" | "dog_walk" | "seesaw" | "balance" | "weave" | "tire" | "start" | "finish" | "hoop" | "hoopers_tunnel" | "barrel" | "gate" | "handler_zone";
type Point = { x: number; y: number };
type ObstacleSpec = { type: ObstacleType; label: string; icon: string; shape: Shape; category: string };
type Obstacle = ObstacleSpec & { id: string; x: number; y: number; rotation: number; number?: number; color?: string };
type DrawPath = { id: string; points: Point[]; color: string; width: number };
type FreeNumber = { id: string; x: number; y: number; num: number; color: string };
type CourseState = { obstacles: Obstacle[]; paths: DrawPath[]; numbers: FreeNumber[]; width: number; height: number; name: string };
type Courses = Record<PlannerMode, CourseState>;
type SavedCourse = { id: string; name: string; mode: PlannerMode; savedAt: string; course: CourseState };

const SAVE_KEY = "am_v3_course_planner_full_green";
const LIBRARY_KEY = "am_v3_course_planner_library_green";
const GUIDE_KEY = "am_v3_course_planner_green_guide_seen";
const DRAW_RED = "#e74b4b";
const NAVY = "#20245f";
const COLORS = ["#ffffff", DRAW_RED, "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#111827"];
const SIZES = [{ label: "20 × 30 m", width: 20, height: 30 }, { label: "20 × 40 m", width: 20, height: 40 }, { label: "30 × 30 m", width: 30, height: 30 }, { label: "30 × 40 m", width: 30, height: 40 }, { label: "40 × 20 m", width: 40, height: 20 }];

const AGILITY: ObstacleSpec[] = [
  { type: "jump", label: "Hopp", icon: "┃", shape: "bar", category: "Hopp" }, { type: "long_jump", label: "Långhopp", icon: "═", shape: "wide", category: "Hopp" }, { type: "oxer", label: "Oxer", icon: "‖", shape: "wide", category: "Hopp" }, { type: "wall", label: "Muren", icon: "▬", shape: "wide", category: "Hopp" },
  { type: "tunnel", label: "Tunnel", icon: "⌒", shape: "tunnel", category: "Tunnlar" }, { type: "a_frame", label: "A-hinder", icon: "△", shape: "triangle", category: "Kontaktfält" }, { type: "dog_walk", label: "Brygga", icon: "━", shape: "long", category: "Kontaktfält" }, { type: "seesaw", label: "Vipp", icon: "⏤", shape: "long", category: "Kontaktfält" }, { type: "balance", label: "Balans", icon: "─", shape: "long", category: "Kontaktfält" },
  { type: "weave", label: "Slalom", icon: "⫶", shape: "long", category: "Övrigt" }, { type: "tire", label: "Däck", icon: "◯", shape: "circle", category: "Övrigt" }, { type: "start", label: "Start", icon: "▸", shape: "bar", category: "Start & mål" }, { type: "finish", label: "Mål", icon: "◼", shape: "bar", category: "Start & mål" },
];
const HOOPERS: ObstacleSpec[] = [
  { type: "hoop", label: "Hoop", icon: "⌒", shape: "wide", category: "Hoopers" }, { type: "hoopers_tunnel", label: "Tunnel", icon: "▬", shape: "tunnel", category: "Hoopers" }, { type: "barrel", label: "Tunna", icon: "●", shape: "circle", category: "Hoopers" }, { type: "gate", label: "Staket", icon: "╫", shape: "wide", category: "Hoopers" }, { type: "handler_zone", label: "Zon", icon: "☐", shape: "zone", category: "Hoopers" }, { type: "start", label: "Start", icon: "▸", shape: "bar", category: "Start & mål" }, { type: "finish", label: "Mål", icon: "◼", shape: "bar", category: "Start & mål" },
];

const uid = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const specsFor = (mode: PlannerMode) => mode === "Hoopers" ? HOOPERS : AGILITY;
const defaultTool = (mode: PlannerMode): ObstacleType => mode === "Hoopers" ? "hoop" : "jump";
const specFor = (mode: PlannerMode, type: ObstacleType) => specsFor(mode).find(s => s.type === type) ?? specsFor(mode)[0];
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const hexToRgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as const;

function makeCourse(mode: PlannerMode): CourseState {
  const start = specsFor(mode).find(s => s.type === "start")!;
  const finish = specsFor(mode).find(s => s.type === "finish")!;
  return {
    name: mode === "Agility" ? "Agilitybana" : "Hoopersbana",
    width: mode === "Agility" ? 40 : 30,
    height: mode === "Agility" ? 20 : 30,
    paths: [],
    numbers: [],
    obstacles: [
      { ...start, id: uid("start"), x: 10, y: 82, rotation: 0, color: "#ffffff" },
      { ...finish, id: uid("finish"), x: 88, y: 16, rotation: 0, color: "#ffffff" },
    ],
  };
}
function loadInitial(): Courses {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Courses>;
      return { Agility: parsed.Agility ?? makeCourse("Agility"), Hoopers: parsed.Hoopers ?? makeCourse("Hoopers") };
    }
  } catch { /* ignore */ }
  return { Agility: makeCourse("Agility"), Hoopers: makeCourse("Hoopers") };
}
function downloadFile(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function V3CoursePlannerPageFixed() {
  const [mode, setMode] = useState<PlannerMode>("Agility");
  const [courses, setCourses] = useState<Courses>(() => loadInitial());
  const [selectedTool, setSelectedTool] = useState<ObstacleType>("jump");
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
  const [color, setColor] = useState(DRAW_RED);
  const [zoom, setZoom] = useState(100);
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [saved, setSaved] = useState<SavedCourse[]>(() => { try { return JSON.parse(window.localStorage.getItem(LIBRARY_KEY) ?? "[]") as SavedCourse[]; } catch { return []; } });

  const course = courses[mode];
  const selected = useMemo(() => course.obstacles.find(o => o.id === selectedId) ?? null, [course.obstacles, selectedId]);
  const grouped = useMemo(() => {
    const map = new Map<string, ObstacleSpec[]>();
    for (const item of specsFor(mode)) map.set(item.category, [...(map.get(item.category) ?? []), item]);
    return Array.from(map.entries());
  }, [mode]);
  const nextNumber = Math.max(0, ...course.obstacles.map(o => o.number ?? 0), ...course.numbers.map(n => n.num)) + 1;

  useEffect(() => { try { if (window.localStorage.getItem(GUIDE_KEY) !== "1") setGuide(true); } catch { setGuide(true); } }, []);
  useEffect(() => { window.localStorage.setItem(SAVE_KEY, JSON.stringify(courses)); }, [courses]);
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [fullscreen]);

  const updateCourse = (updater: CourseState | ((prev: CourseState) => CourseState)) => setCourses(prev => ({ ...prev, [mode]: typeof updater === "function" ? updater(prev[mode]) : updater }));
  const setObstacles = (updater: Obstacle[] | ((prev: Obstacle[]) => Obstacle[])) => updateCourse(prev => ({ ...prev, obstacles: typeof updater === "function" ? updater(prev.obstacles) : updater }));
  const setPaths = (updater: DrawPath[] | ((prev: DrawPath[]) => DrawPath[])) => updateCourse(prev => ({ ...prev, paths: typeof updater === "function" ? updater(prev.paths) : updater }));
  const setNumbers = (updater: FreeNumber[] | ((prev: FreeNumber[]) => FreeNumber[])) => updateCourse(prev => ({ ...prev, numbers: typeof updater === "function" ? updater(prev.numbers) : updater }));

  const toPoint = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let x = ((event.clientX - rect.left) / rect.width) * 100;
    let y = ((event.clientY - rect.top) / rect.height) * 100;
    if (snap) { x = Math.round(x / 2) * 2; y = Math.round(y / 2) * 2; }
    return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
  };
  const addObstacle = (type: ObstacleType = selectedTool) => {
    const spec = specFor(mode, type);
    const numbered = !["start", "finish", "handler_zone"].includes(spec.type);
    const obstacle: Obstacle = { ...spec, id: uid(spec.type), x: 16 + ((course.obstacles.length * 12) % 68), y: 18 + ((course.obstacles.length * 9) % 64), rotation: spec.type.includes("tunnel") ? 18 : 0, number: numbered ? nextNumber : undefined, color: "#ffffff" };
    setObstacles(prev => [...prev, obstacle]);
    setSelectedId(obstacle.id);
    setToolMode("select");
  };
  const switchMode = (next: PlannerMode) => { setMode(next); setSelectedTool(defaultTool(next)); setSelectedId(null); setDraggingId(null); setToolMode("select"); };
  const deleteSelected = () => { if (!selectedId) return; setObstacles(prev => prev.filter(o => o.id !== selectedId)); setNumbers(prev => prev.filter(n => n.id !== selectedId)); setSelectedId(null); };
  const rotateSelected = (deg = 15) => selectedId && setObstacles(prev => prev.map(o => o.id === selectedId ? { ...o, rotation: (o.rotation + deg + 360) % 360 } : o));
  const moveSelected = (dx: number, dy: number) => selectedId && setObstacles(prev => prev.map(o => o.id === selectedId ? { ...o, x: clamp(o.x + dx, 0, 100), y: clamp(o.y + dy, 0, 100) } : o));
  const recolorSelected = (nextColor: string) => selectedId && setObstacles(prev => prev.map(o => o.id === selectedId ? { ...o, color: nextColor } : o));
  const renumberSelected = () => selectedId && setObstacles(prev => prev.map(o => o.id === selectedId ? { ...o, number: nextNumber } : o));
  const setNumberSelected = (n: number | undefined) => selectedId && setObstacles(prev => prev.map(o => o.id === selectedId ? { ...o, number: n && n > 0 ? Math.floor(n) : undefined } : o));
  const eraseNear = (x: number, y: number) => {
    const p = { x, y };
    const hit = course.obstacles.find(o => distance(p, o) < 4.5);
    if (hit) { setObstacles(prev => prev.filter(o => o.id !== hit.id)); if (selectedId === hit.id) setSelectedId(null); return; }
    setPaths(prev => prev.filter(path => !path.points.some(pt => distance(p, pt) < 3.5)));
    setNumbers(prev => prev.filter(n => distance(p, n) > 4));
  };
  const fieldDown = (event: PointerEvent<HTMLDivElement>) => {
    const p = toPoint(event);
    if (toolMode === "draw") { setDrawing(true); setCurrentPath({ id: uid("path"), points: [p], color, width: 3 }); return; }
    if (toolMode === "number") { const n: FreeNumber = { id: uid("number"), x: p.x, y: p.y, num: nextNumber, color }; setNumbers(prev => [...prev, n]); setSelectedId(n.id); return; }
    if (toolMode === "erase") eraseNear(p.x, p.y);
  };
  const fieldMove = (event: PointerEvent<HTMLDivElement>) => {
    const p = toPoint(event);
    if (draggingId) { event.preventDefault(); setObstacles(prev => prev.map(o => o.id === draggingId ? { ...o, x: p.x, y: p.y } : o)); }
    if (drawing && currentPath) setCurrentPath({ ...currentPath, points: [...currentPath.points, p] });
  };
  const fieldUp = () => { if (currentPath && currentPath.points.length > 1) setPaths(prev => [...prev, currentPath]); setCurrentPath(null); setDrawing(false); setDraggingId(null); };
  const reset = () => { updateCourse(makeCourse(mode)); setSelectedId(null); toast.success(`${mode}-banan återställd`); };
  const saveToLibrary = () => { const entry = { id: uid("saved"), name: course.name.trim() || `${mode}-bana`, mode, savedAt: new Date().toISOString(), course }; const next = [entry, ...saved].slice(0, 20); setSaved(next); window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); toast.success("Banan sparades"); };
  const openSaved = (entry: SavedCourse) => { setMode(entry.mode); setCourses(prev => ({ ...prev, [entry.mode]: entry.course })); setSavedOpen(false); toast.success(`Öppnade ${entry.name}`); };
  const exportJson = () => { downloadFile(`${course.name || mode}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ mode, course }, null, 2)); toast.success("JSON exporterad"); };
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = 297, pageH = 210, headerH = 17, date = new Date().toISOString().slice(0, 10);
    pdf.setFillColor(...hexToRgb(NAVY)); pdf.rect(0, 0, pageW, headerH, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text("AgilityManager - Banplanerare", 10, 10.5);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.text(date, pageW - 10, 10.5, { align: "right" });
    pdf.setTextColor(55, 55, 55); pdf.setFontSize(8); pdf.text(`Sport: ${mode}   |   Banstorlek: ${course.width} x ${course.height} m   |   Antal hinder: ${course.obstacles.length}`, 10, 26);
    const marginX = 18, top = 33, fieldW = 262, fieldH = Math.min(150, fieldW * (course.height / course.width));
    pdf.setFillColor(248, 248, 248); pdf.rect(marginX, top, fieldW, fieldH, "F");
    for (let x = 0; x <= course.width; x++) { const px = marginX + (x / course.width) * fieldW; const c = x % 5 === 0 ? 215 : 238; pdf.setDrawColor(c, c, c); pdf.setLineWidth(0.12); pdf.line(px, top, px, top + fieldH); if (x % 5 === 0) pdf.text(String(x), px - 1, top + fieldH + 5); }
    for (let y = 0; y <= course.height; y++) { const py = top + (y / course.height) * fieldH; const c = y % 5 === 0 ? 215 : 238; pdf.setDrawColor(c, c, c); pdf.line(marginX, py, marginX + fieldW, py); if (y % 5 === 0 && y > 0) pdf.text(String(y), marginX - 4, py + 1); }
    pdf.setTextColor(120, 120, 120); pdf.setFontSize(5.5); pdf.text("1 ruta = 1 meter", marginX + 3, top + 5);
    const toPdf = (p: Point) => ({ x: marginX + (p.x / 100) * fieldW, y: top + (p.y / 100) * fieldH });
    pdf.setDrawColor(...hexToRgb(DRAW_RED)); pdf.setLineWidth(0.7); if (typeof pdf.setLineDashPattern === "function") pdf.setLineDashPattern([2, 1.6], 0);
    for (const path of course.paths) { if (path.points.length < 2) continue; const first = toPdf(path.points[0]); pdf.moveTo(first.x, first.y); for (const pt of path.points.slice(1)) { const p = toPdf(pt); pdf.lineTo(p.x, p.y); } pdf.stroke(); }
    if (typeof pdf.setLineDashPattern === "function") pdf.setLineDashPattern([], 0);
    for (const obstacle of course.obstacles) drawPdfObstacle(pdf, obstacle, toPdf(obstacle));
    for (const n of course.numbers) { const p = toPdf(n); const [r, g, b] = hexToRgb(n.color || DRAW_RED); pdf.setFillColor(r, g, b); pdf.circle(p.x, p.y, 2.5, "F"); pdf.setTextColor(n.color === "#ffffff" ? 20 : 255, n.color === "#ffffff" ? 40 : 255, n.color === "#ffffff" ? 20 : 255); pdf.setFontSize(5.5); pdf.text(String(n.num), p.x, p.y + 0.8, { align: "center" }); }
    pdf.setDrawColor(120, 120, 120); pdf.line(marginX + fieldW - 36, top + fieldH - 5, marginX + fieldW - 8, top + fieldH - 5); pdf.line(marginX + fieldW - 36, top + fieldH - 6, marginX + fieldW - 36, top + fieldH - 4); pdf.line(marginX + fieldW - 8, top + fieldH - 6, marginX + fieldW - 8, top + fieldH - 4); pdf.setTextColor(100, 100, 100); pdf.text("5 m", marginX + fieldW - 22, top + fieldH - 7, { align: "center" });
    pdf.setFontSize(6); pdf.text("Skapad med AgilityManager - agilitymanager.se", pageW / 2, pageH - 8, { align: "center" });
    pdf.save(`${course.name || mode}.pdf`); toast.success("PDF skapad");
  };
  const closeGuide = () => { window.localStorage.setItem(GUIDE_KEY, "1"); setGuide(false); };

  return <div className={cn("min-h-[100dvh] bg-[#f7f6f0] text-v3-text-primary animate-v3-fade-in", fullscreen && "fixed inset-0 z-[1000] overflow-auto")}> 
    <header className="sticky top-0 z-40 bg-[#f7f6f0]/92 backdrop-blur-xl border-b border-black/5 px-3 lg:px-6 py-3"><div className="max-w-[1760px] mx-auto flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2 min-w-0"><button type="button" onClick={() => { window.location.href = "/v3/courses"; }} className="h-10 w-10 rounded-v3-base bg-white border border-black/8 shadow-v3-xs grid place-items-center text-v3-text-secondary shrink-0" aria-label="Tillbaka"><ArrowLeft size={18} /></button><input value={course.name} onChange={(e) => updateCourse(prev => ({ ...prev, name: e.target.value }))} className="h-10 min-w-0 w-[190px] lg:w-[260px] rounded-v3-base border border-black/8 bg-white px-3 text-v3-sm font-semibold shadow-v3-xs outline-none focus:ring-2 focus:ring-v3-brand-500/25" /><span className="hidden sm:inline-flex text-v3-xs text-v3-text-tertiary">Autosparad · PDF stöds</span></div><div className="flex flex-wrap items-center gap-2"><Segmented value={mode} onChange={switchMode} options={["Agility", "Hoopers"]} /><ToolbarButton onClick={() => setLeftOpen(v => !v)} active={!leftOpen} icon={leftOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}>{leftOpen ? "Stäng meny" : "Visa meny"}</ToolbarButton><ToolbarButton onClick={() => setZoom(z => clamp(z - 10, 50, 160))} icon={<ZoomOut size={15} />} /><span className="h-10 min-w-[66px] rounded-v3-base bg-white border border-black/8 grid place-items-center text-v3-xs font-semibold shadow-v3-xs">{zoom}%</span><ToolbarButton onClick={() => setZoom(z => clamp(z + 10, 50, 160))} icon={<ZoomIn size={15} />} /><ToolbarButton onClick={() => setGrid(v => !v)} active={grid} icon={<Grid3X3 size={15} />}>Rutnät</ToolbarButton><ToolbarButton onClick={() => setSnap(v => !v)} active={snap}>Snap</ToolbarButton><ToolbarButton onClick={saveToLibrary} icon={<Save size={15} />}>Spara</ToolbarButton><ToolbarButton onClick={() => setSavedOpen(true)} icon={<FolderOpen size={15} />}>Öppna</ToolbarButton><ToolbarButton onClick={exportPdf} icon={<FileText size={15} />}>Exportera PDF</ToolbarButton><ToolbarButton onClick={() => setFullscreen(v => !v)} active={fullscreen} icon={fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}>{fullscreen ? "Avsluta" : "Storbild"}</ToolbarButton></div></div></header>
    <main className={cn("max-w-[1760px] mx-auto px-3 lg:px-6 py-4 grid gap-4", leftOpen && rightOpen ? "xl:grid-cols-[300px_minmax(0,1fr)_330px]" : leftOpen ? "xl:grid-cols-[300px_minmax(0,1fr)]" : rightOpen ? "xl:grid-cols-[minmax(0,1fr)_330px]" : "xl:grid-cols-1")}>{leftOpen && <LeftPanel grouped={grouped} selectedTool={selectedTool} setSelectedTool={setSelectedTool} addObstacle={addObstacle} mode={mode} />}<section className="rounded-[24px] bg-white border border-black/6 shadow-v3-sm p-2 lg:p-4 min-w-0"><div className="relative overflow-auto rounded-[20px] bg-[#17351f]/10 p-3 lg:p-5"><div className="origin-top-left transition-transform" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", width: "760px", height: `${760 * (course.height / course.width)}px`, marginRight: `${760 * (zoom / 100 - 1)}px`, marginBottom: `${760 * (course.height / course.width) * (zoom / 100 - 1)}px` }}><GrassField course={course} selectedId={selectedId} draggingId={draggingId} grid={grid} toolMode={toolMode} currentPath={currentPath} onFieldDown={fieldDown} onFieldMove={fieldMove} onFieldUp={fieldUp} onObstacleDown={(event, obstacle) => { event.preventDefault(); event.stopPropagation(); if (toolMode === "erase") { eraseNear(obstacle.x, obstacle.y); return; } setSelectedId(obstacle.id); setToolMode("select"); setDraggingId(obstacle.id); event.currentTarget.setPointerCapture(event.pointerId); }} onSelect={setSelectedId} /></div></div></section>{rightOpen && <RightPanel selected={selected} toolMode={toolMode} setToolMode={setToolMode} setRightOpen={setRightOpen} setGuide={setGuide} moveSelected={moveSelected} rotateSelected={rotateSelected} renumberSelected={renumberSelected} deleteSelected={deleteSelected} setColor={setColor} recolorSelected={recolorSelected} course={course} updateCourse={updateCourse} exportJson={exportJson} exportPdf={exportPdf} reset={reset} setPaths={setPaths} />}</main>
    {!rightOpen && <button type="button" onClick={() => setRightOpen(true)} className="fixed right-4 bottom-4 z-40 h-12 px-4 rounded-full bg-v3-text-primary text-white shadow-v3-lg text-v3-sm font-semibold inline-flex items-center gap-2"><Settings2 size={16} /> Verktyg</button>}{savedOpen && <SavedDialog saved={saved} onClose={() => setSavedOpen(false)} onOpen={openSaved} />}{guide && <Guide onClose={closeGuide} />}</div>;
}

function drawPdfObstacle(pdf: jsPDF, obstacle: Obstacle, p: Point) { const [r, g, b] = hexToRgb(obstacle.color ?? "#ffffff"); pdf.setFillColor(r, g, b); pdf.setDrawColor(60, 80, 70); pdf.setLineWidth(0.55); if (obstacle.shape === "long") pdf.roundedRect(p.x - 7, p.y - 1.2, 14, 2.4, 0.8, 0.8, "FD"); else if (obstacle.shape === "wide" || obstacle.shape === "tunnel") pdf.roundedRect(p.x - 5, p.y - 2, 10, 4, 1, 1, "FD"); else if (obstacle.shape === "triangle") pdf.triangle(p.x, p.y - 5, p.x - 4, p.y + 5, p.x + 4, p.y + 5, "FD"); else if (obstacle.shape === "circle") pdf.circle(p.x, p.y, 3.5, "FD"); else pdf.roundedRect(p.x - 3, p.y - 3, 6, 6, 0.8, 0.8, "FD"); if (obstacle.number) { pdf.setFillColor(34, 93, 52); pdf.circle(p.x + 4.5, p.y - 4.5, 2.3, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(5); pdf.text(String(obstacle.number), p.x + 4.5, p.y - 3.2, { align: "center" }); } }
function Segmented({ value, onChange, options }: { value: PlannerMode; onChange: (v: PlannerMode) => void; options: PlannerMode[] }) { return <div className="grid grid-cols-2 rounded-v3-base bg-white border border-black/8 p-1 shadow-v3-xs w-[220px]">{options.map(o => <button key={o} type="button" onClick={() => onChange(o)} className={cn("h-9 rounded-v3-sm text-v3-sm font-semibold", value === o ? "bg-v3-brand-600 text-white" : "text-v3-text-secondary hover:bg-v3-canvas")}>{o}</button>)}</div>; }
function ToolbarButton({ children, icon, onClick, active }: { children?: ReactNode; icon?: ReactNode; onClick: () => void; active?: boolean }) { return <button type="button" onClick={onClick} className={cn("h-10 px-3 rounded-v3-base border border-black/8 shadow-v3-xs inline-flex items-center gap-2 text-v3-sm font-medium", active ? "bg-v3-brand-600 text-white" : "bg-white text-v3-text-secondary hover:bg-v3-canvas")}>{icon}{children}</button>; }
function ToolButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) { return <button type="button" onClick={onClick} className={cn("min-h-[66px] rounded-v3-xl border p-2 text-v3-xs font-semibold flex flex-col items-center justify-center gap-1", active ? "bg-v3-brand-600 text-white border-v3-brand-600" : "bg-v3-canvas border-v3-canvas-sunken text-v3-text-secondary hover:bg-v3-canvas-sunken")}>{icon}{label}</button>; }
function LeftPanel({ grouped, selectedTool, setSelectedTool, addObstacle, mode }: { grouped: [string, ObstacleSpec[]][]; selectedTool: ObstacleType; setSelectedTool: (t: ObstacleType) => void; addObstacle: (t: ObstacleType) => void; mode: PlannerMode }) { return <aside className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-4 max-h-[calc(100vh-120px)] overflow-y-auto"><div className="mb-4"><h2 className="font-v3-display text-v3-2xl">{mode}-hinder</h2><p className="text-v3-sm text-v3-text-secondary mt-1">Klicka för att lägga till. Dra sedan på gräset.</p></div>{grouped.map(([category, items]) => <section key={category} className="mb-4"><h3 className="text-[10px] uppercase tracking-[0.08em] font-semibold text-v3-text-tertiary mb-2">{category}</h3><div className="grid grid-cols-2 gap-2">{items.map(item => <button key={item.type} type="button" onClick={() => { setSelectedTool(item.type); addObstacle(item.type); }} className={cn("min-h-[74px] rounded-v3-xl border p-2 text-center transition-all", selectedTool === item.type ? "bg-v3-brand-500/10 border-v3-brand-500/30 text-v3-brand-800" : "bg-v3-canvas border-v3-canvas-sunken/60 text-v3-text-secondary hover:border-v3-brand-500/30")}><span className="block text-[22px] leading-none">{item.icon}</span><span className="block mt-2 text-[11px] font-semibold leading-tight">{item.label}</span></button>)}</div></section>)}</aside>; }
function RightPanel({ selected, toolMode, setToolMode, setRightOpen, setGuide, moveSelected, rotateSelected, renumberSelected, deleteSelected, setColor, recolorSelected, course, updateCourse, exportJson, exportPdf, reset, setPaths }: { selected: Obstacle | null; toolMode: ToolMode; setToolMode: (t: ToolMode) => void; setRightOpen: (v: boolean) => void; setGuide: (v: boolean) => void; moveSelected: (dx: number, dy: number) => void; rotateSelected: (deg?: number) => void; renumberSelected: () => void; deleteSelected: () => void; setColor: (c: string) => void; recolorSelected: (c: string) => void; course: CourseState; updateCourse: (updater: CourseState | ((prev: CourseState) => CourseState)) => void; exportJson: () => void; exportPdf: () => void; reset: () => void; setPaths: (updater: DrawPath[] | ((prev: DrawPath[]) => DrawPath[])) => void }) { return <aside className="space-y-3"><section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-4"><div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="font-v3-display text-v3-xl">Verktyg</h2><p className="text-v3-xs text-v3-text-tertiary">Rita, numrera, mät, sudda hinder och exportera PDF.</p></div><button type="button" onClick={() => setRightOpen(false)} className="h-8 w-8 rounded-full hover:bg-v3-canvas-sunken grid place-items-center text-v3-text-tertiary"><X size={15} /></button></div><div className="grid grid-cols-3 gap-2"><ToolButton active={toolMode === "select"} onClick={() => setToolMode("select")} icon={<MousePointer2 size={15} />} label="Välj" /><ToolButton active={toolMode === "draw"} onClick={() => setToolMode("draw")} icon={<Pencil size={15} />} label="Rita" /><ToolButton active={toolMode === "erase"} onClick={() => setToolMode("erase")} icon={<Eraser size={15} />} label="Sudda" /><ToolButton active={toolMode === "number"} onClick={() => setToolMode("number")} icon={<Hash size={15} />} label="Nummer" /><ToolButton active={toolMode === "measure"} onClick={() => setToolMode("measure")} icon={<Move size={15} />} label="Mät" /><ToolButton active={false} onClick={() => setGuide(true)} icon={<HelpCircle size={15} />} label="Guide" /></div></section><section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-4 space-y-3"><h2 className="font-v3-display text-v3-xl">Valt objekt</h2>{selected ? <><div className="rounded-v3-xl bg-v3-canvas p-3"><div className="text-v3-sm font-semibold">{selected.label}</div><div className="text-v3-xs text-v3-text-tertiary mt-1">{selected.number ? `Nummer ${selected.number}` : "Ingen nummerskylt"}</div></div><div className="grid grid-cols-4 gap-2"><button className="mobile-tool-btn" onClick={() => moveSelected(0, -2)}>↑</button><button className="mobile-tool-btn" onClick={() => moveSelected(-2, 0)}>←</button><button className="mobile-tool-btn" onClick={() => moveSelected(2, 0)}>→</button><button className="mobile-tool-btn" onClick={() => moveSelected(0, 2)}>↓</button></div><div className="grid grid-cols-2 gap-2"><button className="mobile-tool-btn" onClick={() => rotateSelected(-15)}><Undo2 size={14} /> -15°</button><button className="mobile-tool-btn" onClick={() => rotateSelected(15)}><RotateCcw size={14} /> +15°</button><button className="mobile-tool-btn" onClick={renumberSelected}><Hash size={14} /> Nummer</button><button className="mobile-tool-btn text-red-600" onClick={deleteSelected}><Trash2 size={14} /> Ta bort</button></div><div><div className="text-[11px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary mb-2">Färg</div><div className="flex flex-wrap gap-2">{COLORS.map(c => <button key={c} type="button" onClick={() => { setColor(c); recolorSelected(c); }} className="h-8 w-8 rounded-full border border-black/10 shadow-v3-xs" style={{ background: c }} aria-label={c} />)}</div></div></> : <div className="rounded-v3-xl bg-v3-canvas p-4 text-v3-sm text-v3-text-secondary">Välj ett hinder, eller använd suddgummit för att ta bort hinder, nummer och ritningar.</div>}</section><section className="rounded-[22px] bg-white border border-black/6 shadow-v3-sm p-4 space-y-3"><h2 className="font-v3-display text-v3-xl">Banstorlek & PDF</h2><select value={`${course.width}x${course.height}`} onChange={(e) => { const s = SIZES.find(item => `${item.width}x${item.height}` === e.target.value); if (s) updateCourse(prev => ({ ...prev, width: s.width, height: s.height })); }} className="w-full h-11 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm">{SIZES.map(s => <option key={s.label} value={`${s.width}x${s.height}`}>{s.label}</option>)}</select><div className="grid grid-cols-2 gap-2"><button className="mobile-tool-btn" onClick={exportJson}><Download size={14} /> JSON</button><button className="mobile-tool-btn" onClick={exportPdf}><FileText size={14} /> PDF</button><button className="mobile-tool-btn" onClick={reset}><RotateCcw size={14} /> Återställ</button><button className="mobile-tool-btn" onClick={() => setPaths(prev => prev.slice(0, -1))}><Undo2 size={14} /> Ångra ritning</button></div></section></aside>; }
function GrassField({ course, selectedId, draggingId, grid, toolMode, currentPath, onFieldDown, onFieldMove, onFieldUp, onObstacleDown, onSelect }: { course: CourseState; selectedId: string | null; draggingId: string | null; grid: boolean; toolMode: ToolMode; currentPath: DrawPath | null; onFieldDown: (event: PointerEvent<HTMLDivElement>) => void; onFieldMove: (event: PointerEvent<HTMLDivElement>) => void; onFieldUp: () => void; onObstacleDown: (event: PointerEvent<HTMLButtonElement>, obstacle: Obstacle) => void; onSelect: (id: string) => void }) { const cursor = toolMode === "draw" ? "cursor-crosshair" : toolMode === "erase" ? "cursor-cell" : toolMode === "number" ? "cursor-copy" : draggingId ? "cursor-grabbing" : "cursor-default"; return <div onPointerDown={onFieldDown} onPointerMove={onFieldMove} onPointerUp={onFieldUp} onPointerCancel={onFieldUp} className={cn("relative rounded-[22px] overflow-hidden border border-[#d7e3ca] shadow-inner select-none min-h-[620px]", cursor)} style={{ backgroundColor: "#78a957", backgroundImage: grid ? "radial-gradient(circle at 18px 18px, rgba(255,255,255,.08) 1px, transparent 1.8px), linear-gradient(rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,.09), rgba(25,77,36,.10))" : "linear-gradient(135deg, rgba(255,255,255,.09), rgba(25,77,36,.10))", backgroundSize: "20px 20px, 68px 68px, 68px 68px, 100% 100%", touchAction: "none", aspectRatio: `${course.width} / ${course.height}` }}><div className="absolute left-3 top-3 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm pointer-events-none">{course.width} × {course.height} m · 1 ruta = 1 meter</div><svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">{course.paths.map(path => <polyline key={path.id} points={path.points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={path.color} strokeWidth={path.width / 3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.3 1" />)}{currentPath && <polyline points={currentPath.points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={currentPath.color} strokeWidth={currentPath.width / 3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.3 1" />}</svg>{course.numbers.map(n => <button key={n.id} type="button" onClick={(e) => { e.stopPropagation(); onSelect(n.id); }} className={cn("absolute h-7 w-7 rounded-full grid place-items-center text-[12px] font-bold shadow-v3-sm border border-white/70", selectedId === n.id ? "ring-4 ring-white/40" : "")} style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)", background: n.color, color: n.color === "#ffffff" ? "#1d2b20" : "white" }}>{n.num}</button>)}{course.obstacles.map(obstacle => <ObstacleButton key={obstacle.id} obstacle={obstacle} selected={selectedId === obstacle.id} dragging={draggingId === obstacle.id} erasing={toolMode === "erase"} onDown={(event) => onObstacleDown(event, obstacle)} onSelect={() => onSelect(obstacle.id)} />)}<div className="absolute left-3 bottom-3 right-3 flex items-end justify-between text-white/90 text-[11px] font-semibold pointer-events-none"><span>0 m</span><span className="inline-flex items-center gap-2"><span className="h-px w-16 bg-white/80" />5 m</span></div></div>; }
function ObstacleButton({ obstacle, selected, dragging, erasing, onDown, onSelect }: { obstacle: Obstacle; selected: boolean; dragging: boolean; erasing: boolean; onDown: (event: PointerEvent<HTMLButtonElement>) => void; onSelect: () => void }) { const bg = obstacle.color ?? "#ffffff"; return <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(); }} onPointerDown={onDown} className={cn("absolute grid place-items-center border shadow-[0_8px_16px_rgba(24,64,33,.20)] transition-transform touch-none", erasing ? "cursor-cell" : "cursor-grab active:cursor-grabbing", selected ? "border-white ring-4 ring-white/40 scale-105 z-20" : "border-white/70 z-10", dragging && "scale-110 shadow-[0_16px_26px_rgba(24,64,33,.28)]", obstacleSize(obstacle.shape))} style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%`, transform: `translate(-50%, -50%) rotate(${obstacle.rotation}deg)`, background: bg }} aria-label={obstacle.label}><span className="leading-none font-bold pointer-events-none text-[18px] text-v3-brand-900">{obstacle.icon}</span>{obstacle.number && <span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-v3-brand-600 text-white text-[10px] font-bold grid place-items-center shadow-v3-xs pointer-events-none">{obstacle.number}</span>}</button>; }
function obstacleSize(shape: Shape) { if (shape === "long") return "h-8 w-24 lg:h-9 lg:w-28 rounded-full"; if (shape === "wide") return "h-8 w-16 lg:h-9 lg:w-20 rounded-lg"; if (shape === "tunnel") return "h-9 w-16 lg:h-10 lg:w-20 rounded-full"; if (shape === "circle") return "h-10 w-10 lg:h-11 lg:w-11 rounded-full"; if (shape === "zone") return "h-16 w-16 lg:h-20 lg:w-20 rounded-lg bg-white/40 border-dashed"; if (shape === "triangle") return "h-10 w-10 lg:h-11 lg:w-11 rounded-lg"; return "h-9 w-9 lg:h-10 lg:w-10 rounded-lg"; }
function SavedDialog({ saved, onClose, onOpen }: { saved: SavedCourse[]; onClose: () => void; onOpen: (entry: SavedCourse) => void }) { return <div className="fixed inset-0 z-[1100] bg-v3-text-primary/45 backdrop-blur-sm px-4 py-6 flex items-center justify-center"><section className="w-full max-w-lg rounded-[26px] bg-white shadow-v3-xl border border-black/10 overflow-hidden"><div className="p-5 border-b border-black/5 flex justify-between"><div><div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-v3-text-tertiary">Bibliotek</div><h2 className="font-v3-display text-[28px]">Sparade banor</h2></div><button onClick={onClose} className="h-10 w-10 rounded-full bg-v3-canvas grid place-items-center"><X size={18} /></button></div><div className="p-5 space-y-2 max-h-[55vh] overflow-y-auto">{saved.length === 0 ? <p className="text-v3-sm text-v3-text-secondary">Inga sparade banor än.</p> : saved.map(entry => <button key={entry.id} onClick={() => onOpen(entry)} className="w-full text-left rounded-v3-xl border border-v3-canvas-sunken/60 bg-v3-canvas p-4 hover:bg-v3-canvas-sunken/40"><div className="font-semibold text-v3-text-primary">{entry.name}</div><div className="text-v3-xs text-v3-text-tertiary mt-1">{entry.mode} · {new Date(entry.savedAt).toLocaleString("sv-SE")}</div></button>)}</div></section></div>; }
function Guide({ onClose }: { onClose: () => void }) { return <div className="fixed inset-0 z-[1100] bg-v3-text-primary/45 backdrop-blur-sm px-4 py-6 flex items-center justify-center"><section className="w-full max-w-md rounded-[26px] bg-white shadow-v3-xl border border-black/10 overflow-hidden"><div className="p-5 border-b border-black/5 flex justify-between"><div><div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-v3-text-tertiary">Snabbguide</div><h2 className="font-v3-display text-[28px]">Ny grön banplanerare</h2></div><button onClick={onClose} className="h-10 w-10 rounded-full bg-v3-canvas grid place-items-center"><X size={18} /></button></div><div className="p-5 space-y-3 text-v3-sm text-v3-text-secondary"><p><strong className="text-v3-text-primary">Välj hinder</strong> i vänsterpanelen och dra dem på gräset.</p><p><strong className="text-v3-text-primary">Rita med röd streckad linje</strong> i samma stil som PDF-exporten.</p><p><strong className="text-v3-text-primary">Sudda</strong> tar bort hinder, nummer och ritningar.</p><p><strong className="text-v3-text-primary">Exportera PDF</strong> skapar en liggande A4 med rubrik, baninfo, rutnät och footer.</p></div><div className="p-5 pt-0"><button onClick={onClose} className="w-full h-12 rounded-v3-base bg-v3-brand-600 text-white text-v3-sm font-semibold">Jag fattar – börja rita</button></div></section></div>; }
