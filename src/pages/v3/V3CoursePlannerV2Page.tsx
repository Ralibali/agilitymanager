/**
 * Banplaneraren v2 — Sprint 1
 * Route: /v3/course-planner-v2
 *
 * Innehåller:
 *  - Topbar: tillbaka, banans namn, autosparad, sport-toggle, spara
 *  - Vänsterkolumn: hinderpalett (komplett enligt SAgiK), klassmallar, bana-egenskaper
 *  - Mitt: banyta i meter med rutnät (1 m linjer)
 *  - Höger: storleksklass (XS–XL) alltid synlig, dynamisk panel under
 *
 * Data sparas i localStorage under egen nyckel — påverkar INTE v1.
 * Hoopers-läget visar palett men sprint 1 är primärt agility.
 */
import { useEffect, useMemo, useRef, useState, useCallback, forwardRef, useImperativeHandle, type PointerEvent, type WheelEvent } from "react";
import { Trash2, RotateCw, Hash, MousePointer2, Eraser, AlertTriangle, AlertCircle, Info, CheckCircle2, Undo2, Redo2, Copy, Magnet, Box, Footprints, Lock, Unlock, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Ruler, Crosshair, Smartphone, Hand, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PreviewGate } from "@/components/v3/PreviewGate";
import { CoursePlannerPreviewSkeleton } from "@/components/v3/previewSkeletons";
import {
  OBSTACLES_V2, SIZE_CLASSES, CLASS_TEMPLATES, getArenaPresetsBySport,
  getObstacleDefV2, getTemplatesBySport,
  type Sport, type SizeClassKey, type ObstacleTypeV2, type ClassTemplateKey, type ObstacleDefV2,
} from "@/features/course-planner-v2/config";
import { validateCourse, computeCourseTimes, summarizeIssues, type ValidationIssue } from "@/features/course-planner-v2/validation";
import { DEFAULT_RULESET_ID, getActiveRuleSets, getRuleSet, getDefaultRuleSetIdForSport } from "@/features/course-planner-v2/rules";
import { buildDogPath, dogPathToSvgD } from "@/features/course-planner-v2/dogPath";
import { analyzeCourse } from "@/features/course-planner-v2/courseAnalysis";
import { exportJudgePdf } from "@/features/course-planner-v2/judgePdf";
import { exportStartlistPdf } from "@/features/course-planner-v2/startlistPdf";
import CourseLibraryDialog from "@/features/course-planner-v2/CourseLibraryDialog";
import ClubShareDialog from "@/features/course-planner-v2/ClubShareDialog";
import CourseCommentsPanel from "@/features/course-planner-v2/CourseCommentsPanel";
import { instantiatePrebuilt, type PrebuiltCourse } from "@/features/course-planner-v2/templates";
import type { LibraryCourse } from "@/features/course-planner-v2/library";
import { CommandPalette } from "@/components/course-planner-v2/CommandPalette";
import { KeyboardShortcutsHelp } from "@/components/course-planner-v2/KeyboardShortcutsHelp";
import { ExportMenu } from "@/components/course-planner-v2/ExportMenu";
import { PlannerTopbar } from "@/components/course-planner-v2/PlannerTopbar";
import { CanvasRulers } from "@/components/course-planner-v2/CanvasRulers";
import { ViewportControls } from "@/components/course-planner-v2/ViewportControls";
import { useCanvasViewport } from "@/features/course-planner-v2/useCanvasViewport";
import { MobileObstacleSheet } from "@/components/course-planner-v2/MobileObstacleSheet";
import { MobileBottomDock } from "@/components/course-planner-v2/MobileBottomDock";
import { RuleSetTrustBadge } from "@/components/course-planner-v2/RuleSetTrustBadge";
import { buildPlannerCommands } from "@/features/course-planner-v2/plannerCommands";
import { useCoursePlannerHotkeys } from "@/hooks/useCoursePlannerHotkeys";
import { useProfileName } from "@/hooks/useProfileName";
import { exportTrainingPdf } from "@/features/course-planner-v2/trainingPdf";
import { exportBuildPdf } from "@/features/course-planner-v2/buildPdf";
import { mapAllToObstacle3D } from "@/features/course-planner-v2/to3DCoords";
import { parseCourseJson } from "@/features/course-planner-v2/importJson";
import { renderCourseImage, shareCanvas } from "@/lib/shareImage";
import { trackEvent } from "@/lib/analyticsLoader";
import { clampObstacleToArena, clampCenterForRotatedBox, getDeviceClass } from "@/features/course-planner-v2/geometry";
import { pinchSample, pinchScale, pinchPanDelta, type PinchSample } from "@/features/course-planner-v2/gestureMath";
import { MobileSelectedObstacleSheet } from "@/components/course-planner-v2/MobileSelectedObstacleSheet";
import { makeQrDataUrl } from "@/lib/qrDataUrl";
import LazyCoursePlanner3D from "@/features/course-planner/3d/LazyCoursePlanner3D";
import {
  CoursePlaybackOverlay,
  CoursePlaybackControls,
  useCoursePlayback,
} from "@/components/course-planner-v2/CoursePlayback";

const DIM_STORAGE_KEY = "am_planner_show_dimensions";

const STORAGE_KEY = "am_course_planner_v2";

interface ObstacleV2 {
  id: string;
  type: ObstacleTypeV2;
  /** position i meter (0,0 = banans övre vänstra hörn). */
  x: number;
  y: number;
  rotation: number;
  number?: number;
  /** Tunnel-böjning 0–90° (0 = rak). Endast meningsfullt för tunneltyper. */
  curveDeg?: number;
  /** Vilken sida tunneln böjer åt. Default "right". */
  curveSide?: "left" | "right";
  /** Låst hinder kan inte flyttas, roteras, dupliceras eller raderas. */
  locked?: boolean;
  /** Z-order för render-sortering. Default 0. */
  zIndex?: number;
}

interface CourseV2 {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleV2[];
  /**
   * Id på versionerat regelverk (se @/features/course-planner-v2/rules).
   * Saknas på gamla banor — fallback i loadCourse sätter default per sport.
   */
  ruleSetId?: string;
}

const DEFAULT_COURSE: CourseV2 = {
  name: "Ny bana",
  sport: "agility",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  classTemplate: null,
  obstacles: [],
  ruleSetId: DEFAULT_RULESET_ID,
};

function loadCourse(): CourseV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COURSE;
    const parsed = JSON.parse(raw);
    const merged: CourseV2 = { ...DEFAULT_COURSE, ...parsed };
    // Prompt A: gamla banor saknar ruleSetId — sätt default baserat på sport.
    if (!merged.ruleSetId) merged.ruleSetId = getDefaultRuleSetIdForSport(merged.sport);
    return merged;
  } catch { return DEFAULT_COURSE; }
}

function saveCourse(c: CourseV2) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

function uid() { return Math.random().toString(36).slice(2, 10); }

