import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, FileText, MapPinned, RotateCcw, Ruler, Save, X } from "lucide-react";
import { toast } from "sonner";
import V3CoursePlannerPageFixed from "./V3CoursePlannerPageFixed";

const SAVE_KEY = "am_v3_course_planner_full_green";
const TUNNEL_CURVE_KEY = "am_v3_course_planner_tunnel_curves";

type TunnelCurve = { curveDeg: number; curveSide: "left" | "right" };
type AnyObstacle = {
  id: string;
  type: string;
  label?: string;
  x: number;
  y: number;
  rotation?: number;
  number?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
};
type StoredCourse = { obstacles?: AnyObstacle[]; name?: string; width?: number; height?: number; location?: string };
type StoredCourses = Record<string, StoredCourse>;

type TunnelItem = { mode: string; courseName: string; obstacle: AnyObstacle; curve: TunnelCurve };
type CourseOption = { mode: string; course: StoredCourse };

function isTunnel(type?: string) { return type === "tunnel" || type === "hoopers_tunnel"; }
function readJson<T>(key: string, fallback: T): T { try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; } }
function meterPoint(course: StoredCourse, obstacle: AnyObstacle) { return { x: ((obstacle.x ?? 0) / 100) * (course.width ?? 40), y: ((obstacle.y ?? 0) / 100) * (course.height ?? 20) }; }
function metersBetween(course: StoredCourse, a?: AnyObstacle | null, b?: AnyObstacle | null) { if (!a || !b) return 0; const pa = meterPoint(course, a); const pb = meterPoint(course, b); return Math.hypot(pb.x - pa.x, pb.y - pa.y); }
function readCourses(): StoredCourses { return readJson<StoredCourses>(SAVE_KEY, {}); }
function orderedObstacles(course?: StoredCourse) { return [...(course?.obstacles ?? [])].sort((a, b) => (a.number ?? 9999) - (b.number ?? 9999)); }
function numberedObstacles(course?: StoredCourse) { return orderedObstacles(course).filter((o) => typeof o.number === "number"); }
function estimateCourseLength(course?: StoredCourse) { const nums = numberedObstacles(course); return nums.reduce((sum, obstacle, index) => sum + (index > 0 ? metersBetween(course ?? {}, nums[index - 1], obstacle) : 0), 0); }
function readTunnelItems(): TunnelItem[] {
  const courses = readCourses();
  const curveOverrides = readJson<Record<string, TunnelCurve>>(TUNNEL_CURVE_KEY, {});
  const items: TunnelItem[] = [];
  for (const [mode, course] of Object.entries(courses)) {
    for (const obstacle of course.obstacles ?? []) {
      if (!isTunnel(obstacle.type)) continue;
      const curve = curveOverrides[obstacle.id] ?? { curveDeg: obstacle.curveDeg ?? 0, curveSide: obstacle.curveSide ?? "left" };
      items.push({ mode, courseName: course.name || `${mode}-bana`, obstacle, curve: { curveDeg: Math.max(0, Math.min(90, curve.curveDeg ?? 0)), curveSide: curve.curveSide ?? "left" } });
    }
  }
  return items.sort((a, b) => a.mode.localeCompare(b.mode) || (a.obstacle.number ?? 999) - (b.obstacle.number ?? 999));
}
function persistTunnelCurve(id: string, curve: TunnelCurve) {
  const normalized: TunnelCurve = { curveDeg: Math.max(0, Math.min(90, curve.curveDeg)), curveSide: curve.curveSide };
  const courses = readCourses();
  const nextCourses: StoredCourses = {};
  for (const [mode, course] of Object.entries(courses)) {
    nextCourses[mode] = { ...course, obstacles: (course.obstacles ?? []).map((obstacle) => obstacle.id === id ? { ...obstacle, curveDeg: normalized.curveDeg, curveSide: normalized.curveSide } : obstacle) };
  }
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(nextCourses));
  const overrides = readJson<Record<string, TunnelCurve>>(TUNNEL_CURVE_KEY, {});
  window.localStorage.setItem(TUNNEL_CURVE_KEY, JSON.stringify({ ...overrides, [id]: normalized }));
  window.dispatchEvent(new CustomEvent("am:tunnel-curve-updated", { detail: { id, curve: normalized } }));
}

function TunnelCurvePreview({ curve }: { curve: TunnelCurve }) {
  const side = curve.curveSide === "left" ? 1 : -1;
  const deg = Math.max(0, Math.min(90, curve.curveDeg));
  const endX = 92;
  const bend = (deg / 90) * 46 * side;
  const path = deg < 1 ? `M 14 50 L ${endX} 50` : `M 14 50 Q 52 ${50 - bend} ${endX} 50`;
  return <svg viewBox="0 0 106 100" className="h-16 w-full rounded-2xl bg-[#eef4e8] border border-black/5"><path d={path} fill="none" stroke="#2563eb" strokeWidth="16" strokeLinecap="round" /><path d={path} fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray="4 5" strokeLinecap="round" /><circle cx="14" cy="50" r="8" fill="#10253f" /><circle cx={endX} cy="50" r="8" fill="#10253f" /></svg>;
}

function TunnelCurvePanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TunnelItem[]>(() => readTunnelItems());
  const [selectedId, setSelectedId] = useState<string | null>(() => readTunnelItems()[0]?.obstacle.id ?? null);
  const selected = useMemo(() => items.find((item) => item.obstacle.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const refresh = () => setItems(readTunnelItems());
  useEffect(() => { const onStorage = () => refresh(); const onCustom = () => refresh(); window.addEventListener("storage", onStorage); window.addEventListener("am:tunnel-curve-updated", onCustom as EventListener); const timer = window.setInterval(refresh, 2500); return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("am:tunnel-curve-updated", onCustom as EventListener); window.clearInterval(timer); }; }, []);
  const updateSelected = (patch: Partial<TunnelCurve>) => { if (!selected) return; const next: TunnelCurve = { curveDeg: patch.curveDeg ?? selected.curve.curveDeg, curveSide: patch.curveSide ?? selected.curve.curveSide }; persistTunnelCurve(selected.obstacle.id, next); setItems(readTunnelItems()); };
  if (!items.length) return null;
  return (
    <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[1050] w-[min(360px,calc(100vw-1.5rem))] font-v3-sans">
      {!open ? <button type="button" onClick={() => setOpen(true)} className="ml-auto flex h-12 items-center gap-2 rounded-full bg-[#173d2c] px-4 text-sm font-semibold text-white shadow-2xl"><ChevronDown className="rotate-180" size={16} /> Tunnelböjning</button> : (
        <div className="rounded-[28px] border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-3"><div><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-v3-text-tertiary">2D / export</div><div className="text-lg font-semibold text-v3-text-primary">Tunnelböjning</div><p className="text-xs text-v3-text-secondary">Sparas i banobjektet och används i 3D.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X size={15} /></button></div>
          <label className="mb-1 block text-xs font-semibold text-v3-text-secondary">Välj tunnel</label>
          <select value={selected?.obstacle.id ?? ""} onChange={(e) => setSelectedId(e.target.value)} className="mb-3 h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#173d2c]/20">{items.map((item) => <option key={item.obstacle.id} value={item.obstacle.id}>{item.mode}: {item.obstacle.number ? `#${item.obstacle.number} ` : ""}{item.obstacle.label ?? "Tunnel"}</option>)}</select>
          {selected && <><TunnelCurvePreview curve={selected.curve} /><div className="mt-3 flex items-center justify-between text-sm"><span className="font-semibold text-v3-text-primary">Böjning</span><span className="rounded-full bg-black/5 px-2 py-1 text-xs font-bold text-v3-text-secondary">{selected.curve.curveDeg}°</span></div><input type="range" min={0} max={90} step={5} value={selected.curve.curveDeg} onChange={(e) => updateSelected({ curveDeg: Number(e.target.value) })} className="mt-2 w-full accent-[#173d2c]" /><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => updateSelected({ curveSide: "left" })} className={`h-10 rounded-full text-sm font-semibold ${selected.curve.curveSide === "left" ? "bg-[#173d2c] text-white" : "bg-black/5 text-v3-text-secondary"}`}>Vänster</button><button type="button" onClick={() => updateSelected({ curveSide: "right" })} className={`h-10 rounded-full text-sm font-semibold ${selected.curve.curveSide === "right" ? "bg-[#173d2c] text-white" : "bg-black/5 text-v3-text-secondary"}`}>Höger</button></div><button type="button" onClick={() => { persistTunnelCurve(selected.obstacle.id, selected.curve); toast.success("Tunnelböjning sparad i banan"); }} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-v3-text-primary text-sm font-semibold text-white"><Save size={15} /> Spara i banan</button><button type="button" onClick={() => updateSelected({ curveDeg: 0, curveSide: "left" })} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-black/5 text-xs font-semibold text-v3-text-secondary"><RotateCcw size={14} /> Rak tunnel</button></>}
        </div>
      )}
    </div>
  );
}

