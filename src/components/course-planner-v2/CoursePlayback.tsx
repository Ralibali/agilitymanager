/**
 * Banplaneraren v2 — 2D-uppspelning ("Spela upp banan").
 *
 * Renderar inuti SVG:n (i meter-koordinater):
 *   - färgad rutt fram till nuvarande position
 *   - roterande hund-ikon (Footprints) på markörens plats
 *
 * Renderar utanför SVG:n en kompakt kontrollpanel:
 *   - Play/Paus, Restart, Stäng
 *   - Hastighetsval (0,5× / 1× / 2×)
 *   - Scrubber (range)
 *
 * Hastighet räknas i banlängd per sekund. 1× = 4 m/s (typisk förarhastighet).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X, Footprints } from "lucide-react";
import {
  buildCoursePath,
  sampleAt,
  toSvgPathDUntil,
  toSvgPathD,
  type CoursePathInput,
} from "@/features/course-planner-v2/pathSampling";

const SPEEDS = [0.5, 1, 2] as const;
type Speed = typeof SPEEDS[number];
const BASE_M_PER_S = 4; // 1× = 4 m/s

interface Props {
  course: CoursePathInput;
  active: boolean;
  onClose: () => void;
}

/** SVG-overlay som ritar rutt + markör. Ska placeras inuti samma <svg>. */
export function CoursePlaybackOverlay({
  course,
  active,
  t,
}: {
  course: CoursePathInput;
  active: boolean;
  t: number;
}) {
  const path = useMemo(() => buildCoursePath(course), [course]);
  if (!active || path.points.length < 2) return null;

  const fullD = toSvgPathD(path);
  const traveledD = toSvgPathDUntil(path, t);
  const pose = sampleAt(path, t);
  if (!pose) return null;

  // Hund-ikonen är 24×24 px i Lucide. Vi skalar ner till ~1.4 m bred.
  const iconSizeM = 1.4;
  const headingDeg = (pose.heading * 180) / Math.PI;

  return (
    <g pointerEvents="none">
      {/* Hela rutten — svag bakgrundslinje */}
      <path
        d={fullD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={0.12}
        strokeDasharray="0.4 0.3"
        strokeLinecap="round"
        opacity={0.35}
      />
      {/* Tillryggalagd del — solid varmare färg */}
      <path
        d={traveledD}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth={0.22}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
      {/* Markör: cirkel-bakgrund + roterande hund-ikon */}
      <g transform={`translate(${pose.x} ${pose.y}) rotate(${headingDeg})`}>
        <circle r={iconSizeM * 0.55} fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth={0.08} />
        {/* Footprints SVG path (Lucide), centrerad och skalad */}
        <g
          transform={`translate(${-iconSizeM / 2} ${-iconSizeM / 2}) scale(${iconSizeM / 24})`}
        >
          <path
            d="M4 16v-2.38c0-.97.32-1.71 1.34-2.99 1.04-1.32 1.32-2.04 1.32-3.12 0-1.85-1.25-3.5-3.16-3.5C2.34 4.01 2 5.7 2 7.5c0 .92.32 1.83.66 2.5"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 20v-2.38c0-.97.32-1.71 1.34-2.99 1.04-1.32 1.32-2.04 1.32-3.12 0-1.85-1.25-3.5-3.16-3.5-1.16 0-1.5 1.69-1.5 3.5 0 .92.32 1.83.66 2.5"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 21c0-3 1.85-5.36 5.08-5.36 2.5 0 4.92 1.86 4.92 5.36"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 21c0-3 1.85-5.36 5.08-5.36 2.5 0 4.92 1.86 4.92 5.36"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  );
}

/** Kontrollpanel — rendera utanför canvas, t.ex. ovanför verktygsraden. */
export function CoursePlaybackControls({
  course,
  active,
  onClose,
  t,
  setT,
  playing,
  setPlaying,
  speed,
  setSpeed,
}: {
  course: CoursePathInput;
  active: boolean;
  onClose: () => void;
  t: number;
  setT: (v: number) => void;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  speed: Speed;
  setSpeed: (s: Speed) => void;
}) {
  const path = useMemo(() => buildCoursePath(course), [course]);
  if (!active) return null;

  const noPath = path.points.length < 2;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <Footprints size={16} className="text-primary" />
      <span className="text-sm font-medium text-foreground">Spela upp banan</span>
      <div className="mx-1 h-5 w-px bg-border" />

      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        disabled={noPath}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        aria-label={playing ? "Pausa uppspelning" : "Starta uppspelning"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {playing ? "Paus" : "Spela"}
      </button>

      <button
        type="button"
        onClick={() => { setT(0); setPlaying(true); }}
        disabled={noPath}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40"
        aria-label="Börja om"
        title="Börja om"
      >
        <RotateCcw size={14} />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      <div className="inline-flex h-8 items-center rounded-full border border-border bg-card p-0.5 text-xs">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`h-7 rounded-full px-2.5 transition ${
              speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
            aria-pressed={speed === s}
          >
            {s}×
          </button>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(t * 1000)}
        disabled={noPath}
        onChange={(e) => { setPlaying(false); setT(Number(e.target.value) / 1000); }}
        className="h-1.5 min-w-[120px] flex-1 cursor-pointer accent-primary"
        aria-label="Position i banan"
      />

      <span className="tabular-nums text-xs text-muted-foreground">
        {Math.round(t * path.total)} / {Math.round(path.total)} m
      </span>

      <button
        type="button"
        onClick={onClose}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted"
        aria-label="Stäng uppspelning"
        title="Stäng (Esc)"
      >
        <X size={14} />
      </button>

      {noPath && (
        <p className="basis-full text-xs text-muted-foreground">
          Numrera minst två hinder för att kunna spela upp banan.
        </p>
      )}
    </div>
  );
}

/** Hook som hanterar tid + animation. */
export function useCoursePlayback(course: CoursePathInput, active: boolean) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const path = useMemo(() => buildCoursePath(course), [course]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // Reset när uppspelningen stängs.
  useEffect(() => {
    if (!active) {
      setT(0);
      setPlaying(false);
      lastRef.current = null;
    }
  }, [active]);

  // Esc stänger inte här — det hanteras av sidan, men vi pausar.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // RAF-loop.
  useEffect(() => {
    if (!active || !playing || path.total === 0) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = (ts - lastRef.current) / 1000;
      lastRef.current = ts;
      const dT = (BASE_M_PER_S * speed * dt) / path.total;
      setT((prev) => {
        const next = prev + dT;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [active, playing, speed, path.total]);

  return { t, setT, playing, setPlaying, speed, setSpeed };
}

// Exportera hjälp-typen för andra konsumenter.
export type { Speed };
