/**
 * Banplaneraren v2 — 2D-uppspelning ("Spela upp banan").
 *
 * Pro-läget gör uppspelningen användbar som faktisk banvandring:
 *   - tydlig tillryggalagd väg + look-ahead-markör
 *   - scrubber och hopp mellan hinder
 *   - beräknad tid vid vald visualiseringshastighet
 *   - aktuell/nästa passage och progress
 *
 * Hastigheten är en visualiseringshastighet, inte en officiell referenstid.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Footprints,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {
  buildCoursePath,
  sampleAt,
  toSvgPathDUntil,
  toSvgPathD,
  type CoursePathInput,
} from "@/features/course-planner-v2/pathSampling";

const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];
const BASE_M_PER_S = 4; // 1× = 4 m/s, endast visualisering

interface Checkpoint {
  number: number;
  t: number;
}

function buildCheckpoints(course: CoursePathInput): Checkpoint[] {
  const numbered = course.obstacles
    .filter((o): o is typeof o & { number: number } => typeof o.number === "number")
    .sort((a, b) => a.number - b.number);

  if (numbered.length === 0) return [];
  if (numbered.length === 1) return [{ number: numbered[0].number, t: 0 }];

  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < numbered.length; i++) {
    total += Math.hypot(numbered[i].x - numbered[i - 1].x, numbered[i].y - numbered[i - 1].y);
    cumulative.push(total);
  }

  if (total <= 0.001) {
    return numbered.map((o, i) => ({ number: o.number, t: i / Math.max(1, numbered.length - 1) }));
  }

  return numbered.map((o, i) => ({ number: o.number, t: cumulative[i] / total }));
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const rounded = Math.round(seconds);
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
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

  // Visa ca 2,5 meter framåt för att visualisera hundens nästa linje.
  const lookAheadT = Math.min(1, t + (path.total > 0 ? Math.min(0.08, 2.5 / path.total) : 0));
  const lookAhead = sampleAt(path, lookAheadT);

  // Hund-ikonen är 24×24 px i Lucide. Vi skalar ner till ~1,4 m bred.
  const iconSizeM = 1.4;
  const headingDeg = (pose.heading * 180) / Math.PI;

  return (
    <g pointerEvents="none">
      {/* Hela rutten — tydlig men sekundär. */}
      <path
        d={fullD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={0.14}
        strokeDasharray="0.4 0.3"
        strokeLinecap="round"
        opacity={0.32}
      />

      {/* Mjuk halo under tillryggalagd väg gör progress lätt att läsa ute i solen. */}
      <path
        d={traveledD}
        fill="none"
        stroke="hsl(var(--card))"
        strokeWidth={0.42}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <path
        d={traveledD}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth={0.22}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.98}
      />

      {/* Look-ahead: vart linjen är på väg, inte en andra hund. */}
      {lookAhead && lookAheadT < 1 && (
        <g transform={`translate(${lookAhead.x} ${lookAhead.y})`}>
          <circle
            r={0.48}
            fill="hsl(var(--card))"
            stroke="hsl(var(--primary))"
            strokeWidth={0.07}
            strokeDasharray="0.12 0.1"
            opacity={0.9}
          />
          <circle r={0.12} fill="hsl(var(--primary))" opacity={0.85} />
        </g>
      )}

      {/* Markör: cirkel-bakgrund + roterande hund-ikon. */}
      <g transform={`translate(${pose.x} ${pose.y}) rotate(${headingDeg})`}>
        <circle r={iconSizeM * 0.62} fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth={0.09} />
        <g transform={`translate(${-iconSizeM / 2} ${-iconSizeM / 2}) scale(${iconSizeM / 24})`}>
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
  const checkpoints = useMemo(() => buildCheckpoints(course), [course]);
  if (!active) return null;

  const noPath = path.points.length < 2;
  const currentIdx = checkpoints.reduce((best, cp, idx) => (cp.t <= t + 0.012 ? idx : best), 0);
  const current = checkpoints[currentIdx];
  const next = checkpoints[Math.min(checkpoints.length - 1, currentIdx + 1)];
  const canPrev = checkpoints.length > 0 && currentIdx > 0;
  const canNext = checkpoints.length > 0 && currentIdx < checkpoints.length - 1;
  const totalSeconds = path.total > 0 ? path.total / (BASE_M_PER_S * speed) : 0;
  const elapsedSeconds = totalSeconds * t;
  const progressPct = Math.round(t * 100);

  const jumpTo = (idx: number) => {
    const cp = checkpoints[idx];
    if (!cp) return;
    setPlaying(false);
    setT(Math.max(0, Math.min(1, cp.t)));
  };

  return (
    <div className="mb-2 w-[min(92vw,46rem)] rounded-2xl border-2 border-ink bg-paper p-2.5 shadow-hard sm:p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2 pr-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-paper">
            <Footprints size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-wider text-ink">Banvandring</p>
            <p className="text-[10px] font-semibold text-ink/50">Look-ahead · passagekontroll · tempo</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => jumpTo(Math.max(0, currentIdx - 1))}
            disabled={!canPrev || noPath}
            className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink/15 bg-white text-ink/70 transition hover:border-ink disabled:opacity-30"
            aria-label="Föregående hinder"
            title="Föregående hinder"
          >
            <SkipBack size={15} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            disabled={noPath}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-ink bg-forest px-3 text-xs font-bold text-paper shadow-hard-sm disabled:opacity-40"
            aria-label={playing ? "Pausa uppspelning" : "Starta uppspelning"}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? "Paus" : "Spela"}
          </button>
          <button
            type="button"
            onClick={() => jumpTo(Math.min(checkpoints.length - 1, currentIdx + 1))}
            disabled={!canNext || noPath}
            className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink/15 bg-white text-ink/70 transition hover:border-ink disabled:opacity-30"
            aria-label="Nästa hinder"
            title="Nästa hinder"
          >
            <SkipForward size={15} />
          </button>
          <button
            type="button"
            onClick={() => { setT(0); setPlaying(true); }}
            disabled={noPath}
            className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink/15 bg-white text-ink/70 transition hover:border-ink disabled:opacity-30"
            aria-label="Börja om"
            title="Börja om"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink/15 bg-white text-ink/70 transition hover:border-ink"
            aria-label="Stäng uppspelning"
            title="Stäng (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-ink/50">
            <span>{current ? `Passage #${current.number}` : "Start"}{next && next !== current ? ` → #${next.number}` : " → mål"}</span>
            <span>{progressPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(t * 1000)}
            disabled={noPath}
            onChange={(e) => { setPlaying(false); setT(Number(e.target.value) / 1000); }}
            className="h-2 w-full cursor-pointer accent-forest"
            aria-label="Position i banan"
          />
        </div>

        <div className="inline-flex h-9 items-center rounded-xl border-2 border-ink/15 bg-white p-0.5 text-[10px] font-bold">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`h-7 rounded-lg px-2 transition ${
                speed === s ? "bg-ink text-paper" : "text-ink/50 hover:bg-cream hover:text-ink"
              }`}
              aria-pressed={speed === s}
              title={`${s}× visualiseringshastighet`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className="rounded-xl bg-cream px-2.5 py-2">
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-ink/45"><Eye size={11} /> Sträcka</div>
          <div className="mt-0.5 text-xs font-black tabular-nums text-ink">{(t * path.total).toFixed(0)} / {path.total.toFixed(0)} m</div>
        </div>
        <div className="rounded-xl bg-cream px-2.5 py-2">
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-ink/45"><Gauge size={11} /> Visningstid</div>
          <div className="mt-0.5 text-xs font-black tabular-nums text-ink">{formatSeconds(elapsedSeconds)} / {formatSeconds(totalSeconds)}</div>
        </div>
        <div className="rounded-xl bg-cream px-2.5 py-2">
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-ink/45"><Footprints size={11} /> Nästa</div>
          <div className="mt-0.5 text-xs font-black text-ink">{next && next !== current ? `#${next.number}` : "Mål"}</div>
        </div>
      </div>

      <p className="mt-2 text-[10px] font-semibold leading-relaxed text-ink/45">
        Hastigheten är en visningsmodell för banvandring — inte officiell referens- eller maxtid.
      </p>

      {noPath && (
        <p className="mt-2 rounded-xl bg-tang/15 px-3 py-2 text-xs font-semibold text-ink/70">
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

  // Tangentbordet ägs av PlannerPage. Tidigare fanns en extra Space-listener
  // här också, vilket kunde toggla play/pause två gånger på samma tangenttryck.

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

export type { Speed };
