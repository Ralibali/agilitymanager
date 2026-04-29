import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { X, Eye, Footprints, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Arena3D } from "./Arena3D";
import { Obstacle3D } from "./Obstacle3D";
import { PathLine3D } from "./PathLine3D";
import { WalkControls } from "./WalkControls";
import { map2DTo3D } from "./coordinateMapping";

export type Planner3DObstacle = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  number?: number;
  color?: string;
  label?: string;
};
export type Planner3DPath = { id: string; points: { x: number; y: number }[]; color?: string };
export type CoursePlanner3DProps = {
  obstacles: Planner3DObstacle[];
  paths: Planner3DPath[];
  widthMeters: number;
  heightMeters: number;
  initialMode?: "view" | "walk";
  courseName?: string;
  onClose: () => void;
};

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

function CameraTeleport({ pos, lookAt, version }: { pos: [number, number, number]; lookAt: [number, number, number]; version: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
  }, [camera, lookAt, pos, version]);
  return null;
}

function obstacleDistanceMeters(a?: Planner3DObstacle, b?: Planner3DObstacle, widthMeters?: number, heightMeters?: number) {
  if (!a || !b || !widthMeters || !heightMeters) return null;
  const pa = map2DTo3D(a.x, a.y, widthMeters, heightMeters);
  const pb = map2DTo3D(b.x, b.y, widthMeters, heightMeters);
  return Math.round(Math.hypot(pb.x - pa.x, pb.z - pa.z));
}

