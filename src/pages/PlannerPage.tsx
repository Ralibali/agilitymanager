import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft, Copy, Download, Eraser, Grid2x2, Link2, MousePointerClick,
  Redo2, RotateCcw, RotateCw, Share2, Spline, Trash2, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import {
  OBSTACLES, SAMPLE_COURSES, smoothPath, pathLength, uid,
  type ObstacleType, type PlacedObstacle, type Sport,
} from "@/lib/course";
import { ObstacleGlyph } from "@/components/ObstacleGlyph";
import { Logo } from "@/components/SiteNav";
import { EmailCapture, isSubscribed } from "@/components/EmailCapture";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ── Delningslänkar: hela banan kodad i URL:en ───────────────────────────────

function encodeCourse(d: Draft): string {
  const json = JSON.stringify({ sport: d.sport, name: d.name, obstacles: d.obstacles });
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeCourse(s: string): Draft | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const d = JSON.parse(json) as Draft;
    if (!d || !Array.isArray(d.obstacles)) return null;
    return { sport: d.sport === "hoopers" ? "hoopers" : "agility", name: String(d.name || "Delad bana"), obstacles: d.obstacles };
  } catch {
    return null;
  }
}

const FIELDS: Record<Sport, [number, number]> = { agility: [40, 25], hoopers: [36, 22] };
const STORAGE_KEY = "am-redesign-planner-v1";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snap = (v: number) => Math.round(v * 4) / 4; // 0,25 m-snap

interface Draft {
  sport: Sport;
  name: string;
  obstacles: PlacedObstacle[];
}

function loadInitial(search: URLSearchParams): Draft {
  const shared = search.get("bana");
  if (shared) {
    const d = decodeCourse(shared);
    if (d) return d;
  }
  const templateSlug = search.get("template");
  if (templateSlug) {
    const t = SAMPLE_COURSES.find((c) => c.slug === templateSlug);
    if (t) {
      return {
        sport: t.sport,
        name: t.name,
        obstacles: t.obstacles.map((ob) => ({ ...ob, id: uid() })),
      };
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d && Array.isArray(d.obstacles)) return d;
    }
  } catch {
    /* ignorera */
  }
  const sport: Sport = search.get("sport") === "hoopers" ? "hoopers" : "agility";
  return { sport, name: "Min bana", obstacles: [] };
}

