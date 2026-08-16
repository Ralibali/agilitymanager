import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft, BookOpen, Box, Check, ChevronDown, ChevronUp, Cloud, CloudCheck,
  Command, Copy, Download, Eraser, Footprints, Grid2x2, Keyboard, Link2, Loader2, Lock,
  Lightbulb, MessageSquare, MoreHorizontal, MousePointerClick, Play, Redo2, RotateCcw, RotateCw, Ruler,
  Share2, ShieldCheck, Spline, Trash2, Undo2, Unlock, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { uid, type PlacedObstacle, type Sport } from "@/lib/course";
import { ObstacleGlyph } from "@/components/ObstacleGlyph";
import { Logo } from "@/components/SiteNav";
import { EmailCapture, isSubscribed } from "@/components/EmailCapture";
import { AuthDialog } from "@/components/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  OBSTACLES_V2, CLASS_TEMPLATES, SIZE_CLASSES, ARENA_PRESETS,
  getObstacleDefV2, getClassTemplate,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey,
} from "@/features/course-planner-v2/config";
import {
  getRuleSet, getDefaultRuleSetIdForSport,
} from "@/features/course-planner-v2/rules";
import {
  validateCourse, computeCourseTimes, type ValidationIssue,
} from "@/features/course-planner-v2/validation";
import { buildCoursePath, toSvgPathD } from "@/features/course-planner-v2/pathSampling";
import { parseCourseJson } from "@/features/course-planner-v2/importJson";
import { instantiatePrebuilt, type PrebuiltCourse } from "@/features/course-planner-v2/templates";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import type { LibraryCourse } from "@/features/course-planner-v2/library";
import CourseLibraryDialog from "@/features/course-planner-v2/CourseLibraryDialog";
import CourseCommentsPanel from "@/features/course-planner-v2/CourseCommentsPanel";
import ClubShareDialog from "@/features/course-planner-v2/ClubShareDialog";
import { CommandPalette, type PaletteCommand } from "@/components/course-planner-v2/CommandPalette";
import { KeyboardShortcutsHelp } from "@/components/course-planner-v2/KeyboardShortcutsHelp";
import { CanvasRulers } from "@/components/course-planner-v2/CanvasRulers";
import { ExportMenu } from "@/components/course-planner-v2/ExportMenu";
import { RuleSetTrustBadge } from "@/components/course-planner-v2/RuleSetTrustBadge";
import {
  CoursePlaybackControls, CoursePlaybackOverlay, useCoursePlayback,
} from "@/components/course-planner-v2/CoursePlayback";
import LazyCoursePlanner3D from "@/features/course-planner/3d/LazyCoursePlanner3D";
import { mapAllToObstacle3D } from "@/features/course-planner-v2/to3DCoords";
import { makeQrDataUrl } from "@/lib/qrDataUrl";
import { usePlannerProfile } from "@/lib/plannerProfile";
import PlannerProfileDialog from "@/features/planner-social/PlannerProfileDialog";
import SaveShareDialog from "@/features/planner-social/SaveShareDialog";
import FeedbackDialog from "@/features/planner-social/FeedbackDialog";

// ── Banmodell (v2) ──────────────────────────────────────────────────────────

interface Draft {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: PlacedObstacle[];
  ruleSetId?: string;
}

const STORAGE_KEY = "am-redesign-planner-v2";
const CLOUD_ID_KEY = "am-redesign-planner-v2-cloud";
const SOCIAL_ID_KEY = "am-planner-shared-course";
const RULER_PX = 24;

/** Hinder som inte numreras i banordningen. */
const NON_COMPETING = new Set<ObstacleTypeV2>(["start", "finish", "number", "handler_zone"]);

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snapM = (v: number) => Math.round(v * 4) / 4; // 0,25 m-snap

/** Tilldela löpnummer 1..N till tävlande hinder i listordning. */
function withNumbers(obstacles: PlacedObstacle[]): PlacedObstacle[] {
  let n = 0;
  return obstacles.map((ob) =>
    NON_COMPETING.has(ob.type) ? { ...ob, number: undefined } : { ...ob, number: ++n }
  );
}

/** Normalisera en inläst bana: sortera tävlande hinder efter ev. sparat nummer. */
function normalizeObstacles(obstacles: PlacedObstacle[]): PlacedObstacle[] {
  const competing = obstacles.filter((ob) => !NON_COMPETING.has(ob.type));
  const rest = obstacles.filter((ob) => NON_COMPETING.has(ob.type));
  const allNumbered = competing.every((ob) => typeof ob.number === "number");
  const ordered = allNumbered
    ? [...competing].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    : competing;
  return [...ordered, ...rest].map((ob) => ({ ...ob, id: ob.id || uid() }));
}

function defaultDraft(sport: Sport): Draft {
  const tpl = CLASS_TEMPLATES.find((t) => t.sport === sport);
  return {
    name: "Min bana",
    sport,
    sizeClass: "L",
    arenaWidthM: tpl?.arenaWidthM ?? 30,
    arenaHeightM: tpl?.arenaHeightM ?? 40,
    classTemplate: null,
    obstacles: [],
    ruleSetId: getDefaultRuleSetIdForSport(sport),
  };
}

// ── Delningslänkar: hela banan kodad i URL:en ───────────────────────────────

function encodeCourse(d: Draft): string {
  const json = JSON.stringify({
    v: 2,
    name: d.name,
    sport: d.sport,
    sizeClass: d.sizeClass,
    arenaWidthM: d.arenaWidthM,
    arenaHeightM: d.arenaHeightM,
    classTemplate: d.classTemplate,
    obstacles: d.obstacles,
    ruleSetId: d.ruleSetId,
  });
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeCourse(s: string): Draft | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const raw = JSON.parse(json);
    if (!raw || !Array.isArray(raw.obstacles)) return null;
    const sport: Sport = raw.sport === "hoopers" ? "hoopers" : "agility";
    const base = defaultDraft(sport);
    const obstacles = normalizeObstacles(
      raw.obstacles.map((ob: PlacedObstacle & { rot?: number }) => ({
        ...ob,
        rotation: typeof ob.rotation === "number" ? ob.rotation : (ob.rot ?? 0),
      }))
    );
    return {
      ...base,
      name: String(raw.name || "Delad bana"),
      sizeClass: raw.sizeClass ?? base.sizeClass,
      arenaWidthM: Number(raw.arenaWidthM) || base.arenaWidthM,
      arenaHeightM: Number(raw.arenaHeightM) || base.arenaHeightM,
      classTemplate: raw.classTemplate ?? null,
      ruleSetId: raw.ruleSetId ?? base.ruleSetId,
      obstacles,
    };
  } catch {
    return null;
  }
}

function draftFromPrebuilt(p: PrebuiltCourse): Draft {
  return {
    name: p.label,
    sport: p.sport,
    sizeClass: p.defaultSize,
    arenaWidthM: p.arenaWidthM,
    arenaHeightM: p.arenaHeightM,
    classTemplate: p.classTemplate,
    obstacles: normalizeObstacles(instantiatePrebuilt(p)),
    ruleSetId: getDefaultRuleSetIdForSport(p.sport),
  };
}

function draftFromLibraryCourse(c: LibraryCourse): Draft | null {
  try {
    const data = c.course_data;
    if (!data || !Array.isArray(data.obstacles)) return null;
    const sport: Sport = data.sport === "hoopers" ? "hoopers" : "agility";
    const base = defaultDraft(sport);
    return {
      ...base,
      name: c.name || "Sparad bana",
      sizeClass: data.sizeClass ?? base.sizeClass,
      arenaWidthM: Number(data.arenaWidthM) || base.arenaWidthM,
      arenaHeightM: Number(data.arenaHeightM) || base.arenaHeightM,
      classTemplate: data.classTemplate ?? null,
      obstacles: normalizeObstacles(data.obstacles),
      ruleSetId: data.ruleSetId ?? base.ruleSetId,
    };
  } catch {
    return null;
  }
}