/** Bounding-rektangel (AABB) i meter för ett hinder, med rotation. */
function obstacleBox(o: { x: number; y: number; rotation: number }, w: number, d: number) {
  const rad = (o.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = (w * cos + d * sin) / 2;
  const halfH = (w * sin + d * cos) / 2;
  return { minX: o.x - halfW, maxX: o.x + halfW, minY: o.y - halfH, maxY: o.y + halfH };
}

function rectsOverlap(a: { minX: number; maxX: number; minY: number; maxY: number }, b: typeof a) {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
}

export default function V3CoursePlannerV2Page() {
  const { subscription } = useAuth();
  if (!subscription.loading && !subscription.subscribed) {
    return (
      <PreviewGate featureKey="course-planner" preview={<CoursePlannerPreviewSkeleton />}>
        <V3CoursePlannerV2PageInner />
      </PreviewGate>
    );
  }
  return <V3CoursePlannerV2PageInner />;
}

/** Imperative API som ArenaCanvas exponerar för sin förälder. */
interface ArenaCanvasHandle {
  fitToScreen(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomAtClient(factor: number, clientX: number, clientY: number): void;
  zoomTo(zoom: number, anchorClientX?: number, anchorClientY?: number): void;
  panByPx(dxPx: number, dyPx: number): void;
  clientToCourseM(clientX: number, clientY: number): { x: number; y: number };
  getViewportCenterCourseM(): { x: number; y: number };
  getZoom(): number;
  getSvgElement(): SVGSVGElement | null;
}

function V3CoursePlannerV2PageInner() {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const isPremium = !!subscription.subscribed;
  const [showWatermark, setShowWatermark] = useState(true);
  const isMobile = useIsMobile();
  const [course, setCourseRaw] = useState<CourseV2>(() => loadCourse());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "erase" | "number" | "measure" | "pan">("select");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(() => {
    try { return localStorage.getItem(DIM_STORAGE_KEY) !== "0"; } catch { return true; }
  });
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [snap, setSnap] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY + "_cloud_id"); } catch { return null; }
  });
  const [savingCloud, setSavingCloud] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [view3D, setView3D] = useState<null | "view" | "walk">(null);
  const [playback2D, setPlayback2D] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileObstaclesOpen, setMobileObstaclesOpen] = useState(false);
  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Imperative handle mot ArenaCanvas — hooken useCanvasViewport bor inuti
  // barnkomponenten och exponerar zoom/pan/fit/koordinatkonvertering härifrån.
  const arenaCanvasRef = useRef<ArenaCanvasHandle>(null);

  // Pointer- och drag-session state (bevaras i föräldern eftersom historik
  // och tävlingsstate hanteras här).
  const pointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartRef = useRef<
    { sample: PinchSample; startZoom: number } | null
  >(null);
  const dragSessionRef = useRef<
    | { id: string; originalCourse: CourseV2; startX: number; startY: number; moved: boolean; lastCellKey: string }
    | null
  >(null);
  const panSessionRef = useRef<{ lastClientX: number; lastClientY: number } | null>(null);

  // Persistera Mått-toggle.
  useEffect(() => {
    try { localStorage.setItem(DIM_STORAGE_KEY, showDimensions ? "1" : "0"); } catch { /* ignore */ }
  }, [showDimensions]);

  // Helskärmsläge — lyssna på fullscreenchange.
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Emit `course_planner_opened` en gång per mount, med sport och device-klass.
  // Ingen bane-data eller koordinater lämnar klienten.
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackEvent("course_planner_opened", {
      sport: course.sport,
      device_class: getDeviceClass(),
    });
    // course.sport läses medvetet vid mount — inte som dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = fullscreenRootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch (e) { console.error(e); }
  }, []);
  // Stoppa orefererade variabler från att smälla — kommer bindas i nästa pass.
  void isFullscreen; void toggleFullscreen; void fullscreenRootRef;

  // Emit `course_validation_opened` när regelpanelen öppnas.
  useEffect(() => {
    if (issuesOpen) {
      trackEvent("course_validation_opened", { sport: course.sport, device_class: getDeviceClass() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuesOpen]);

  // Emit `course_3d_opened` när 3D-läget öppnas.
  useEffect(() => {
    if (view3D) {
      trackEvent("course_3d_opened", { sport: course.sport, mode: view3D, device_class: getDeviceClass() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view3D]);

  // Fit-to-screen på mobil första gången canvasstorleken är känd (så användaren
  // Auto-fit vid första storlek och vid arena-/sportbyte ligger nu inne i
  // ArenaCanvas (den äger viewport-hooken och sin egen ResizeObserver).


  // 2D-uppspelning ("Spela upp banan").
  const playback = useCoursePlayback(course, playback2D);

  // Esc stänger uppspelningen.
  useEffect(() => {
    if (!playback2D) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlayback2D(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback2D]);

  // Undo/redo (begränsad till 30 steg)
  const historyRef = useRef<{ past: CourseV2[]; future: CourseV2[] }>({ past: [], future: [] });
  const skipHistoryRef = useRef(false);

  const setCourse = useCallback((updater: CourseV2 | ((c: CourseV2) => CourseV2)) => {
    setCourseRaw((prev) => {
      const next = typeof updater === "function" ? (updater as (c: CourseV2) => CourseV2)(prev) : updater;
      if (!skipHistoryRef.current && next !== prev) {
        historyRef.current.past.push(prev);
        if (historyRef.current.past.length > 30) historyRef.current.past.shift();
        historyRef.current.future = [];
      }
      skipHistoryRef.current = false;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const prev = h.past.pop()!;
    setCourseRaw((cur) => { h.future.unshift(cur); return prev; });
    skipHistoryRef.current = true;
  }, []);
  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future.shift()!;
    setCourseRaw((cur) => { h.past.push(cur); return next; });
    skipHistoryRef.current = true;
  }, []);

  // Autospara lokalt
  useEffect(() => {
    const t = setTimeout(() => { saveCourse(course); setSavedAt(new Date()); }, 600);
    return () => clearTimeout(t);
  }, [course]);

  // Globala kortkommandon hanteras av useCoursePlannerHotkeys (anropas
  // längre ner i komponenten där alla handlers redan är definierade).

  // Validering + tider — räknas live
  const issues = useMemo(() => validateCourse(course), [course]);
  const issueSummary = useMemo(() => summarizeIssues(issues), [issues]);
  const issueIdSet = useMemo(() => new Set(issues.filter((i) => i.obstacleId).map((i) => i.obstacleId!)), [issues]);
  const times = useMemo(() => computeCourseTimes(course), [course]);

  const profileName = useProfileName();

  const baseExportInput = useCallback(() => ({
    name: course.name,
    sport: course.sport,
    sizeClass: course.sizeClass,
    arenaWidthM: course.arenaWidthM,
    arenaHeightM: course.arenaHeightM,
    classTemplate: course.classTemplate,
    obstacles: course.obstacles,
    authorName: profileName,
    ruleSetId: course.ruleSetId,
    showWatermark: !isPremium || showWatermark,
  }), [course, profileName, isPremium, showWatermark]);

  // Bygger dataURL för QR-koden som pekar tillbaka till banplaneraren.
  // Använder en engångs-per-export rendering för att undvika onödigt jobb.
  async function buildQrDataUrl(): Promise<string | undefined> {
    try {
      return await makeQrDataUrl(
        "https://agilitymanager.se/banplanerare?utm_source=pdf&utm_medium=export",
        256,
      );
    } catch {
      return undefined;
    }
  }

  async function handleExportPdf() {
    try {
      const qrDataUrl = await buildQrDataUrl();
      await exportJudgePdf({ ...baseExportInput(), qrDataUrl, svgElement: arenaCanvasRef.current?.getSvgElement() ?? null });
      toast.success("Domar-PDF skapad");
    } catch (e) { console.error(e); toast.error("Kunde inte skapa PDF"); }
  }

  async function handleExportTrainingPdf() {
    try {
      const qrDataUrl = await buildQrDataUrl();
      await exportTrainingPdf({ ...baseExportInput(), qrDataUrl });
      toast.success("Tränings-PDF skapad");
    }
    catch (e) { console.error(e); toast.error("Kunde inte skapa PDF"); }
  }

  async function handleExportBuildPdf() {
    try {
      const qrDataUrl = await buildQrDataUrl();
      await exportBuildPdf({ ...baseExportInput(), qrDataUrl });
      toast.success("Bygg-PDF skapad");
    }
    catch (e) { console.error(e); toast.error("Kunde inte skapa PDF"); }
  }


  function handleExportJson() {
    try {
      const data = JSON.stringify({ version: 2, ...course }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(course.name || "bana").replace(/[^a-z0-9åäö_-]+/gi, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exporterad");
    } catch { toast.error("Kunde inte exportera JSON"); }
  }

  function handleImportJsonClick() {
    importInputRef.current?.click();
  }

  async function handleImportJsonFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Filen är för stor (max 5 MB).");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error("Kunde inte läsa filen.");
      return;
    }
    const result = parseCourseJson(text);
    if (result.ok !== true) {
      toast.error(result.error);
      return;
    }
    if (course.obstacles.length > 0) {
      const ok = window.confirm(
        `Importera "${result.course.name}"?\nDen ersätter den nuvarande banan (${course.obstacles.length} hinder).`,
      );
      if (!ok) return;
    }
    setCourse({
      name: result.course.name,
      sport: result.course.sport,
      sizeClass: result.course.sizeClass,
      arenaWidthM: result.course.arenaWidthM,
      arenaHeightM: result.course.arenaHeightM,
      classTemplate: result.course.classTemplate,
      obstacles: result.course.obstacles,
    });
    setSelectedId(null);
    // Lokal moln-länk gäller inte längre — nästa molnspar skapar ny rad.
    setCloudId(null);
    try { localStorage.removeItem(STORAGE_KEY + "_cloud_id"); } catch { /* ignore */ }
    if (result.warnings.length > 0) {
      toast.success(`Banan importerad — ${result.warnings.join(" ")}`);
    } else {
      toast.success(`"${result.course.name}" importerad`);
    }
  }
  async function saveToCloud(opts?: { silent?: boolean }): Promise<string | null> {
    if (!user?.id) {
      if (!opts?.silent) toast.error("Logga in för att spara i molnet");
      return null;
    }
    setSavingCloud(true);
    try {
      const payload = {
        user_id: user.id,
        name: course.name || "Ny bana",
        description: "",
        course_data: {
          version: 2,
          sport: course.sport,
          sizeClass: course.sizeClass,
          arenaWidthM: course.arenaWidthM,
          arenaHeightM: course.arenaHeightM,
          classTemplate: course.classTemplate,
          obstacles: course.obstacles,
        } as any,
        canvas_width: Math.round(course.arenaWidthM * 20),
        canvas_height: Math.round(course.arenaHeightM * 20),
      };
      let id = cloudId;
      if (id) {
        const { error } = await supabase.from("saved_courses")
          .update(payload).eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("saved_courses")
          .insert(payload).select("id").single();
        if (error) throw error;
        id = data.id as string;
        setCloudId(id);
        try { localStorage.setItem(STORAGE_KEY + "_cloud_id", id); } catch { /* ignore */ }
      }
      if (!opts?.silent) toast.success("Bana sparad i molnet");
      return id;
    } catch (e) {
      console.error(e);
      if (!opts?.silent) toast.error("Kunde inte spara i molnet");
      return null;
    } finally {
      setSavingCloud(false);
    }
  }

  async function handleShare() {
    const id = cloudId ?? await saveToCloud({ silent: true });
    if (!id) {
      toast.error("Banan måste sparas i molnet först — logga in och försök igen");
      return;
    }
    setShareOpen(true);
  }

  function handleTrainThis() {
    const sport = course.sport === "agility" ? "agility" : "hoopers";
    const params = new URLSearchParams({
      from: "course-planner",
      sport,
      courseName: course.name || "Ny bana",
      sizeClass: course.sizeClass,
    });
    if (cloudId) params.set("courseId", cloudId);
    navigate(`/v3/training?${params.toString()}`);
  }


  function handlePickFromLibrary(kind: "prebuilt" | "saved", payload: PrebuiltCourse | LibraryCourse) {
    if (course.obstacles.length > 0) {
      const ok = window.confirm("Att ladda en ny bana ersätter nuvarande bana. Fortsätt?");
      if (!ok) return;
    }
    if (kind === "prebuilt") {
      const p = payload as PrebuiltCourse;
      setCourse({
        name: p.label, sport: p.sport, sizeClass: p.defaultSize,
        arenaWidthM: p.arenaWidthM, arenaHeightM: p.arenaHeightM,
        classTemplate: p.classTemplate, obstacles: instantiatePrebuilt(p),
      });
      setCloudId(null);
      try { localStorage.removeItem(STORAGE_KEY + "_cloud_id"); } catch { /* ignore */ }
      toast.success(`${p.label} laddad`);
    } else {
      const c = payload as LibraryCourse;
      const data = c.course_data as any;
      if (!data?.obstacles) { toast.error("Banan har ett okänt format"); return; }
      setCourse({
        name: c.name,
        sport: data.sport ?? "agility",
        sizeClass: data.sizeClass ?? "L",
        arenaWidthM: data.arenaWidthM ?? 30,
        arenaHeightM: data.arenaHeightM ?? 40,
        classTemplate: data.classTemplate ?? null,
        obstacles: data.obstacles,
      });
      // Bara aktivera moln-länk om det är ägarens egna bana
      if (user?.id === c.user_id) {
        setCloudId(c.id);
        try { localStorage.setItem(STORAGE_KEY + "_cloud_id", c.id); } catch { /* ignore */ }
      } else {
        setCloudId(null);
        try { localStorage.removeItem(STORAGE_KEY + "_cloud_id"); } catch { /* ignore */ }
      }
      setSelectedId(null);
      toast.success(`${c.name} laddad`);
    }
  }

  // Snap-to-grid: 0.5 m steg
  function snapM(v: number): number {
    return snap ? Math.round(v * 2) / 2 : v;
  }

  const selected = course.obstacles.find((o) => o.id === selectedId) ?? null;


  function update(patch: Partial<CourseV2>) {
    setCourse((c) => ({ ...c, ...patch }));
  }

  function switchSport(next: Sport) {
    if (next === course.sport) return;
    const nextRuleSetId = getDefaultRuleSetIdForSport(next);
    if (course.obstacles.length > 0) {
      const ok = window.confirm("Att byta sport kräver tom bana. Vill du rensa banan och byta?");
      if (!ok) return;
      setCourse((c) => ({ ...c, sport: next, obstacles: [], classTemplate: null, ruleSetId: nextRuleSetId }));
      setSelectedId(null);
      return;
    }
    update({ sport: next, classTemplate: null, ruleSetId: nextRuleSetId });
  }

  function placeObstacle(type: ObstacleTypeV2) {
    const def = getObstacleDefV2(type);
    if (!def) return;
    if (!def.sport.includes(course.sport)) {
      toast.error(`${def.label} hör inte till ${course.sport === "agility" ? "agility" : "hoopers"}`);
      return;
    }
    const id = uid();
    // Placeringspunkt = viewportens mitt i banans meter-koord (via ArenaCanvas
    // imperative-API). Faller tillbaka till arenans mitt tills canvas är monterad.
    const vpCenter = arenaCanvasRef.current?.getViewportCenterCourseM();
    const arenaCx = course.arenaWidthM / 2;
    const arenaCy = course.arenaHeightM / 2;
    const cx = vpCenter && Number.isFinite(vpCenter.x) ? vpCenter.x : arenaCx;
    const cy = vpCenter && Number.isFinite(vpCenter.y) ? vpCenter.y : arenaCy;
    // Diskret offset per placering så flera hinder inte hamnar exakt ovanpå.
    // Räknar antal hinder av samma typ, offsettar 0.5 m diagonalt per steg.
    const sameTypeCount = course.obstacles.filter((o) => o.type === type).length;
    const offset = sameTypeCount * 0.5;
    const clamped = clampCenterForRotatedBox(
      { x: cx + offset, y: cy + offset },
      def.sizeM.w, def.sizeM.d, 0,
      course.arenaWidthM, course.arenaHeightM,
    );
    const ob: ObstacleV2 = {
      id, type,
      x: snapM(clamped.x),
      y: snapM(clamped.y),
      rotation: 0,
    };
    setCourse((c) => ({ ...c, obstacles: [...c.obstacles, ob] }));
    setSelectedId(id);
    setTool("select");
    try { navigator.vibrate?.(8); } catch { /* ignore */ }
    trackEvent("course_obstacle_added", { sport: course.sport, obstacle_type: type, device_class: getDeviceClass() });
  }

  function duplicateObstacle(id: string) {
    const ob = course.obstacles.find((o) => o.id === id);
    if (!ob) return;
    const def = getObstacleDefV2(ob.type);
    const dims = def?.sizeM ?? { w: 1, d: 1 };
    const newId = uid();
    // +1, +1 kan hamna utanför banan om ob ligger nära hörnet — klampa via
    // rotated bounds så hela kopian är innanför även vid roterade långhopp.
    const clamped = clampCenterForRotatedBox(
      { x: ob.x + 1, y: ob.y + 1 },
      dims.w, dims.d, ob.rotation,
      course.arenaWidthM, course.arenaHeightM,
    );
    // Duplikat ärver INTE locked — användaren vill kunna flytta kopian direkt.
    const copy: ObstacleV2 = {
      ...ob, id: newId,
      x: snapM(clamped.x),
      y: snapM(clamped.y),
      number: undefined,
      locked: false,
    };
    setCourse((c) => ({ ...c, obstacles: [...c.obstacles, copy] }));
    setSelectedId(newId);
  }

  function applyTemplate(key: ClassTemplateKey) {
    const t = CLASS_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    if (course.obstacles.length > 0) {
      const ok = window.confirm("Klassmallen ersätter nuvarande bana. Fortsätt?");
      if (!ok) return;
    }
    setCourse({
      ...course,
      sport: t.sport,
      sizeClass: t.defaultSize,
      arenaWidthM: t.arenaWidthM,
      arenaHeightM: t.arenaHeightM,
      classTemplate: key,
      obstacles: [],
      name: t.label,
    });
    setSelectedId(null);
    toast.success(`${t.label} laddad`);
  }

  function deleteObstacle(id: string) {
    const ob = course.obstacles.find((o) => o.id === id);
    if (ob?.locked) {
      toast.error("Hindret är låst — lås upp först");
      return;
    }
    setCourse((c) => ({ ...c, obstacles: c.obstacles.filter((o) => o.id !== id) }));
    setSelectedId(null);
  }

  function rotateObstacle(id: string, deg: number) {
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o) => {
        if (o.id !== id) return o;
        if (o.locked) return o;
        const rotation = (o.rotation + deg + 360) % 360;
        // Efter rotation kan hindrets AABB sticka utanför arenan; klampa in
        // via geometry-helpern så att t.ex. ett långt slalom vid vänsterkanten
        // ryckt in något efter en 90° rotation istället för att lämna banan.
        const def = getObstacleDefV2(o.type);
        const dims = def?.sizeM ?? { w: 1, d: 1 };
        const clamped = clampCenterForRotatedBox(
          { x: o.x, y: o.y }, dims.w, dims.d, rotation,
          c.arenaWidthM, c.arenaHeightM,
        );
        return { ...o, rotation, x: snapM(clamped.x), y: snapM(clamped.y) };
      }),
    }));
  }

  function setTunnelCurve(id: string, patch: { curveDeg?: number; curveSide?: "left" | "right" }) {
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o) => {
        if (o.id !== id) return o;
        if (o.locked) return o;
        const curveDeg = patch.curveDeg !== undefined ? Math.max(0, Math.min(90, patch.curveDeg)) : o.curveDeg;
        const curveSide = patch.curveSide ?? o.curveSide;
        return { ...o, curveDeg, curveSide };
      }),
    }));
  }

  function toggleLock(id: string) {
    let nowLocked = false;
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o) => {
        if (o.id !== id) return o;
        nowLocked = !o.locked;
        return { ...o, locked: nowLocked };
      }),
    }));
    // Toast efter setState — använd setTimeout för att läsa nowLocked korrekt
    setTimeout(() => toast.success(nowLocked ? "Hinder låst" : "Hinder upplåst"), 0);
  }

  /** Returnerar hinder vars bounding-rektangel överlappar givet hinder. */
  function getOverlappingObstacles(target: ObstacleV2, all: ObstacleV2[]): ObstacleV2[] {
    const def = getObstacleDefV2(target.type);
    if (!def) return [];
    const ra = obstacleBox(target, def.sizeM.w, def.sizeM.d);
    return all.filter((o) => {
      if (o.id === target.id) return false;
      const od = getObstacleDefV2(o.type);
      if (!od) return false;
      const rb = obstacleBox(o, od.sizeM.w, od.sizeM.d);
      return rectsOverlap(ra, rb);
    });
  }

  function bringForward(id: string) {
    setCourse((c) => {
      const target = c.obstacles.find((o) => o.id === id);
      if (!target) return c;
      const overlap = getOverlappingObstacles(target, c.obstacles);
      const max = overlap.reduce((m, o) => Math.max(m, o.zIndex ?? 0), target.zIndex ?? 0);
      const next = max + 1;
      return { ...c, obstacles: c.obstacles.map((o) => o.id === id ? { ...o, zIndex: next } : o) };
    });
    toast.success("Flyttad framåt");
  }

  function sendBackward(id: string) {
    setCourse((c) => {
      const target = c.obstacles.find((o) => o.id === id);
      if (!target) return c;
      const overlap = getOverlappingObstacles(target, c.obstacles);
      const min = overlap.reduce((m, o) => Math.min(m, o.zIndex ?? 0), target.zIndex ?? 0);
      const next = min - 1;
      return { ...c, obstacles: c.obstacles.map((o) => o.id === id ? { ...o, zIndex: next } : o) };
    });
    toast.success("Flyttad bakåt");
  }

  function bringToFront(id: string) {
    setCourse((c) => {
      const max = c.obstacles.reduce((m, o) => Math.max(m, o.zIndex ?? 0), 0);
      return { ...c, obstacles: c.obstacles.map((o) => o.id === id ? { ...o, zIndex: max + 1 } : o) };
    });
    toast.success("Flyttad längst fram");
  }

  function sendToBack(id: string) {
    setCourse((c) => {
      const min = c.obstacles.reduce((m, o) => Math.min(m, o.zIndex ?? 0), 0);
      return { ...c, obstacles: c.obstacles.map((o) => o.id === id ? { ...o, zIndex: min - 1 } : o) };
    });
    toast.success("Flyttad längst bak");
  }

  function setObstacleNumber(id: string, num: number | undefined) {
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o) => o.id === id ? { ...o, number: num } : o),
    }));
  }

  function autoRenumber() {
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o, i) => ({ ...o, number: i + 1 })),
    }));
    toast.success("Numrerar i placeringsordning");
  }

  /**
   * Pointerdown på ett hinder. Startar en drag-session (för undo) om
   * verktyget är select/pan och hindret inte är låst. Är verktyget `erase`
   * eller `number` hanteras klicket direkt utan drag.
   *
   * Om ett andra finger redan är nere behandlas gesten som pinch och drag
   * startar inte — se `handleSvgBackgroundPointerDown` för pinch-init.
   */
  function handlePointerDown(e: PointerEvent<SVGGElement>, id: string) {
    e.stopPropagation();
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    // Om två fingrar redan är nere: cancel drag och låt pinch-hanteraren ta över.
    if (pointersRef.current.size >= 2) {
      dragSessionRef.current = null;
      setDraggingId(null);
      return;
    }
    const ob = course.obstacles.find((o) => o.id === id);
    if (tool === "erase") { deleteObstacle(id); return; }
    if (tool === "number") {
      if (ob?.locked) { toast.error("Hindret är låst"); return; }
      const next = ob?.number ? undefined : ((Math.max(0, ...course.obstacles.map((x) => x.number ?? 0))) + 1);
      setObstacleNumber(id, next);
      return;
    }
    setSelectedId(id);
    if (ob?.locked) return;
    if (!ob) return;
    setDraggingId(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragSessionRef.current = {
      id,
      originalCourse: course,
      startX: ob.x,
      startY: ob.y,
      moved: false,
      lastCellKey: `${Math.round(ob.x * 2)}:${Math.round(ob.y * 2)}`,
    };
    try { navigator.vibrate?.(8); } catch { /* ignore */ }
  }

  /**
   * Pointermove på SVG-nivå. Tre olika lägen:
   *  1. 2+ pointers → pinch: zoom + tvåfinger-pan via viewport-hooken.
   *  2. draggingId satt → flytta det aktiva hindret. Använder
   *     viewport.clientToCourseM för korrekt konvertering vid zoom/pan.
   *  3. panSession aktiv → panorera viewporten (pan-verktyg / bakgrund).
   *
   * Under drag används `skipHistoryRef` så att varje pointermove INTE
   * skapar en undo-post. Snapshot av original läggs i historiken vid
   * pointerup (se `handleSvgPointerUp`).
   */
  function handleSvgPointerMove(e: PointerEvent<SVGSVGElement>) {
    // Uppdatera pointerns senaste position.
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    // Pinch (2 fingrar) — dominerar över drag/pan.
    if (pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values()).slice(0, 2) as [
        { clientX: number; clientY: number },
        { clientX: number; clientY: number },
      ];
      const sample = pinchSample(pts[0], pts[1]);
      if (!pinchStartRef.current) {
        pinchStartRef.current = { sample, startZoom: viewport.state.zoom };
        // Avbryt eventuell drag så att pinch inte råkar flytta ett hinder.
        dragSessionRef.current = null;
        setDraggingId(null);
      } else {
        const scale = pinchScale(pinchStartRef.current.sample, sample);
        const nextZoom = pinchStartRef.current.startZoom * scale;
        viewport.zoomTo(nextZoom, sample.mid.clientX, sample.mid.clientY);
        const dp = pinchPanDelta(pinchStartRef.current.sample, sample);
        viewport.panByPx(dp.dxPx, dp.dyPx);
        pinchStartRef.current = { sample, startZoom: nextZoom };
      }
      return;
    }

    // Hinder-drag.
    if (draggingId && dragSessionRef.current) {
      const local = viewport.clientToCourseM(e.clientX, e.clientY);
      const session = dragSessionRef.current;
      skipHistoryRef.current = true;
      setCourseRaw((c) => ({
        ...c,
        obstacles: c.obstacles.map((o) => {
          if (o.id !== draggingId) return o;
          const def = getObstacleDefV2(o.type);
          const dims = def?.sizeM ?? { w: 1, d: 1 };
          const clamped = clampObstacleToArena(
            { ...o, x: local.x, y: local.y },
            { widthM: c.arenaWidthM, heightM: c.arenaHeightM },
            dims,
          );
          const nx = snapM(clamped.x);
          const ny = snapM(clamped.y);
          const cellKey = `${Math.round(nx * 2)}:${Math.round(ny * 2)}`;
          if (cellKey !== session.lastCellKey) {
            session.lastCellKey = cellKey;
            session.moved = session.moved || nx !== session.startX || ny !== session.startY;
            // Haptic bara vid varje ny snap-cell — inte varje move.
            try { navigator.vibrate?.(4); } catch { /* ignore */ }
          }
          return { ...clamped, x: nx, y: ny };
        }),
      }));
      return;
    }

    // Pan-session (bakgrund + pan-verktyg / space+drag desktop).
    if (panSessionRef.current) {
      const dx = e.clientX - panSessionRef.current.lastClientX;
      const dy = e.clientY - panSessionRef.current.lastClientY;
      panSessionRef.current = { lastClientX: e.clientX, lastClientY: e.clientY };
      viewport.panByPx(dx, dy);
    }
  }

  function handleSvgPointerUp(e: PointerEvent<SVGSVGElement>) {
    pointersRef.current.delete(e.pointerId);
    // Om vi tappar den andra pointern under pinch → återställ pinch-start.
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (draggingId) {
      const session = dragSessionRef.current;
      if (session && session.moved) {
        // Skapa en ENDA history-transition för hela draget: pusha original.
        historyRef.current.past.push(session.originalCourse);
        if (historyRef.current.past.length > 30) historyRef.current.past.shift();
        historyRef.current.future = [];
        trackEvent("course_obstacle_moved", {
          sport: course.sport,
          device_class: getDeviceClass(),
        });
      }
      dragSessionRef.current = null;
      setDraggingId(null);
    }
    panSessionRef.current = null;
  }

  /**
   * Pointerdown på SVG-bakgrunden (inte på ett hinder). Registrerar
   * pointern, initierar pinch när ett andra finger går ned, eller startar
   * pan när pan-verktyget är aktivt.
   */
  function handleSvgBackgroundPointerDown(e: PointerEvent<SVGSVGElement>) {
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values()).slice(0, 2) as [
        { clientX: number; clientY: number },
        { clientX: number; clientY: number },
      ];
      pinchStartRef.current = {
        sample: pinchSample(pts[0], pts[1]),
        startZoom: viewport.state.zoom,
      };
      // Om vi råkade dra ett hinder — släpp det, pinch tar över.
      dragSessionRef.current = null;
      setDraggingId(null);
      return;
    }
    if (tool === "pan") {
      panSessionRef.current = { lastClientX: e.clientX, lastClientY: e.clientY };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
  }

  /**
   * Wheel/trackpad. ctrl/meta = zoom kring pointern (matchar
   * mac/trackpad-pinch som skickas som wheel + ctrlKey). Annars normal
   * scroll — vi låter sidan hantera det så att långa banor inte låser
   * hela viewporten.
   */
  function handleSvgWheel(e: WheelEvent<SVGSVGElement>) {
    if (e.ctrlKey || e.metaKey) {
      // Trackpad-pinch/ctrl-scroll = zoom kring pekaren.
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      viewport.zoomAtClient(factor, e.clientX, e.clientY);
      return;
    }
    // Vanlig scroll → panorera viewporten. Dra åt höger/ner motsvarar positiv delta.
    if (e.deltaX === 0 && e.deltaY === 0) return;
    e.preventDefault();
    viewport.panByPx(-e.deltaX, -e.deltaY);
  }


  const palette = useMemo(
    () => OBSTACLES_V2.filter((o) => o.sport.includes(course.sport)),
    [course.sport],
  );
  const grouped = useMemo(() => {
    const m = new Map<string, ObstacleDefV2[]>();
    for (const o of palette) {
      const list = m.get(o.category) ?? [];
      list.push(o); m.set(o.category, list);
    }
    return Array.from(m.entries());
  }, [palette]);
  const sizeDef = SIZE_CLASSES.find((s) => s.key === course.sizeClass)!;
  const templates = getTemplatesBySport(course.sport);
  const arenaPresets = useMemo(() => getArenaPresetsBySport(course.sport), [course.sport]);

  // Spara-handler delas av topbar-knapp, palette och Ctrl+S.
  const handleSaveAll = useCallback(async () => {
    saveCourse(course);
    if (user) await saveToCloud();
    else toast.success("Bana sparad lokalt");
  }, [course, user]); // saveToCloud läses som closure — OK eftersom course är dep.

  // Globala kortkommandon (DEL 2 i sprint 6).
  useCoursePlannerHotkeys({
    openPalette: () => setPaletteOpen(true),
    openHelp: () => setHelpOpen(true),
    save: () => { void handleSaveAll(); },
    exportJudgePdf: () => { void handleExportPdf(); },
    undo,
    redo,
    duplicateSelected: () => { if (selectedId) duplicateObstacle(selectedId); },
    deleteSelected: () => { if (selectedId) deleteObstacle(selectedId); },
    rotateSelected: (deg) => { if (selectedId) rotateObstacle(selectedId, deg); },
    setToolSelect: () => setTool("select"),
    setToolErase: () => setTool("erase"),
    setToolNumber: () => setTool("number"),
    togglePath: () => setShowPath((v) => !v),
    deselect: () => setSelectedId(null),
    hasSelection: () => selectedId != null,
    bringForward: () => { if (selectedId) bringForward(selectedId); },
    sendBackward: () => { if (selectedId) sendBackward(selectedId); },
    bringToFront: () => { if (selectedId) bringToFront(selectedId); },
    sendToBack: () => { if (selectedId) sendToBack(selectedId); },
    toggleLockSelected: () => { if (selectedId) toggleLock(selectedId); },
  });

  // Bygger kommandolistan för paletten.
  const paletteCommands = useMemo(() => buildPlannerCommands({
    save: () => { void handleSaveAll(); },
    openLibrary: () => setLibraryOpen(true),
    openShare: () => { void handleShare(); },
    trainThis: handleTrainThis,
    importJson: handleImportJsonClick,
    setToolSelect: () => setTool("select"),
    setToolErase: () => setTool("erase"),
    setToolNumber: () => setTool("number"),
    autoNumber: autoRenumber,
    togglePath: () => setShowPath((v) => !v),
    toggleValidation: () => setIssuesOpen((v) => !v),
    addObstacle: placeObstacle,
    switchSport,
    currentSport: course.sport,
    exportJudgePdf: () => { void handleExportPdf(); },
    exportTrainingPdf: () => { void handleExportTrainingPdf(); },
    exportBuildPdf: () => { void handleExportBuildPdf(); },
    exportStartlist: () => exportStartlistPdf({
      courseName: course.name, sport: course.sport,
      sizeClass: course.sizeClass, classTemplate: course.classTemplate,
      obstacles: course.obstacles,
    }),
    open3DView: () => setView3D("view"),
    open3DWalk: () => setView3D("walk"),
    play2D: () => setPlayback2D(true),
    undo, redo,
    duplicateSelected: () => { if (selectedId) duplicateObstacle(selectedId); },
    deleteSelected: () => { if (selectedId) deleteObstacle(selectedId); },
    hasSelection: selectedId != null,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    toggleLockSelected: () => { if (selectedId) toggleLock(selectedId); },
    bringForward: () => { if (selectedId) bringForward(selectedId); },
    sendBackward: () => { if (selectedId) sendBackward(selectedId); },
    bringToFront: () => { if (selectedId) bringToFront(selectedId); },
    sendToBack: () => { if (selectedId) sendToBack(selectedId); },
  }), [course, selectedId, handleSaveAll, undo, redo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[100dvh] bg-background text-neutral-900 pb-[max(env(safe-area-inset-bottom),5rem)] lg:pb-0">
      {/* TOPBAR — strukturerad med funktionell gruppering, kebab-overflow på mobil */}
      <PlannerTopbar
        courseName={course.name}
        onCourseNameChange={(name) => update({ name })}
        savedAt={savedAt}
        sportToggle={<SegmentedSport value={course.sport} onChange={switchSport} />}
        validationBadge={
          <ValidationBadge summary={issueSummary} onClick={() => setIssuesOpen((v) => !v)} active={issuesOpen} />
        }
        exportMenu={
          <ExportMenu
            onJudge={() => { void handleExportPdf(); }}
            onTraining={() => { void handleExportTrainingPdf(); }}
            onBuild={() => { void handleExportBuildPdf(); }}
            onStartlist={() => exportStartlistPdf({
              courseName: course.name, sport: course.sport,
              sizeClass: course.sizeClass, classTemplate: course.classTemplate,
              obstacles: course.obstacles,
            })}
            onJson={handleExportJson}
            onImportJson={handleImportJsonClick}
            onShareImage={async () => {
              try {
                const canvas = renderCourseImage({
                  courseName: course.name || "Ny bana",
                  sport: course.sport,
                  sizeClass: course.sizeClass,
                  classTemplate: course.classTemplate,
                  obstacleCount: course.obstacles.length,
                  obstacles: course.obstacles.map((o) => ({ x: o.x, y: o.y, number: o.number ?? null })),
                  ringMeters: { width: course.arenaWidthM, height: course.arenaHeightM },
                }, { showWatermark: !isPremium || showWatermark });
                const result = await shareCanvas(canvas, `${(course.name || "bana").replace(/\s+/g, "-").toLowerCase()}.png`, course.name || "Min bana");
                toast.success(result === "shared" ? "Bana delad" : "Bild nedladdad");
              } catch (e) {
                toast.error("Kunde inte skapa bild");
                console.error(e);
              }
            }}
            on3DView={() => setView3D("view")}
            on3DWalk={() => setView3D("walk")}
            isPremium={isPremium}
            showWatermark={showWatermark}
            onToggleWatermark={setShowWatermark}
          />
        }
        onLibrary={() => setLibraryOpen(true)}
        onTrain={handleTrainThis}
        onShare={handleShare}
        shareDisabled={!user}
        shareTitle={user ? "Dela banan (klubb / publik länk)" : "Logga in för att dela"}
        onSave={async () => {
          saveCourse(course);
          if (user) await saveToCloud();
          else toast.success("Bana sparad lokalt");
        }}
        saveDisabled={savingCloud}
        isAuthenticated={!!user}
      />

      {/* Dold input för JSON-import. Triggas via ExportMenu eller kommandopaletten. */}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportJsonFile(file);
          // Nollställ värdet så samma fil kan importeras igen
          e.target.value = "";
        }}
      />

      <ClubShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        courseId={cloudId}
        courseName={course.name || "Ny bana"}
      />

      <CourseLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onPick={handlePickFromLibrary}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={paletteCommands}
      />

      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />

      {view3D && (
        <LazyCoursePlanner3D
          obstacles={mapAllToObstacle3D(
            course.obstacles,
            course.arenaWidthM,
            course.arenaHeightM,
            (t) => getObstacleDefV2(t)?.label,
          )}
          paths={[]}
          widthMeters={course.arenaWidthM}
          heightMeters={course.arenaHeightM}
          courseName={course.name}
          initialMode={view3D}
          onClose={() => setView3D(null)}
        />
      )}

      {issuesOpen && (
        <div className="bg-card border-b border-border px-4 py-3 max-h-[40vh] overflow-y-auto">
          <IssuesList issues={issues} onSelect={(id) => { if (id) setSelectedId(id); }} />
        </div>
      )}

      {/* Mobil-banner "visningsläge" borttagen — mobilen är nu ett fullt redigeringsläge. */}

      {/* MAIN GRID */}
      <main className="grid gap-3 p-3 lg:p-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* LEFT — gömd på mobil (visningsläge) */}
        <aside className="hidden lg:block rounded-2xl bg-card border border-border p-3 space-y-4 max-h-[calc(100dvh-90px)] overflow-y-auto">
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Hinder</h3>
            <div className="space-y-3">
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">{cat}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {items.map((def) => (
                      <button
                        key={def.type}
                        onClick={() => placeObstacle(def.type)}
                        title={`${def.label} — ${def.description}`}
                        className="aspect-square rounded-lg border border-border bg-muted/40 hover:bg-primary/5 hover:border-primary/30 grid place-items-center text-[10px] font-medium text-foreground/80 leading-tight px-1 text-center transition"
                      >
                        <ObstacleGlyph type={def.type} />
                        <span className="mt-1 line-clamp-1">{def.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Regelverk</h3>
            <select
              value={course.ruleSetId ?? getDefaultRuleSetIdForSport(course.sport)}
              onChange={(e) => update({ ruleSetId: e.target.value })}
              className="w-full h-9 px-2 rounded-lg text-[12px] font-medium border border-border bg-card text-foreground/90 hover:border-primary/30 transition"
            >
              {getActiveRuleSets().filter((rs) => rs.sport === course.sport).map((rs) => (
                <option key={rs.id} value={rs.id}>
                  {rs.name} ({rs.validFrom.slice(0, 4)}{rs.validTo ? `–${rs.validTo.slice(0, 4)}` : "→"})
                </option>
              ))}
            </select>
            {(() => {
              const rs = getRuleSet(course.ruleSetId ?? getDefaultRuleSetIdForSport(course.sport));
              if (!rs) return null;
              return (
                <div className="mt-2">
                  <RuleSetTrustBadge ruleSet={rs} />
                </div>
              );
            })()}
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Klassmallar</h3>
            <div className="grid gap-1">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => applyTemplate(t.key)}
                  className={cn(
                    "h-9 px-2.5 rounded-lg text-left text-[12px] font-medium border transition",
                    course.classTemplate === t.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/80 border-border hover:border-primary/30",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Banstorlek</h3>
            <div className="grid grid-cols-2 gap-1">
              {arenaPresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => update({ arenaWidthM: p.width, arenaHeightM: p.height })}
                  className={cn(
                    "h-8 rounded-lg text-[11px] font-semibold border transition",
                    course.arenaWidthM === p.width && course.arenaHeightM === p.height
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-card text-neutral-700 border-border hover:border-neutral-400",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* CENTER — banyta */}
        <section className="rounded-2xl bg-card border border-border p-3 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mobil kompletteras av MobileBottomDock nedan. Toolbar-raden är
                  responsiv och wrapar när skärmen är smal. */}
              {/* Grupp: ritverktyg */}
              <ToolBtn active={tool === "select"} onClick={() => setTool("select")} icon={<MousePointer2 size={14} />} title="Välj och flytta hinder">Välj</ToolBtn>
              <ToolBtn active={tool === "pan"} onClick={() => setTool("pan")} icon={<Hand size={14} />} title="Panorera vyn genom att dra bakgrunden">Flytta vy</ToolBtn>
              <ToolBtn active={tool === "erase"} onClick={() => setTool("erase")} icon={<Eraser size={14} />} title="Sudda hinder genom att klicka">Sudda</ToolBtn>
              <ToolBtn active={tool === "number"} onClick={() => setTool("number")} icon={<Hash size={14} />} title="Sätt nummer på hinder genom att klicka i ordning">Nummer</ToolBtn>

              <span className="h-6 w-px bg-black/10 mx-0.5" aria-hidden />
              {/* Grupp: numrering */}
              <button
                type="button"
                onClick={autoRenumber}
                title="Auto-numrera hinder utifrån positionsordning"
                aria-label="Auto-numrera"
                className="h-9 px-3 rounded-full text-[12px] font-semibold bg-card border border-border text-neutral-700 hover:border-neutral-400 transition"
              >
                Auto-numrera
              </button>

              <span className="h-6 w-px bg-black/10 mx-0.5" aria-hidden />

              {/* Grupp: historik */}
              <button
                type="button"
                onClick={undo}
                disabled={historyRef.current.past.length === 0}
                title="Ångra (Ctrl+Z)"
                aria-label="Ångra"
                className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border hover:border-neutral-400 disabled:opacity-30 transition"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={historyRef.current.future.length === 0}
                title="Gör om (Ctrl+Shift+Z)"
                aria-label="Gör om"
                className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border hover:border-neutral-400 disabled:opacity-30 transition"
              >
                <Redo2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => selected && duplicateObstacle(selected.id)}
                disabled={!selected}
                title="Duplicera markerat hinder (Ctrl+D)"
                aria-label="Duplicera"
                className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border hover:border-neutral-400 disabled:opacity-30 transition"
              >
                <Copy size={14} />
              </button>

              <span className="h-6 w-px bg-black/10 mx-0.5" aria-hidden />

              {/* Grupp: hjälpmedel */}
              <button
                type="button"
                onClick={() => setSnap((v) => !v)}
                title="Snap till rutnät (0,5 m)"
                aria-label="Snap-to-grid"
                aria-pressed={snap}
                className={cn(
                  "h-9 px-3 rounded-full text-[12px] font-semibold border inline-flex items-center gap-1.5 transition",
                  snap
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/80 border-border hover:border-foreground/40",
                )}
              >
                <Magnet size={13} /> Snap
              </button>
              <button
                type="button"
                onClick={() => setShowPath((v) => !v)}
                title="Visa banlinjen mellan numrerade hinder"
                aria-label="Visa banlinje"
                aria-pressed={showPath}
                className={cn(
                  "h-9 px-3 rounded-full text-[12px] font-semibold border inline-flex items-center transition",
                  showPath
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/80 border-border hover:border-foreground/40",
                )}
              >
                Banlinje
              </button>
              <button
                type="button"
                onClick={() => setShowDimensions((v) => !v)}
                title="Visa banmått (linjaler i meter)"
                aria-label="Visa mått"
                aria-pressed={showDimensions}
                className={cn(
                  "h-9 px-3 rounded-full text-[12px] font-semibold border inline-flex items-center gap-1.5 transition",
                  showDimensions
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/80 border-border hover:border-foreground/40",
                )}
              >
                <Ruler size={13} /> Mått
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">
              {course.arenaWidthM} × {course.arenaHeightM} m · {times.lengthM.toFixed(1)} m · {course.obstacles.length} hinder
            </div>
          </div>
          <CoursePlaybackControls
            course={course}
            active={playback2D}
            onClose={() => setPlayback2D(false)}
            t={playback.t}
            setT={playback.setT}
            playing={playback.playing}
            setPlaying={playback.setPlaying}
            speed={playback.speed}
            setSpeed={playback.setSpeed}
          />
          <div className="relative">
            <ArenaCanvas
              containerRef={viewport.containerRef}
              svgRef={viewport.svgRef}
              viewBox={viewport.viewBox}
              pxPerM={viewport.metrics.pxPerM}
              course={course}
              selectedId={selectedId}
              highlightIds={issueIdSet}
              showPath={showPath}
              showDimensions={showDimensions}
              onObstacleDown={handlePointerDown}
              onSvgPointerDown={handleSvgBackgroundPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onWheel={handleSvgWheel}
              onBackgroundClick={() => setSelectedId(null)}
              playbackActive={playback2D}
              playbackT={playback.t}
            />
            {/* Mobil zoom-overlay inuti canvas-wrappern. 44px targets. */}
            <div
              className="lg:hidden pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2"
              aria-label="Zoom-kontroller"
            >
              <button
                type="button"
                onClick={() => viewport.zoomIn()}
                aria-label="Zooma in"
                className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-border bg-card/95 text-foreground/80 shadow-sm backdrop-blur active:scale-95"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={() => viewport.fitToScreen()}
                aria-label={`Anpassa banan till skärmen. Zoom ${Math.round(viewport.state.zoom * 100)} procent`}
                className="pointer-events-auto inline-flex h-11 min-w-[60px] items-center justify-center gap-1 rounded-full border border-border bg-card/95 px-2 text-[11px] font-semibold text-foreground/80 shadow-sm backdrop-blur active:scale-95"
              >
                <Maximize size={14} />
                <span>{Math.round(viewport.state.zoom * 100)}%</span>
              </button>
              <button
                type="button"
                onClick={() => viewport.zoomOut()}
                aria-label="Zooma ut"
                className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-border bg-card/95 text-foreground/80 shadow-sm backdrop-blur active:scale-95"
              >
                <ZoomOut size={18} />
              </button>
            </div>
          </div>
        </section>


        {/* RIGHT */}
        <aside className="hidden lg:block rounded-2xl bg-card border border-border p-3 space-y-4 max-h-[calc(100dvh-90px)] overflow-y-auto">
          {/* Storleksklass — alltid synlig */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Storleksklass</h3>
            <div className="grid grid-cols-5 gap-1">
              {SIZE_CLASSES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => update({ sizeClass: s.key })}
                  className={cn(
                    "h-9 rounded-lg text-[12px] font-bold border transition",
                  course.sizeClass === s.key
                      ? "bg-coral-500 text-white border-coral-500"
                      : "bg-card text-foreground/80 border-border hover:border-coral-500/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground leading-snug">
              Hopphöjd <strong>{sizeDef.jumpHeightCm[0]}–{sizeDef.jumpHeightCm[1]} cm</strong> ·
              {" "}däck <strong>{sizeDef.tireHeightCm[0]}–{sizeDef.tireHeightCm[1]} cm</strong>
              <br />
              Långhopp {sizeDef.longJumpPlanks} plankor ({sizeDef.longJumpLengthCm[0]}–{sizeDef.longJumpLengthCm[1]} cm) ·
              {" "}komboavstånd ≥ {sizeDef.comboDistanceM} m
            </div>
          </section>

          {/* Dynamisk panel */}
          {selected ? (
            <SelectedPanel
              obstacle={selected}
              size={course.sizeClass}
              onRotate={(deg) => rotateObstacle(selected.id, deg)}
              onDelete={() => deleteObstacle(selected.id)}
              onNumberChange={(n) => setObstacleNumber(selected.id, n)}
              onTunnelCurve={(p) => setTunnelCurve(selected.id, p)}
              onToggleLock={() => toggleLock(selected.id)}
              onBringForward={() => bringForward(selected.id)}
              onSendBackward={() => sendBackward(selected.id)}
              onBringToFront={() => bringToFront(selected.id)}
              onSendToBack={() => sendToBack(selected.id)}
            />
          ) : (
            <>
              <SummaryPanel course={course} />
              <AnalysisPanel course={course} />
            </>
          )}
          <CourseCommentsPanel courseId={cloudId} enabled={!!cloudId} />
        </aside>
      </main>

      {/* Mobil bottom dock + hinder-sheet — förstaklassig mobilredigering. */}
      <MobileObstacleSheet
        open={mobileObstaclesOpen}
        onOpenChange={setMobileObstaclesOpen}
        sport={course.sport}
        onPick={(type) => placeObstacle(type)}
      />
      <MobileBottomDock
        tool={tool}
        onSetTool={(t) => setTool(t)}
        onAddObstacle={() => setMobileObstaclesOpen(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyRef.current.past.length > 0}
        canRedo={historyRef.current.future.length > 0}
        onValidate={() => setIssuesOpen((v) => !v)}
        errorCount={issueSummary.errors}
        warningCount={issueSummary.warnings}
        onMore={() => setPaletteOpen(true)}
      />
      {/* Kompakt action-panel för markerat hinder — visas ovanför docken.
          Bara på mobil; desktop har redan SelectedPanel i höger sidokolumn. */}
      {isMobile && selected && (
        <MobileSelectedObstacleSheet
          obstacle={selected}
          label={getObstacleDefV2(selected.type)?.label ?? "Hinder"}
          onRotate={(deg) => rotateObstacle(selected.id, deg)}
          onNumber={(n) => setObstacleNumber(selected.id, n)}
          onToggleLock={() => toggleLock(selected.id)}
          onDuplicate={() => duplicateObstacle(selected.id)}
          onDelete={() => deleteObstacle(selected.id)}
          onTunnelCurve={(p) => setTunnelCurve(selected.id, p)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

/* ───────────────── Sub-components ───────────────── */

function SegmentedSport({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <div className="inline-flex h-9 rounded-full bg-muted p-0.5">
      {(["agility", "hoopers"] as Sport[]).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            "h-8 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wide transition",
            value === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
          )}
        >
          {s === "agility" ? "Agility" : "Hoopers"}
        </button>
      ))}
    </div>
  );
}

function ToolBtn({ active, onClick, icon, children, title }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode; title?: string }) {
  // Stilen matchar topbar-knapparna: h-9 rounded-full, samma border-tjocklek.
  // Aktivt verktyg får svart "selected"-look så det inte blandas ihop med
  // gröna toggle-knappar (Snap, Banlinje) som signalerar på/av-läge.
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition border",
        active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-card text-neutral-700 border-border hover:border-neutral-400",
      )}
    >
      {icon}{children}
    </button>
  );
}


function ArenaCanvas({
  containerRef, svgRef, viewBox, pxPerM,
  course, selectedId, highlightIds, showPath, showDimensions = false,
  onObstacleDown, onSvgPointerDown, onPointerMove, onPointerUp, onWheel, onBackgroundClick,
  playbackActive = false, playbackT = 0,
}: {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  viewBox: string;
  pxPerM: number;
  course: CourseV2;
  selectedId: string | null;
  highlightIds: Set<string>;
  showPath: boolean;
  showDimensions?: boolean;
  onObstacleDown: (e: PointerEvent<SVGGElement>, id: string) => void;
  onSvgPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
  onWheel: (e: WheelEvent<SVGSVGElement>) => void;
  onBackgroundClick: () => void;
  playbackActive?: boolean;
  playbackT?: number;
}) {
  const w = course.arenaWidthM;
  const h = course.arenaHeightM;
  // Hundens väg (Prompt B) — mjuk Catmull-Rom-kurva via dogPath.
  const dogPath = buildDogPath(course.obstacles);
  const pathD = dogPathToSvgD(dogPath);

  // Adaptiv tickmark-täthet i meter beroende på arenastorlek.
  const maxArenaM = Math.max(w, h);
  const tickStepM = maxArenaM <= 20 ? 1 : maxArenaM <= 40 ? 5 : 10;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl bg-[#e8efe0] p-2"
      style={{ touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-auto min-h-[min(70dvh,720px)] lg:min-h-0 max-h-[calc(100dvh-200px)] touch-none select-none"
        onPointerDown={onSvgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onClick={onBackgroundClick}
        style={{ cursor: "default" }}
      >
        <rect x={0} y={0} width={w} height={h} fill="#dce5cf" stroke="#173d2c" strokeWidth={0.05} />
        {Array.from({ length: w + 1 }).map((_, i) => (
          <line key={`vx${i}`} x1={i} y1={0} x2={i} y2={h} stroke="#173d2c" strokeWidth={i % 5 === 0 ? 0.04 : 0.015} opacity={i % 5 === 0 ? 0.45 : 0.25} />
        ))}
        {Array.from({ length: h + 1 }).map((_, i) => (
          <line key={`hz${i}`} x1={0} y1={i} x2={w} y2={i} stroke="#173d2c" strokeWidth={i % 5 === 0 ? 0.04 : 0.015} opacity={i % 5 === 0 ? 0.45 : 0.25} />
        ))}
        {showPath && pathD && !playbackActive && (
          <path d={pathD} fill="none" stroke="#c85d1e" strokeWidth={0.18} strokeDasharray="0.5 0.3" strokeLinecap="round" opacity={0.85} />
        )}
        {[...course.obstacles]
          .sort((a, b) => {
            const za = a.zIndex ?? 0;
            const zb = b.zIndex ?? 0;
            if (za !== zb) return za - zb;
            return a.id.localeCompare(b.id);
          })
          .map((ob) => (
            <ObstacleSvg
              key={ob.id}
              obstacle={ob}
              selected={selectedId === ob.id}
              hasIssue={highlightIds.has(ob.id)}
              pxPerM={pxPerM}
              onPointerDown={(e) => onObstacleDown(e, ob.id)}
            />
          ))}


        {/* Banmått — sticky linjaler i meter, ritade direkt i SVG så de skalar med viewBox */}
        {showDimensions && (
          <g pointerEvents="none">
            {/* Tickmarks topp (x-axel) */}
            {Array.from({ length: Math.floor(w / tickStepM) + 1 }).map((_, i) => {
              const m = i * tickStepM;
              if (m === 0 || m === w) return null;
              return (
                <g key={`tx-${m}`}>
                  <line x1={m} y1={-0.55} x2={m} y2={-0.15} stroke="#173d2c" strokeWidth={0.03} opacity={0.55} />
                  <text x={m} y={-0.72} textAnchor="middle" fontSize={0.42} fill="#173d2c" opacity={0.75}>
                    {m}
                  </text>
                </g>
              );
            })}
            {/* Tickmarks vänster (y-axel) */}
            {Array.from({ length: Math.floor(h / tickStepM) + 1 }).map((_, i) => {
              const m = i * tickStepM;
              if (m === 0 || m === h) return null;
              return (
                <g key={`ty-${m}`}>
                  <line x1={-0.55} y1={m} x2={-0.15} y2={m} stroke="#173d2c" strokeWidth={0.03} opacity={0.55} />
                  <text x={-0.72} y={m + 0.15} textAnchor="end" fontSize={0.42} fill="#173d2c" opacity={0.75}>
                    {m}
                  </text>
                </g>
              );
            })}
            {/* Banmått — totala bredd/höjd centrerat utanför arenan */}
            <text x={w / 2} y={-0.92} textAnchor="middle" fontSize={0.55} fontWeight={700} fill="#173d2c" opacity={0.9}>
              {w} m
            </text>
            <text
              x={-0.92} y={h / 2} textAnchor="middle" fontSize={0.55} fontWeight={700} fill="#173d2c" opacity={0.9}
              transform={`rotate(-90 -0.92 ${h / 2})`}
            >
              {h} m
            </text>
            {/* Hörnmarkörer (0,0) */}
            <text x={-0.55} y={-0.2} textAnchor="end" fontSize={0.35} fill="#173d2c" opacity={0.55}>0</text>
          </g>
        )}

        <CoursePlaybackOverlay course={course} active={playbackActive} t={playbackT} />
      </svg>
    </div>
  );
}

function ObstacleSvg({ obstacle, selected, hasIssue, pxPerM, onPointerDown }: {
  obstacle: ObstacleV2;
  selected: boolean;
  hasIssue?: boolean;
  /** Skala mellan meter och skärm-pixlar. Används för att räkna ut en
   *  transparent hit-area så att små hinder alltid har minst ~44 CSS-px
   *  tryck-yta oavsett zoom-nivå. */
  pxPerM: number;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
}) {
  const def = getObstacleDefV2(obstacle.type);
  if (!def) return null;
  const { w, d } = def.sizeM;
  const locked = !!obstacle.locked;
  // Minsta hit-area i meter så att touch-target ≥ 44 CSS-px.
  const minHitM = pxPerM > 0 ? 44 / pxPerM : 0;
  const hitW = Math.max(w, minHitM);
  const hitD = Math.max(d, minHitM);
  return (
    <g
      transform={`translate(${obstacle.x} ${obstacle.y}) rotate(${obstacle.rotation})`}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: locked ? "not-allowed" : "grab" }}
    >
      {/* Transparent hit-target — påverkar inte visuella mått, bara touch-yta. */}
      <rect
        x={-hitW / 2} y={-hitD / 2} width={hitW} height={hitD}
        fill="transparent"
        pointerEvents="all"
      />
      {hasIssue && !selected && (
        <circle r={Math.max(w, d) / 2 + 0.35} fill="#ef4444" opacity={0.18} />
      )}
      <ObstacleShape def={def} selected={selected} obstacle={obstacle} />
      {selected && (
        <circle r={Math.max(w, d) / 2 + 0.4} fill="none" stroke="#1a6b3c" strokeWidth={0.12} strokeDasharray="0.3 0.2" />
      )}
      {locked && (
        // Hänglås-glyf uppe till vänster på hindret. Roteras tillbaka så det alltid står upp.
        <g transform={`translate(${-w / 2 - 0.25} ${-d / 2 - 0.25}) rotate(${-obstacle.rotation})`}>
          <circle r={0.36} fill="#fff" stroke="#173d2c" strokeWidth={0.05} />
          <g transform="translate(-0.22 -0.22) scale(0.018)" fill="none" stroke="#173d2c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" fill="#fff" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </g>
        </g>
      )}
      {obstacle.number != null && (
        <g transform={`translate(${w / 2 + 0.3} ${-d / 2 - 0.3})`}>
          <circle r={0.55} fill="#173d2c" />
          <text textAnchor="middle" dominantBaseline="central" fontSize={0.7} fill="#fff" fontWeight={700}>{obstacle.number}</text>
        </g>
      )}
    </g>
  );
}

function ObstacleShape({ def, selected, obstacle }: { def: ObstacleDefV2; selected: boolean; obstacle?: ObstacleV2 }) {
  const { w, d } = def.sizeM;
  const stroke = selected ? "#1a6b3c" : "#173d2c";
  const sw = 0.06;
  switch (def.type) {
    case "jump":
    case "wall":
    case "combo":
      return <g>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#fff" stroke={stroke} strokeWidth={sw} rx={0.05} />
        <rect x={-w / 2} y={-d / 2 - 0.05} width={0.18} height={d + 0.1} fill={stroke} />
        <rect x={w / 2 - 0.18} y={-d / 2 - 0.05} width={0.18} height={d + 0.1} fill={stroke} />
      </g>;
    case "longjump":
      return <g>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-w / 2} y={-d / 2 + (i * d / 4)} width={w} height={0.18} fill="#fff" stroke={stroke} strokeWidth={sw} />
        ))}
      </g>;
    case "tire":
      return <g>
        <circle r={Math.min(w, d) / 2} fill="none" stroke={stroke} strokeWidth={sw * 2} />
        <circle r={Math.min(w, d) / 2 - 0.15} fill="#fff" stroke={stroke} strokeWidth={sw} />
      </g>;
    case "tunnel": {
      const curveDeg = Math.max(0, Math.min(90, obstacle?.curveDeg ?? 0));
      if (curveDeg < 1) {
        return <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={d / 2} ry={d / 2} fill="#cfe2f3" stroke={stroke} strokeWidth={sw} />;
      }
      // Böjd tunnel: rita en bezier-kurva mellan ändarna med kontrollpunkt offset åt curveSide.
      // Tunneln går längs w-axeln (x: -w/2 → w/2). Sidan är längs y.
      const side = (obstacle?.curveSide ?? "right") === "right" ? 1 : -1;
      const r = d / 2;
      const offset = Math.tan((curveDeg * Math.PI / 180) / 2) * (w / 2);
      const x0 = -w / 2, x1 = w / 2;
      const cx = 0, cy = side * offset;
      // Två parallella bezier-kurvor (tubens kanter) + fyllnad mellan.
      const top = `M ${x0} ${-r} Q ${cx} ${cy - r} ${x1} ${-r}`;
      const bot = `M ${x0} ${r} Q ${cx} ${cy + r} ${x1} ${r}`;
      const fill = `M ${x0} ${-r} Q ${cx} ${cy - r} ${x1} ${-r} L ${x1} ${r} Q ${cx} ${cy + r} ${x0} ${r} Z`;
      return <g>
        <path d={fill} fill="#cfe2f3" stroke="none" />
        <path d={top} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d={bot} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <circle cx={x0} cy={0} r={r} fill="none" stroke={stroke} strokeWidth={sw * 0.6} opacity={0.4} />
        <circle cx={x1} cy={0} r={r} fill="none" stroke={stroke} strokeWidth={sw * 0.6} opacity={0.4} />
      </g>;
    }
    case "weave_8":
    case "weave_10":
    case "weave_12": {
      const count = def.type === "weave_8" ? 8 : def.type === "weave_10" ? 10 : 12;
      return <g>
        {Array.from({ length: count }).map((_, i) => (
          <circle key={i} cx={0} cy={-d / 2 + (i + 0.5) * (d / count)} r={0.08} fill={stroke} />
        ))}
      </g>;
    }
    case "aframe":
      return <g>
        <polygon points={`${-w / 2},${d / 2} ${w / 2},${d / 2} 0,${-d / 2}`} fill="#f4d6c0" stroke={stroke} strokeWidth={sw} />
        <line x1={0} y1={-d / 2} x2={0} y2={d / 2} stroke={stroke} strokeWidth={sw} strokeDasharray="0.1 0.1" />
        {/* kontaktfält */}
        <rect x={-w / 2} y={d / 2 - 0.4} width={w} height={0.4} fill="#1a6b3c" opacity={0.45} />
      </g>;
    case "dogwalk":
      return <g>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#fff" stroke={stroke} strokeWidth={sw} />
        <rect x={-w / 2} y={-d / 2} width={w} height={0.6} fill="#1a6b3c" opacity={0.45} />
        <rect x={-w / 2} y={d / 2 - 0.6} width={w} height={0.6} fill="#1a6b3c" opacity={0.45} />
      </g>;
    case "seesaw":
      return <g>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#fff" stroke={stroke} strokeWidth={sw} />
        <polygon points={`${-0.3},0 ${0.3},0 0,0.4`} fill={stroke} />
      </g>;
    case "table":
      return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#fde9d3" stroke={stroke} strokeWidth={sw} rx={0.1} />;
    case "start":
      return <g>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#22c55e" />
        <text textAnchor="middle" dominantBaseline="central" fontSize={0.35} fill="#fff" fontWeight={700}>START</text>
      </g>;
    case "finish":
      return <g>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#111827" />
        <text textAnchor="middle" dominantBaseline="central" fontSize={0.35} fill="#fff" fontWeight={700}>MÅL</text>
      </g>;
    case "number":
      return <circle r={0.25} fill="#173d2c" />;
    case "hoop":
      return <g>
        <ellipse rx={w / 2} ry={d / 2} fill="none" stroke={stroke} strokeWidth={sw * 2} />
      </g>;
    case "barrel":
      return <circle r={Math.min(w, d) / 2} fill="#f4d6c0" stroke={stroke} strokeWidth={sw} />;
    case "fence":
      return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={stroke} />;
    case "handler_zone":
      return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#1a6b3c" opacity={0.18} stroke="#1a6b3c" strokeWidth={sw} strokeDasharray="0.3 0.2" />;
    default:
      return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#fff" stroke={stroke} strokeWidth={sw} />;
  }
}