export default function CoursePlanner3D({ obstacles, paths, widthMeters, heightMeters, initialMode = "view", courseName, onClose }: CoursePlanner3DProps) {
  const [mode, setMode] = useState<"view" | "walk">(initialMode);
  const [webglOk] = useState(() => detectWebGL());
  const isMobile = useMemo(() => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches, []);
  const numbered = useMemo(() => obstacles.filter((o) => o.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)), [obstacles]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [teleportV, setTeleportV] = useState(0);
  const currentObstacle = numbered[currentIdx];
  const nextObstacle = numbered[currentIdx + 1];
  const distanceToNext = obstacleDistanceMeters(currentObstacle, nextObstacle, widthMeters, heightMeters);
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookDeltaRef = useRef({ x: 0, y: 0 });
  const sprintRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [sprinting, setSprinting] = useState(false);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") mode === "walk" ? setMode("view") : onClose();
      if (mode === "walk" && (e.key === "ArrowRight" || e.key.toLowerCase() === "n")) setCurrentIdx((i) => Math.min(numbered.length - 1, i + 1));
      if (mode === "walk" && (e.key === "ArrowLeft" || e.key.toLowerCase() === "p")) setCurrentIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, numbered.length, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  useEffect(() => {
    if (mode === "walk") setTeleportV((v) => v + 1);
  }, [mode, currentIdx]);

  useEffect(() => {
    if (!showHint) return;
    const t = window.setTimeout(() => setShowHint(false), 3200);
    return () => window.clearTimeout(t);
  }, [showHint]);

  const walkPose = useMemo(() => {
    if (!numbered.length) return { pos: [0, 1.65, 0] as [number, number, number], target: [0, 1.65, -1] as [number, number, number] };
    const a = numbered[currentIdx] ?? numbered[0];
    const b = numbered[currentIdx + 1] ?? a;
    const ma = map2DTo3D(a.x, a.y, widthMeters, heightMeters);
    const mb = map2DTo3D(b.x, b.y, widthMeters, heightMeters);
    const dx = mb.x - ma.x;
    const dz = mb.z - ma.z;
    const len = Math.hypot(dx, dz) || 1;
    return { pos: [ma.x - (dx / len) * 2.1, 1.65, ma.z - (dz / len) * 2.1] as [number, number, number], target: [mb.x, 1.52, mb.z] as [number, number, number] };
  }, [numbered, currentIdx, widthMeters, heightMeters]);

  if (!webglOk) {
    return <div className="fixed inset-0 z-[1100] bg-[#f6f2ea] text-v3-text-primary grid place-items-center p-6"><div className="max-w-md text-center space-y-4 rounded-[28px] bg-white border border-black/8 shadow-v3-xl p-6"><div className="text-2xl font-semibold">3D-läget kan inte visas</div><p className="text-v3-text-secondary">Din enhet eller webbläsare stöder inte WebGL.</p><button onClick={onClose} className="h-11 px-5 rounded-full bg-v3-text-primary text-white font-semibold">Tillbaka till 2D</button></div></div>;
  }

  const sceneObstacles = obstacles.map((o) => ({ ...o, ...map2DTo3D(o.x, o.y, widthMeters, heightMeters) }));
  const maxDim = Math.max(widthMeters, heightMeters);
  const overviewCamera = isMobile
    ? ([widthMeters * 0.42, maxDim * 0.42, heightMeters * 0.74] as [number, number, number])
    : ([widthMeters * 0.5, maxDim * 0.46, heightMeters * 0.68] as [number, number, number]);

  const startWalk = () => {
    setCurrentIdx(0);
    setShowHint(true);
    setMode("walk");
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-[#f6f2ea]" style={{ touchAction: "none" }}>
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/35 to-transparent text-white">
        <button onClick={onClose} className="h-10 px-3 rounded-full bg-black/45 hover:bg-black/55 backdrop-blur inline-flex items-center gap-2 text-sm font-semibold shadow-lg"><X size={16} /> Avsluta</button>
        <div className="flex items-center gap-1 rounded-full bg-black/35 backdrop-blur p-1 shadow-lg">
          <button onClick={() => setMode("view")} className={`h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${mode === "view" ? "bg-white text-black" : "text-white/85"}`}><Eye size={15} /> 3D</button>
          <button onClick={startWalk} className={`h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${mode === "walk" ? "bg-white text-black" : "text-white/85"}`}><Footprints size={15} /> Gå banan</button>
        </div>
      </div>

      {mode === "walk" && numbered.length === 0 && (
        <div className="absolute left-1/2 top-[88px] z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-[24px] bg-white/92 border border-black/10 shadow-2xl backdrop-blur-xl p-4 text-center">
          <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-v3-text-tertiary mb-1">Gå banan</div>
          <div className="text-lg font-semibold text-v3-text-primary">Numrera hindren i 2D först</div>
          <p className="mt-1 text-sm text-v3-text-secondary">För att kunna gå banan i rätt ordning behöver hindren ha nummer.</p>
          <button onClick={onClose} className="mt-3 h-10 px-4 rounded-full bg-v3-text-primary text-white text-sm font-semibold">Tillbaka till 2D</button>
        </div>
      )}

      {mode === "walk" && numbered.length > 0 && (
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-[18px] bg-black/58 backdrop-blur text-white text-xs sm:text-sm font-semibold max-w-[92vw] text-center shadow-lg">
          <div>Hinder {currentObstacle?.number}: {currentObstacle?.label ?? currentObstacle?.type}</div>
          {nextObstacle ? <div className="opacity-75 text-[11px] mt-0.5">Nästa: {nextObstacle.number} {nextObstacle.label ?? nextObstacle.type}{distanceToNext != null ? ` · ca ${distanceToNext} m` : ""}</div> : <div className="opacity-75 text-[11px] mt-0.5">Sista hindret</div>}
        </div>
      )}

      {mode === "walk" && numbered.length > 1 && (
        <div className="absolute right-3 top-[126px] z-30 flex flex-col gap-2">
          <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} className="h-11 w-11 rounded-full bg-black/45 backdrop-blur text-white grid place-items-center shadow-lg"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentIdx((i) => Math.min(numbered.length - 1, i + 1))} className="h-11 w-11 rounded-full bg-black/45 backdrop-blur text-white grid place-items-center shadow-lg"><ChevronRight size={20} /></button>
          <button onClick={() => setCurrentIdx(0)} className="h-11 w-11 rounded-full bg-black/45 backdrop-blur text-white grid place-items-center shadow-lg"><RotateCcw size={17} /></button>
        </div>
      )}

      <Canvas shadows dpr={isMobile ? [1, 1.25] : [1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: overviewCamera, fov: isMobile ? 50 : 46, near: 0.1, far: 1000 }} onCreated={({ gl }) => { gl.setClearColor("#f6f2ea"); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}>
        <fog attach="fog" args={["#f6f2ea", maxDim * 1.15, maxDim * 2.9]} />
        <Suspense fallback={null}>
          {mode === "view" ? <PerspectiveCamera makeDefault position={overviewCamera} fov={isMobile ? 50 : 46} /> : <PerspectiveCamera makeDefault position={walkPose.pos} fov={70} />}
          <Arena3D widthMeters={widthMeters} heightMeters={heightMeters} />
          {sceneObstacles.map((o) => {
            const numIdx = numbered.findIndex((n) => n.id === o.id);
            return <Obstacle3D key={o.id} type={o.type} x={o.x} z={o.z} rotationDeg={o.rotation} number={o.number} color={o.color} onSelect={numIdx >= 0 ? () => { setCurrentIdx(numIdx); setMode("walk"); } : undefined} highlight={mode === "walk" && numIdx >= 0 && numIdx === currentIdx} />;
          })}
          <PathLine3D paths={paths} widthMeters={widthMeters} heightMeters={heightMeters} />
          {mode === "view" ? <OrbitControls enablePan enableRotate enableZoom minDistance={3} maxDistance={Math.max(widthMeters, heightMeters) * 1.75} maxPolarAngle={Math.PI / 2 - 0.08} target={[0, 0.65, 0]} makeDefault /> : <><CameraTeleport pos={walkPose.pos} lookAt={walkPose.target} version={teleportV} /><WalkControls joystickRef={joystickRef} lookDeltaRef={lookDeltaRef} sprintRef={sprintRef} isMobile={isMobile} bounds={{ w: widthMeters, h: heightMeters }} /></>}
        </Suspense>
      </Canvas>

      {mode === "view" && <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-20 text-black/70 text-[11px] sm:text-xs bg-white/80 border border-black/8 shadow-lg backdrop-blur px-3 py-1.5 rounded-full text-center max-w-[92vw]">Dra för att rotera · Nyp/scrolla för att zooma</div>}
      {mode === "walk" && isMobile && numbered.length > 0 && <MobileWalkControls joystickRef={joystickRef} lookDeltaRef={lookDeltaRef} sprintRef={sprintRef} knob={knob} setKnob={setKnob} sprinting={sprinting} setSprinting={setSprinting} showHint={showHint} setShowHint={setShowHint} />}
      {mode === "walk" && !isMobile && numbered.length > 0 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-white/80 text-xs bg-black/50 px-3 py-1.5 rounded-full">WASD = gå · Shift = spring · ←/→ = hinder · Esc = lämna</div>}
    </div>
  );
}

function MobileWalkControls({ joystickRef, lookDeltaRef, sprintRef, knob, setKnob, sprinting, setSprinting, showHint, setShowHint }: { joystickRef: { current: { x: number; y: number } }; lookDeltaRef: { current: { x: number; y: number } }; sprintRef: { current: boolean }; knob: { x: number; y: number }; setKnob: (v: { x: number; y: number }) => void; sprinting: boolean; setSprinting: (v: boolean) => void; showHint: boolean; setShowHint: (v: boolean) => void }) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const stickTouchId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const setStick = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const r = padRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (clientX - cx) / (r.width / 2);
    let dy = (clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    setKnob({ x: dx, y: dy });
    joystickRef.current = { x: dx, y: dy };
  };
  const resetStick = () => { setKnob({ x: 0, y: 0 }); joystickRef.current = { x: 0, y: 0 }; stickTouchId.current = null; };
  return <><div className="absolute inset-0 z-10" style={{ touchAction: "none" }} onTouchStart={(e) => { if (lookId.current != null) return; const t = e.changedTouches[0]; lookId.current = t.identifier; lookLast.current = { x: t.clientX, y: t.clientY }; }} onTouchMove={(e) => { for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i]; if (t.identifier === lookId.current) { const dx = t.clientX - lookLast.current.x; const dy = t.clientY - lookLast.current.y; lookLast.current = { x: t.clientX, y: t.clientY }; lookDeltaRef.current.x += dx; lookDeltaRef.current.y += dy; } } }} onTouchEnd={(e) => { for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === lookId.current) lookId.current = null; }} onTouchCancel={() => { lookId.current = null; }} />{showHint && <button type="button" onClick={() => setShowHint(false)} className="absolute top-[170px] left-1/2 -translate-x-1/2 z-30 px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-white text-[12px] leading-snug max-w-[88vw] shadow-2xl"><div className="font-semibold mb-1.5 text-[13px]">Så styr du</div><div className="opacity-90 text-left space-y-0.5"><div>Joystick nere till vänster styr rörelse</div><div>Dra på vyn för att titta runt</div><div>Håll Sprint för att gå snabbare</div></div><div className="mt-2 text-[10px] opacity-60">Tryck för att stänga</div></button>}<div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white/75 text-[10px] pointer-events-none">Joystick · Dra för att titta · Sprint</div><div ref={padRef} className="absolute left-4 bottom-[calc(env(safe-area-inset-bottom)+2.35rem)] z-30 h-24 w-24 rounded-full bg-black/18 backdrop-blur border border-white/35 shadow-lg" style={{ touchAction: "none" }} onTouchStart={(e) => { e.stopPropagation(); const t = e.changedTouches[0]; stickTouchId.current = t.identifier; setStick(t.clientX, t.clientY); }} onTouchMove={(e) => { e.stopPropagation(); for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i]; if (t.identifier === stickTouchId.current) setStick(t.clientX, t.clientY); } }} onTouchEnd={(e) => { e.stopPropagation(); for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === stickTouchId.current) resetStick(); }} onTouchCancel={(e) => { e.stopPropagation(); resetStick(); }}><div className="absolute h-10 w-10 rounded-full bg-white/92 shadow-lg pointer-events-none" style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) translate(${knob.x * 22}px, ${knob.y * 22}px)` }} /></div><button type="button" className={`absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+2.35rem)] z-30 h-16 w-16 rounded-full backdrop-blur border shadow-lg text-white text-[10px] font-bold uppercase tracking-wider select-none transition-colors ${sprinting ? "bg-amber-400/85 border-amber-200 text-black" : "bg-black/25 border-white/35"}`} style={{ touchAction: "none" }} onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); sprintRef.current = true; setSprinting(true); }} onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); sprintRef.current = false; setSprinting(false); }} onTouchCancel={() => { sprintRef.current = false; setSprinting(false); }}>Sprint</button></>;
}