function JudgeToolsPanel() {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<StoredCourses>(() => readCourses());
  const [mode, setMode] = useState<string>(() => Object.keys(readCourses())[0] ?? "Agility");
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  const [speed, setSpeed] = useState(3.5);
  const courseOptions = useMemo<CourseOption[]>(() => Object.entries(courses).map(([key, course]) => ({ mode: key, course })), [courses]);
  const course = courses[mode] ?? courseOptions[0]?.course;
  const rows = useMemo(() => orderedObstacles(course), [course]);
  const numbered = useMemo(() => numberedObstacles(course), [course]);
  const courseLength = useMemo(() => estimateCourseLength(course), [course]);
  const measureA = rows.find((o) => o.id === aId) ?? numbered[0] ?? rows[0];
  const measureB = rows.find((o) => o.id === bId) ?? numbered[1] ?? rows[1];
  const measureDistance = metersBetween(course ?? {}, measureA, measureB);
  const courseTime = speed > 0 ? courseLength / speed : 0;

  const refresh = () => setCourses(readCourses());
  useEffect(() => { const onStorage = () => refresh(); const onCustom = () => refresh(); window.addEventListener("storage", onStorage); window.addEventListener("am:tunnel-curve-updated", onCustom as EventListener); const timer = window.setInterval(refresh, 2500); return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("am:tunnel-curve-updated", onCustom as EventListener); window.clearInterval(timer); }; }, []);
  useEffect(() => { if (!courses[mode] && courseOptions[0]) setMode(courseOptions[0].mode); }, [courses, mode, courseOptions]);

  if (!courseOptions.length || !course) return null;
  return (
    <div className="fixed left-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[1049] w-[min(430px,calc(100vw-1.5rem))] font-v3-sans">
      {!open ? <button type="button" onClick={() => setOpen(true)} className="flex h-12 items-center gap-2 rounded-full bg-[#20245f] px-4 text-sm font-semibold text-white shadow-2xl"><Ruler size={16} /> Domarvy / mät</button> : (
        <div className="max-h-[78vh] overflow-hidden rounded-[28px] border border-black/10 bg-white/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-black/10 p-4"><div><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-v3-text-tertiary">Course design</div><div className="text-lg font-semibold text-v3-text-primary">Domarvy & bygglista</div><p className="text-xs text-v3-text-secondary">Mått, koordinater, banlängd och tid.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X size={15} /></button></div>
          <div className="max-h-[calc(78vh-86px)] overflow-auto p-4">
            <label className="mb-1 block text-xs font-semibold text-v3-text-secondary">Bana</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="mb-3 h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#20245f]/20">{courseOptions.map((item) => <option key={item.mode} value={item.mode}>{item.mode}: {item.course.name ?? `${item.mode}-bana`}</option>)}</select>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric icon={MapPinned} label="Storlek" value={`${course.width ?? 40}×${course.height ?? 20} m`} />
              <Metric icon={Ruler} label="Banlängd" value={`${Math.round(courseLength)} m`} />
              <Metric icon={BarChart3} label="Tid" value={`${Math.ceil(courseTime)} s`} />
            </div>
            <div className="mt-4 rounded-3xl border border-black/10 bg-[#f7f6f0] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-v3-text-primary"><Ruler size={15} /> Mät mellan hinder</div>
              <div className="grid grid-cols-2 gap-2"><select value={measureA?.id ?? ""} onChange={(e) => setAId(e.target.value)} className="h-9 rounded-2xl border border-black/10 bg-white px-2 text-xs">{rows.map((o) => <option key={o.id} value={o.id}>{o.number ? `#${o.number} ` : ""}{o.label ?? o.type}</option>)}</select><select value={measureB?.id ?? ""} onChange={(e) => setBId(e.target.value)} className="h-9 rounded-2xl border border-black/10 bg-white px-2 text-xs">{rows.map((o) => <option key={o.id} value={o.id}>{o.number ? `#${o.number} ` : ""}{o.label ?? o.type}</option>)}</select></div>
              <div className="mt-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-v3-text-primary">Avstånd: {measureDistance.toFixed(1)} m</div>
            </div>
            <div className="mt-4 rounded-3xl border border-black/10 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} /> Bygglista</div><label className="flex items-center gap-2 text-xs text-v3-text-secondary">m/s<input type="number" min="1" max="8" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value) || 0)} className="h-8 w-16 rounded-xl border border-black/10 px-2" /></label></div>
              <div className="overflow-hidden rounded-2xl border border-black/10"><table className="w-full text-left text-[11px]"><thead className="bg-black/5 text-v3-text-tertiary"><tr><th className="p-2">#</th><th className="p-2">Hinder</th><th className="p-2 text-right">X/Y m</th><th className="p-2 text-right">Rot.</th></tr></thead><tbody>{rows.map((o) => { const p = meterPoint(course, o); return <tr key={o.id} className="border-t border-black/5"><td className="p-2 font-bold">{o.number ?? "–"}</td><td className="p-2">{o.label ?? o.type}</td><td className="p-2 text-right tabular-nums">{p.x.toFixed(1)} / {p.y.toFixed(1)}</td><td className="p-2 text-right tabular-nums">{Math.round(o.rotation ?? 0)}°</td></tr>; })}</tbody></table></div>
              <p className="mt-2 text-[11px] leading-snug text-v3-text-tertiary">Banlängden är en uppskattning mellan numrerade hinder. Perfekt som snabb domar-/byggkontroll innan PDF-versioner byggs ut.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) { return <div className="rounded-2xl bg-[#f7f6f0] p-2"><div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full bg-white"><Icon size={14} /></div><div className="text-[10px] font-semibold uppercase tracking-wide text-v3-text-tertiary">{label}</div><div className="text-sm font-bold text-v3-text-primary">{value}</div></div>; }

export default function V3CoursePlannerPageTunnelIntegrated() {
  return <><V3CoursePlannerPageFixed /><JudgeToolsPanel /><TunnelCurvePanel /></>;
}