function SelectedPanel({
  obstacle, size, onRotate, onDelete, onNumberChange, onTunnelCurve,
  onToggleLock, onBringForward, onSendBackward, onBringToFront, onSendToBack,
}: {
  obstacle: ObstacleV2;
  size: SizeClassKey;
  onRotate: (deg: number) => void;
  onDelete: () => void;
  onNumberChange: (n: number | undefined) => void;
  onTunnelCurve?: (patch: { curveDeg?: number; curveSide?: "left" | "right" }) => void;
  onToggleLock: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const locked = !!obstacle.locked;
  const def = getObstacleDefV2(obstacle.type)!;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === size)!;
  const showJumpHeight = ["jump", "wall", "combo", "longjump"].includes(def.type);
  const showTireHeight = def.type === "tire";
  const isTunnel = def.type === "tunnel";
  const curveDeg = obstacle.curveDeg ?? 0;
  const curveSide = obstacle.curveSide ?? "right";
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Valt hinder</h3>
      <div className="rounded-xl border border-border p-3 bg-neutral-50 space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="font-semibold text-sm">{def.label}</div>
          <div className="text-[10px] text-neutral-500">{def.category}</div>
        </div>
        <div className="text-[11px] text-neutral-600">{def.description}</div>
        <div className="text-[11px] text-neutral-700">
          Storlek: <strong>{def.sizeM.w} × {def.sizeM.d} m</strong>
          <br />
          Position: x={obstacle.x.toFixed(1)} m, y={obstacle.y.toFixed(1)} m · {Math.round(obstacle.rotation)}°
        </div>
        {showJumpHeight && (
          <div className="text-[11px] text-[#c85d1e] font-medium">
            Hopphöjd för {sizeDef.label}: {sizeDef.jumpHeightCm[0]}–{sizeDef.jumpHeightCm[1]} cm
          </div>
        )}
        {showTireHeight && (
          <div className="text-[11px] text-[#c85d1e] font-medium">
            Däckhöjd för {sizeDef.label}: {sizeDef.tireHeightCm[0]}–{sizeDef.tireHeightCm[1]} cm
          </div>
        )}
        {def.type === "longjump" && (
          <div className="text-[11px] text-[#c85d1e] font-medium">
            {sizeDef.longJumpPlanks} plankor, total längd {sizeDef.longJumpLengthCm[0]}–{sizeDef.longJumpLengthCm[1]} cm
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-3">
        <button onClick={() => onRotate(15)} disabled={locked} className="h-9 rounded-lg bg-card border border-border text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed">
          <RotateCw size={13} /> Rotera 15°
        </button>
        <button onClick={() => onRotate(90)} disabled={locked} className="h-9 rounded-lg bg-card border border-border text-[12px] font-semibold hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed">
          Rotera 90°
        </button>
      </div>

      <button
        onClick={onToggleLock}
        className={cn(
          "mt-2 w-full h-9 rounded-lg text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 border transition",
          locked
            ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            : "bg-card text-neutral-700 border-border hover:border-neutral-400",
        )}
        title="Lås/lås upp hindret (förhindrar drag, rotation och radering)"
      >
        {locked ? <><Lock size={13} /> Låst — klicka för att låsa upp</> : <><Unlock size={13} /> Lås hinder</>}
      </button>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-1">Stapelordning</div>
        <div className="grid grid-cols-4 gap-1">
          <button onClick={onSendToBack} title="Längst bak (Ctrl+Shift+[)" className="h-8 rounded-lg bg-card border border-border text-neutral-700 hover:border-neutral-400 grid place-items-center"><ArrowDownToLine size={13} /></button>
          <button onClick={onSendBackward} title="Bakåt ett steg (Ctrl+[)" className="h-8 rounded-lg bg-card border border-border text-neutral-700 hover:border-neutral-400 grid place-items-center"><ArrowDown size={13} /></button>
          <button onClick={onBringForward} title="Framåt ett steg (Ctrl+])" className="h-8 rounded-lg bg-card border border-border text-neutral-700 hover:border-neutral-400 grid place-items-center"><ArrowUp size={13} /></button>
          <button onClick={onBringToFront} title="Längst fram (Ctrl+Shift+])" className="h-8 rounded-lg bg-card border border-border text-neutral-700 hover:border-neutral-400 grid place-items-center"><ArrowUpToLine size={13} /></button>
        </div>
        <div className="text-[10px] text-neutral-500 mt-1">Lager: {obstacle.zIndex ?? 0}</div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="text-[11px] text-neutral-600">Nummer</label>
        <input
          type="number"
          value={obstacle.number ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onNumberChange(v === "" ? undefined : Number(v));
          }}
          min={1}
          disabled={locked}
          className="h-9 w-20 px-2 rounded-lg border border-border text-[12px] disabled:opacity-50"
        />
      </div>
      {isTunnel && onTunnelCurve && (
        <div className="mt-3 rounded-xl border border-border p-3 bg-card space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-semibold text-neutral-700">Tunnelböjning</div>
            <div className="text-[11px] text-neutral-500">{curveDeg}°</div>
          </div>
          <input
            type="range" min={0} max={90} step={5} value={curveDeg}
            disabled={locked}
            onChange={(e) => onTunnelCurve({ curveDeg: Number(e.target.value) })}
            className="w-full accent-[#1a6b3c] disabled:opacity-50"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onTunnelCurve({ curveSide: "left" })}
              disabled={locked}
              className={cn("h-8 rounded-lg text-[11px] font-semibold border disabled:opacity-40", curveSide === "left" ? "bg-[#1a6b3c] text-white border-[#1a6b3c]" : "bg-card text-neutral-700 border-border")}
            >Vänster</button>
            <button
              onClick={() => onTunnelCurve({ curveSide: "right" })}
              disabled={locked}
              className={cn("h-8 rounded-lg text-[11px] font-semibold border disabled:opacity-40", curveSide === "right" ? "bg-[#1a6b3c] text-white border-[#1a6b3c]" : "bg-card text-neutral-700 border-border")}
            >Höger</button>
          </div>
          <button
            onClick={() => onTunnelCurve({ curveDeg: 0 })}
            disabled={locked}
            className="w-full h-8 rounded-lg text-[11px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40"
          >Återställ till rak</button>
        </div>
      )}
      <button
        onClick={onDelete}
        disabled={locked}
        title={locked ? "Lås upp först för att ta bort" : "Ta bort hinder"}
        className="mt-3 w-full h-9 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 size={13} /> Ta bort hinder
      </button>
    </section>
  );
}

