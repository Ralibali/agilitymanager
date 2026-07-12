import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  RotateCcw,
  Trash2,
  Plus,
  Move,
  Save,
  FileDown,
  Sparkles,
  X,
  Copy,
  CheckCircle2,
  MousePointer2,
  Lock,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { trackGrowthEvent } from "@/lib/growth";
import {
  buildFreePlannerAuthUrl,
  FREE_PLANNER_DEFAULT_SOURCE,
  type FreePlannerSport,
} from "@/features/free-planner/buildFreePlannerAuthUrl";
import {
  clampPercent,
  clientPointToPercent,
  obstacleCountExcludingMarkers,
  nextFreeObstaclePosition,
  FREE_MAX_COMPETITION_OBSTACLES,
  MARKER_TYPES,
} from "@/features/free-planner/freePlannerGeometry";
import { FreeObstacleGlyph, type FreeObstacleGlyphType } from "@/components/free-planner/FreeObstacleGlyph";

// ---------- Data model ----------

type AgilityType = "jump" | "tunnel" | "weave" | "aframe" | "seesaw" | "longjump" | "wall" | "start" | "finish";
type HoopersType = "hoop" | "tunnel" | "barrel" | "fence" | "zone" | "start" | "finish";
type ObstacleType = AgilityType | HoopersType;

interface FreeObstacle {
  id: string;
  type: ObstacleType;
  x: number; // 0–100
  y: number; // 0–100
  rotation: number;
  number?: number;
}

interface ObstacleDef {
  type: ObstacleType;
  label: string;
  glyph: FreeObstacleGlyphType;
  /** Approximate footprint in % of canvas width for hit-area sizing */
  widthPct: number;
  heightPct: number;
}

const AGILITY_OBSTACLES: ObstacleDef[] = [
  { type: "jump", label: "Hopp", glyph: "jump", widthPct: 9, heightPct: 9 },
  { type: "tunnel", label: "Tunnel", glyph: "tunnel", widthPct: 14, heightPct: 9 },
  { type: "weave", label: "Slalom", glyph: "weave", widthPct: 16, heightPct: 7 },
  { type: "aframe", label: "A-hinder", glyph: "aframe", widthPct: 12, heightPct: 9 },
  { type: "seesaw", label: "Gungbräda", glyph: "seesaw", widthPct: 12, heightPct: 8 },
  { type: "longjump", label: "Långhopp", glyph: "longjump", widthPct: 12, heightPct: 7 },
  { type: "wall", label: "Mur", glyph: "wall", widthPct: 10, heightPct: 9 },
  { type: "start", label: "Start", glyph: "start", widthPct: 8, heightPct: 8 },
  { type: "finish", label: "Mål", glyph: "finish", widthPct: 8, heightPct: 8 },
];

const HOOPERS_OBSTACLES: ObstacleDef[] = [
  { type: "hoop", label: "Hoop", glyph: "hoop", widthPct: 9, heightPct: 9 },
  { type: "tunnel", label: "Tunnel", glyph: "tunnel", widthPct: 14, heightPct: 9 },
  { type: "barrel", label: "Tunna", glyph: "barrel", widthPct: 9, heightPct: 9 },
  { type: "fence", label: "Staket", glyph: "fence", widthPct: 14, heightPct: 6 },
  { type: "zone", label: "Dirigeringszon", glyph: "zone", widthPct: 12, heightPct: 12 },
  { type: "start", label: "Start", glyph: "start", widthPct: 8, heightPct: 8 },
  { type: "finish", label: "Mål", glyph: "finish", widthPct: 8, heightPct: 8 },
];

function getObstaclesFor(sport: FreePlannerSport): ObstacleDef[] {
  return sport === "hoopers" ? HOOPERS_OBSTACLES : AGILITY_OBSTACLES;
}

function defFor(sport: FreePlannerSport, type: ObstacleType): ObstacleDef {
  return getObstaclesFor(sport).find((o) => o.type === type) ?? getObstaclesFor(sport)[0];
}

