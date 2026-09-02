import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft, BookOpen, Box, Check, ChevronDown, ChevronUp, CloudCheck,
  Command, Copy, Download, Eraser, Footprints, Grid2x2, Keyboard, Link2, Loader2, Lock,
  Lightbulb, Maximize, MoreHorizontal, MousePointerClick, Play, Redo2, RotateCcw, RotateCw, Ruler,
  Share2, ShieldCheck, Spline, Trash2, Undo2, Unlock, X, ZoomIn, ZoomOut,
} from "lucide-react";

import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { uid, type PlacedObstacle, type Sport } from "@/lib/course";
import { ObstacleGlyph } from "@/components/ObstacleGlyph";
import { Logo } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
import { MAX_IMPORT_JSON_CHARS, parseCourseJson } from "@/features/course-planner-v2/importJson";
import { clampArenaM, gridTicks } from "@/lib/courseSafety";
import { instantiatePrebuilt, type PrebuiltCourse } from "@/features/course-planner-v2/templates";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import type { LibraryCourse } from "@/features/course-planner-v2/library";
import CourseLibraryDialog from "@/features/course-planner-v2/CourseLibraryDialog";
import { CommandPalette, type PaletteCommand } from "@/components/course-planner-v2/CommandPalette";
import { KeyboardShortcutsHelp } from "@/components/course-planner-v2/KeyboardShortcutsHelp";
import { CanvasRulers } from "@/components/course-planner-v2/CanvasRulers";
import { ExportMenu } from "@/components/course-planner-v2/ExportMenu";
import { RuleSetTrustBadge } from "@/components/course-planner-v2/RuleSetTrustBadge";
import {
  CoursePlaybackControls, CoursePlaybackOverlay,
} from "@/components/course-planner-v2/CoursePlayback";
import { useCoursePlayback } from "@/components/course-planner-v2/useCoursePlayback";
import LazyCoursePlanner3D from "@/features/course-planner/3d/LazyCoursePlanner3D";
import { mapAllToObstacle3D } from "@/features/course-planner-v2/to3DCoords";
import { makeQrDataUrl } from "@/lib/qrDataUrl";
import { usePlannerProfile } from "@/lib/plannerProfile";
import PlannerProfileDialog from "@/features/planner-social/PlannerProfileDialog";
import SaveShareDialog from "@/features/planner-social/SaveShareDialog";
import FeedbackDialog from "@/features/planner-social/FeedbackDialog";
import { CourseMenu } from "@/components/course-planner-v2/CourseMenu";
import { OpenCourseDialog } from "@/components/course-planner-v2/OpenCourseDialog";
import { ConfirmDialog, NameCourseDialog } from "@/components/course-planner-v2/ConfirmDialog";
import {
  saveLocalCourse, type LocalCourse,
} from "@/features/course-planner-v2/localCourses";

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
const SOCIAL_ID_KEY = "am-planner-shared-course";
const RULER_PX = 24;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

/** Zoom + panorering av banvyn (pan i meter). */
interface ViewState { zoom: number; panX: number; panY: number }

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

function draftFromRawCourse(raw: unknown): Draft | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  let json = "";
  try {
    json = JSON.stringify(raw);
  } catch {
    return null;
  }
  if (!json || json.length > MAX_IMPORT_JSON_CHARS) return null;

  const parsed = parseCourseJson(json);
  if (!parsed.ok) return null;
  const base = defaultDraft(parsed.course.sport);
  const rawRuleSetId = (raw as { ruleSetId?: unknown }).ruleSetId;
  const ruleSetId = typeof rawRuleSetId === "string" && getRuleSet(rawRuleSetId)
    ? rawRuleSetId
    : base.ruleSetId;

  return {
    ...base,
    name: parsed.course.name,
    sport: parsed.course.sport,
    sizeClass: parsed.course.sizeClass,
    arenaWidthM: parsed.course.arenaWidthM,
    arenaHeightM: parsed.course.arenaHeightM,
    classTemplate: parsed.course.classTemplate,
    obstacles: normalizeObstacles(parsed.course.obstacles),
    ruleSetId,
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
    if (json.length > MAX_IMPORT_JSON_CHARS) return null;
    // Samma hårdning som JSON-import: storlek, hinder-tak, textlängder,
    // numeriska klampar, okända fält/typer strippas innan state nås.
    return draftFromRawCourse(JSON.parse(json));
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
    const parsed = draftFromRawCourse(c.course_data);
    if (!parsed) return null;
    return {
      ...parsed,
      name: String(c.name || parsed.name || "Sparad bana").slice(0, 120),
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
        if (d.obstacles.length === 0) return defaultDraft(d.sport === "hoopers" ? "hoopers" : "agility");
        const parsed = draftFromRawCourse(d);
        if (parsed) return parsed;
      }
    }
  } catch {
    /* ignorera */
  }
  return defaultDraft(search.get("sport") === "hoopers" ? "hoopers" : "agility");
}