function SummaryPanel({ course }: { course: CourseV2 }) {
  const times = computeCourseTimes({
    sport: course.sport,
    sizeClass: course.sizeClass,
    arenaWidthM: course.arenaWidthM,
    arenaHeightM: course.arenaHeightM,
    classTemplate: course.classTemplate,
    obstacles: course.obstacles,
  });
  const tpl = course.classTemplate ? CLASS_TEMPLATES.find((t) => t.key === course.classTemplate) : null;
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Översikt</h3>
      <div className="rounded-xl border border-border p-3 bg-neutral-50 space-y-1.5 text-[12px]">
        <Row label="Sport" value={course.sport === "agility" ? "Agility" : "Hoopers"} />
        <Row label="Klass" value={tpl?.label ?? "Ingen mall"} />
        <Row label="Banstorlek" value={`${course.arenaWidthM} × ${course.arenaHeightM} m`} />
        <Row label="Hinder" value={`${course.obstacles.length}${tpl ? ` (krav ${tpl.obstacleRange[0]}–${tpl.obstacleRange[1]})` : ""}`} />
        <Row label="Banlängd (hundens väg)" value={`${times.lengthAlongPathM.toFixed(1)} m`} />
        <Row label="Center-till-center" value={`${times.lengthM.toFixed(1)} m`} />
        {times.refTimeS != null && <Row label="Referenstid" value={`${times.refTimeS} s`} />}
        {times.maxTimeS != null && <Row label="Maxtid" value={`${times.maxTimeS} s`} />}
      </div>
      <p className="mt-2 text-[10px] text-neutral-500 leading-snug">
        Banlängden mäts längs hundens förväntade väg — Catmull-Rom-kurva genom hindren
        med tunnel-, slalom- och kontaktfälts-längder inkluderade. Center-till-center
        visas som teknisk referens.
      </p>
    </section>
  );
}