function loadInitial(search: URLSearchParams): Draft {
  const shared = search.get("bana");
  if (shared) {
    const d = decodeCourse(shared);
    if (d) return d;
  }
  const templateKey = search.get("template");
  if (templateKey) {
    const entry = COURSE_BANK.find((c) => c.key === templateKey);
    if (entry) return draftFromPrebuilt(entry);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d && Array.isArray(d.obstacles)) {
        return { ...defaultDraft(d.sport === "hoopers" ? "hoopers" : "agility"), ...d };
      }
    }
  } catch {
    /* ignorera */
  }
  return defaultDraft(search.get("sport") === "hoopers" ? "hoopers" : "agility");
}

export default function PlannerPage() {
  const [search] = useSearchParams();
  const { user } = useAuth();
  const { profile: plannerProfile } = usePlannerProfile();
  const [draft, setDraft] = useState<Draft>(() => loadInitial(search));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<ObstacleTypeV2 | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [showLine, setShowLine] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [past, setPast] = useState<PlacedObstacle[][]>([]);
  const [future, setFuture] = useState<PlacedObstacle[][]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [, forceShareRefresh] = useState(0);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [clubShareOpen, setClubShareOpen] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [view3D, setView3D] = useState<"view" | "walk" | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  // Vattenstämpeln är alltid på i gratisläget — export utan stämpel blir en betald funktion.
  const showWatermark = true;
  const [cloudId, setCloudId] = useState<string | null>(() => {
    try { return localStorage.getItem(CLOUD_ID_KEY); } catch { return null; }
  });
  const [savingCloud, setSavingCloud] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [saveShareOpen, setSaveShareOpen] = useState(false);
  const [pendingSaveShare, setPendingSaveShare] = useState(false);
  const [socialCourseId, setSocialCourseId] = useState<string | null>(() => {
    try { return localStorage.getItem(SOCIAL_ID_KEY); } catch { return null; }
  });
  const [canvasPx, setCanvasPx] = useState({ w: 800, h: 600 });

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean; start: PlacedObstacle[] } | null>(null);
  const rotateRef = useRef<{ id: string; start: PlacedObstacle[] } | null>(null);

  const { sport, name, obstacles } = draft;
  const w = draft.arenaWidthM;
  const h = draft.arenaHeightM;

  // Öppna en delad bana från communityn (?delad=<id>) och bygg vidare på den
  const sharedParam = search.get("delad");
  useEffect(() => {
    if (!sharedParam) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("planner_courses")
        .select("id, name, sport, course_data")
        .eq("id", sharedParam)
        .eq("is_public", true)
        .maybeSingle();
      if (cancelled || !data) return;
      const next = draftFromLibraryCourse(data as unknown as LibraryCourse);
      if (!next) {
        toast.error("Kunde inte öppna den delade banan");
        return;
      }
      setDraft({ ...next, name: `${next.name} (kopia)` });
      toast.success("Delad bana öppnad — bygg vidare!");
    })();
    return () => { cancelled = true; };
  }, [sharedParam]);


  // Numrerade hinder = det som validering, PDF, uppspelning och 3D använder
  const numbered = useMemo(() => withNumbers(obstacles), [obstacles]);
  const ruleSet = useMemo(
    () => getRuleSet(draft.ruleSetId ?? getDefaultRuleSetIdForSport(sport)),
    [draft.ruleSetId, sport]
  );
  const issues = useMemo(
    () =>
      validateCourse({
        sport, sizeClass: draft.sizeClass, arenaWidthM: w, arenaHeightM: h,
        classTemplate: draft.classTemplate, obstacles: numbered, ruleSetId: draft.ruleSetId,
      }),
    [sport, draft.sizeClass, w, h, draft.classTemplate, numbered, draft.ruleSetId]
  );
  const times = useMemo(
    () =>
      computeCourseTimes({
        sport, sizeClass: draft.sizeClass, arenaWidthM: w, arenaHeightM: h,
        classTemplate: draft.classTemplate, obstacles: numbered, ruleSetId: draft.ruleSetId,
      }),
    [sport, draft.sizeClass, w, h, draft.classTemplate, numbered, draft.ruleSetId]
  );
  const issueCounts = useMemo(() => ({
    error: issues.filter((i) => i.level === "error").length,
    warning: issues.filter((i) => i.level === "warning").length,
    info: issues.filter((i) => i.level === "info").length,
  }), [issues]);

  // Hundens väg (samma motor som uppspelningen)
  const pathInput = useMemo(() => ({ obstacles: numbered }), [numbered]);
  const coursePath = useMemo(() => buildCoursePath(pathInput), [pathInput]);
  const runLineD = useMemo(() => (coursePath.points.length >= 2 ? toSvgPathD(coursePath) : ""), [coursePath]);

  const playback = useCoursePlayback(pathInput, playbackActive);

  // Mät arbetsytan för linjalerna
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setCanvasPx({ w: Math.max(0, r.width - RULER_PX), h: Math.max(0, r.height - RULER_PX) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const palette = useMemo(() => OBSTACLES_V2.filter((d) => d.sport.includes(sport)), [sport]);
  const paletteGroups = useMemo(() => {
    const groups = new Map<string, typeof palette>();
    for (const def of palette) {
      const list = groups.get(def.category) ?? [];
      list.push(def);
      groups.set(def.category, list);
    }
    return [...groups.entries()];
  }, [palette]);

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

  // ── Koordinater ─────────────────────────────────────────────
  const vw = w / zoom;
  const vh = h / zoom;
  const viewMinX = (w - vw) / 2;
  const viewMinY = (h - vh) / 2;

  const toField = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: clamp(viewMinX + ((clientX - rect.left) / rect.width) * vw, 0, w),
        y: clamp(viewMinY + ((clientY - rect.top) / rect.height) * vh, 0, h),
      };
    },
    [viewMinX, viewMinY, vw, vh, w, h]
  );

  // ── Undo/redo ───────────────────────────────────────────────
  const undo = useCallback(() => {
    if (!past.length) return;
    setFuture((f) => [obstacles, ...f]);
    setObstacles(past[past.length - 1], false);
    setPast((p) => p.slice(0, -1));
  }, [past, obstacles, setObstacles]);
  const redo = useCallback(() => {
    if (!future.length) return;
    setPast((p) => [...p, obstacles]);
    setObstacles(future[0], false);
    setFuture((f) => f.slice(1));
  }, [future, obstacles, setObstacles]);

  // ── Redigering ──────────────────────────────────────────────
  const selected = obstacles.find((ob) => ob.id === selectedId) ?? null;

  const rotateBy = (delta: number) => {
    if (!selected || selected.locked) return;
    setObstacles(
      obstacles.map((ob) =>
        ob.id === selected.id ? { ...ob, rotation: (((ob.rotation + delta) % 360) + 360) % 360 } : ob
      )
    );
  };
  const duplicateSelected = () => {
    if (!selected || selected.locked) return;
    const copy = { ...selected, id: uid(), x: clamp(selected.x + 2, 1, w - 1), y: clamp(selected.y + 2, 1, h - 1), locked: false };
    setObstacles([...obstacles, copy]);
    setSelectedId(copy.id);
  };
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const target = obstacles.find((ob) => ob.id === selectedId);
    if (target?.locked) return;
    setObstacles(obstacles.filter((ob) => ob.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, obstacles, setObstacles]);
  const toggleLockSelected = () => {
    if (!selected) return;
    setObstacles(obstacles.map((ob) => (ob.id === selected.id ? { ...ob, locked: !ob.locked } : ob)));
  };
  /** Flytta valt hinder ett steg i nummerordningen (delta ±1). */
  const moveSelectedInOrder = (delta: number) => {
    if (!selected || NON_COMPETING.has(selected.type)) return;
    const idx = obstacles.findIndex((ob) => ob.id === selected.id);
    // Hitta nästa tävlande hinder i riktningen
    let j = idx + delta;
    while (j >= 0 && j < obstacles.length && NON_COMPETING.has(obstacles[j].type)) j += delta;
    if (j < 0 || j >= obstacles.length) return;
    const next = [...obstacles];
    [next[idx], next[j]] = [next[j], next[idx]];
    setObstacles(next);
  };
  const setTunnelCurve = (patch: Partial<{ curveDeg: number; curveSide: "left" | "right" }>) => {
    if (!selected || selected.type !== "tunnel") return;
    setObstacles(
      obstacles.map((ob) =>
        ob.id === selected.id
          ? {
              ...ob,
              curveDeg: clamp(patch.curveDeg ?? ob.curveDeg ?? 0, 0, 90),
              curveSide: patch.curveSide ?? ob.curveSide ?? "right",
            }
          : ob
      )
    );
  };

  // ── Pointer-hantering ───────────────────────────────────────
  const onSvgPointerDown = (e: React.PointerEvent) => {
    const pt = toField(e.clientX, e.clientY);
    if (placing) {
      const ob: PlacedObstacle = { id: uid(), type: placing, x: snapM(pt.x), y: snapM(pt.y), rotation: 0 };
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
      const target = obstacles.find((ob) => ob.id === id);
      if (target?.locked) return;
      dragRef.current.moved = true;
      const nx = snapM(clamp(pt.x + dx, 0.5, w - 0.5));
      const ny = snapM(clamp(pt.y + dy, 0.5, h - 0.5));
      setDraft((d) => ({
        ...d,
        obstacles: d.obstacles.map((ob) => (ob.id === id ? { ...ob, x: nx, y: ny } : ob)),
      }));
    }
    if (rotateRef.current) {
      const { id } = rotateRef.current;
      const target = obstacles.find((ob) => ob.id === id);
      if (target?.locked) return;
      setDraft((d) => ({
        ...d,
        obstacles: d.obstacles.map((ob) => {
          if (ob.id !== id) return ob;
          const ang = (Math.atan2(pt.y - ob.y, pt.x - ob.x) * 180) / Math.PI + 90;
          const snapped = Math.round(ang / 15) * 15;
          return { ...ob, rotation: ((snapped % 360) + 360) % 360 };
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

  // ── Klassmall / sport / arena ───────────────────────────────
  const applyClassTemplate = (key: ClassTemplateKey | null) => {
    const tpl = key ? getClassTemplate(key) : null;
    setDraft((d) => ({
      ...d,
      classTemplate: key,
      sizeClass: tpl?.defaultSize ?? d.sizeClass,
      arenaWidthM: tpl?.arenaWidthM ?? d.arenaWidthM,
      arenaHeightM: tpl?.arenaHeightM ?? d.arenaHeightM,
    }));
    if (tpl) toast.success(`Klassmall: ${tpl.label}`, { description: tpl.description });
  };

  const switchSport = (s: Sport) => {
    const tpl = CLASS_TEMPLATES.find((t) => t.sport === s);
    const nw = tpl?.arenaWidthM ?? 30;
    const nh = tpl?.arenaHeightM ?? 40;
    setDraft((d) => ({
      ...d,
      sport: s,
      classTemplate: null,
      arenaWidthM: nw,
      arenaHeightM: nh,
      ruleSetId: getDefaultRuleSetIdForSport(s),
      obstacles: d.obstacles.map((ob) => ({ ...ob, x: clamp(ob.x, 1, nw - 1), y: clamp(ob.y, 1, nh - 1) })),
    }));
    setSelectedId(null);
    setPlacing(null);
  };

  const setArena = (width: number, height: number) => {
    setDraft((d) => ({
      ...d,
      arenaWidthM: width,
      arenaHeightM: height,
      obstacles: d.obstacles.map((ob) => ({ ...ob, x: clamp(ob.x, 1, width - 1), y: clamp(ob.y, 1, height - 1) })),
    }));
  };

  const clearAll = () => {
    if (!obstacles.length) return;
    if (!window.confirm("Rensa hela banan? Alla hinder tas bort.")) return;
    setObstacles([]);
    setSelectedId(null);
  };

  // ── Bibliotek ───────────────────────────────────────────────
  const pickFromLibrary = (kind: "prebuilt" | "saved", payload: PrebuiltCourse | LibraryCourse) => {
    const next = kind === "prebuilt" ? draftFromPrebuilt(payload as PrebuiltCourse) : draftFromLibraryCourse(payload as LibraryCourse);
    if (!next) {
      toast.error("Kunde inte läsa banan");
      return;
    }
    if (obstacles.length > 0 && !window.confirm(`Ladda "${next.name}"? Nuvarande bana ersätts (autosparad lokalt först).`)) return;
    setDraft(next);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    setCloudId(kind === "saved" ? (payload as LibraryCourse).id : null);
    try {
      if (kind === "saved") localStorage.setItem(CLOUD_ID_KEY, (payload as LibraryCourse).id);
      else localStorage.removeItem(CLOUD_ID_KEY);
    } catch { /* ignorera */ }
    toast.success(`Laddade "${next.name}"`);
  };

  // ── Exporter ────────────────────────────────────────────────
  const pdfBase = () => ({
    name, sport, sizeClass: draft.sizeClass,
    arenaWidthM: w, arenaHeightM: h,
    classTemplate: draft.classTemplate,
    obstacles: numbered,
    ruleSetId: draft.ruleSetId,
    showWatermark,
  });

  const runExport = async (kind: string, fn: () => Promise<void> | void) => {
    if (exporting) return;
    setExporting(kind);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      toast.error("Exporten misslyckades — försök igen");
    } finally {
      setExporting(null);
    }
  };

  const shareUrlForQr = () =>
    `${window.location.origin}${window.location.pathname}?bana=${encodeCourse(draft)}`;

  const onJudgePdf = () =>
    runExport("Domar-PDF", async () => {
      const [{ exportJudgePdf }, qrDataUrl] = await Promise.all([
        import("@/features/course-planner-v2/judgePdf"),
        makeQrDataUrl(shareUrlForQr()).catch(() => ""),
      ]);
      await exportJudgePdf({ ...pdfBase(), qrDataUrl });
      toast.success("Domar-PDF nedladdad");
    });
  const onTrainingPdf = () =>
    runExport("Tränings-PDF", async () => {
      const [{ exportTrainingPdf }, qrDataUrl] = await Promise.all([
        import("@/features/course-planner-v2/trainingPdf"),
        makeQrDataUrl(shareUrlForQr()).catch(() => ""),
      ]);
      await exportTrainingPdf({ ...pdfBase(), qrDataUrl });
      toast.success("Tränings-PDF nedladdad");
    });
  const onBuildPdf = () =>
    runExport("Bygg-PDF", async () => {
      const [{ exportBuildPdf }, qrDataUrl] = await Promise.all([
        import("@/features/course-planner-v2/buildPdf"),
        makeQrDataUrl(shareUrlForQr()).catch(() => ""),
      ]);
      await exportBuildPdf({ ...pdfBase(), qrDataUrl });
      toast.success("Bygg-PDF nedladdad");
    });
  const onStartlistPdf = () =>
    runExport("Startlista", async () => {
      const { exportStartlistPdf } = await import("@/features/course-planner-v2/startlistPdf");
      exportStartlistPdf({
        courseName: name, sport, sizeClass: draft.sizeClass,
        classTemplate: draft.classTemplate, obstacles: numbered,
      });
      toast.success("Startlista nedladdad");
    });
  const onJson = () =>
    runExport("JSON", () => {
      const blob = new Blob([JSON.stringify({ ...pdfBase(), version: 2 }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name || "bana"}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  const onImportJson = () => fileInputRef.current?.click();
  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const result = parseCourseJson(text);
    if (!result.ok) {
      toast.error("Ogiltig bafil", { description: result.error });
      return;
    }
    const c = result.course;
    setDraft({
      ...defaultDraft(c.sport),
      name: c.name || "Importerad bana",
      sport: c.sport,
      sizeClass: c.sizeClass ?? "L",
      arenaWidthM: c.arenaWidthM ?? 30,
      arenaHeightM: c.arenaHeightM ?? 40,
      classTemplate: c.classTemplate ?? null,
      obstacles: normalizeObstacles(c.obstacles.map((ob) => ({ ...ob, id: uid() }))),
    });
    setPast([]);
    setFuture([]);
    toast.success(`Importerade "${c.name || "bana"}"`);
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

  // ── Dela ────────────────────────────────────────────────────
  const openShare = () => {
    setShareUrl(shareUrlForQr());
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

  // ── Molnlagring (för kommentarer & klubbdelning) ────────────
  const saveToCloud = async (opts?: { silent?: boolean }): Promise<string | null> => {
    if (!user) {
      setAuthOpen(true);
      return null;
    }
    setSavingCloud(true);
    try {
      const payload = {
        user_id: user.id,
        name,
        description: "",
        course_data: {
          version: 2,
          sport,
          sizeClass: draft.sizeClass,
          arenaWidthM: w,
          arenaHeightM: h,
          classTemplate: draft.classTemplate,
          obstacles: numbered,
          ruleSetId: draft.ruleSetId,
        } as never,
        canvas_width: Math.round(w * 20),
        canvas_height: Math.round(h * 20),
      };
      let id = cloudId;
      if (id) {
        const { error } = await supabase.from("saved_courses").update(payload).eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("saved_courses").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id as string;
        setCloudId(id);
        try { localStorage.setItem(CLOUD_ID_KEY, id); } catch { /* ignorera */ }
      }
      if (!opts?.silent) toast.success("Bana sparad i molnet");
      return id;
    } catch (err) {
      console.error(err);
      if (!opts?.silent) toast.error("Kunde inte spara i molnet");
      return null;
    } finally {
      setSavingCloud(false);
    }
  };

  // ── Lättviktsprofil: spara & dela ───────────────────────────
  const socialCourseData = () => ({
    version: 2,
    sport,
    sizeClass: draft.sizeClass,
    arenaWidthM: w,
    arenaHeightM: h,
    classTemplate: draft.classTemplate,
    obstacles: numbered,
    ruleSetId: draft.ruleSetId,
  });

  const openSaveShare = () => {
    if (!plannerProfile) {
      setPendingSaveShare(true);
      setProfileOpen(true);
      return;
    }
    setSaveShareOpen(true);
  };

  const openComments = async () => {
    const id = cloudId ?? (await saveToCloud({ silent: true }));
    if (!id) return;
    setCommentsOpen(true);
  };
  const openClubShare = async () => {
    const id = cloudId ?? (await saveToCloud({ silent: true }));
    if (!id) return;
    setClubShareOpen(true);
  };

  // ── Kommandopalett ──────────────────────────────────────────
  const commands: PaletteCommand[] = useMemo(() => [
    { id: "undo", label: "Ångra", group: "Redigera", shortcut: ["Ctrl", "Z"], icon: <Undo2 className="h-4 w-4" />, run: undo },
    { id: "redo", label: "Gör om", group: "Redigera", shortcut: ["Ctrl", "Shift", "Z"], icon: <Redo2 className="h-4 w-4" />, run: redo },
    { id: "duplicate", label: "Duplicera valt hinder", group: "Redigera", shortcut: ["Ctrl", "D"], run: duplicateSelected },
    { id: "delete", label: "Ta bort valt hinder", group: "Redigera", shortcut: ["Delete"], icon: <Trash2 className="h-4 w-4" />, run: deleteSelected },
    { id: "rotate-cw", label: "Rotera 45° medurs", group: "Redigera", shortcut: ["R"], icon: <RotateCw className="h-4 w-4" />, run: () => rotateBy(45) },
    { id: "rotate-ccw", label: "Rotera 45° moturs", group: "Redigera", shortcut: ["Shift", "R"], icon: <RotateCcw className="h-4 w-4" />, run: () => rotateBy(-45) },
    { id: "lock", label: "Lås/lås upp valt hinder", group: "Redigera", shortcut: ["L"], icon: <Lock className="h-4 w-4" />, run: toggleLockSelected },
    { id: "clear", label: "Rensa banan", group: "Redigera", icon: <Eraser className="h-4 w-4" />, run: clearAll },
    { id: "line", label: showLine ? "Dölj springlinje" : "Visa springlinje", group: "Visa", icon: <Spline className="h-4 w-4" />, run: () => setShowLine((v) => !v) },
    { id: "numbers", label: showNumbers ? "Dölj nummer" : "Visa nummer", group: "Visa", run: () => setShowNumbers((v) => !v) },
    { id: "grid", label: showGrid ? "Dölj rutnät" : "Visa rutnät", group: "Visa", icon: <Grid2x2 className="h-4 w-4" />, run: () => setShowGrid((v) => !v) },
    { id: "rulers", label: showRulers ? "Dölj linjaler" : "Visa linjaler", group: "Visa", icon: <Ruler className="h-4 w-4" />, run: () => setShowRulers((v) => !v) },
    { id: "zoom-in", label: "Zooma in", group: "Visa", shortcut: ["+"], icon: <ZoomIn className="h-4 w-4" />, run: () => setZoom((z) => clamp(z + 0.25, 1, 2.25)) },
    { id: "zoom-out", label: "Zooma ut", group: "Visa", shortcut: ["-"], icon: <ZoomOut className="h-4 w-4" />, run: () => setZoom((z) => clamp(z - 0.25, 1, 2.25)) },
    { id: "zoom-reset", label: "Zoom 100%", group: "Visa", shortcut: ["0"], run: () => setZoom(1) },
    { id: "issues", label: "Visa regelkontroll", group: "Granska", icon: <ShieldCheck className="h-4 w-4" />, run: () => setIssuesOpen(true) },
    { id: "library", label: "Öppna banbibliotek", group: "Bana", icon: <BookOpen className="h-4 w-4" />, run: () => setLibraryOpen(true) },
    { id: "share", label: "Dela bana via länk", group: "Bana", icon: <Share2 className="h-4 w-4" />, run: openShare },
    { id: "cloud", label: "Spara i molnet", group: "Bana", icon: <Cloud className="h-4 w-4" />, run: () => void saveToCloud() },
    { id: "feedback", label: "Skicka förslag till banbyggaren", group: "Bana", icon: <Lightbulb className="h-4 w-4" />, run: () => setFeedbackOpen(true) },
    { id: "comments", label: "Kommentarer", group: "Bana", icon: <MessageSquare className="h-4 w-4" />, run: () => void openComments() },
    { id: "club", label: "Dela till klubb", group: "Bana", icon: <Users className="h-4 w-4" />, run: () => void openClubShare() },
    { id: "playback", label: "Spela upp hundens väg", group: "Visa", shortcut: ["Space"], icon: <Play className="h-4 w-4" />, run: () => setPlaybackActive((v) => !v) },
    { id: "3d", label: "Öppna 3D-vy", group: "Visa", shortcut: ["3"], icon: <Box className="h-4 w-4" />, run: () => setView3D("view") },
    { id: "3d-walk", label: "Gå banan i 3D", group: "Visa", icon: <Footprints className="h-4 w-4" />, run: () => setView3D("walk") },
    { id: "png", label: "Exportera PNG-bild", group: "Exportera", icon: <Download className="h-4 w-4" />, run: exportPNG },
    { id: "pdf-judge", label: "Exportera domar-PDF", group: "Exportera", run: onJudgePdf },
    { id: "pdf-training", label: "Exportera tränings-PDF", group: "Exportera", run: onTrainingPdf },
    { id: "pdf-build", label: "Exportera bygg-PDF", group: "Exportera", run: onBuildPdf },
    { id: "pdf-startlist", label: "Exportera startlista", group: "Exportera", run: onStartlistPdf },
    { id: "json", label: "Exportera JSON", group: "Exportera", run: onJson },
    { id: "help", label: "Tangentbordsgenvägar", group: "Hjälp", shortcut: ["?"], run: () => setHelpOpen(true) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [undo, redo, showLine, showNumbers, showGrid, showRulers, selected, obstacles, draft, numbered, cloudId, user, exporting]);

  // ── Tangentbord ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing) return;
      if (e.key === "Escape") {
        if (playbackActive) { setPlaybackActive(false); return; }
        setPlacing(null);
        setSelectedId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) deleteSelected();
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      }
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "r") {
        if (e.shiftKey) rotateBy(-45); else rotateBy(45);
      }
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "l") toggleLockSelected();
      if (!e.metaKey && !e.ctrlKey && e.key === "3") setView3D("view");
      if (!e.metaKey && !e.ctrlKey && e.key === "?") setHelpOpen(true);
      if (!e.metaKey && !e.ctrlKey && e.key === "+") setZoom((z) => clamp(z + 0.25, 1, 2.25));
      if (!e.metaKey && !e.ctrlKey && e.key === "-") setZoom((z) => clamp(z - 0.25, 1, 2.25));
      if (!e.metaKey && !e.ctrlKey && e.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Render ──────────────────────────────────────────────────

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
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11 ${
        active ? "border-ink bg-tang text-ink shadow-hard-sm" : "border-ink/15 bg-paper text-ink/70 hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );

  const issueTone = (level: ValidationIssue["level"]) =>
    level === "error"
      ? "border-ember bg-ember/10 text-ember"
      : level === "warning"
        ? "border-tang bg-tang/10 text-ink"
        : "border-ink/20 bg-cream/60 text-ink/70";

  const selectedDef = selected ? getObstacleDefV2(selected.type) : null;
  const selectedNumbered = selected ? numbered.find((ob) => ob.id === selected.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      {/* ── Topprad ── */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Link
            to="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper transition-colors hover:bg-cream sm:h-11 sm:w-11"
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
            className="min-w-0 flex-1 rounded-xl border-2 border-transparent bg-transparent px-2 py-2 font-display text-lg tracking-wide outline-none transition-colors focus:border-ink sm:text-2xl md:max-w-xs"
            aria-label="Banans namn"
          />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors lg:inline-flex ${
                savedFlash ? "bg-forest text-paper" : "bg-cream text-ink/50"
              }`}
            >
              {savedFlash ? "Sparad ✓" : "Autosparas lokalt"}
            </span>
            {cloudId && (
              <span className="hidden items-center gap-1 rounded-full bg-pine px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-paper md:inline-flex">
                <CloudCheck className="h-3.5 w-3.5" /> Molnet
              </span>
            )}
            <ToolButton onClick={() => setLibraryOpen(true)} label="Banbibliotek — officiella banor och mallar">
              <BookOpen className="h-5 w-5" />
            </ToolButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Fler verktyg"
                  title="Fler verktyg"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink/15 bg-paper text-ink/70 transition-all hover:border-ink hover:text-ink sm:h-11 sm:w-11"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-2 border-ink bg-paper">
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-ink/50">
                  Visa banan
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setView3D("view")} className="min-h-11 font-semibold">
                  <Box className="mr-2 h-4 w-4" /> 3D-vy
                  <span className="ml-auto text-xs text-ink/40">3</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setView3D("walk")} className="min-h-11 font-semibold">
                  <Footprints className="mr-2 h-4 w-4" /> Gå banan
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setPlaybackActive((v) => !v)}
                  disabled={numbered.filter((o) => o.number != null).length < 2}
                  className="min-h-11 font-semibold"
                >
                  <Play className="mr-2 h-4 w-4" /> Spela upp hundens väg
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-ink/50">
                  Hjälp
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setPaletteOpen(true)} className="min-h-11 font-semibold">
                  <Command className="mr-2 h-4 w-4" /> Kommandopalett
                  <span className="ml-auto text-xs text-ink/40">Ctrl+K</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setHelpOpen(true)} className="min-h-11 font-semibold">
                  <Keyboard className="mr-2 h-4 w-4" /> Tangentbordsgenvägar
                  <span className="ml-auto text-xs text-ink/40">?</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setFeedbackOpen(true)} className="min-h-11 font-semibold">
                  <Lightbulb className="mr-2 h-4 w-4" /> Skicka förslag & material
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative">
              <ExportMenu
                onJudge={onJudgePdf}
                onTraining={onTrainingPdf}
                onBuild={onBuildPdf}
                onStartlist={onStartlistPdf}
                onJson={onJson}
                onImportJson={onImportJson}
                onShareImage={exportPNG}
                on3DView={() => setView3D("view")}
                on3DWalk={() => setView3D("walk")}
                isPremium={false}
                showWatermark={showWatermark}
                onWatermarkUpsell={() =>
                  toast("Export utan vattenstämpel blir en betald funktion", {
                    description:
                      "Banbyggaren är gratis just nu och exporterna märks med agilitymanager.se. Vi återkommer med pris och släpp.",
                  })
                }
              />
            </div>
            <button
              onClick={openSaveShare}
              disabled={!obstacles.length || savingCloud}
              className="pressable shadow-hard-sm inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-forest px-3 text-sm font-bold text-paper disabled:opacity-40 sm:h-11 sm:px-5"
              title={obstacles.length ? "Spara banan på din profil och välj publik eller privat" : "Placera minst ett hinder först"}
              aria-label="Spara och dela banan på din profil"
            >
              {savingCloud ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudCheck className="h-4 w-4" />}{" "}
              <span className="hidden sm:inline">Spara & dela</span>
            </button>
            <button
              onClick={openShare}
              disabled={!obstacles.length}
              className="pressable shadow-hard-sm inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-tang px-3 text-sm font-bold text-ink disabled:opacity-40 sm:h-11 sm:px-5"
              title={obstacles.length ? "Skapa en länk med hela banan — mottagaren behöver inget konto" : "Placera minst ett hinder först"}
              aria-label="Dela banan via länk"
            >
              <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Dela bana</span>
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              title={plannerProfile ? `Inloggad som ${plannerProfile.name}` : "Skapa din banprofil (namn + e-post)"}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-paper px-2.5 text-sm font-bold transition-colors hover:bg-cream sm:h-11 sm:px-3"
              aria-label={plannerProfile ? "Din banprofil" : "Skapa banprofil"}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-forest text-xs text-paper">
                {plannerProfile ? plannerProfile.name.trim().charAt(0).toUpperCase() : "?"}
              </span>
              <span className="hidden max-w-[8rem] truncate lg:inline">
                {plannerProfile ? plannerProfile.name : "Din profil"}
              </span>
            </button>

          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Vänster sidopanel (desktop) ── */}
        <aside className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r-2 border-ink/10 bg-paper p-5 lg:flex">
          {/* Sport */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">Sport</p>
            <div className="grid grid-cols-2 gap-2">
              {(["agility", "hoopers"] as Sport[]).map((s) => (
                <button
                  key={s}
                  onClick={() => switchSport(s)}
                  className={`h-11 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                    sport === s ? "border-ink bg-forest text-paper shadow-hard-sm" : "border-ink/15 bg-white text-ink/60 hover:border-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Klassmall */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">Klassmall</p>
            <select
              value={draft.classTemplate ?? ""}
              onChange={(e) => applyClassTemplate((e.target.value || null) as ClassTemplateKey | null)}
              className="h-11 w-full rounded-xl border-2 border-ink/15 bg-white px-3 text-sm font-semibold outline-none focus:border-ink"
            >
              <option value="">Fri planering</option>
              {CLASS_TEMPLATES.filter((t) => t.sport === sport).map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            {draft.classTemplate && (
              <p className="mt-1.5 text-xs leading-relaxed text-ink/50">
                {getClassTemplate(draft.classTemplate)?.description}
              </p>
            )}
          </div>

          {/* Storleksklass */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">Storleksklass</p>
            <div className="flex gap-1.5">
              {SIZE_CLASSES.map((sc) => (
                <button
                  key={sc.key}
                  onClick={() => setDraft((d) => ({ ...d, sizeClass: sc.key }))}
                  className={`h-9 flex-1 rounded-lg border-2 text-xs font-bold transition-all ${
                    draft.sizeClass === sc.key ? "border-ink bg-tang text-ink shadow-hard-sm" : "border-ink/15 bg-white text-ink/60 hover:border-ink"
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banstorlek */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">Banstorlek</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ARENA_PRESETS.filter((p) => p.sport.includes(sport)).map((p) => (
                <button
                  key={p.label}
                  onClick={() => setArena(p.width, p.height)}
                  className={`h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                    w === p.width && h === p.height ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white text-ink/60 hover:border-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hinderpalett */}
          <div className="flex-1">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50">
              <MousePointerClick className="h-3.5 w-3.5" /> Klicka för att placera
            </p>
            <div className="space-y-4">
              {paletteGroups.map(([category, defs]) => (
                <div key={category}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-forest">{category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {defs.map((def) => (
                      <button
                        key={def.type}
                        onClick={() => setPlacing(placing === def.type ? null : def.type)}
                        title={def.description}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${
                          placing === def.type ? "border-ink bg-tang shadow-hard-sm" : "border-ink/10 bg-white hover:border-ink"
                        }`}
                      >
                        <svg viewBox={`-3.6 -3.6 7.2 7.2`} className="h-11 w-11">
                          <g transform="scale(0.85)">
                            <ObstacleGlyph type={def.type} sw={0.16} />
                          </g>
                        </svg>
                        <span className="text-[11px] font-bold leading-tight">{def.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Arbetsyta ── */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div ref={canvasWrapRef} className="relative min-h-0 flex-1">
            {showRulers && (
              <CanvasRulers
                viewportWidthPx={canvasPx.w}
                viewportHeightPx={canvasPx.h}
                viewMinXM={viewMinX}
                viewMinYM={viewMinY}
                visibleWidthM={vw}
                visibleHeightM={vh}
                arenaWidthM={w}
                arenaHeightM={h}
                tickStepM={5}
                showFineTicks={zoom >= 1.5}
                zoom={zoom}
                onCornerClick={() => setZoom(1)}
              />
            )}
            <div
              className="absolute bottom-0 right-0"
              style={{ top: showRulers ? RULER_PX : 0, left: showRulers ? RULER_PX : 0 }}
            >
              <svg
                ref={svgRef}
                viewBox={`${viewMinX} ${viewMinY} ${vw} ${vh}`}
                className="planner-svg h-full w-full touch-none select-none"
                onPointerDown={onSvgPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {/* plan */}
                <rect x="0" y="0" width={w} height={h} fill="#FCFAF4" />
                {showGrid && (
                  <g>
                    {Array.from({ length: Math.floor(w) + 1 }).map((_, i) => (
                      <line key={`v${i}`} x1={i} y1="0" x2={i} y2={h} stroke="#161812" strokeOpacity={i % 5 === 0 ? 0.12 : 0.05} strokeWidth={(i % 5 === 0 ? 0.05 : 0.025) / Math.sqrt(zoom)} />
                    ))}
                    {Array.from({ length: Math.floor(h) + 1 }).map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={i} x2={w} y2={i} stroke="#161812" strokeOpacity={i % 5 === 0 ? 0.12 : 0.05} strokeWidth={(i % 5 === 0 ? 0.05 : 0.025) / Math.sqrt(zoom)} />
                    ))}
                  </g>
                )}
                <rect x="0.15" y="0.15" width={w - 0.3} height={h - 0.3} fill="none" stroke="#161812" strokeOpacity="0.6" strokeWidth={0.12 / Math.sqrt(zoom)} />

                {/* springlinje (hundens väg) */}
                {showLine && runLineD && (
                  <path d={runLineD} fill="none" stroke="#FF6900" strokeWidth={0.22 / Math.sqrt(zoom)} strokeDasharray={`${0.65 / Math.sqrt(zoom)} ${0.45 / Math.sqrt(zoom)}`} strokeLinecap="round" opacity="0.85" />
                )}

                {/* hinder */}
                {numbered.map((ob) => {
                  const isSelected = ob.id === selectedId;
                  const hasIssue = issues.some((i) => i.obstacleId === ob.id && i.level !== "info");
                  return (
                    <g
                      key={ob.id}
                      transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rotation})`}
                      onPointerDown={(e) => onObstaclePointerDown(e, ob)}
                      className="cursor-grab active:cursor-grabbing"
                      opacity={ob.locked ? 0.75 : 1}
                    >
                      {/* träffyta — extra stor så att hindret är lätt att peka på i mobilen */}
                      <circle r="2.1" fill="transparent" />
                      {isSelected && <circle r="1.95" fill="#E24C00" opacity="0.07" />}
                      <ObstacleGlyph
                        type={ob.type}
                        stroke={isSelected ? "#E24C00" : hasIssue ? "#E24C00" : "#161812"}
                        sw={0.09}
                        curveDeg={ob.curveDeg}
                        curveSide={ob.curveSide}
                      />
                      {hasIssue && !isSelected && (
                        <circle r="1.15" fill="none" stroke="#E24C00" strokeWidth="0.08" strokeDasharray="0.2 0.14" data-ui />
                      )}
                      {ob.locked && (
                        <g transform={`rotate(${-ob.rotation})`} data-ui>
                          <circle cx="0.95" cy="0.95" r="0.34" fill="#161812" />
                          <text x="0.95" y="1.08" textAnchor="middle" fontSize="0.4" fill="#F6F1E7">🔒</text>
                        </g>
                      )}
                      {showNumbers && ob.number != null && (
                        <g transform={`rotate(${-ob.rotation})`}>
                          <circle cx="1.05" cy="-1.05" r="0.62" fill={isSelected ? "#E24C00" : "#161812"} />
                          <text x="1.05" y="-0.78" textAnchor="middle" fontSize="0.78" fontWeight="800" fill="#F6F1E7" fontFamily="Archivo, sans-serif">
                            {ob.number}
                          </text>
                        </g>
                      )}
                      {isSelected && (
                        <g data-ui>
                          <circle r="1.7" fill="none" stroke="#E24C00" strokeWidth="0.07" strokeDasharray="0.25 0.18" />
                          {/* rotationshandtag */}
                          <line x1="0" y1="-1.7" x2="0" y2="-2.9" stroke="#E24C00" strokeWidth="0.06" strokeDasharray="0.14 0.12" />
                          <g
                            transform={`rotate(${-ob.rotation}) translate(0 ${-2.9 / 1}) `}
                            onPointerDown={(e) => onRotatePointerDown(e, ob.id)}
                            className="cursor-crosshair"
                          >
                            <circle cx="0" cy="-2.9" r="0.5" fill="#E24C00" stroke="#F6F1E7" strokeWidth="0.1" />
                            <g transform={`rotate(${-ob.rotation}) translate(0 -2.9)`}>
                              <RotateCw width="0.5" height="0.5" x="-0.25" y="-0.25" color="#F6F1E7" />
                            </g>
                          </g>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* spökhinder vid placering */}
                {placing && ghost && (
                  <g transform={`translate(${ghost.x} ${ghost.y})`} opacity="0.55" data-ui>
                    <ObstacleGlyph type={placing} stroke="#006937" sw={0.09} />
                  </g>
                )}

                {/* uppspelnings-overlay */}
                <CoursePlaybackOverlay course={pathInput} active={playbackActive} t={playback.t} />
              </svg>
            </div>

            {/* Regelkontroll-knapp (flytande) */}
            <button
              onClick={() => setIssuesOpen((v) => !v)}
              className={`absolute ${showRulers ? "right-3 top-[2.2rem]" : "right-3 top-3"} z-30 inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-2 text-xs font-bold shadow-hard-sm transition-all ${
                issueCounts.error > 0
                  ? "border-ink bg-ember text-paper"
                  : issueCounts.warning > 0
                    ? "border-ink bg-tang text-ink"
                    : "border-ink bg-forest text-paper"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {issueCounts.error > 0
                ? `${issueCounts.error} fel`
                : issueCounts.warning > 0
                  ? `${issueCounts.warning} varningar`
                  : "Regelkontroll ✓"}
            </button>

            {/* Regelkontroll-panel */}
            {issuesOpen && (
              <div className="absolute bottom-3 left-3 right-3 z-30 max-h-[45%] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-4 shadow-hard sm:left-auto sm:w-96">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl uppercase tracking-wide">Regelkontroll</p>
                    {ruleSet && <RuleSetTrustBadge ruleSet={ruleSet} compact className="mt-1" />}
                  </div>
                  <button onClick={() => setIssuesOpen(false)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink/15 hover:border-ink" aria-label="Stäng">
                    ×
                  </button>
                </div>
                {draft.classTemplate && times && (
                  <p className="mb-3 rounded-xl bg-cream px-3 py-2 text-xs font-semibold text-ink/70">
                    Referenstid ca {(times.refTimeS ?? 0).toFixed(0)} s · Maxtid {(times.maxTimeS ?? 0).toFixed(0)} s
                    {` · Banlängd ~${times.lengthAlongPathM.toFixed(0)} m`}
                  </p>
                )}
                {issues.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-xl bg-forest/10 px-3 py-2.5 text-sm font-semibold text-forest">
                    <Check className="h-4 w-4" /> Inga anmärkningar — snyggt jobbat!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {issues.map((issue, i) => (
                      <li key={`${issue.code}-${i}`}>
                        <button
                          onClick={() => {
                            if (issue.obstacleId) setSelectedId(issue.obstacleId);
                          }}
                          className={`w-full rounded-xl border-2 px-3 py-2 text-left text-xs font-semibold leading-relaxed ${issueTone(issue.level)} ${issue.obstacleId ? "cursor-pointer hover:shadow-hard-sm" : "cursor-default"}`}
                        >
                          <span className="mr-1.5 inline-block rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            {issue.level === "error" ? "Fel" : issue.level === "warning" ? "Varning" : "Info"}
                          </span>
                          {issue.message}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Uppspelningskontroller */}
            {playbackActive && (
              <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 sm:bottom-28">
                <CoursePlaybackControls
                  course={pathInput}
                  active={playbackActive}
                  onClose={() => setPlaybackActive(false)}
                  t={playback.t}
                  setT={playback.setT}
                  playing={playback.playing}
                  setPlaying={playback.setPlaying}
                  speed={playback.speed}
                  setSpeed={playback.setSpeed}
                />
              </div>
            )}

            {/* Valt hinder — åtgärdsrad */}
            {selected && !playbackActive && (
              <div className="absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border-2 border-ink bg-paper p-1.5 shadow-hard sm:bottom-28">
                <span className="hidden px-2 text-xs font-bold leading-tight text-ink/70 sm:block">
                  {selectedNumbered?.number != null && `#${selectedNumbered.number} `}{selectedDef?.label}
                  <span className="block font-semibold text-ink/45">
                    {selected.x.toFixed(2).replace(".", ",")} × {selected.y.toFixed(2).replace(".", ",")} m · {Math.round(selected.rotation)}°
                  </span>
                </span>
                <ToolButton onClick={() => rotateBy(-45)} label="Rotera 45° moturs (Shift+R)" disabled={selected.locked}>
                  <RotateCcw className="h-4 w-4" />
                </ToolButton>
                <ToolButton onClick={() => rotateBy(45)} label="Rotera 45° medurs (R)" disabled={selected.locked}>
                  <RotateCw className="h-4 w-4" />
                </ToolButton>
                {!NON_COMPETING.has(selected.type) && (
                  <>
                    <ToolButton onClick={() => moveSelectedInOrder(-1)} label="Flytta tidigare i banordningen">
                      <ChevronDown className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton onClick={() => moveSelectedInOrder(1)} label="Flytta senare i banordningen">
                      <ChevronUp className="h-4 w-4" />
                    </ToolButton>
                  </>
                )}
                <ToolButton onClick={duplicateSelected} label="Duplicera (Ctrl+D)" disabled={selected.locked}>
                  <Copy className="h-4 w-4" />
                </ToolButton>
                <ToolButton onClick={toggleLockSelected} label={selected.locked ? "Lås upp (L)" : "Lås (L)"} active={selected.locked}>
                  {selected.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </ToolButton>
                <ToolButton onClick={deleteSelected} label="Ta bort (Delete)" disabled={selected.locked}>
                  <Trash2 className="h-4 w-4" />
                </ToolButton>
              </div>
            )}

            {/* Tunnelböjning för vald tunnel */}
            {selected?.type === "tunnel" && !playbackActive && (
              <div className="absolute left-3 top-[2.2rem] z-30 w-64 rounded-2xl border-2 border-ink bg-paper p-3.5 shadow-hard" data-ui>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/60">
                  Tunnelböjning · {selected.curveDeg ?? 0}°
                </p>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={selected.curveDeg ?? 0}
                  onChange={(e) => setTunnelCurve({ curveDeg: Number(e.target.value) })}
                  className="w-full accent-forest"
                />
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setTunnelCurve({ curveSide: "left" })}
                    className={`h-9 rounded-lg border-2 text-xs font-bold ${(selected.curveSide ?? "right") === "left" ? "border-ink bg-forest text-paper" : "border-ink/15 bg-white text-ink/60"}`}
                  >
                    Böj vänster
                  </button>
                  <button
                    onClick={() => setTunnelCurve({ curveSide: "right" })}
                    className={`h-9 rounded-lg border-2 text-xs font-bold ${(selected.curveSide ?? "right") === "right" ? "border-ink bg-forest text-paper" : "border-ink/15 bg-white text-ink/60"}`}
                  >
                    Böj höger
                  </button>
                </div>
              </div>
            )}

            {/* Tom bana — kom igång */}
            {obstacles.length === 0 && !placing && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center p-4">
                <div className="max-w-md rounded-3xl border-2 border-dashed border-ink/25 bg-paper/90 p-5 text-center shadow-hard-sm backdrop-blur sm:p-6">
                  <MousePointerClick className="mx-auto mb-3 h-8 w-8 text-forest" />
                  <p className="font-display text-2xl uppercase tracking-wide">Kom igång på 3 steg</p>

                  <ol className="mx-auto mt-4 max-w-xs space-y-2 text-left">
                    {[
                      "Välj hinder i hinderpaletten",
                      "Tryck på planen för att placera — dra för att flytta",
                      "Spara & dela banan när du är nöjd",
                    ].map((step, i) => (
                      <li key={step} className="flex items-start gap-2.5 text-sm font-semibold leading-snug text-ink/70">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest text-xs font-black text-paper">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {palette[0] && (
                      <button
                        onClick={() => setPlacing(palette[0].type)}
                        className="pressable shadow-hard-sm pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-forest px-5 text-sm font-bold text-paper"
                      >
                        <MousePointerClick className="h-4 w-4" /> Placera {palette[0].label.toLowerCase()}
                      </button>
                    )}
                    <button
                      onClick={() => setLibraryOpen(true)}
                      className="pressable shadow-hard-sm pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-tang px-5 text-sm font-bold"
                    >
                      <BookOpen className="h-4 w-4" /> Färdiga banor
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-ink/45">
                    Allt autosparas lokalt — du kan börja om när du vill.
                  </p>
                </div>
              </div>
            )}

            {/* Placeringsläge — tydlig status + avbryt */}
            {placing && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-ink bg-forest px-3 py-1.5 text-paper shadow-hard">
                  <MousePointerClick className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold leading-tight">
                    Tryck på planen för att placera {getObstacleDefV2(placing)?.label.toLowerCase()}
                    <span className="hidden font-semibold text-paper/70 sm:inline"> · fortsätt trycka för fler</span>
                  </span>
                  <button
                    onClick={() => setPlacing(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper/20 transition-colors hover:bg-paper/35"
                    aria-label="Avbryt placering (Esc)"
                    title="Avbryt placering (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Verktygsrad (desktop) ── */}
          <div className="hidden items-center justify-center gap-1.5 border-t-2 border-ink/10 bg-paper px-4 py-2.5 sm:flex">
            <ToolButton onClick={undo} label="Ångra (Ctrl+Z)" disabled={!past.length}>
              <Undo2 className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={redo} label="Gör om (Ctrl+Shift+Z)" disabled={!future.length}>
              <Redo2 className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 h-8 w-px bg-ink/15" />
            <ToolButton onClick={() => setShowLine((v) => !v)} active={showLine} label="Springlinje">
              <Spline className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={() => setShowNumbers((v) => !v)} active={showNumbers} label="Nummer">
              <span className="text-sm font-black">#</span>
            </ToolButton>
            <ToolButton onClick={() => setShowGrid((v) => !v)} active={showGrid} label="Rutnät">
              <Grid2x2 className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={() => setShowRulers((v) => !v)} active={showRulers} label="Linjaler">
              <Ruler className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 h-8 w-px bg-ink/15" />
            <ToolButton onClick={() => setZoom((z) => clamp(z - 0.25, 1, 2.25))} label="Zooma ut (−)" disabled={zoom <= 1}>
              <ZoomOut className="h-5 w-5" />
            </ToolButton>
            <button onClick={() => setZoom(1)} className="h-11 w-14 rounded-xl border-2 border-ink/15 text-xs font-bold text-ink/70 hover:border-ink" title="Återställ zoom (0)">
              {Math.round(zoom * 100)}%
            </button>
            <ToolButton onClick={() => setZoom((z) => clamp(z + 0.25, 1, 2.25))} label="Zooma in (+)" disabled={zoom >= 2.25}>
              <ZoomIn className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 h-8 w-px bg-ink/15" />
            <ToolButton onClick={clearAll} label="Rensa banan" disabled={!obstacles.length}>
              <Eraser className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 hidden h-8 w-px bg-ink/15 md:block" />
            <span className="hidden text-xs font-semibold text-ink/50 md:block">
              {numbered.filter((o) => o.number != null).length} hinder
              {coursePath.points.length >= 2 && ` · ~${coursePath.total.toFixed(0)} m`}
              {draft.classTemplate && times && ` · ref ${(times.refTimeS ?? 0).toFixed(0)} s`}
            </span>
          </div>

          {/* ── Mobildocka ── */}
          <div className="border-t-2 border-ink bg-paper p-2.5 sm:hidden">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                {numbered.filter((o) => o.number != null).length} hinder
                {coursePath.points.length >= 2 && ` · ~${coursePath.total.toFixed(0)} m`}
              </span>
              <button
                onClick={() => setLibraryOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 text-xs font-bold text-ink/70"
              >
                <BookOpen className="h-3.5 w-3.5" /> Färdiga banor
              </button>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={undo}
                disabled={!past.length}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-ink/15 bg-white disabled:opacity-30"
                aria-label="Ångra"
              >
                <Undo2 className="h-5 w-5" />
              </button>
              <button
                onClick={redo}
                disabled={!future.length}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-ink/15 bg-white disabled:opacity-30"
                aria-label="Gör om"
              >
                <Redo2 className="h-5 w-5" />
              </button>
              {palette.map((def) => (
                <button
                  key={def.type}
                  onClick={() => setPlacing(placing === def.type ? null : def.type)}
                  className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border-2 p-1.5 ${
                    placing === def.type ? "border-ink bg-tang" : "border-ink/10 bg-white"
                  }`}
                >
                  <svg viewBox="-3.6 -3.6 7.2 7.2" className="h-8 w-8">
                    <ObstacleGlyph type={def.type} sw={0.2} />
                  </svg>
                  <span className="text-[9px] font-bold leading-tight">{def.label}</span>
                </button>
              ))}
            </div>
            {placing && (
              <button
                onClick={() => setPlacing(null)}
                className="mt-1.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 text-xs font-bold text-forest"
              >
                <X className="h-4 w-4" /> Avbryt placering av {getObstacleDefV2(placing)?.label.toLowerCase()}
              </button>
            )}
          </div>
        </main>
      </div>

      {/* ── Dela-dialog (e-postgrinden) ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="border-2 border-ink bg-paper sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase tracking-wide">Dela din bana</DialogTitle>
            <DialogDescription className="text-ink/60">
              Hela banan kodas i länken — mottagaren behöver varken konto eller app.
            </DialogDescription>
          </DialogHeader>
          {isSubscribed() ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-white px-3 font-mono text-xs outline-none"
                />
                <button
                  onClick={copyShare}
                  className="pressable shadow-hard-sm inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border-2 border-ink bg-tang px-4 text-sm font-bold"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Kopierad!" : "Kopiera"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => void openComments()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-sm font-bold transition-colors hover:border-ink"
                >
                  <MessageSquare className="h-4 w-4" /> Kommentarer
                </button>
                <button
                  onClick={() => void openClubShare()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-sm font-bold transition-colors hover:border-ink"
                >
                  <Users className="h-4 w-4" /> Dela till klubb
                </button>
              </div>
              {!user && (
                <p className="text-xs leading-relaxed text-ink/50">
                  Kommentarer och klubbdelning kräver ett gratis konto — banan sparas då i molnet.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-ink/10 bg-white p-4">
              <p className="mb-3 text-sm leading-relaxed text-ink/70">
                För att dela behöver vi din e-post — det är vår enda "valuta". Du får nyheter,
                nya banor och tävlingstips. Inga pengar, inget krångel.
              </p>
              <EmailCapture compact onDone={() => forceShareRefresh((x) => x + 1)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bibliotek, kommentarer, klubbdelning, auth ── */}
      <CourseLibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} onPick={pickFromLibrary} />

      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent className="w-full border-l-2 border-ink bg-paper sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl uppercase tracking-wide">Kommentarer</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CourseCommentsPanel courseId={cloudId} enabled={!!cloudId} />
          </div>
        </SheetContent>
      </Sheet>

      <ClubShareDialog open={clubShareOpen} onOpenChange={setClubShareOpen} courseId={cloudId} courseName={name} />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      <PlannerProfileDialog
        open={profileOpen}
        onOpenChange={(o) => { setProfileOpen(o); if (!o) setPendingSaveShare(false); }}
        reason={pendingSaveShare ? "Ange namn och e-post för att spara och dela banan." : undefined}
        onReady={() => { if (pendingSaveShare) { setPendingSaveShare(false); setSaveShareOpen(true); } }}
      />

      <SaveShareDialog
        open={saveShareOpen}
        onOpenChange={setSaveShareOpen}
        courseName={name}
        sport={sport}
        courseData={socialCourseData()}
        courseId={socialCourseId}
        onSaved={({ id }) => {
          setSocialCourseId(id);
          try { localStorage.setItem(SOCIAL_ID_KEY, id); } catch { /* ignorera */ }
        }}
      />

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        courseData={obstacles.length ? socialCourseData() : undefined}
      />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />

      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJsonFile} />

      {exporting && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-paper shadow-hard">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Skapar {exporting}…
        </div>
      )}

      {/* ── 3D ── */}
      {view3D && (
        <LazyCoursePlanner3D
          obstacles={mapAllToObstacle3D(numbered, w, h, (t) => getObstacleDefV2(t)?.label)}
          paths={[]}
          widthMeters={w}
          heightMeters={h}
          courseName={name}
          initialMode={view3D}
          onClose={() => setView3D(null)}
        />
      )}
    </div>
  );
}