export default function PlannerPage() {
  const [search] = useSearchParams();
  const [draft, setDraft] = useState<Draft>(() => loadInitial(search));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<ObstacleType | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [showLine, setShowLine] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [past, setPast] = useState<PlacedObstacle[][]>([]);
  const [future, setFuture] = useState<PlacedObstacle[][]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [, forceShareRefresh] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean; start: PlacedObstacle[] } | null>(null);
  const rotateRef = useRef<{ id: string; start: PlacedObstacle[] } | null>(null);

  const { sport, name, obstacles } = draft;
  const [w, h] = FIELDS[sport];
  const palette = OBSTACLES.filter((d) => d.sports.includes(sport));
  const templates = SAMPLE_COURSES.filter((c) => c.sport === sport);

  const setObstacles = useCallback(
    (next: PlacedObstacle[], commit = true) => {
      if (commit) {
        setPast((p) => [...p.slice(-49), obstacles]);
        setFuture([]);
      }
      setDraft((d) => ({ ...d, obstacles: next }));
    },
    [obstacles]
  );

  // Autosparning (lokalt i webbläsaren)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSavedFlash(true);
        const f = setTimeout(() => setSavedFlash(false), 1600);
        return () => clearTimeout(f);
      } catch {
        /* fullt/localStorage avstängt */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [draft]);

  const toField = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const vw = w / zoom;
      const vh = h / zoom;
      const vx = (w - vw) / 2;
      const vy = (h - vh) / 2;
      return {
        x: clamp(vx + ((clientX - rect.left) / rect.width) * vw, 0, w),
        y: clamp(vy + ((clientY - rect.top) / rect.height) * vh, 0, h),
      };
    },
    [w, h, zoom]
  );

  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [obstacles, ...f]);
    setObstacles(past[past.length - 1], false);
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, obstacles]);
    setObstacles(future[0], false);
    setFuture((f) => f.slice(1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlacing(null);
        setSelectedId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT") return;
        setObstacles(obstacles.filter((ob) => ob.id !== selectedId));
        setSelectedId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Pointer-hantering ───────────────────────────────────────

  const onSvgPointerDown = (e: React.PointerEvent) => {
    const pt = toField(e.clientX, e.clientY);
    if (placing) {
      const ob: PlacedObstacle = { id: uid(), type: placing, x: snap(pt.x), y: snap(pt.y), rot: 0 };
      setObstacles([...obstacles, ob]);
      setSelectedId(ob.id);
      return;
    }
    setSelectedId(null);
  };

  const onObstaclePointerDown = (e: React.PointerEvent, ob: PlacedObstacle) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pt = toField(e.clientX, e.clientY);
    dragRef.current = { id: ob.id, dx: ob.x - pt.x, dy: ob.y - pt.y, moved: false, start: obstacles };
    setSelectedId(ob.id);
    setPlacing(null);
  };

  const onRotatePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    rotateRef.current = { id, start: obstacles };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pt = toField(e.clientX, e.clientY);
    if (placing) setGhost(pt);
    if (dragRef.current) {
      const { id, dx, dy } = dragRef.current;
      dragRef.current.moved = true;
      const nx = snap(clamp(pt.x + dx, 0.5, w - 0.5));
      const ny = snap(clamp(pt.y + dy, 0.5, h - 0.5));
      setDraft((d) => ({
        ...d,
        obstacles: d.obstacles.map((ob) => (ob.id === id ? { ...ob, x: nx, y: ny } : ob)),
      }));
    }
    if (rotateRef.current) {
      const { id } = rotateRef.current;
      setDraft((d) => ({
        ...d,
        obstacles: d.obstacles.map((ob) => {
          if (ob.id !== id) return ob;
          const ang = (Math.atan2(pt.y - ob.y, pt.x - ob.x) * 180) / Math.PI + 90;
          const snapped = Math.round(ang / 15) * 15;
          return { ...ob, rot: ((snapped % 360) + 360) % 360 };
        }),
      }));
    }
  };

  const onPointerUp = () => {
    if (dragRef.current?.moved) {
      const start = dragRef.current.start;
      setPast((p) => [...p.slice(-49), start]);
      setFuture([]);
    }
    if (rotateRef.current) {
      const start = rotateRef.current.start;
      if (JSON.stringify(start) !== JSON.stringify(draftRef.current.obstacles)) {
        setPast((p) => [...p.slice(-49), start]);
        setFuture([]);
      }
    }
    dragRef.current = null;
    rotateRef.current = null;
  };

  // håll en färsk referens till draft för pointer-up-hantering
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const selected = obstacles.find((ob) => ob.id === selectedId) ?? null;

  const rotateBy = (delta: number) => {
    if (!selected) return;
    setObstacles(
      obstacles.map((ob) =>
        ob.id === selected.id ? { ...ob, rot: (((ob.rot + delta) % 360) + 360) % 360 } : ob
      )
    );
  };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy = { ...selected, id: uid(), x: clamp(selected.x + 2, 1, w - 1), y: clamp(selected.y + 2, 1, h - 1) };
    setObstacles([...obstacles, copy]);
    setSelectedId(copy.id);
  };
  const deleteSelected = () => {
    if (!selected) return;
    setObstacles(obstacles.filter((ob) => ob.id !== selected.id));
    setSelectedId(null);
  };

  const linePoints = useMemo(() => obstacles.map((ob) => ({ x: ob.x, y: ob.y })), [obstacles]);
  const linePath = useMemo(() => smoothPath(linePoints), [linePoints]);
  const totalLength = useMemo(() => pathLength(linePoints), [linePoints]);

  const loadTemplate = (slug: string) => {
    const t = SAMPLE_COURSES.find((c) => c.slug === slug);
    if (!t) return;
    setDraft({ sport: t.sport, name: t.name, obstacles: t.obstacles.map((ob) => ({ ...ob, id: uid() })) });
    setPast([]);
    setFuture([]);
    setSelectedId(null);
  };

  const switchSport = (s: Sport) => {
    const [nw, nh] = FIELDS[s];
    setDraft((d) => ({
      ...d,
      sport: s,
      obstacles: d.obstacles.map((ob) => ({ ...ob, x: clamp(ob.x, 1, nw - 1), y: clamp(ob.y, 1, nh - 1) })),
    }));
    setSelectedId(null);
  };

  const exportPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
    clone.setAttribute("width", String(w * 60));
    clone.setAttribute("height", String(h * 60));
    clone.querySelectorAll("[data-ui]").forEach((n) => n.remove());
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w * 60;
      canvas.height = h * 60;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FCFAF4";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        a.download = `${name || "bana"}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, "image/png");
    };
    img.src = url;
  };

  const openShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?bana=${encodeCourse(draft)}`;
    setShareUrl(url);
    setCopied(false);
    setShareOpen(true);
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const vw = w / zoom;
  const vh = h / zoom;

  const ToolButton = ({
    onClick, active, label, children, disabled,
  }: {
    onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-11 w-11 place-items-center rounded-xl border-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "border-ink bg-tang text-ink shadow-hard-sm" : "border-ink/15 bg-paper text-ink/70 hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      {/* Topprad */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-3 px-3 sm:px-5">
          <Link
            to="/"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper transition-colors hover:bg-cream"
            aria-label="Tillbaka till startsidan"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="hidden md:block">
            <Logo />
          </div>
          <div className="mx-1 hidden h-8 w-px bg-ink/15 md:block" />
          <input
            value={name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="min-w-0 flex-1 rounded-xl border-2 border-transparent bg-transparent px-3 py-2 font-display text-2xl tracking-wide outline-none transition-colors focus:border-ink md:max-w-xs"
            aria-label="Banans namn"
          />
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors sm:inline-flex ${
                savedFlash ? "bg-forest text-paper" : "bg-cream text-ink/50"
              }`}
            >
              {savedFlash ? "Sparad ✓" : "Autosparas lokalt"}
            </span>
            <button
              onClick={openShare}
              disabled={!obstacles.length}
              className="pressable shadow-hard-sm inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 text-sm font-bold text-ink disabled:opacity-40 sm:px-5"
            >
              <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Dela bana</span>
            </button>
            <button
              onClick={exportPNG}
              className="pressable shadow-hard-sm inline-flex h-11 items-center gap-2 rounded-full bg-tang px-4 text-sm font-bold text-ink sm:px-5"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportera PNG</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[110rem] flex-1 flex-col lg:flex-row">
        {/* ── Sidopanel (desktop) ── */}
        <aside className="hidden w-72 shrink-0 flex-col gap-5 border-r-2 border-ink/10 p-5 lg:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Sport</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["agility", "hoopers"] as Sport[]).map((s) => (
                <button
                  key={s}
                  onClick={() => switchSport(s)}
                  className={`rounded-xl border-2 px-3 py-2.5 font-display text-lg tracking-wide transition-all ${
                    sport === s ? "border-ink bg-forest text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                  }`}
                >
                  {s === "agility" ? "Agility" : "Hoopers"}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">
              Hinder {placing ? "· klicka på planen" : ""}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {palette.map((def) => (
                <button
                  key={def.type}
                  onClick={() => setPlacing(placing === def.type ? null : def.type)}
                  className={`group flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all ${
                    placing === def.type
                      ? "border-ink bg-tang shadow-hard-sm"
                      : "border-ink/15 bg-paper hover:-translate-y-0.5 hover:border-ink"
                  }`}
                >
                  <svg viewBox="-3.4 -2.2 6.8 4.4" className="h-10 w-full">
                    <ObstacleGlyph type={def.type} sw={0.16} stroke={placing === def.type ? "#161812" : "#006937"} />
                  </svg>
                  <span className="text-[0.72rem] font-bold uppercase tracking-wider">{def.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Mallar</p>
            <div className="mt-2 space-y-2">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => loadTemplate(t.slug)}
                  className="w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-2.5 text-left transition-all hover:border-ink"
                >
                  <b className="block text-sm">{t.name}</b>
                  <span className="text-xs font-semibold text-ink/50">{t.level}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Arbetsyta ── */}
        <main className="flex min-w-0 flex-1 flex-col p-3 pb-40 sm:p-5 lg:pb-5">
          {/* Verktygsrad */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ToolButton onClick={undo} disabled={!past.length} label="Ångra (Ctrl+Z)">
              <Undo2 className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={redo} disabled={!future.length} label="Gör om (Ctrl+Shift+Z)">
              <Redo2 className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1 h-8 w-px bg-ink/15" />
            <ToolButton onClick={() => setShowLine(!showLine)} active={showLine} label="Visa/dölj banlinje">
              <Spline className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={() => setShowNumbers(!showNumbers)} active={showNumbers} label="Visa/dölj nummer">
              <span className="font-display text-lg leading-none">1</span>
            </ToolButton>
            <ToolButton onClick={() => setShowGrid(!showGrid)} active={showGrid} label="Visa/dölj rutnät">
              <Grid2x2 className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1 h-8 w-px bg-ink/15" />
            <ToolButton onClick={() => setZoom((z) => clamp(z - 0.25, 1, 2.25))} disabled={zoom <= 1} label="Zooma ut">
              <ZoomOut className="h-5 w-5" />
            </ToolButton>
            <span className="w-12 text-center text-sm font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
            <ToolButton onClick={() => setZoom((z) => clamp(z + 0.25, 1, 2.25))} disabled={zoom >= 2.25} label="Zooma in">
              <ZoomIn className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1 h-8 w-px bg-ink/15" />
            <ToolButton
              onClick={() => {
                setObstacles([]);
                setSelectedId(null);
              }}
              disabled={!obstacles.length}
              label="Rensa planen"
            >
              <Eraser className="h-5 w-5" />
            </ToolButton>
            <div className="ml-auto flex items-center gap-3 text-sm font-bold text-ink/60">
              <span className="rounded-full bg-cream px-3 py-1.5 tabular-nums">{obstacles.length} hinder</span>
              <span className="rounded-full bg-cream px-3 py-1.5 tabular-nums">{totalLength.toFixed(0)} m linje</span>
            </div>
          </div>

          {/* Planen */}
          <div className="relative flex-1 rounded-3xl border-2 border-ink bg-[#FCFAF4] p-2 shadow-hard sm:p-3">
            <svg
              ref={svgRef}
              viewBox={`${(w - vw) / 2} ${(h - vh) / 2} ${vw} ${vh}`}
              className="planner-svg h-full max-h-[calc(100vh-14rem)] w-full rounded-2xl lg:max-h-none"
              style={{ minHeight: "24rem" }}
              onPointerDown={onSvgPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={() => setGhost(null)}
            >
              <rect x="0" y="0" width={w} height={h} fill="#FCFAF4" />
              {showGrid && (
                <g>
                  {Array.from({ length: Math.floor(w) + 1 }).map((_, i) => (
                    <line key={`v${i}`} x1={i} y1="0" x2={i} y2={h} stroke="#161812" strokeOpacity={i % 5 === 0 ? 0.14 : 0.055} strokeWidth={i % 5 === 0 ? 0.07 : 0.03} />
                  ))}
                  {Array.from({ length: Math.floor(h) + 1 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i} x2={w} y2={i} stroke="#161812" strokeOpacity={i % 5 === 0 ? 0.14 : 0.055} strokeWidth={i % 5 === 0 ? 0.07 : 0.03} />
                  ))}
                </g>
              )}
              <rect x="0.18" y="0.18" width={w - 0.36} height={h - 0.36} fill="none" stroke="#161812" strokeOpacity="0.5" strokeWidth="0.12" />

              {/* metermarkeringar */}
              <g fontFamily="Archivo, sans-serif" fill="#161812" opacity="0.4">
                {Array.from({ length: Math.floor(w / 5) }).map((_, i) => (
                  <text key={`tx${i}`} x={(i + 1) * 5 - 0.9} y={h - 0.5} fontSize="0.8" fontWeight="700">
                    {(i + 1) * 5}m
                  </text>
                ))}
              </g>

              {/* banlinje */}
              {showLine && linePath && (
                <path d={linePath} fill="none" stroke="#FF6900" strokeWidth="0.28" strokeDasharray="0.85 0.6" strokeLinecap="round" opacity="0.95" />
              )}

              {/* hinder */}
              {obstacles.map((ob, i) => {
                const isSel = ob.id === selectedId;
                return (
                  <g
                    key={ob.id}
                    transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rot})`}
                    className="obstacle-drag"
                    onPointerDown={(e) => onObstaclePointerDown(e, ob)}
                  >
                    {/* generös truffyta */}
                    <circle r="2.1" fill="transparent" />
                    {isSel && (
                      <circle r="1.9" fill="none" stroke="#FF6900" strokeWidth="0.12" strokeDasharray="0.3 0.25" />
                    )}
                    <ObstacleGlyph type={ob.type} stroke={isSel ? "#E24C00" : "#161812"} sw={isSel ? 0.11 : 0.09} />
                    {showNumbers && (
                      <g transform={`rotate(${-ob.rot})`}>
                        <circle cx="1.35" cy="-1.35" r="0.66" fill={isSel ? "#FF6900" : "#161812"} stroke="#FCFAF4" strokeWidth="0.08" />
                        <text x="1.35" y="-1.06" textAnchor="middle" fontSize="0.82" fontWeight="800" fill={isSel ? "#161812" : "#F6F1E7"} fontFamily="Archivo, sans-serif">
                          {i + 1}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* rotationshandtag */}
              {selected && (
                <g transform={`translate(${selected.x} ${selected.y})`}>
                  <line x1="0" y1="0" x2="0" y2="-2.9" stroke="#FF6900" strokeWidth="0.09" strokeDasharray="0.22 0.18" transform={`rotate(${selected.rot})`} />
                  <g transform={`rotate(${selected.rot}) translate(0 -2.9)`}>
                    <circle
                      r="0.62"
                      fill="#FF6900"
                      stroke="#FCFAF4"
                      strokeWidth="0.12"
                      className="obstacle-drag"
                      onPointerDown={(e) => onRotatePointerDown(e, selected.id)}
                    />
                    <g transform="scale(0.028) translate(-12 -12)" pointerEvents="none">
                      <path
                        d="M20.5 3.5a9 9 0 1 1-8.5 6.2M20.5 3.5V9m0-5.5H15"
                        fill="none"
                        stroke="#161812"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </g>
                </g>
              )}

              {/* spök-hinder vid placering */}
              {placing && ghost && (
                <g transform={`translate(${snap(ghost.x)} ${snap(ghost.y)})`} opacity="0.55" pointerEvents="none">
                  <ObstacleGlyph type={placing} stroke="#006937" sw={0.1} />
                </g>
              )}
            </svg>

            {/* tom-läge-hint */}
            {obstacles.length === 0 && !placing && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="max-w-xs rounded-2xl border-2 border-dashed border-ink/30 bg-paper/90 px-6 py-5 text-center">
                  <MousePointerClick className="mx-auto h-7 w-7 text-forest" />
                  <p className="mt-2 font-bold">Tom plan — full frihet</p>
                  <p className="mt-1 text-sm text-ink/55">
                    Välj ett hinder ur paletten {`(eller ladda en mall)`} och klicka på planen för att placera det.
                  </p>
                </div>
              </div>
            )}

            {/* åtgärdsrad för valt hinder (desktop) */}
            {selected && (
              <div data-ui className="absolute left-1/2 top-5 hidden -translate-x-1/2 items-center gap-2 rounded-full border-2 border-ink bg-paper px-3 py-2 shadow-hard lg:flex">
                <span className="px-1 text-sm font-bold uppercase tracking-wider text-ink/60">
                  {OBSTACLES.find((d) => d.type === selected.type)?.label}
                </span>
                <button onClick={() => rotateBy(-45)} className="grid h-10 w-10 place-items-center rounded-full bg-cream transition-colors hover:bg-tang" title="Rotera vänster 45°" aria-label="Rotera vänster">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => rotateBy(45)} className="grid h-10 w-10 place-items-center rounded-full bg-cream transition-colors hover:bg-tang" title="Rotera höger 45°" aria-label="Rotera höger">
                  <RotateCw className="h-4 w-4" />
                </button>
                <button onClick={duplicateSelected} className="grid h-10 w-10 place-items-center rounded-full bg-cream transition-colors hover:bg-tang" title="Duplicera" aria-label="Duplicera">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={deleteSelected} className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ember transition-colors hover:bg-ember hover:text-paper" title="Ta bort" aria-label="Ta bort">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Mobil hinder-dock ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {selected && (
          <div className="flex items-center justify-center gap-2 border-b border-ink/10 px-4 py-2">
            <span className="text-sm font-bold uppercase tracking-wider text-ink/60">
              {OBSTACLES.find((d) => d.type === selected.type)?.label}
            </span>
            <button onClick={() => rotateBy(-45)} className="grid h-10 w-10 place-items-center rounded-full bg-cream" aria-label="Rotera vänster"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={() => rotateBy(45)} className="grid h-10 w-10 place-items-center rounded-full bg-cream" aria-label="Rotera höger"><RotateCw className="h-4 w-4" /></button>
            <button onClick={duplicateSelected} className="grid h-10 w-10 place-items-center rounded-full bg-cream" aria-label="Duplicera"><Copy className="h-4 w-4" /></button>
            <button onClick={deleteSelected} className="grid h-10 w-10 place-items-center rounded-full bg-ember text-paper" aria-label="Ta bort"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2.5">
          <div className="mr-1 flex shrink-0 flex-col justify-center gap-1">
            {(["agility", "hoopers"] as Sport[]).map((s) => (
              <button
                key={s}
                onClick={() => switchSport(s)}
                className={`rounded-lg px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider ${
                  sport === s ? "bg-forest text-paper" : "bg-cream text-ink/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {palette.map((def) => (
            <button
              key={def.type}
              onClick={() => setPlacing(placing === def.type ? null : def.type)}
              className={`flex w-[4.6rem] shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 p-1.5 ${
                placing === def.type ? "border-ink bg-tang" : "border-ink/15 bg-paper"
              }`}
            >
              <svg viewBox="-3.4 -2.2 6.8 4.4" className="h-8 w-full">
                <ObstacleGlyph type={def.type} sw={0.16} stroke={placing === def.type ? "#161812" : "#006937"} />
              </svg>
              <span className="text-[0.6rem] font-bold uppercase tracking-wide">{def.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* ── Dela-modal: e-post är enda "priset" ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-2 border-ink bg-paper p-7 shadow-hard">
          <DialogHeader>
            <DialogTitle className="font-display text-4xl tracking-wide text-ink">
              Dela din bana
            </DialogTitle>
            <DialogDescription className="text-ink/60">
              Banan är gratis att rita — och gratis att dela. Det enda vi ber om är
              din e-post, så vi kan skicka nya banor och träningstips.
            </DialogDescription>
          </DialogHeader>

          {isSubscribed() ? (
            <div className="mt-2">
              <p className="text-sm font-bold uppercase tracking-wider text-forest">
                Din delningslänk är klar
              </p>
              <div className="mt-2 flex items-stretch gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-[#FCFAF4] px-4 py-3 text-sm font-medium text-ink/70"
                  aria-label="Delningslänk"
                />
                <button
                  onClick={copyShare}
                  className={`pressable shadow-hard-sm inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-ink px-4 font-bold ${
                    copied ? "bg-forest text-paper" : "bg-tang text-ink"
                  }`}
                >
                  {copied ? <><Link2 className="h-4 w-4" /> Kopierad!</> : <><Copy className="h-4 w-4" /> Kopiera</>}
                </button>
              </div>
              <p className="mt-3 text-sm text-ink/55">
                Den som öppnar länken får din bana direkt i sin egen planerare — gratis, utan konto.
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <EmailCapture
                compact
                onDone={() => forceShareRefresh((x) => x + 1)}
              />
              {isSubscribed() && (
                <div className="mt-4">
                  <p className="text-sm font-bold uppercase tracking-wider text-forest">Tack! Här är din länk</p>
                  <div className="mt-2 flex items-stretch gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.target.select()}
                      className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-[#FCFAF4] px-4 py-3 text-sm font-medium text-ink/70"
                      aria-label="Delningslänk"
                    />
                    <button
                      onClick={copyShare}
                      className={`pressable shadow-hard-sm inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-ink px-4 font-bold ${
                        copied ? "bg-forest text-paper" : "bg-tang text-ink"
                      }`}
                    >
                      {copied ? "Kopierad!" : "Kopiera"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