function AnalysisPanel({ course }: { course: CourseV2 }) {
  const a = useMemo(() => analyzeCourse(course.obstacles), [course.obstacles]);
  const tone =
    a.difficultyLabel === "Lätt" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : a.difficultyLabel === "Medel" ? "bg-blue-50 text-blue-700 border-blue-200"
        : a.difficultyLabel === "Svår" ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-red-50 text-red-700 border-red-200";
  return (
    <section className="mt-3">
      <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Bananalys</h3>
      <div className="rounded-xl border border-border p-3 bg-neutral-50 space-y-2 text-[12px]">
        <div className={cn("inline-flex items-center gap-2 px-2 py-1 rounded-full border text-[11px] font-semibold", tone)}>
          {a.difficultyLabel} · {a.difficultyScore}/100
        </div>
        <Row label="Skarpa svängar (>90°)" value={`${a.sharpTurns}`} />
        <Row label="Sidbyten" value={`${a.sideChanges}`} />
        <Row label="Längsta raksträcka" value={`${a.longestStraightM.toFixed(1)} m`} />
        <Row label="Medelsvängskärpa" value={`${a.avgCurvatureDegPerM.toFixed(1)}°/m`} />
        <details className="pt-1">
          <summary className="cursor-pointer text-[10px] text-neutral-500">Poängkomponenter</summary>
          <div className="pt-1 space-y-0.5 text-[11px]">
            <Row label="Svängar" value={`+${a.components.sharpTurns}`} />
            <Row label="Sidbyten" value={`+${a.components.sideChanges}`} />
            <Row label="Kurvatur" value={`+${a.components.avgCurvature}`} />
            <Row label="Fartsektion (bonus)" value={`${a.components.straightBonus}`} />
          </div>
        </details>
      </div>
    </section>
  );
}