export default function PlannerPage() {
  const [search] = useSearchParams();
  const { profile: plannerProfile } = usePlannerProfile();
  const isExternalCopy = search.has("bana") || search.has("template") || search.has("delad");
  const [draft, setDraft] = useState<Draft>(() => loadInitial(search));
  // Externa kopior (?bana=/?template=/?delad=) får aldrig skriva över
  // användarens egen autosparade bana förrän hen faktiskt redigerar kopian.
  // Referensen håller exakt det innehåll som kom utifrån.
  const externalSnapshotRef = useRef<string | null>(null);
  if (isExternalCopy && externalSnapshotRef.current === null) {
    externalSnapshotRef.current = JSON.stringify(draft);
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<ObstacleTypeV2 | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [showLine, setShowLine] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [view, setView] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 });
  const zoom = view.zoom;
  const [past, setPast] = useState<PlacedObstacle[][]>([]);
  const [future, setFuture] = useState<PlacedObstacle[][]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [view3D, setView3D] = useState<"view" | "walk" | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  // PDF-exporterna märks alltid med en liten agilitymanager.se-byline.
  // Det finns ingen betald nivå — bylinen är bara attribution, inte en upsell.
  const showWatermark = true;
  const [profileOpen, setProfileOpen] = useState(false);
  const [saveShareOpen, setSaveShareOpen] = useState(false);
  const [pendingSaveShare, setPendingSaveShare] = useState(false);
  const [socialCourseId, setSocialCourseId] = useState<string | null>(() => {
    if (isExternalCopy) return null;
    try { return localStorage.getItem(SOCIAL_ID_KEY); } catch { return null; }
  });
  const [canvasPx, setCanvasPx] = useState({ w: 800, h: 600 });
  const [openCourseOpen, setOpenCourseOpen] = useState(false);
  const [localCourseId, setLocalCourseId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  // Bekräftelsedialoger (ersätter window.confirm/prompt för a11y + tydlighet)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [pendingOpenDraft, setPendingOpenDraft] = useState<{
    next: Draft;
    ids: { local?: string | null; social?: string | null };
  } | null>(null);
  const [pendingLibraryPick, setPendingLibraryPick] = useState<{
    kind: "prebuilt" | "saved";
    payload: PrebuiltCourse | LibraryCourse;
    next: Draft;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean; start: PlacedObstacle[] } | null>(null);
  const rotateRef = useRef<{ id: string; start: PlacedObstacle[] } | null>(null);
  const panRef = useRef<{ id: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number } | null>(null);
  const spaceRef = useRef(false);

  const { sport, name, obstacles } = draft;
  const w = clampArenaM(draft.arenaWidthM, 30);
  const h = clampArenaM(draft.arenaHeightM, 40);

  // Banidentitet = vilken community-bana (planner-social) som en ev.
  // "Spara & dela" ska uppdatera. Delade länkar/mallar är alltid nya kopior.
  const resetCourseIdentity = useCallback((nextSocialId: string | null = null) => {
    setSocialCourseId(nextSocialId);
    try {
      if (nextSocialId) localStorage.setItem(SOCIAL_ID_KEY, nextSocialId);
      else localStorage.removeItem(SOCIAL_ID_KEY);
    } catch {
      /* localStorage kan vara avstängt */
    }
  }, []);

  // Delade länkar och mall-länkar är alltid nya kopior. De får aldrig ärva
  // spar-ID från den bana som råkade vara öppen i webbläsaren tidigare.
  useEffect(() => {
    if (isExternalCopy) resetCourseIdentity(null);
  }, [isExternalCopy, resetCourseIdentity]);

  // Öppna en delad bana från communityn (?delad=<id>) och bygg vidare på den
  const sharedParam = search.get("delad");
  const [sharedDone, setSharedDone] = useState(false);
  const [sharedFailed, setSharedFailed] = useState(false);
  const loadingShared = !!sharedParam && !sharedDone && !sharedFailed;
  useEffect(() => {
    if (!sharedParam) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("planner_courses")
          .select("id, name, sport, course_data")
          .eq("id", sharedParam)
          .eq("is_public", true)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setSharedFailed(true);
          toast.error("Hittade inte den delade banan", {
            description: "Länken kan vara felaktig eller banan har tagits bort.",
          });
          return;
        }
        const next = draftFromLibraryCourse(data as unknown as LibraryCourse);
        if (!next) {
          setSharedFailed(true);
          toast.error("Kunde inte öppna den delade banan");
          return;
        }
        const copy = { ...next, name: `${next.name} (kopia)` };
        resetCourseIdentity(null);
        // Markera kopians ursprungsinnehåll så att autosparningen inte
        // skriver över användarens lokala bana förrän hen redigerar kopian.
        externalSnapshotRef.current = JSON.stringify(copy);
        setDraft(copy);
        setPast([]);
        setFuture([]);
        setSelectedId(null);
        setSharedDone(true);
        toast.success("Delad bana öppnad — bygg vidare!");
      } catch {
        // Nätverksfel/okonfigurerad backend — aldrig fastna i laddningsläge.
        if (cancelled) return;
        setSharedFailed(true);
        toast.error("Kunde inte hämta den delade banan", {
          description: "Kontrollera din uppkoppling och öppna länken igen.",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [sharedParam, resetCourseIdentity]);

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
    // En oredigerad extern kopia (delad länk/mall) får inte skriva över
    // användarens egen autosparade bana. Först vid faktisk redigering
    // blir kopian det nya autosparade utkastet.
    if (isExternalCopy && JSON.stringify(draft) === externalSnapshotRef.current) {
      return;
    }
    let flashTimer: ReturnType<typeof setTimeout> | null = null;
    const saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSavedFlash(true);
        flashTimer = setTimeout(() => setSavedFlash(false), 1600);
      } catch {
        /* fullt/localStorage avstängt */
      }
    }, 600);
    return () => {
      clearTimeout(saveTimer);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, [draft, isExternalCopy]);

  // ── Koordinater ─────────────────────────────────────────────
  const vw = w / zoom;
  const vh = h / zoom;
  const viewMinX = (w - vw) / 2 + view.panX;
  const viewMinY = (h - vh) / 2 + view.panY;

  const toField = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const local = point.matrixTransform(ctm.inverse());
      return {
        x: clamp(local.x, 0, w),
        y: clamp(local.y, 0, h),
      };
    },
    [w, h]
  );

  // ── Zoom & panorering ───────────────────────────────────────
  /** Zooma till ett nytt värde och håll punkten under (clientX, clientY) stilla. */
  const zoomToValue = useCallback(
    (resolve: (current: number) => number, clientX?: number, clientY?: number) => {
      setView((v) => {
        const next = clamp(resolve(v.zoom), ZOOM_MIN, ZOOM_MAX);
        if (Math.abs(next - v.zoom) < 1e-4) return v;
        const rect = svgRef.current?.getBoundingClientRect();
        const hasAnchor = rect && clientX !== undefined && clientY !== undefined && rect.width > 0 && rect.height > 0;
        if (!hasAnchor) return { ...v, zoom: next };
        const fx = (clientX! - rect!.left) / rect!.width;
        const fy = (clientY! - rect!.top) / rect!.height;
        const vwOld = w / v.zoom;
        const vhOld = h / v.zoom;
        const px = (w - vwOld) / 2 + v.panX + fx * vwOld;
        const py = (h - vhOld) / 2 + v.panY + fy * vhOld;
        const vwNew = w / next;
        const vhNew = h / next;
        return {
          zoom: next,
          panX: clamp(px - fx * vwNew - (w - vwNew) / 2, -w / 2, w / 2),
          panY: clamp(py - fy * vhNew - (h - vhNew) / 2, -h / 2, h / 2),
        };
      });
    },
    [w, h]
  );

  const zoomStep = useCallback(
    (dir: 1 | -1, clientX?: number, clientY?: number) =>
      zoomToValue((z) => (dir === 1 ? z * 1.25 : z / 1.25), clientX, clientY),
    [zoomToValue]
  );

  const resetView = useCallback(() => setView({ zoom: 1, panX: 0, panY: 0 }), []);

  /** Passa hela banan i vyn (bredd och höjd). */
  const fitToScreen = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) { resetView(); return; }
    // Vid zoom=1 visas w × h i viewBox, utsträckt över hela ytan. Vi vill att
    // banans proportion får plats: minsta av bredd-/höjdförhållandet.
    const fit = Math.min(1, (rect.width / rect.height) / (w / h));
    setView({ zoom: clamp(fit, ZOOM_MIN, ZOOM_MAX), panX: 0, panY: 0 });
  }, [w, h, resetView]);

  const panByPx = useCallback(
    (dxPx: number, dyPx: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      setView((v) => {
        const dxM = -dxPx * ((w / v.zoom) / rect.width);
        const dyM = -dyPx * ((h / v.zoom) / rect.height);
        return {
          ...v,
          panX: clamp(v.panX + dxM, -w / 2, w / 2),
          panY: clamp(v.panY + dyM, -h / 2, h / 2),
        };
      });
    },
    [w, h]
  );

  // Scrollhjul + styrplattans nyp — native lyssnare (React onWheel är passiv).
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    if (e.ctrlKey || e.metaKey || !e.shiftKey) {
      zoomToValue((z) => z * Math.exp(-dy * 0.0018), e.clientX, e.clientY);
    } else {
      panByPx(-e.deltaX, -dy);
    }
  };
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);


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
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Två fingrar = nyp-zoom + panorering
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(b.x - a.x, b.y - a.y) };
      panRef.current = null;
      dragRef.current = null;
      return;
    }
    // Mellanknapp eller mellanslag = panorera
    if (e.button === 1 || spaceRef.current) {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      panRef.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: false };
      return;
    }
    const pt = toField(e.clientX, e.clientY);
    if (placing) {
      const ob: PlacedObstacle = { id: uid(), type: placing, x: snapM(pt.x), y: snapM(pt.y), rotation: 0 };
      setObstacles([...obstacles, ob]);
      setSelectedId(ob.id);
      return;
    }
    // Ett finger/mus på tom yta: panorera vid drag, avmarkera vid klick.
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    panRef.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: false };
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
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // Nyp-zoom
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const prev = pinchRef.current.dist;
      if (prev > 1) {
        const factor = dist / prev;
        if (Math.abs(factor - 1) > 0.002) zoomToValue((z) => z * factor, midX, midY);
      }
      pinchRef.current = { dist };
      return;
    }
    if (panRef.current && panRef.current.id === e.pointerId) {
      const dx = e.clientX - panRef.current.lastX;
      const dy = e.clientY - panRef.current.lastY;
      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        if (Math.hypot(e.clientX - panRef.current.lastX, e.clientY - panRef.current.lastY) > 0.5) {
          panRef.current.moved = panRef.current.moved || Math.hypot(dx, dy) > 2;
        }
        if (panRef.current.moved) panByPx(dx, dy);
        panRef.current.lastX = e.clientX;
        panRef.current.lastY = e.clientY;
      }
      if (panRef.current.moved) return;
    }
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

  const onPointerUp = (e?: React.PointerEvent) => {
    if (e) pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (panRef.current && (!e || panRef.current.id === e.pointerId)) {
      const wasClick = !panRef.current.moved;
      panRef.current = null;
      if (wasClick && !placing) setSelectedId(null);
    }
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
    setConfirmClearOpen(true);
  };

  const doClearAll = () => {
    setObstacles([]);
    setSelectedId(null);
    toast.success("Banan rensad", { description: "Du kan ångra med Ctrl+Z." });
  };

  // ── Bibliotek ───────────────────────────────────────────────
  const applyLibraryPick = (kind: "prebuilt" | "saved", payload: PrebuiltCourse | LibraryCourse, next: Draft) => {
    setDraft(next);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    resetCourseIdentity(kind === "saved" ? (payload as LibraryCourse).id : null);
    toast.success(`Laddade "${next.name}"`);
  };

  const pickFromLibrary = (kind: "prebuilt" | "saved", payload: PrebuiltCourse | LibraryCourse) => {
    const next = kind === "prebuilt" ? draftFromPrebuilt(payload as PrebuiltCourse) : draftFromLibraryCourse(payload as LibraryCourse);
    if (!next) {
      toast.error("Kunde inte läsa banan");
      return;
    }
    if (obstacles.length > 0) {
      setPendingLibraryPick({ kind, payload, next });
      return;
    }
    applyLibraryPick(kind, payload, next);
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
    resetCourseIdentity(null);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
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

  // ── Spara / öppna banor (meny) ──────────────────────────────
  const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const dirty = savedSnapshot !== draftSnapshot;

  const persistCourse = async (opts?: { asNew?: boolean; name?: string }) => {
    const targetName = (opts?.name ?? name).trim() || "Min bana";
    const nextDraft: Draft = { ...draftRef.current, name: targetName };
    if (targetName !== name) setDraft((d) => ({ ...d, name: targetName }));
    const id = saveLocalCourse({
      id: opts?.asNew ? null : localCourseId,
      name: targetName,
      sport: nextDraft.sport,
      obstacleCount: nextDraft.obstacles.length,
      data: nextDraft,
    });
    setLocalCourseId(id);
    setSavedSnapshot(JSON.stringify(nextDraft));
    setLastSavedAt(new Date().toISOString());
    toast.success(`"${targetName}" sparad i den här webbläsaren`);
  };

  const handleSaveAs = () => setSaveAsOpen(true);

  const doNewCourse = () => {
    setDraft(defaultDraft(sport));
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    setPlacing(null);
    setLocalCourseId(null);
    setSavedSnapshot(null);
    setLastSavedAt(null);
    resetCourseIdentity(null);
    resetView();
  };

  const handleNewCourse = () => {
    if (dirty && obstacles.length) {
      setConfirmNewOpen(true);
      return;
    }
    doNewCourse();
  };

  const doApplyOpenedDraft = (next: Draft, ids: { local?: string | null; social?: string | null }) => {
    setDraft(next);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    setPlacing(null);
    setLocalCourseId(ids.local ?? null);
    resetCourseIdentity(ids.social ?? null);
    setSavedSnapshot(JSON.stringify(next));
    setLastSavedAt(new Date().toISOString());
    setOpenCourseOpen(false);
    resetView();
    toast.success(`Öppnade "${next.name}"`);
  };

  const applyOpenedDraft = (next: Draft, ids: { local?: string | null; social?: string | null }) => {
    if (dirty && obstacles.length) {
      setPendingOpenDraft({ next, ids });
      return;
    }
    doApplyOpenedDraft(next, ids);
  };

  const openLocalCourse = (c: LocalCourse) => {
    const data = c.data as Draft | null;
    if (!data || !Array.isArray(data.obstacles)) {
      toast.error("Kunde inte läsa den sparade banan");
      return;
    }
    applyOpenedDraft({ ...defaultDraft(data.sport === "hoopers" ? "hoopers" : "agility"), ...data }, { local: c.id });
  };

  // Öppna en bana från "Mina banor" (planner-social). Banan kopplas till
  // sin community-rad så att nästa "Spara & dela" uppdaterar samma bana.
  const openSavedSharedCourse = (c: LibraryCourse) => {
    const next = draftFromLibraryCourse(c);
    if (!next) {
      toast.error("Kunde inte läsa den sparade banan");
      return;
    }
    applyOpenedDraft(next, { social: c.id });
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

  // ── Kommandopalett ──────────────────────────────────────────
  const hasSelection = !!selected;
  const canPlay = numbered.filter((o) => o.number != null).length >= 2;
  const hasObstacles = obstacles.length > 0;
  const commands: PaletteCommand[] = useMemo(() => [
    { id: "undo", label: "Ångra", group: "Redigera", shortcut: ["Ctrl", "Z"], icon: <Undo2 className="h-4 w-4" />, run: undo, disabled: past.length === 0, hint: past.length === 0 ? "Inget att ångra ännu" : undefined },
    { id: "redo", label: "Gör om", group: "Redigera", shortcut: ["Ctrl", "Shift", "Z"], icon: <Redo2 className="h-4 w-4" />, run: redo, disabled: future.length === 0, hint: future.length === 0 ? "Inget att göra om" : undefined },
    { id: "duplicate", label: "Duplicera valt hinder", group: "Redigera", shortcut: ["Ctrl", "D"], run: duplicateSelected, disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "delete", label: "Ta bort valt hinder", group: "Redigera", shortcut: ["Delete"], icon: <Trash2 className="h-4 w-4" />, run: deleteSelected, disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "rotate-cw", label: "Rotera 45° medurs", group: "Redigera", shortcut: ["R"], icon: <RotateCw className="h-4 w-4" />, run: () => rotateBy(45), disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "rotate-ccw", label: "Rotera 45° moturs", group: "Redigera", shortcut: ["Shift", "R"], icon: <RotateCcw className="h-4 w-4" />, run: () => rotateBy(-45), disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "lock", label: "Lås/lås upp valt hinder", group: "Redigera", shortcut: ["L"], icon: <Lock className="h-4 w-4" />, run: toggleLockSelected, disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "clear", label: "Rensa banan", group: "Redigera", icon: <Eraser className="h-4 w-4" />, run: clearAll, disabled: !hasObstacles, hint: hasObstacles ? undefined : "Banan är redan tom" },
    { id: "line", label: showLine ? "Dölj springlinje" : "Visa springlinje", group: "Visa", icon: <Spline className="h-4 w-4" />, run: () => setShowLine((v) => !v) },
    { id: "numbers", label: showNumbers ? "Dölj nummer" : "Visa nummer", group: "Visa", run: () => setShowNumbers((v) => !v) },
    { id: "grid", label: showGrid ? "Dölj rutnät" : "Visa rutnät", group: "Visa", icon: <Grid2x2 className="h-4 w-4" />, run: () => setShowGrid((v) => !v) },
    { id: "rulers", label: showRulers ? "Dölj linjaler" : "Visa linjaler", group: "Visa", icon: <Ruler className="h-4 w-4" />, run: () => setShowRulers((v) => !v) },
    { id: "zoom-in", label: "Zooma in", group: "Visa", shortcut: ["+"], icon: <ZoomIn className="h-4 w-4" />, run: () => zoomStep(1) },
    { id: "zoom-out", label: "Zooma ut", group: "Visa", shortcut: ["-"], icon: <ZoomOut className="h-4 w-4" />, run: () => zoomStep(-1) },
    { id: "zoom-reset", label: "Zoom 100 %", group: "Visa", shortcut: ["0"], run: resetView },
    { id: "zoom-fit", label: "Passa banan i skärmen", group: "Visa", icon: <Maximize className="h-4 w-4" />, run: fitToScreen },
    { id: "save-course", label: "Spara bana", group: "Bana", shortcut: ["Ctrl", "S"], run: () => void persistCourse(), disabled: !hasObstacles, hint: hasObstacles ? undefined : "Lägg till hinder först" },
    { id: "save-course-as", label: "Spara bana som…", group: "Bana", run: handleSaveAs, disabled: !hasObstacles, hint: hasObstacles ? undefined : "Lägg till hinder först" },
    { id: "open-course", label: "Öppna sparad bana", group: "Bana", shortcut: ["Ctrl", "O"], run: () => setOpenCourseOpen(true) },
    { id: "new-course", label: "Ny bana", group: "Bana", run: handleNewCourse },
    { id: "issues", label: "Visa regelkontroll", group: "Granska", icon: <ShieldCheck className="h-4 w-4" />, run: () => setIssuesOpen(true) },
    { id: "library", label: "Öppna banbibliotek", group: "Bana", icon: <BookOpen className="h-4 w-4" />, run: () => setLibraryOpen(true) },
    { id: "share", label: "Dela bana via länk", group: "Bana", icon: <Share2 className="h-4 w-4" />, run: openShare, disabled: !hasObstacles, hint: hasObstacles ? undefined : "Lägg till hinder först" },
    { id: "save-share", label: "Spara & dela publikt", group: "Bana", icon: <Share2 className="h-4 w-4" />, run: openSaveShare, disabled: !hasObstacles, hint: hasObstacles ? "Betyg & kommentarer via communityn" : "Lägg till hinder först" },
    { id: "feedback", label: "Skicka förslag till banbyggaren", group: "Bana", icon: <Lightbulb className="h-4 w-4" />, run: () => setFeedbackOpen(true) },
    { id: "playback", label: "Spela upp hundens väg", group: "Visa", shortcut: ["Space"], icon: <Play className="h-4 w-4" />, run: () => setPlaybackActive((v) => !v), disabled: !canPlay, hint: canPlay ? undefined : "Numrera minst två hinder först" },
    { id: "3d", label: "Öppna 3D-vy", group: "Visa", shortcut: ["3"], icon: <Box className="h-4 w-4" />, run: () => setView3D("view"), disabled: !hasObstacles, hint: hasObstacles ? undefined : "Lägg till hinder först" },
    { id: "3d-walk", label: "Gå banan i 3D", group: "Visa", icon: <Footprints className="h-4 w-4" />, run: () => setView3D("walk"), disabled: !hasObstacles, hint: hasObstacles ? undefined : "Lägg till hinder först" },
    { id: "png", label: "Exportera PNG-bild", group: "Exportera", icon: <Download className="h-4 w-4" />, run: exportPNG, disabled: !hasObstacles, hint: hasObstacles ? undefined : "Lägg till hinder först" },
    { id: "pdf-judge", label: "Exportera domar-PDF", group: "Exportera", run: onJudgePdf, disabled: !hasObstacles },
    { id: "pdf-training", label: "Exportera tränings-PDF", group: "Exportera", run: onTrainingPdf, disabled: !hasObstacles },
    { id: "pdf-build", label: "Exportera bygg-PDF", group: "Exportera", run: onBuildPdf, disabled: !hasObstacles },
    { id: "pdf-startlist", label: "Exportera startlista", group: "Exportera", run: onStartlistPdf, disabled: !hasObstacles },
    { id: "json", label: "Exportera JSON", group: "Exportera", run: onJson, disabled: !hasObstacles },
    { id: "help", label: "Tangentbordsgenvägar", group: "Hjälp", shortcut: ["?"], run: () => setHelpOpen(true) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [undo, redo, showLine, showNumbers, showGrid, showRulers, selected, obstacles, draft, numbered, exporting, past.length, future.length, hasSelection, canPlay, hasObstacles, plannerProfile]);

  // ── Tangentbord ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const tag = t.tagName;
      // Fält där användaren skriver/väljer — inklusive <select> (annars
      // öppnar t.ex. "3" 3D-vyn medan klassmallen ändras).
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
      // Interaktiva ytor (knappar, länkar, dialoger): Space/Enter ska
      // aktivera det fokuserade elementet — aldrig planerarens genvägar.
      const interactive =
        !!t.closest?.("button, a, [role='dialog'], [role='listbox'], [role='menu'], [role='combobox'], [role='option']");
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "k") {
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
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && key === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && key === "d") {
        e.preventDefault();
        duplicateSelected();
      }
      if ((e.metaKey || e.ctrlKey) && key === "s") {
        e.preventDefault();
        void persistCourse();
      }
      if ((e.metaKey || e.ctrlKey) && key === "o") {
        e.preventDefault();
        setOpenCourseOpen(true);
      }
      // Alla enkeltangents-genvägar kräver att fokus inte ligger på en
      // interaktiv kontroll — annars kapar vi t.ex. Space på en knapp.
      if (e.metaKey || e.ctrlKey || interactive) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) deleteSelected();
      if (key === "r") {
        if (e.shiftKey) rotateBy(-45); else rotateBy(45);
      }
      if (key === "l") toggleLockSelected();
      if (e.key === "3") setView3D("view");
      if (e.key === "?") setHelpOpen(true);
      if (e.code === "Space") {
        e.preventDefault();
        if (numbered.filter((o) => o.number != null).length >= 2) {
          setPlaybackActive((v) => !v);
        }
      }
      if (e.key === "+" || e.key === "=") zoomStep(1);
      if (e.key === "-") zoomStep(-1);
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Render ──────────────────────────────────────────────────

  const ToolButton = ({
    onClick, active, label, children, disabled, toggle,
  }: {
    onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean;
    /** true = knappen är en på/av-toggle och får aria-pressed. */
    toggle?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={toggle ? !!active : undefined}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11 ${
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper text-ink">
      <Seo
        title="Banplanerare — rita agility- och hoopersbanor gratis | AgilityManager"
        description="Rita banor i meterskala direkt i webbläsaren. Hindereditor, live banlinje, PNG-export och delningslänkar för agility och hoopers — gratis, utan konto."
        canonicalPath="/banplanerare"
      />
      {/* ── Topprad ── */}
      <header className="z-40 shrink-0 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-1.5 px-2 sm:gap-3 sm:px-5">

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
            className="w-0 min-w-0 flex-1 rounded-xl border-2 border-transparent bg-transparent px-1.5 py-2 font-display text-base tracking-wide outline-none transition-colors focus:border-ink sm:px-2 sm:text-2xl md:max-w-xs"
            aria-label="Banans namn"
          />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <CourseMenu
              onSave={() => void persistCourse()}
              onSaveAs={handleSaveAs}
              onOpen={() => setOpenCourseOpen(true)}
              onNew={handleNewCourse}
              dirty={dirty}
              lastSavedAt={lastSavedAt}
            />
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors lg:inline-flex ${
                savedFlash ? "bg-forest text-paper" : "bg-cream text-ink/50"
              }`}
            >
              {savedFlash ? "Sparad ✓" : "Autosparas lokalt"}
            </span>
            <div className="hidden sm:block">
              <ToolButton onClick={() => setLibraryOpen(true)} label="Banbibliotek — officiella banor och mallar">
                <BookOpen className="h-5 w-5" />
              </ToolButton>
            </div>

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
              />
            </div>
            <button
              onClick={openSaveShare}
              disabled={!obstacles.length}
              className="pressable shadow-hard-sm inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-forest px-3 text-sm font-bold text-paper disabled:opacity-40 sm:h-11 sm:px-5"
              title={obstacles.length ? "Spara banan på din profil och välj publik eller privat" : "Placera minst ett hinder först"}
              aria-label="Spara och dela banan på din profil"
            >
              <CloudCheck className="h-4 w-4" />{" "}
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
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
                        aria-pressed={placing === def.type}
                        aria-label={`Placera ${def.label.toLowerCase()} — ${def.description}`}
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
                onCornerClick={resetView}
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
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {/* plan */}
                <rect x="0" y="0" width={w} height={h} fill="#FCFAF4" />
                {showGrid && (
                  <g>
                    {gridTicks(w).map((i) => (
                      <line key={`v${i}`} x1={i} y1="0" x2={i} y2={h} stroke="#161812" strokeOpacity={i % 5 === 0 ? 0.12 : 0.05} strokeWidth={(i % 5 === 0 ? 0.05 : 0.025) / Math.sqrt(zoom)} />
                    ))}
                    {gridTicks(h).map((i) => (
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
                            transform={`translate(0 -2.9) rotate(${-ob.rotation})`}
                            onPointerDown={(e) => onRotatePointerDown(e, ob.id)}
                            className="cursor-crosshair"
                          >
                            <circle r="0.5" fill="#E24C00" stroke="#F6F1E7" strokeWidth="0.1" />
                            <RotateCw width="0.5" height="0.5" x="-0.25" y="-0.25" color="#F6F1E7" />
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
              aria-expanded={issuesOpen}
              aria-label={
                issueCounts.error > 0
                  ? `Regelkontroll — ${issueCounts.error} fel, visa lista`
                  : issueCounts.warning > 0
                    ? `Regelkontroll — ${issueCounts.warning} varningar, visa lista`
                    : "Regelkontroll — inga anmärkningar"
              }
              className={`absolute right-3 ${placing ? "top-[4.6rem] sm:top-[2.2rem]" : showRulers ? "top-[2.2rem]" : "top-3"} z-30 inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-2 text-xs font-bold shadow-hard-sm transition-all ${
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

            {/* Hämtar delad bana */}
            {loadingShared && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center p-4" role="status">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-paper px-5 py-4 shadow-hard">
                  <Loader2 className="h-5 w-5 animate-spin text-forest" aria-hidden="true" />
                  <span className="text-sm font-bold">Hämtar delad bana…</span>
                </div>
              </div>
            )}

            {/* Tom bana — kom igång */}
            {obstacles.length === 0 && !placing && !loadingShared && (
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
            <ToolButton
              onClick={undo}
              label={past.length ? `Ångra (Ctrl+Z) — ${past.length} steg att ångra` : "Ångra (Ctrl+Z) — inget att ångra ännu"}
              disabled={!past.length}
            >
              <Undo2 className="h-5 w-5" />
            </ToolButton>
            <ToolButton
              onClick={redo}
              label={future.length ? `Gör om (Ctrl+Shift+Z) — ${future.length} steg att göra om` : "Gör om (Ctrl+Shift+Z) — inget att göra om"}
              disabled={!future.length}
            >
              <Redo2 className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 h-8 w-px bg-ink/15" />
            <ToolButton onClick={() => setShowLine((v) => !v)} active={showLine} toggle label={showLine ? "Dölj springlinje" : "Visa springlinje"}>
              <Spline className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={() => setShowNumbers((v) => !v)} active={showNumbers} toggle label={showNumbers ? "Dölj nummer" : "Visa nummer"}>
              <span className="text-sm font-black">#</span>
            </ToolButton>
            <ToolButton onClick={() => setShowGrid((v) => !v)} active={showGrid} toggle label={showGrid ? "Dölj rutnät" : "Visa rutnät"}>
              <Grid2x2 className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={() => setShowRulers((v) => !v)} active={showRulers} toggle label={showRulers ? "Dölj linjaler" : "Visa linjaler"}>
              <Ruler className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 h-8 w-px bg-ink/15" />
            <ToolButton onClick={() => zoomStep(-1)} label="Zooma ut (−)" disabled={zoom <= ZOOM_MIN + 0.001}>
              <ZoomOut className="h-5 w-5" />
            </ToolButton>
            <button onClick={resetView} className="h-11 w-14 rounded-xl border-2 border-ink/15 text-xs font-bold text-ink/70 hover:border-ink" title="Återställ zoom och panorering (0)">
              {Math.round(zoom * 100)}%
            </button>
            <ToolButton onClick={() => zoomStep(1)} label="Zooma in (+)" disabled={zoom >= ZOOM_MAX - 0.001}>
              <ZoomIn className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={fitToScreen} label="Passa banan i skärmen">
              <Maximize className="h-5 w-5" />
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => zoomStep(-1)}
                  disabled={zoom <= ZOOM_MIN + 0.001}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/15 disabled:opacity-30"
                  aria-label="Zooma ut"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={resetView}
                  className="h-9 min-w-[3.25rem] rounded-full border-2 border-ink/15 px-2 text-[11px] font-bold text-ink/70"
                  aria-label={`Zoom ${Math.round(zoom * 100)} procent. Tryck för att återställa`}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => zoomStep(1)}
                  disabled={zoom >= ZOOM_MAX - 0.001}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/15 disabled:opacity-30"
                  aria-label="Zooma in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={fitToScreen}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/15"
                  aria-label="Passa banan i skärmen"
                >
                  <Maximize className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLibraryOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 text-xs font-bold text-ink/70"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Banor
                </button>
              </div>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={undo}
                disabled={!past.length}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-ink/15 bg-white disabled:opacity-30"
                aria-label={past.length ? "Ångra" : "Ångra — inget att ångra ännu"}
              >
                <Undo2 className="h-5 w-5" />
              </button>
              <button
                onClick={redo}
                disabled={!future.length}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-ink/15 bg-white disabled:opacity-30"
                aria-label={future.length ? "Gör om" : "Gör om — inget att göra om"}
              >
                <Redo2 className="h-5 w-5" />
              </button>
              {palette.map((def) => (
                <button
                  key={def.type}
                  onClick={() => setPlacing(placing === def.type ? null : def.type)}
                  aria-pressed={placing === def.type}
                  aria-label={`Placera ${def.label.toLowerCase()}`}
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

      {/* ── Dela-dialog (direktlänk — ingen e-postgrind) ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="border-2 border-ink bg-paper sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase tracking-wide">Dela din bana</DialogTitle>
            <DialogDescription className="text-ink/60">
              Hela banan kodas i länken — mottagaren behöver varken konto eller app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                aria-label="Delningslänk"
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
            <button
              onClick={() => { setShareOpen(false); openSaveShare(); }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-sm font-bold transition-colors hover:border-ink"
            >
              <Share2 className="h-4 w-4" /> Dela publikt till communityn (betyg & kommentarer)
            </button>
            <p className="text-xs leading-relaxed text-ink/50">
              Länken fungerar direkt. Delar du publikt kan andra hitta banan på
              sidan Delade banor, betygsätta och bygga vidare på den.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bibliotek och sparade banor ── */}
      <CourseLibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} onPick={pickFromLibrary} />
      <OpenCourseDialog
        open={openCourseOpen}
        onOpenChange={setOpenCourseOpen}
        onPickLocal={openLocalCourse}
        onPickShared={openSavedSharedCourse}
      />

      {/* ── Bekräftelser och namngivning (ersätter window.confirm/prompt) ── */}
      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Rensa hela banan?"
        description={`Alla ${obstacles.length} hinder tas bort. Du kan ångra direkt efteråt med Ctrl+Z.`}
        confirmLabel="Rensa banan"
        destructive
        onConfirm={doClearAll}
      />
      <ConfirmDialog
        open={confirmNewOpen}
        onOpenChange={setConfirmNewOpen}
        title="Skapa ny tom bana?"
        description="Du har osparade ändringar som försvinner. Välj Spara i bana-menyn först om du vill behålla dem."
        confirmLabel="Ny bana"
        destructive
        onConfirm={doNewCourse}
      />
      <ConfirmDialog
        open={pendingOpenDraft !== null}
        onOpenChange={(v) => { if (!v) setPendingOpenDraft(null); }}
        title={`Öppna "${pendingOpenDraft?.next.name ?? ""}"?`}
        description="Du har osparade ändringar i den nuvarande banan som försvinner."
        confirmLabel="Öppna banan"
        onConfirm={() => {
          if (pendingOpenDraft) doApplyOpenedDraft(pendingOpenDraft.next, pendingOpenDraft.ids);
          setPendingOpenDraft(null);
        }}
      />
      <ConfirmDialog
        open={pendingLibraryPick !== null}
        onOpenChange={(v) => { if (!v) setPendingLibraryPick(null); }}
        title={`Ladda "${pendingLibraryPick?.next.name ?? ""}"?`}
        description="Nuvarande bana ersätts (den är autosparad lokalt i webbläsaren)."
        confirmLabel="Ladda banan"
        onConfirm={() => {
          if (pendingLibraryPick) applyLibraryPick(pendingLibraryPick.kind, pendingLibraryPick.payload, pendingLibraryPick.next);
          setPendingLibraryPick(null);
        }}
      />
      <NameCourseDialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        title="Spara som ny bana"
        description="Den nuvarande banan ligger kvar orörd — du skapar en kopia med nytt namn."
        initialName={`${name} (kopia)`}
        confirmLabel="Spara kopia"
        onSubmit={(newName) => void persistCourse({ asNew: true, name: newName })}
      />

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
