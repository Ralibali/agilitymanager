import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { X, Eye, Footprints, ChevronLeft, ChevronRight } from "lucide-react";
import { Arena3D } from "./Arena3D";
import { Obstacle3D } from "./Obstacle3D";
import { PathLine3D } from "./PathLine3D";
import { WalkControls } from "./WalkControls";
import { map2DTo3D } from "./coordinateMapping";

export type Planner3DObstacle = {
  id: string;
  type: string;
  x: number; // 0-100
  y: number; // 0-100
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

export default function CoursePlanner3D(props: CoursePlanner3DProps) {
  const { obstacles, paths, widthMeters, heightMeters, initialMode = "view", courseName, onClose } = props;
  const [mode, setMode] = useState<"view" | "walk">(initialMode);
  const [webglOk] = useState<boolean>(() => detectWebGL());
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMemo(() => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches, []);

  // Walk mode state
  const numbered = useMemo(
    () => obstacles.filter((o) => o.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [obstacles]
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentObstacle = numbered[currentIdx];
  const nextObstacle = numbered[currentIdx + 1];

  // Mobile look + joystick
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookDeltaRef = useRef({ x: 0, y: 0 });
  const [jsVisual, setJsVisual] = useState({ x: 0, y: 0 });

  // Esc to close
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

  // Compute initial walk camera position (at obstacle 1, looking towards 2)
  const walkStart = useMemo(() => {
    if (!numbered.length) return { pos: [0, 1.65, 0] as [number, number, number], target: [0, 1.65, -1] as [number, number, number] };
    const a = numbered[0];
    const b = numbered[1] ?? a;
    const ma = map2DTo3D(a.x, a.y, widthMeters, heightMeters);
    const mb = map2DTo3D(b.x, b.y, widthMeters, heightMeters);
    return {
      pos: [ma.x, 1.65, ma.z] as [number, number, number],
      target: [mb.x, 1.65, mb.z] as [number, number, number],
    };
  }, [numbered, widthMeters, heightMeters]);

  if (!webglOk) {
    return (
      <div className="fixed inset-0 z-[1100] bg-[#0d1410] text-white grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-2xl font-semibold">3D-läget kan inte visas</div>
          <p className="text-white/70">
            Din enhet eller webbläsare stöder inte WebGL. Prova en uppdaterad version av Chrome, Safari eller Firefox.
          </p>
          <button onClick={onClose} className="h-11 px-5 rounded-full bg-white text-black font-semibold">
            Tillbaka till 2D
          </button>
        </div>
      </div>
    );
  }

  const sceneObstacles = obstacles.map((o) => {
    const m = map2DTo3D(o.x, o.y, widthMeters, heightMeters);
    return { ...o, _x: m.x, _z: m.z };
  });

  return (
    <div className="fixed inset-0 z-[1100] bg-[#0d1410]">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 py-3 bg-gradient-to-b from-black/70 to-transparent text-white">
        <div className="min-w-0 flex items-center gap-2">
          <button
            onClick={onClose}
            className="h-10 px-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur inline-flex items-center gap-2 text-sm font-semibold"
          >
            <X size={16} /> Avsluta
          </button>
          <div className="hidden sm:block text-sm font-semibold truncate max-w-[40vw]">
            {courseName || "3D-vy"} · {widthMeters}×{heightMeters} m
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/10 backdrop-blur p-1">
          <button
            onClick={() => setMode("view")}
            className={`h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${
              mode === "view" ? "bg-white text-black" : "text-white/80"
            }`}
          >
            <Eye size={15} /> 3D
          </button>
          <button
            onClick={() => {
              setCurrentIdx(0);
              setMode("walk");
            }}
            className={`h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${
              mode === "walk" ? "bg-white text-black" : "text-white/80"
            }`}
          >
            <Footprints size={15} /> Gå banan
          </button>
        </div>
      </div>

      {/* Walk mode HUD */}
      {mode === "walk" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/55 backdrop-blur text-white text-sm font-semibold">
          {currentObstacle ? (
            <>
              Hinder {currentObstacle.number}: {currentObstacle.label ?? currentObstacle.type}
              {nextObstacle && (
                <span className="opacity-60"> · Nästa: {nextObstacle.number} {nextObstacle.label ?? nextObstacle.type}</span>
              )}
            </>
          ) : (
            "Inga numrerade hinder"
          )}
        </div>
      )}

      {/* Walk mode prev/next */}
      {mode === "walk" && numbered.length > 1 && (
        <div className="absolute right-3 top-20 z-30 flex flex-col gap-2">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="h-11 w-11 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentIdx((i) => Math.min(numbered.length - 1, i + 1))}
            className="h-11 w-11 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Canvas */}
      <Canvas
        shadows={!isMobile}
        dpr={isMobile ? [1, 1.4] : [1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0d1410");
        }}
        onError={() => setError("3D kunde inte initieras")}
      >
        <Suspense fallback={null}>
          {mode === "view" ? (
            <PerspectiveCamera
              makeDefault
              position={[widthMeters * 0.7, Math.max(widthMeters, heightMeters) * 0.6, heightMeters * 0.85]}
              fov={45}
            />
          ) : (
            <PerspectiveCamera makeDefault position={walkStart.pos} fov={70} />
          )}
          <Arena3D widthMeters={widthMeters} heightMeters={heightMeters} />
          {sceneObstacles.map((o) => (
            <Obstacle3D
              key={o.id}
              type={o.type}
              x={o._x}
              z={o._z}
              rotationDeg={o.rotation}
              number={o.number}
              color={o.color}
            />
          ))}
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
            />
          ) : (
            <WalkControls
              joystick={jsVisual}
              lookDelta={lookDeltaRef.current}
              isMobile={isMobile}
              bounds={{ w: widthMeters, h: heightMeters }}
            />
          )}
        </Suspense>
      </Canvas>

      {/* Hint */}
      {mode === "view" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-white/70 text-xs bg-black/40 px-3 py-1.5 rounded-full">
          Dra för att rotera · Scrolla/nyp för att zooma · Högerklick för att panorera
        </div>
      )}
      {mode === "walk" && !isMobile && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-white/70 text-xs bg-black/40 px-3 py-1.5 rounded-full">
          Klicka för att låsa muspekaren · WASD för att gå · Shift = spring · Esc avslutar gå-läget
        </div>
      )}

      {/* Mobile joystick + look pad */}
      {mode === "walk" && isMobile && (
        <MobileWalkControls
          onMove={(v) => {
            joystickRef.current = v;
            setJsVisual(v);
          }}
          onLook={(d) => {
            lookDeltaRef.current = d;
          }}
        />
      )}

      {error && (
        <div className="absolute inset-0 z-40 bg-black/70 grid place-items-center text-white p-6 text-center">
          <div className="space-y-3">
            <div className="text-lg font-semibold">{error}</div>
            <button onClick={onClose} className="h-10 px-4 rounded-full bg-white text-black font-semibold">
              Stäng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileWalkControls({
  onMove,
  onLook,
}: {
  onMove: (v: { x: number; y: number }) => void;
  onLook: (d: { x: number; y: number }) => void;
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const padRef = useRef<HTMLDivElement | null>(null);
  const lookRef = useRef<{ id: number | null; x: number; y: number }>({ id: null, x: 0, y: 0 });

  const handleStickMove = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const r = padRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (clientX - cx) / (r.width / 2);
    let dy = (clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    onMove({ x: dx, y: dy });
  };
  const reset = () => {
    setKnob({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  return (
    <>
      {/* Joystick */}
      <div
        ref={padRef}
        className="absolute left-5 bottom-6 z-30 h-32 w-32 rounded-full bg-white/15 backdrop-blur border border-white/30 touch-none"
        onTouchStart={(e) => {
          const t = e.touches[0];
          handleStickMove(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          handleStickMove(t.clientX, t.clientY);
        }}
        onTouchEnd={reset}
        onTouchCancel={reset}
      >
        <div
          className="absolute h-12 w-12 rounded-full bg-white/80 shadow-lg pointer-events-none"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${knob.x * 28}px, ${knob.y * 28}px)`,
          }}
        />
      </div>

      {/* Look pad – right half of the screen */}
      <div
        className="absolute right-0 top-16 bottom-0 w-1/2 z-20 touch-none"
        onTouchStart={(e) => {
          const t = e.touches[0];
          lookRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
          onLook({ x: 0, y: 0 });
        }}
        onTouchMove={(e) => {
          for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            if (t.identifier === lookRef.current.id) {
              const dx = t.clientX - lookRef.current.x;
              const dy = t.clientY - lookRef.current.y;
              lookRef.current.x = t.clientX;
              lookRef.current.y = t.clientY;
              onLook({ x: dx, y: dy });
            }
          }
        }}
        onTouchEnd={() => {
          lookRef.current.id = null;
          onLook({ x: 0, y: 0 });
        }}
      />
    </>
  );
}