const AGILITY_DEMO: FreeObstacle[] = [
  { id: "demo-start", type: "start", x: 10, y: 85, rotation: 0 },
  { id: "demo-1", type: "jump", x: 24, y: 70, rotation: 0, number: 1 },
  { id: "demo-2", type: "tunnel", x: 44, y: 55, rotation: 15, number: 2 },
  { id: "demo-3", type: "weave", x: 62, y: 42, rotation: -8, number: 3 },
  { id: "demo-4", type: "jump", x: 78, y: 30, rotation: 0, number: 4 },
  { id: "demo-finish", type: "finish", x: 90, y: 15, rotation: 0 },
];

const HOOPERS_DEMO: FreeObstacle[] = [
  { id: "demo-start", type: "start", x: 12, y: 82, rotation: 0 },
  { id: "demo-1", type: "hoop", x: 28, y: 68, rotation: 0, number: 1 },
  { id: "demo-2", type: "barrel", x: 46, y: 54, rotation: 0, number: 2 },
  { id: "demo-3", type: "tunnel", x: 62, y: 40, rotation: 10, number: 3 },
  { id: "demo-4", type: "hoop", x: 78, y: 26, rotation: 0, number: 4 },
  { id: "demo-finish", type: "finish", x: 90, y: 14, rotation: 0 },
];

function demoFor(sport: FreePlannerSport): FreeObstacle[] {
  return sport === "hoopers" ? HOOPERS_DEMO : AGILITY_DEMO;
}

const WATERMARK = "Skapad med AgilityManager.se";

// ---------- Helpers ----------

