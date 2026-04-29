import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { X, Eye, Footprints, ChevronLeft, ChevronRight } from "lucide-react";
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

// Helper to set camera at a specific obstacle in walk mode without remounting Canvas
function CameraTeleport({ pos, lookAt, version }: { pos: [number, number, number]; lookAt: [number, number, number]; version: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return null;
}

export default function CoursePlanner3D(props: CoursePlanner3DProps) {
  const { obstacles, paths, widthMeters, heightMeters, initialMode = "view", courseName, onClose } = props;
  const [mode, setMode] = useState<"view" | "walk">(initialMode);
  const [webglOk] = useState<boolean>(() => detectWebGL());
  const isMobile = useMemo(() => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches, []);

  const numbered = useMemo(
    () => obstacles.filter((o) => o.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [obstacles]
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [teleportV, setTeleportV] = useState(0);
  const currentObstacle = numbered[currentIdx];
  const nextObstacle = numbered[currentIdx + 1];

  // Walk control inputs (refs so they don't trigger re-renders)
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookDeltaRef = useRef({ x: 0, y: 0 });
  const sprintRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [sprinting, setSprinting] = useState(false);

  // ESC handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mode === "walk") setMode("view");
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Teleport camera on obstacle change in walk mode
  useEffect(() => {
    if (mode === "walk") setTeleportV((v) => v + 1);
  }, [mode, currentIdx]);

  const walkPose = useMemo(() => {
    if (!numbered.length) {
      return { pos: [0, 1.65, 0] as [number, number, number], target: [0, 1.65, -1] as [number, number, number] };
    }
    const a = numbered[currentIdx] ?? numbered[0];
    const b = numbered[currentIdx + 1] ?? a;
    const ma = map2DTo3D(a.x, a.y, widthMeters, heightMeters);
    const mb = map2DTo3D(b.x, b.y, widthMeters, heightMeters);
    // Stand 2m before the obstacle along the direction towards next
    const dx = mb.x - ma.x;
    const dz = mb.z - ma.z;
    const len = Math.hypot(dx, dz) || 1;
    const ox = ma.x - (dx / len) * 2;
    const oz = ma.z - (dz / len) * 2;
    return {
      pos: [ox, 1.65, oz] as [number, number, number],
      target: [mb.x, 1.65, mb.z] as [number, number, number],
    };
  }, [numbered, currentIdx, widthMeters, heightMeters]);

  if (!webglOk) {
    return (
      <div className="fixed inset-0 z-[1100] bg-[#0d1410] text-white grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-2xl font-semibold">3D-läget kan inte visas</div>
          <p className="text-white/70">Din enhet eller webbläsare stöder inte WebGL. Prova en uppdaterad version av Chrome, Safari eller Firefox.</p>
          <button onClick={onClose} className="h-11 px-5 rounded-full bg-white text-black font-semibold">Tillbaka till 2D</button>
        </div>
      </div>
    );
  }

  const sceneObstacles = obstacles.map((o) => {
    const m = map2DTo3D(o.x, o.y, widthMeters, heightMeters);
    return { ...o, _x: m.x, _z: m.z };
  });

  return (
    <div className="fixed inset-0 z-[1100] bg-[#0d1410]" style={{ touchAction: "none" }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 py-3 bg-gradient-to-b from-black/70 to-transparent text-white">
        <div className="min-w-0 flex items-center gap-2">
          <button onClick={onClose} className="h-10 px-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur inline-flex items-center gap-2 text-sm font-semibold">
            <X size={16} /> Avsluta
          </button>
          <div className="hidden sm:block text-sm font-semibold truncate max-w-[40vw]">
            {courseName || "3D-vy"} · {widthMeters}×{heightMeters} m
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/10 backdrop-blur p-1">
          <button onClick={() => setMode("view")} className={`h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${mode === "view" ? "bg-white text-black" : "text-white/80"}`}>
            <Eye size={15} /> 3D
          </button>
          <button onClick={() => { setCurrentIdx(0); setMode("walk"); }} className={`h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${mode === "walk" ? "bg-white text-black" : "text-white/80"}`}>
            <Footprints size={15} /> Gå banan
          </button>
        </div>
      </div>

      {/* Walk HUD */}
      {mode === "walk" && (
        <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/55 backdrop-blur text-white text-xs sm:text-sm font-semibold max-w-[92vw] text-center">
          {currentObstacle ? (
            <>
              Hinder {currentObstacle.number}: {currentObstacle.label ?? currentObstacle.type}
              {nextObstacle && <span className="opacity-60"> · Nästa: {nextObstacle.number} {nextObstacle.label ?? nextObstacle.type}</span>}
            </>
          ) : "Inga numrerade hinder"}
        </div>
      )}

      {mode === "walk" && numbered.length > 1 && (
        <div className="absolute right-3 top-[120px] z-30 flex flex-col gap-2">
          <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} className="h-11 w-11 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentIdx((i) => Math.min(numbered.length - 1, i + 1))} className="h-11 w-11 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center"><ChevronRight size={20} /></button>
        </div>
      )}

      <Canvas
        shadows={false}
        dpr={isMobile ? [1, 1.4] : [1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => { gl.setClearColor("#0d1410"); }}
      >
        <Suspense fallback={null}>
          {mode === "view" ? (
            <PerspectiveCamera
              makeDefault
              position={[widthMeters * 0.7, Math.max(widthMeters, heightMeters) * 0.6, heightMeters * 0.85]}
              fov={45}
            />
          ) : (
            <PerspectiveCamera makeDefault position={walkPose.pos} fov={70} />
          )}
          <Arena3D widthMeters={widthMeters} heightMeters={heightMeters} />
          {sceneObstacles.map((o) => {
            const numIdx = numbered.findIndex((n) => n.id === o.id);
            const handleSelect = numIdx >= 0
              ? () => { setCurrentIdx(numIdx); setMode("walk"); }
              : undefined;
            const isNext = mode === "walk" && numIdx >= 0 && numIdx === currentIdx;
            return (
              <Obstacle3D
                key={o.id}
                type={o.type}
                x={o._x}
                z={o._z}
                rotationDeg={o.rotation}
                number={o.number}
                color={o.color}
                onSelect={handleSelect}
                highlight={isNext}
              />
            );
          })}
          <PathLine3D paths={paths} widthMeters={widthMeters} heightMeters={heightMeters} />

          {mode === "view" ? (
            <OrbitControls
              enablePan
              enableRotate
              enableZoom
              minDistance={3}
              maxDistance={Math.max(widthMeters, heightMeters) * 2}
              maxPolarAngle={Math.PI / 2 - 0.05}
              target={[0, 0.5, 0]}
              makeDefault
            />
          ) : (
            <>
              <CameraTeleport pos={walkPose.pos} lookAt={walkPose.target} version={teleportV} />
              <WalkControls
                joystickRef={joystickRef}
                lookDeltaRef={lookDeltaRef}
                sprintRef={sprintRef}
                isMobile={isMobile}
                bounds={{ w: widthMeters, h: heightMeters }}
              />
            </>
          )}
        </Suspense>
      </Canvas>

      {/* Hints */}
      {mode === "view" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-white/70 text-[11px] sm:text-xs bg-black/40 px-3 py-1.5 rounded-full text-center max-w-[92vw]">
          Dra för att rotera · Nyp/scrolla för att zooma
        </div>
      )}
      {mode === "walk" && !isMobile && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-white/70 text-xs bg-black/40 px-3 py-1.5 rounded-full">
          Klicka för att låsa muspekaren · WASD = gå · Shift = spring · Esc = lämna gå-läget
        </div>
      )}

      {/* Mobile walk controls */}
      {mode === "walk" && isMobile && (
        <MobileWalkUI
          joystickRef={joystickRef}
          lookDeltaRef={lookDeltaRef}
          sprintRef={sprintRef}
          knob={knob}
          setKnob={setKnob}
          sprinting={sprinting}
          setSprinting={setSprinting}
        />
      )}
    </div>
  );
}

function MobileWalkUI({
  joystickRef,
  lookDeltaRef,
  sprintRef,
  knob,
  setKnob,
  sprinting,
  setSprinting,
}: {
  joystickRef: { current: { x: number; y: number } };
  lookDeltaRef: { current: { x: number; y: number } };
  sprintRef: { current: boolean };
  knob: { x: number; y: number };
  setKnob: (v: { x: number; y: number }) => void;
  sprinting: boolean;
  setSprinting: (v: boolean) => void;
}) {
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
  const resetStick = () => {
    setKnob({ x: 0, y: 0 });
    joystickRef.current = { x: 0, y: 0 };
    stickTouchId.current = null;
  };

  return (
    <>
      {/* Full-screen look pad – sits BELOW the UI controls (z-10).
          Touches on joystick/sprint/topbar/HUD never reach this layer because
          those elements are positioned above with their own pointer events. */}
      <div
        className="absolute inset-0 z-10"
        style={{ touchAction: "none" }}
        onTouchStart={(e) => {
          if (lookId.current != null) return;
          const t = e.changedTouches[0];
          lookId.current = t.identifier;
          lookLast.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchMove={(e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookId.current) {
              const dx = t.clientX - lookLast.current.x;
              const dy = t.clientY - lookLast.current.y;
              lookLast.current = { x: t.clientX, y: t.clientY };
              lookDeltaRef.current.x += dx;
              lookDeltaRef.current.y += dy;
            }
          }
        }}
        onTouchEnd={(e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookId.current) {
              lookId.current = null;
            }
          }
        }}
        onTouchCancel={() => { lookId.current = null; }}
      />

      {/* Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white/80 text-[11px] pointer-events-none">
        Joystick = gå · Dra på vyn = titta · Håll Sprint
      </div>

      {/* Joystick (left) */}
      <div
        ref={padRef}
        className="absolute left-4 bottom-10 z-30 h-28 w-28 rounded-full bg-white/15 backdrop-blur border border-white/30 shadow-lg"
        style={{ touchAction: "none" }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const t = e.changedTouches[0];
          stickTouchId.current = t.identifier;
          setStick(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === stickTouchId.current) {
              setStick(t.clientX, t.clientY);
            }
          }
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === stickTouchId.current) {
              resetStick();
            }
          }
        }}
        onTouchCancel={(e) => { e.stopPropagation(); resetStick(); }}
      >
        <div
          className="absolute h-11 w-11 rounded-full bg-white/85 shadow-lg pointer-events-none"
          style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) translate(${knob.x * 26}px, ${knob.y * 26}px)` }}
        />
      </div>

      {/* Sprint button (right) */}
      <button
        type="button"
        className={`absolute right-4 bottom-10 z-30 h-20 w-20 rounded-full backdrop-blur border shadow-lg text-white text-xs font-bold uppercase tracking-wider select-none transition-colors ${
          sprinting
            ? "bg-amber-400/80 border-amber-200 text-black"
            : "bg-white/15 border-white/30"
        }`}
        style={{ touchAction: "none" }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sprintRef.current = true;
          setSprinting(true);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sprintRef.current = false;
          setSprinting(false);
        }}
        onTouchCancel={() => {
          sprintRef.current = false;
          setSprinting(false);
        }}
      >
        Sprint
      </button>
    </>
  );
}