function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-800 text-right">{value}</span>
    </div>
  );
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

/* Mini-glyf för palettknapp */
function ObstacleGlyph({ type }: { type: ObstacleTypeV2 }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5 } as const;
  switch (type) {
    case "jump": return <svg {...common}><line x1="4" y1="12" x2="20" y2="12" /><rect x="3" y="9" width="2" height="6" /><rect x="19" y="9" width="2" height="6" /></svg>;
    case "wall": return <svg {...common}><rect x="4" y="9" width="16" height="6" /><line x1="12" y1="9" x2="12" y2="15" /></svg>;
    case "longjump": return <svg {...common}><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="16" x2="20" y2="16" /></svg>;
    case "tire": return <svg {...common}><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="3" /></svg>;
    case "combo": return <svg {...common}><line x1="4" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /></svg>;
    case "tunnel": return <svg {...common}><path d="M4 12 Q 12 8 20 12" /><path d="M4 12 Q 12 16 20 12" /></svg>;
    case "weave_8":
    case "weave_10":
    case "weave_12": return <svg {...common}>{[5, 9, 12, 15, 19].map((x, i) => <circle key={i} cx={x} cy="12" r="0.8" fill="currentColor" />)}</svg>;
    case "aframe": return <svg {...common}><path d="M5 18 L 12 6 L 19 18 Z" /></svg>;
    case "dogwalk": return <svg {...common}><rect x="3" y="11" width="18" height="2" /></svg>;
    case "seesaw": return <svg {...common}><rect x="4" y="11" width="16" height="2" /><path d="M11 13 L 12 16 L 13 13 Z" fill="currentColor" /></svg>;
    case "table": return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="1" /></svg>;
    case "start": return <svg {...common}><rect x="4" y="9" width="16" height="6" fill="currentColor" /></svg>;
    case "finish": return <svg {...common}><rect x="4" y="9" width="16" height="6" /><line x1="8" y1="9" x2="8" y2="15" /><line x1="12" y1="9" x2="12" y2="15" /><line x1="16" y1="9" x2="16" y2="15" /></svg>;
    case "number": return <svg {...common}><circle cx="12" cy="12" r="5" /><text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none">N</text></svg>;
    case "hoop": return <svg {...common}><ellipse cx="12" cy="12" rx="7" ry="3" /></svg>;
    case "barrel": return <svg {...common}><circle cx="12" cy="12" r="6" /></svg>;
    case "fence": return <svg {...common}><line x1="4" y1="12" x2="20" y2="12" strokeWidth="2.5" /></svg>;
    case "handler_zone": return <svg {...common}><rect x="5" y="5" width="14" height="14" strokeDasharray="2 2" /></svg>;
    default: return null;
  }
}