function detectDeviceClass(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function createObstacle(sport: FreePlannerSport, type: ObstacleType, indexHint: number, competitionCount: number): FreeObstacle {
  const pos = nextFreeObstaclePosition(indexHint);
  return {
    id: `${type}-${Date.now().toString(36)}-${indexHint}`,
    type,
    x: pos.x,
    y: pos.y,
    rotation: type === "tunnel" ? 15 : 0,
    number: MARKER_TYPES.has(type) ? undefined : competitionCount + 1,
  };
}

// ---------- Page ----------

export default function FreeCoursePlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sportParam = searchParams.get("sport");
  const sport: FreePlannerSport = sportParam === "hoopers" ? "hoopers" : "agility";
  const source = (searchParams.get("source") ?? "").trim() || FREE_PLANNER_DEFAULT_SOURCE;

  const [obstacles, setObstacles] = useState<FreeObstacle[]>(() => demoFor(sport));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState<"threshold" | "save" | "export" | "3d" | "validate" | null>(null);

  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackGrowthEvent("free_planner_opened", { sport, source, device_class: detectDeviceClass() });
  }, [sport, source]);

  // Reset canvas when sport changes
  const lastSportRef = useRef<FreePlannerSport>(sport);
  useEffect(() => {
    if (lastSportRef.current === sport) return;
    lastSportRef.current = sport;
    setObstacles(demoFor(sport));
    setSelectedId(null);
    setUnlockOpen(false);
  }, [sport]);

  const competitionCount = useMemo(() => obstacleCountExcludingMarkers(obstacles), [obstacles]);
  const reachedLimit = competitionCount >= FREE_MAX_COMPETITION_OBSTACLES;
  const selected = useMemo(() => obstacles.find((o) => o.id === selectedId) ?? null, [obstacles, selectedId]);

  const signupUrl = buildFreePlannerAuthUrl({ mode: "signup", source, sport });
  const loginUrl = buildFreePlannerAuthUrl({ mode: "login", source, sport });

  // Value unlock trigger at threshold (6)
  useEffect(() => {
    if (competitionCount === 6 && !unlockOpen && unlockReason !== "threshold") {
      setUnlockReason("threshold");
      setUnlockOpen(true);
    }
  }, [competitionCount, unlockOpen, unlockReason]);

  const switchSport = useCallback(
    (next: FreePlannerSport) => {
      if (next === sport) return;
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("sport", next);
      if (!nextParams.get("source") && source) nextParams.set("source", source);
      setSearchParams(nextParams, { replace: true });
      trackGrowthEvent("free_planner_sport_changed", { from: sport, to: next });
    },
    [sport, source, searchParams, setSearchParams],
  );

  const addObstacle = useCallback(
    (type: ObstacleType) => {
      const isMarker = MARKER_TYPES.has(type);
      if (!isMarker && reachedLimit) {
        trackGrowthEvent("free_planner_limit_hit", { sport });
        setUnlockReason("threshold");
        setUnlockOpen(true);
        return;
      }
      // Prevent duplicate start/finish
      if (isMarker && obstacles.some((o) => o.type === type)) return;

      setObstacles((items) => {
        const next = createObstacle(sport, type, items.length + 1, obstacleCountExcludingMarkers(items));
        return [...items, next];
      });
      setAddSheetOpen(false);
      trackGrowthEvent("free_planner_obstacle_added", {
        sport,
        obstacle_type: type,
        count: competitionCount + (isMarker ? 0 : 1),
      });
    },
    [reachedLimit, sport, obstacles, competitionCount],
  );

  const handleLockedAction = useCallback(
    (action: "save" | "export" | "3d" | "validate") => {
      trackGrowthEvent("free_planner_locked_action", { action, sport });
      setUnlockReason(action);
      setUnlockOpen(true);
    },
    [sport],
  );

  const rotateSelected = useCallback(
    (delta: number) => {
      if (!selectedId) return;
      setObstacles((items) =>
        items.map((it) => (it.id === selectedId ? { ...it, rotation: ((it.rotation + delta) % 360 + 360) % 360 } : it)),
      );
    },
    [selectedId],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setObstacles((items) => items.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    if (!MARKER_TYPES.has(selected.type) && reachedLimit) {
      setUnlockReason("threshold");
      setUnlockOpen(true);
      return;
    }
    if (MARKER_TYPES.has(selected.type)) return;
    setObstacles((items) => {
      const clone: FreeObstacle = {
        ...selected,
        id: `${selected.type}-${Date.now().toString(36)}-dup`,
        x: clampPercent(selected.x + 6),
        y: clampPercent(selected.y + 6),
        number: obstacleCountExcludingMarkers(items) + 1,
      };
      return [...items, clone];
    });
  }, [selected, reachedLimit]);

  const setNumber = useCallback(
    (delta: number) => {
      if (!selected || MARKER_TYPES.has(selected.type)) return;
      setObstacles((items) =>
        items.map((it) => (it.id === selected.id ? { ...it, number: Math.max(1, (it.number ?? 1) + delta) } : it)),
      );
    },
    [selected],
  );

  const moveSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedId) return;
      setObstacles((items) =>
        items.map((it) => (it.id === selectedId ? { ...it, x: clampPercent(it.x + dx), y: clampPercent(it.y + dy) } : it)),
      );
    },
    [selectedId],
  );

  const resetCourse = useCallback(() => {
    setObstacles(demoFor(sport));
    setSelectedId(null);
    setUnlockOpen(false);
  }, [sport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowUp") { e.preventDefault(); moveSelected(0, -1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveSelected(0, 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); moveSelected(-1, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); moveSelected(1, 0); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelected(); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); rotateSelected(15); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, moveSelected, removeSelected, rotateSelected]);

  // ---------- Pointer drag on canvas ----------

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean; type: ObstacleType } | null>(null);

  const onObstaclePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, obstacle: FreeObstacle) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const pt = clientPointToPercent(rect, e.clientX, e.clientY);
      dragRef.current = {
        id: obstacle.id,
        offsetX: pt.x - obstacle.x,
        offsetY: pt.y - obstacle.y,
        moved: false,
        type: obstacle.type,
      };
      setSelectedId(obstacle.id);
    },
    [],
  );

  const onCanvasPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = clientPointToPercent(rect, e.clientX, e.clientY);
    const nextX = clampPercent(pt.x - drag.offsetX);
    const nextY = clampPercent(pt.y - drag.offsetY);
    setObstacles((items) => {
      let changed = false;
      const mapped = items.map((it) => {
        if (it.id !== drag.id) return it;
        if (Math.abs(it.x - nextX) < 0.05 && Math.abs(it.y - nextY) < 0.05) return it;
        changed = true;
        return { ...it, x: nextX, y: nextY };
      });
      if (changed) drag.moved = true;
      return mapped;
    });
  }, []);

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
      if (drag.moved) {
        trackGrowthEvent("free_planner_obstacle_moved", { sport, obstacle_type: drag.type });
      }
      dragRef.current = null;
    },
    [sport],
  );

  // ---------- Copy ----------

  const heading =
    sport === "hoopers" ? "Gratis banbyggare för hoopers" : "Gratis banbyggare för agility";
  const metaTitle =
    sport === "hoopers"
      ? "Gratis banbyggare för hoopers | AgilityManager"
      : "Gratis banbyggare för agility | AgilityManager";
  const metaDesc =
    sport === "hoopers"
      ? "Rita en hoopersbana direkt i webbläsaren. Dra hoops, tunnor, tunnel och dirigeringszoner – fungerar på mobil, inget konto krävs."
      : "Rita en agilitybana direkt i webbläsaren. Dra hopp, tunnel, slalom och kontakthinder – fungerar på mobil, inget konto krävs.";

  const paletteDefs = getObstaclesFor(sport);

  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
        <meta property="og:title" content={heading} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content="https://agilitymanager.se/banplanerare" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg sm:text-xl font-semibold tracking-tight truncate">
            Agility<span className="text-primary">Manager</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={loginUrl}
              onClick={() => trackGrowthEvent("free_planner_signup_clicked", { placement: "header_login", sport })}
              className="hidden sm:inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              Logga in
            </Link>
            <Link
              to={signupUrl}
              onClick={() => trackGrowthEvent("free_planner_signup_clicked", { placement: "header_signup", sport })}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Skapa konto
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-32 lg:pb-16">
        {/* Hero + sport toggle */}
        <section className="max-w-6xl mx-auto px-4 sm:px-5 pt-6 sm:pt-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-medium text-primary">
              Gratis · ingen inloggning krävs för att testa
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mt-3">
              {heading}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-3">
              Skissa en bana direkt i webbläsaren. Dra hindren, numrera och rotera – fungerar smidigt på mobil.
              Skapa konto när du vill exportera, spara och validera i den fulla banbyggaren.
            </p>
            <div className="mt-4 inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="Välj sport">
              <button
                type="button"
                role="tab"
                aria-selected={sport === "agility"}
                onClick={() => switchSport("agility")}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-medium transition-colors",
                  sport === "agility" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Agility
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sport === "hoopers"}
                onClick={() => switchSport("hoopers")}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-medium transition-colors",
                  sport === "hoopers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Hoopers
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-2">
              <CheckCircle2 size={13} className="text-primary" /> Fungerar på mobil · touchdragning · inget konto krävs
            </p>
          </div>
        </section>

        {/* Editor: mobile-first (canvas → dock; palette in bottom sheet), desktop 3-col */}
        <section className="max-w-6xl mx-auto px-4 sm:px-5 mt-6 lg:mt-8 grid gap-4 lg:grid-cols-[240px_1fr_260px]">
          {/* Desktop palette */}
          <aside className="hidden lg:block rounded-3xl border border-border bg-card p-4 h-fit">
            <h2 className="font-display text-lg">Lägg till hinder</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {competitionCount} av {FREE_MAX_COMPETITION_OBSTACLES} tävlingshinder · start/mål räknas inte
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {paletteDefs.map((def) => (
                <PaletteButton key={def.type} def={def} onClick={() => addObstacle(def.type)} />
              ))}
            </div>
            {reachedLimit && (
              <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                Gratisläget täcker {FREE_MAX_COMPETITION_OBSTACLES} tävlingshinder. Skapa konto för fler.
              </div>
            )}
          </aside>

          {/* Canvas */}
          <div className="rounded-[1.75rem] border border-border bg-card p-2 sm:p-3 shadow-xl shadow-foreground/5">
            <div className="flex items-center justify-between px-2 pt-1 pb-2 text-xs text-muted-foreground lg:hidden">
              <span className="inline-flex items-center gap-1">
                <MousePointer2 size={12} /> Dra hindren · tryck för att välja
              </span>
              <span className="font-medium text-foreground">
                {competitionCount}/{FREE_MAX_COMPETITION_OBSTACLES}
              </span>
            </div>
            <div
              ref={canvasRef}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
              className={cn(
                "relative w-full overflow-hidden rounded-2xl border border-border bg-muted select-none",
                "aspect-[3/4] sm:aspect-[4/3] lg:aspect-[3/2]",
              )}
              style={{ touchAction: "none" }}
              aria-label="Banarea"
            >
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, hsl(var(--foreground) / 0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
                  backgroundSize: "8% 10%",
                }}
              />
              <div className="absolute left-3 top-3 rounded-full bg-card/85 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-muted-foreground border border-border">
                {sport === "hoopers" ? "Hoopers demo" : "20 × 30 m demo"}
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-card/85 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-primary border border-border">
                Gratis
              </div>

              {obstacles.map((obs) => {
                const def = defFor(sport, obs.type);
                const isSelected = obs.id === selectedId;
                const isMarker = MARKER_TYPES.has(obs.type);
                return (
                  <button
                    key={obs.id}
                    type="button"
                    onPointerDown={(e) => onObstaclePointerDown(e, obs)}
                    className={cn(
                      "absolute grid place-items-center rounded-xl transition-shadow",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    )}
                    style={{
                      left: `${obs.x}%`,
                      top: `${obs.y}%`,
                      transform: `translate(-50%, -50%) rotate(${obs.rotation}deg)`,
                      touchAction: "none",
                    }}
                    aria-label={def.label}
                    aria-pressed={isSelected}
                  >
                    {/* Transparent 44px+ hit target */}
                    <span
                      className="absolute rounded-2xl"
                      style={{
                        minWidth: 44,
                        minHeight: 44,
                        width: `max(44px, ${def.widthPct * 1.3}%)`,
                        height: `max(44px, ${def.heightPct * 1.3}%)`,
                      }}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "relative grid place-items-center rounded-xl border bg-card shadow-sm",
                        isSelected ? "border-primary ring-2 ring-primary/25" : "border-border",
                      )}
                      style={{
                        width: "clamp(34px, 8vw, 56px)",
                        height: "clamp(34px, 8vw, 56px)",
                      }}
                    >
                      <FreeObstacleGlyph type={def.glyph} size={26} />
                      {!isMarker && obs.number != null && (
                        <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center shadow">
                          {obs.number}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              <div className="absolute left-3 bottom-3 rounded-full bg-card/90 border border-border px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-primary shadow-sm inline-flex items-center gap-1.5">
                <CheckCircle2 size={11} /> Gratis demo
              </div>
              <div className="absolute right-3 bottom-3 rounded-full bg-card/85 border border-border px-2.5 py-1 text-[10px] sm:text-xs text-muted-foreground shadow-sm">
                {WATERMARK}
              </div>
            </div>
          </div>

          {/* Desktop right panel */}
          <aside className="hidden lg:block rounded-3xl border border-border bg-card p-4 h-fit space-y-4">
            <div>
              <h2 className="font-display text-lg">Valt hinder</h2>
              {selected ? (
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {defFor(sport, selected.type).label}
                  {selected.number != null && ` · #${selected.number}`}
                  {" · "}rotation {Math.round(selected.rotation)}°
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Klicka eller dra ett hinder på banan.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ToolButton onClick={() => rotateSelected(-15)} disabled={!selected}>
                <RotateCcw size={14} /> −15°
              </ToolButton>
              <ToolButton onClick={() => rotateSelected(15)} disabled={!selected}>
                <RotateCcw size={14} className="-scale-x-100" /> +15°
              </ToolButton>
              <ToolButton onClick={() => setNumber(-1)} disabled={!selected || MARKER_TYPES.has(selected.type)}>
                # −1
              </ToolButton>
              <ToolButton onClick={() => setNumber(1)} disabled={!selected || MARKER_TYPES.has(selected.type)}>
                # +1
              </ToolButton>
              <ToolButton onClick={duplicateSelected} disabled={!selected || MARKER_TYPES.has(selected.type)}>
                <Copy size={14} /> Duplicera
              </ToolButton>
              <ToolButton onClick={removeSelected} disabled={!selected} className="text-destructive border-destructive/30 bg-destructive/10">
                <Trash2 size={14} /> Ta bort
              </ToolButton>
            </div>
            <button
              type="button"
              onClick={resetCourse}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium hover:bg-muted"
            >
              Återställ demo
            </button>
            <div className="grid grid-cols-2 gap-2">
              <LockedActionButton onClick={() => handleLockedAction("save")}><Save size={14} /> Spara</LockedActionButton>
              <LockedActionButton onClick={() => handleLockedAction("export")}><FileDown size={14} /> PDF</LockedActionButton>
              <LockedActionButton onClick={() => handleLockedAction("validate")}><CheckCircle2 size={14} /> Validera</LockedActionButton>
              <LockedActionButton onClick={() => handleLockedAction("3d")}><Sparkles size={14} /> 3D</LockedActionButton>
            </div>
          </aside>
        </section>

        {/* Value / journey copy */}
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-14">
          <div className="rounded-[2rem] bg-foreground text-background p-5 sm:p-8 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl" aria-hidden />
            <div className="relative grid lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-8 items-center">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-background/50 font-semibold">
                  Från skiss till riktigt träningspass
                </div>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl mt-3">
                  Gör skissen till ett riktigt träningspass.
                </h2>
                <p className="text-background/70 mt-3 max-w-lg text-sm sm:text-base">
                  I fulla banbyggaren får du exakta mått, förhandskontroll av vanliga banproblem, 3D-vy för att gå banan,
                  PDF för att bygga i hallen och molnsparning kopplad till träningsloggen. Förhandskontrollen är ett stöd,
                  inte ett officiellt regelutlåtande.
                </p>
                <Link
                  to={signupUrl}
                  onClick={() => trackGrowthEvent("free_planner_signup_clicked", { placement: "value_section", sport })}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-background px-5 text-sm font-medium text-foreground hover:bg-background/90"
                >
                  Fortsätt i fulla banbyggaren <ArrowRight size={15} className="ml-2" />
                </Link>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Exakta mått", "Meter och avstånd, inte procent."],
                  ["Banförhandskontroll", "Fångar vanliga problem innan träningen."],
                  ["3D & gå banan", "Se linjer och avstånd i 3D."],
                  ["Bygg-PDF", "Ta med utskrift till hallen."],
                  ["Molnsparning", "Alla banor följer med."],
                  ["Träningslogg", "Koppla bana till pass och statistik."],
                ].map(([title, text]) => (
                  <li key={title} className="rounded-2xl border border-background/10 bg-background/[0.06] p-4">
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-xs text-background/70 mt-1">{text}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-5 pb-16 prose prose-stone">
          {sport === "hoopers" ? (
            <>
              <h2>Rita hoopersbana online gratis</h2>
              <p>
                Skissa en hoopersbana med hoops, tunnor, tunnel, staket och markerade dirigeringszoner. Använd den för att
                planera ett träningspass eller visa en kombination för en tränarkollega.
              </p>
            </>
          ) : (
            <>
              <h2>Rita agilitybana online gratis</h2>
              <p>
                Skissa en agilitybana med hopp, tunnel, slalom, kontakthinder och långhopp. Verktyget passar för att
                snabbt planera en övning eller ett kortare pass innan du bygger på planen.
              </p>
            </>
          )}
          <p>
            Gratisversionen är medvetet enkel – tillräcklig för att testa idén. När du vill ha exakta mått,
            förhandskontroll, 3D, PDF och sparning skapar du ett konto och fortsätter i den fulla banbyggaren.
          </p>
        </section>
      </main>

      {/* Mobile bottom dock */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-6xl mx-auto px-3 pt-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground px-1 pb-2">
            <span className="truncate">
              {selected ? defFor(sport, selected.type).label : "Inget hinder valt"}
            </span>
            <span className="font-medium text-foreground shrink-0">
              {competitionCount}/{FREE_MAX_COMPETITION_OBSTACLES}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            <DockButton onClick={() => setAddSheetOpen(true)} label="Lägg till">
              <Plus size={18} />
            </DockButton>
            <DockButton onClick={() => {}} label="Flytta" disabled>
              <Move size={18} />
            </DockButton>
            <DockButton onClick={() => rotateSelected(15)} label="Rotera" disabled={!selected}>
              <RotateCcw size={18} />
            </DockButton>
            <DockButton
              onClick={removeSelected}
              label="Ta bort"
              disabled={!selected}
              className="text-destructive"
            >
              <Trash2 size={18} />
            </DockButton>
            <DockButton onClick={resetCourse} label="Återställ">
              <RotateCcw size={18} className="-scale-x-100" />
            </DockButton>
            <DockButton onClick={() => handleLockedAction("save")} label="Spara" className="text-primary">
              <Save size={18} />
            </DockButton>
          </div>
        </div>
      </div>

      {/* Mobile selected sheet */}
      {selected && (
        <div className="lg:hidden fixed inset-x-0 z-30" style={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }}>
          <div className="mx-3 rounded-2xl border border-border bg-card shadow-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {defFor(sport, selected.type).label}
                  {selected.number != null && ` · #${selected.number}`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  rotation {Math.round(selected.rotation)}°
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
                aria-label="Avmarkera"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <ToolButton onClick={() => rotateSelected(-15)}>−15°</ToolButton>
              <ToolButton onClick={() => rotateSelected(15)}>+15°</ToolButton>
              <ToolButton onClick={() => setNumber(-1)} disabled={MARKER_TYPES.has(selected.type)}># −1</ToolButton>
              <ToolButton onClick={() => setNumber(1)} disabled={MARKER_TYPES.has(selected.type)}># +1</ToolButton>
              <ToolButton onClick={duplicateSelected} disabled={MARKER_TYPES.has(selected.type)} className="col-span-2">
                <Copy size={14} /> Duplicera
              </ToolButton>
              <ToolButton onClick={removeSelected} className="col-span-2 text-destructive border-destructive/30 bg-destructive/10">
                <Trash2 size={14} /> Ta bort
              </ToolButton>
            </div>
          </div>
        </div>
      )}

      {/* Add-obstacle bottom sheet */}
      {addSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setAddSheetOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card border-t border-border p-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-lg">Lägg till hinder</div>
                <div className="text-xs text-muted-foreground">
                  {competitionCount}/{FREE_MAX_COMPETITION_OBSTACLES} tävlingshinder · start/mål räknas inte
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddSheetOpen(false)}
                className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted"
                aria-label="Stäng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {paletteDefs.map((def) => (
                <PaletteButton key={def.type} def={def} onClick={() => addObstacle(def.type)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Value unlock dialog */}
      {unlockOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setUnlockOpen(false)} />
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 max-w-md sm:w-full">
            <div className="rounded-3xl bg-card border border-border p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Lock size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl">Gör skissen till ett riktigt träningspass.</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    I fulla banbyggaren får du <strong className="text-foreground">exakta mått</strong>,
                    <strong className="text-foreground"> förhandskontroll</strong> av vanliga banproblem,
                    <strong className="text-foreground"> 3D-vy</strong>, <strong className="text-foreground">bygg-PDF</strong>,
                    <strong className="text-foreground"> molnsparning</strong> och koppling till träningsloggen.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Förhandskontrollen är ett stöd – den ersätter inte officiellt regelverk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUnlockOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted shrink-0"
                  aria-label="Stäng"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                <Link
                  to={signupUrl}
                  onClick={() =>
                    trackGrowthEvent("free_planner_signup_clicked", {
                      placement: "unlock_dialog",
                      action: unlockReason ?? "threshold",
                      sport,
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Fortsätt i fulla banbyggaren <ArrowRight size={15} className="ml-2" />
                </Link>
                <Link
                  to={loginUrl}
                  onClick={() =>
                    trackGrowthEvent("free_planner_signup_clicked", {
                      placement: "unlock_dialog_login",
                      action: unlockReason ?? "threshold",
                      sport,
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-medium hover:bg-muted"
                >
                  Jag har redan konto
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Small components ----------

function PaletteButton({ def, onClick }: { def: ObstacleDef; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-2xl border border-border bg-background p-2.5 text-left hover:border-primary/40 hover:bg-muted transition-colors flex items-center gap-2"
    >
      <FreeObstacleGlyph type={def.glyph} size={24} />
      <span className="text-xs font-medium truncate">{def.label}</span>
    </button>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

function LockedActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-medium text-foreground hover:bg-primary/10"
    >
      {children}
    </button>
  );
}

function DockButton({
  children,
  onClick,
  label,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-xl bg-card hover:bg-muted disabled:opacity-40 disabled:pointer-events-none",
        "min-h-[52px] px-1 py-1.5",
        className,
      )}
    >
      {children}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