/* ───────────── Validering UI ───────────── */

function ValidationBadge({ summary, onClick, active }: {
  summary: { errors: number; warnings: number; info: number };
  onClick: () => void;
  active: boolean;
}) {
  const total = summary.errors + summary.warnings + summary.info;
  const ok = total === 0;
  const tone = summary.errors > 0
    ? "bg-red-50 text-red-700 border-red-200"
    : summary.warnings > 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : ok
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <button
      onClick={onClick}
      title="Visa valideringsdetaljer"
      className={cn(
        "h-9 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1.5 transition",
        tone,
        active && "ring-2 ring-offset-1",
      )}
    >
      {ok ? <CheckCircle2 size={13} /> : summary.errors > 0 ? <AlertCircle size={13} /> : <AlertTriangle size={13} />}
      {ok ? "OK" : (
        <>
          {summary.errors > 0 && <span>{summary.errors} fel</span>}
          {summary.warnings > 0 && <span>{summary.warnings} varn</span>}
          {summary.errors === 0 && summary.warnings === 0 && summary.info > 0 && <span>{summary.info} info</span>}
        </>
      )}
    </button>
  );
}

function IssuesList({ issues, onSelect }: {
  issues: ValidationIssue[];
  onSelect: (id: string | undefined) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-700 text-[12px] font-medium">
        <CheckCircle2 size={14} /> Inga regelproblem hittades. Banan ser bra ut.
      </div>
    );
  }
  const order: Record<ValidationIssue["level"], number> = { error: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <ul className="space-y-1">
      {sorted.map((iss, idx) => {
        const tone = iss.level === "error"
          ? "text-red-700 bg-red-50 border-red-100"
          : iss.level === "warning"
            ? "text-amber-700 bg-amber-50 border-amber-100"
            : "text-blue-700 bg-blue-50 border-blue-100";
        const Icon = iss.level === "error" ? AlertCircle : iss.level === "warning" ? AlertTriangle : Info;
        return (
          <li key={idx}>
            <button
              onClick={() => onSelect(iss.obstacleId)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-lg border text-[12px] inline-flex items-start gap-2 hover:brightness-95 transition",
                tone,
              )}
            >
              <Icon size={13} className="mt-0.5 shrink-0" />
              <span>{iss.message}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

