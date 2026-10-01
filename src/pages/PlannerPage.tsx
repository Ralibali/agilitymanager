import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft, ArrowLeftRight, ArrowUpDown, BookOpen, Box, Check,
  ChevronDown, ChevronUp, ClipboardPaste, CloudCheck, Command, Copy, Download, Eraser, Footprints,
  Grid2x2, Keyboard, Link2, ListOrdered, Loader2, Lock, Lightbulb, Maximize, MoreHorizontal,
  MousePointerClick, Play, Redo2, RotateCcw, RotateCw, Ruler, RulerDimensionLine, Scissors,
  Share2, ShieldCheck, SlidersHorizontal, Spline, SquareDashedMousePointer, Trash2, Undo2, Unlock,
  X, ZoomIn, ZoomOut,
} from "lucide-react";

import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { exportFile, isExportCancelled } from "@/lib/exportFile";
import { Seo, SITE_URL } from "@/components/Seo";
import { uid, type PlacedObstacle, type Sport } from "@/lib/course";
import { ObstacleGlyph, ObstacleIcon } from "@/components/ObstacleGlyph";
import { Logo } from "@/components/SiteNav";
import { AffiliateBanner } from "@/components/AffiliateBanner";
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
import { track } from "@/lib/analytics";
import { ConfirmDialog, NameCourseDialog } from "@/components/course-planner-v2/ConfirmDialog";
import {
  saveLocalCourse, type LocalCourse,
} from "@/features/course-planner-v2/localCourses";
import {
  draftSaveStatusLabel, saveDraftToStorage, type DraftSaveState,
} from "@/features/course-planner-v2/draftStorage";
import {
  applySnapshot, pushHistory, snapshotDraft, snapshotsEqual, type DraftSnapshot,
} from "@/features/course-planner-v2/plannerHistory";
import {
  NON_COMPETING, alignObstacles, applyNumberingSequence, clampGroupDelta, computeSegmentLabels,
  copyObstacles, deleteObstacles, distributeObstacles, duplicateObstacles, formatMeters, idsInRect,
  isCompeting, moveToNumber, nearestObstacle, obstacleLocalBounds, pasteObstacles, placeLabelsAwayFrom,
  reverseNumbering,
  rotateObstacles, setPosition, setRotation, snapM, toggleLock, translateObstacles, withNumbers,
  type AlignMode, type ClipboardItem,
} from "@/features/course-planner-v2/editorOps";
import { ObstacleInspector } from "@/components/course-planner-v2/ObstacleInspector";

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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Regelkontrollens avståndskoder — används för att färga avståndsetiketter. */
const DISTANCE_ISSUE_CODES = new Set(["jump_too_close", "obstacles_close", "hoopers_too_close"]);

const INSPECTOR_PREF_KEY = "am-planner-inspector-open";

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
  // parseCourseJson garanterar ett giltigt regelverk för rätt sport.
  const ruleSetId = parsed.course.ruleSetId || base.ruleSetId;

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
        // Även ett tomt utkast ska behålla mått, klassmall och regelverk —
        // ändringar gjorda före första hindret får inte försvinna. JSON-
        // importen kräver minst ett hinder (en tom FIL är ett fel), så vi
        // saniterar via en tillfällig markör och tömmer listan igen.
        if (d.obstacles.length === 0) {
          const probe = draftFromRawCourse({
            ...d,
            obstacles: [{ id: "probe", type: "number", x: 0, y: 0, rotation: 0 }],
          });
          if (probe) return { ...probe, obstacles: [] };
        } else {
          const parsed = draftFromRawCourse(d);
          if (parsed) return parsed;
        }
      }
    }
  } catch {
    /* ignorera */
  }
  return defaultDraft(search.get("sport") === "hoopers" ? "hoopers" : "agility");
}

const IS_NATIVE_APP = import.meta.env.VITE_NATIVE_APP === "true";

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
  // Markering: ett eller flera hinder. `selectedId` är satt när EXAKT ett
  // hinder är markerat (rotationshandtag, egenskaper, tunnelböjning).
  const [selection, setSelection] = useState<string[]>([]);
  const setSelectedId = useCallback((id: string | null) => setSelection(id ? [id] : []), []);
  /** Pekskärm: tryck lägger till/tar bort i markeringen, drag på ytan ritar en markeringsruta. */
  const [multiMode, setMultiMode] = useState(false);
  const [placing, setPlacing] = useState<ObstacleTypeV2 | null>(null);
  // Numreringsläge: klicka hindren i den ordning de ska tas.
  const [numbering, setNumbering] = useState<{
    baseIds: string[];
    seq: string[];
    keepFirst: number;
    committed: boolean;
  } | null>(null);
  // Måttband: dra mellan två punkter (snäpper mot hindrens mittpunkter).
  const [measureMode, setMeasureMode] = useState(false);
  const [measure, setMeasure] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const [marquee, setMarquee] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const [showDistances, setShowDistances] = useState(false);
  const [inspectorOpen, setInspectorOpenState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(INSPECTOR_PREF_KEY);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch {
      /* ignorera */
    }
    // Standard: utfälld på dator, hopfälld i mobilen (där ytan är liten).
    return typeof window === "undefined" || window.innerWidth >= 640;
  });
  const setInspectorOpen = useCallback((open: boolean) => {
    setInspectorOpenState(open);
    try { localStorage.setItem(INSPECTOR_PREF_KEY, open ? "1" : "0"); } catch { /* ignorera */ }
  }, []);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [showLine, setShowLine] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [view, setView] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 });
  const zoom = view.zoom;
  // håll en färsk referens till draft för pointer-/historikhantering
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [past, setPast] = useState<DraftSnapshot[]>([]);
  const [future, setFuture] = useState<DraftSnapshot[]>([]);
  const [saveState, setSaveState] = useState<DraftSaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveAttempt, setSaveAttempt] = useState(0);
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
  // Exporternas byline anger var banan skapades.
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
  const dragRef = useRef<{
    anchorId: string;
    /** Olåsta hinder som följer med i dragningen, med startposition. */
    items: Map<string, { x: number; y: number }>;
    grabDx: number;
    grabDy: number;
    moved: boolean;
    start: DraftSnapshot;
    /** "Välj flera": ett tryck utan dragning avmarkerar hindret. */
    toggleOffOnTap?: string;
  } | null>(null);
  const measureRef = useRef<{ id: number } | null>(null);
  const marqueeRef = useRef<{ id: number; base: string[]; a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const clipboardRef = useRef<ClipboardItem[]>([]);
  const [clipboardCount, setClipboardCount] = useState(0);
  const nudgeRef = useRef(0);
  const rotateRef = useRef<{ id: string; start: DraftSnapshot } | null>(null);
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

  // Produktmätning: en händelse när planeraren öppnas (no-op utan mätsnutt).
  useEffect(() => {
    track("planner_open");
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
        externalEditedRef.current = false;
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
  }, [sharedParam, resetCourseIdentity, setSelectedId]);

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

  /**
   * Ändrar utkastet OCH lägger ett ångra-steg med hela läget (hinder +
   * inställningar som ytmått, storleksklass, klassmall och regelverk).
   */
  const commitDraft = useCallback((updater: (d: Draft) => Draft) => {
    // Ta ögonblicksbilden NU — inuti en state-updater körs koden först vid
    // omritningen, då draftRef redan pekar på det nya läget (inget att ångra).
    const before = snapshotDraft(draftRef.current);
    setPast((p) => pushHistory(p, before));
    setFuture([]);
    setDraft(updater);
  }, []);


  const setObstacles = useCallback(
    (next: PlacedObstacle[], commit = true) => {
      if (commit) commitDraft((d) => ({ ...d, obstacles: next }));
      else setDraft((d) => ({ ...d, obstacles: next }));
    },
    [commitDraft]
  );

  // ── Autosparning (lokalt i webbläsaren) ─────────────────────
  // Sparar bara det som verkligen gick att spara: misslyckas lagringen visar
  // vi "Kunde inte spara" med försök-igen och JSON-export. Banan ligger kvar
  // i minnet oavsett.
  // Så snart användaren faktiskt redigerat en extern kopia är den "hens egen"
  // och ska sparas — även om hen sedan ångrar tillbaka till originalinnehållet
  // (annars låg en gammal redigerad version kvar i localStorage).
  const externalEditedRef = useRef(false);
  if (isExternalCopy && !externalEditedRef.current && JSON.stringify(draft) !== externalSnapshotRef.current) {
    externalEditedRef.current = true;
  }
  const isExternalUnedited =
    isExternalCopy && !externalEditedRef.current && JSON.stringify(draft) === externalSnapshotRef.current;

  const persistDraft = useCallback((d: Draft) => {
    const res = saveDraftToStorage(STORAGE_KEY, d);
    if (res.ok) {
      setSaveState("saved");
      setSaveError(null);
    } else {
      setSaveState("error");
      setSaveError(res.message);
    }
    return res.ok;
  }, []);

  useEffect(() => {
    // En oredigerad extern kopia (delad länk/mall) får aldrig skriva över
    // användarens egen autosparade bana.
    if (isExternalUnedited) return;
    setSaveState((s) => (s === "error" ? s : "saving"));
    const saveTimer = setTimeout(() => persistDraft(draftRef.current), 600);
    return () => clearTimeout(saveTimer);
  }, [draft, isExternalUnedited, persistDraft, saveAttempt]);

  // Skriv direkt när sidan göms/stängs, så att ändringar inom debouncefönstret
  // inte tappas om användaren lämnar sidan.
  useEffect(() => {
    if (isExternalUnedited) return;
    const flush = () => { persistDraft(draftRef.current); };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isExternalUnedited, persistDraft]);

  const retrySave = useCallback(() => {
    setSaveState("saving");
    setSaveError(null);
    setSaveAttempt((n) => n + 1);
  }, []);

  // ── Koordinater ─────────────────────────────────────────────
  const vw = w / zoom;
  const vh = h / zoom;
  const viewMinX = (w - vw) / 2 + view.panX;
  const viewMinY = (h - vh) / 2 + view.panY;

  // Hur många skärmpixlar en meter blir just nu. På stora skärmar med liten bana
  // blir linjerna annars hårfina — vi skalar upp detaljerna så hindren syns.
  const pxPerMeter = useMemo(() => {
    const availW = canvasPx.w || 800;
    const availH = canvasPx.h || 600;
    return Math.min(availW / vw, availH / vh) || 20;
  }, [canvasPx.w, canvasPx.h, vw, vh]);
  const detail = clamp(22 / pxPerMeter, 1, 2.6);
  const pxPerMeterRef = useRef(pxPerMeter);
  pxPerMeterRef.current = pxPerMeter;


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
    const snap = past[past.length - 1];
    const current = snapshotDraft(draftRef.current);
    setFuture((f) => [current, ...f]);
    setDraft((d) => applySnapshot(d, snap));
    setPast((p) => p.slice(0, -1));
    setSelectedId(null);
    setNumbering(null);
  }, [past, setSelectedId]);
  const redo = useCallback(() => {
    if (!future.length) return;
    const snap = future[0];
    const current = snapshotDraft(draftRef.current);
    setPast((p) => [...p, current]);
    setDraft((d) => applySnapshot(d, snap));
    setFuture((f) => f.slice(1));
    setSelectedId(null);
    setNumbering(null);
  }, [future, setSelectedId]);


  // ── Redigering ──────────────────────────────────────────────
  const arena = useMemo(() => ({ width: w, height: h }), [w, h]);
  // Markeringen rensas från hinder som inte längre finns (ångra, rensa, öppna).
  const obstacleIds = useMemo(() => new Set(obstacles.map((ob) => ob.id)), [obstacles]);
  const selectionIds = useMemo(() => selection.filter((id) => obstacleIds.has(id)), [selection, obstacleIds]);
  const selectionSet = useMemo(() => new Set(selectionIds), [selectionIds]);
  const selectedId = selectionIds.length === 1 ? selectionIds[0] : null;
  const selected = selectedId ? obstacles.find((ob) => ob.id === selectedId) ?? null : null;
  const selectedObstacles = useMemo(() => obstacles.filter((ob) => selectionSet.has(ob.id)), [obstacles, selectionSet]);
  const hasSelection = selectionIds.length > 0;
  const selectionLockedCount = selectedObstacles.filter((ob) => ob.locked).length;
  const selectionMovable = selectedObstacles.length - selectionLockedCount;

  /** Byt hinderlistan om den faktiskt ändrats (ett ångra-steg, aldrig tomma steg). */
  const applyObstacles = (next: PlacedObstacle[]) => {
    if (next !== obstacles && JSON.stringify(next) !== JSON.stringify(obstacles)) setObstacles(next);
  };

  const rotateBy = (delta: number) => {
    if (!hasSelection) return;
    applyObstacles(rotateObstacles(obstacles, selectionIds, delta, arena));
  };
  const duplicateSelected = () => {
    if (!hasSelection) return;
    const res = duplicateObstacles(obstacles, selectionIds, arena);
    setObstacles(res.obstacles);
    setSelection(res.newIds);
  };
  const deleteSelected = useCallback(() => {
    if (!selectionIds.length) return;
    const next = deleteObstacles(obstacles, selectionIds);
    if (next.length === obstacles.length) {
      toast("Låsta hinder tas inte bort", { description: "Lås upp dem först (L)." });
      return;
    }
    setObstacles(next);
    setSelection(selectionIds.filter((id) => next.some((ob) => ob.id === id)));
  }, [selectionIds, obstacles, setObstacles]);
  const toggleLockSelected = () => {
    if (!hasSelection) return;
    applyObstacles(toggleLock(obstacles, selectionIds));
  };
  const selectAll = () => {
    setPlacing(null);
    setSelection(obstacles.map((ob) => ob.id));
  };
  const copySelection = (cut = false) => {
    if (!hasSelection) return;
    clipboardRef.current = copyObstacles(obstacles, selectionIds);
    setClipboardCount(clipboardRef.current.length);
    if (cut) {
      const next = deleteObstacles(obstacles, selectionIds);
      if (next.length !== obstacles.length) setObstacles(next);
      setSelection([]);
      toast.success(`Klippte ut ${selectionIds.length} hinder`, { description: "Klistra in med Ctrl+V." });
    } else {
      toast.success(`Kopierade ${selectionIds.length} hinder`, { description: "Klistra in med Ctrl+V — även i en annan bana." });
    }
  };
  const pasteClipboard = () => {
    const items = clipboardRef.current.filter((it) => palette.some((def) => def.type === it.type));
    if (!items.length) {
      if (clipboardRef.current.length) toast.error("Urklippet innehåller hinder som inte finns i den här sporten");
      return;
    }
    const res = pasteObstacles(obstacles, items, arena);
    setObstacles(res.obstacles);
    setSelection(res.newIds);
  };
  /** Piltangenter: täta tryck slås ihop till ett ångra-steg. */
  const nudgeSelection = (dx: number, dy: number) => {
    if (!hasSelection) return;
    const next = translateObstacles(obstacles, selectionIds, dx, dy, arena);
    if (next === obstacles) return;
    const now = Date.now();
    const merge = now - nudgeRef.current < 700;
    nudgeRef.current = now;
    setObstacles(next, !merge);
  };
  const alignSelection = (mode: AlignMode) => applyObstacles(alignObstacles(obstacles, selectionIds, mode));
  const distributeSelection = (axis: "x" | "y") => applyObstacles(distributeObstacles(obstacles, selectionIds, axis));

  /** Flytta valt hinder ett steg i nummerordningen (delta ±1). */
  const moveSelectedInOrder = (delta: number) => {
    if (!selected || NON_COMPETING.has(selected.type)) return;
    const current = numbered.find((ob) => ob.id === selected.id)?.number;
    if (current == null) return;
    applyObstacles(moveToNumber(obstacles, selected.id, current + delta));
  };
  const setSelectedNumber = (n: number) => {
    if (!selected) return;
    applyObstacles(moveToNumber(obstacles, selected.id, n));
  };
  const setSelectedPosition = (pos: { x?: number; y?: number }) => {
    if (!selected) return;
    applyObstacles(setPosition(obstacles, selected.id, pos, arena));
  };
  const setSelectedRotation = (deg: number) => {
    if (!selected) return;
    applyObstacles(setRotation(obstacles, selected.id, deg));
  };
  const setTunnelCurve = (patch: Partial<{ curveDeg: number; curveSide: "left" | "right" }>) => {
    if (!selected || selected.type !== "tunnel" || selected.locked) return;
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
  const reverseOrder = () => {
    if (obstacles.filter(isCompeting).length < 2) return;
    setObstacles(reverseNumbering(obstacles));
    toast.success("Banordningen vänd", { description: "Sista hindret är nu nummer 1. Ångra med Ctrl+Z." });
  };

  // ── Lägen: numrering och måttband ───────────────────────────
  const competingCount = useMemo(() => obstacles.filter(isCompeting).length, [obstacles]);

  const stopNumbering = useCallback(() => setNumbering(null), []);
  /** Avsluta alla verktygslägen — används när en annan bana laddas. */
  const resetModes = useCallback(() => {
    setNumbering(null);
    setMeasureMode(false);
    setMeasure(null);
    setMarquee(null);
    setMultiMode(false);
    marqueeRef.current = null;
    measureRef.current = null;
  }, []);
  const startNumbering = () => {
    if (competingCount < 2) {
      toast("Placera minst två tävlingshinder först");
      return;
    }
    setPlacing(null);
    setMeasureMode(false);
    setMeasure(null);
    setMultiMode(false);
    setPlaybackActive(false);
    // Med ett markerat tävlingshinder numreras banan om FRÅN det hindret.
    const from = selected && isCompeting(selected) ? numbered.find((ob) => ob.id === selected.id)?.number ?? null : null;
    setNumbering({
      baseIds: obstacles.map((ob) => ob.id),
      seq: from != null && selected ? [selected.id] : [],
      keepFirst: from != null ? from - 1 : 0,
      committed: false,
    });
    setSelection([]);
  };
  const toggleNumbering = () => (numbering ? stopNumbering() : startNumbering());

  const numberingClick = (id: string) => {
    if (!numbering) return;
    const ob = obstacles.find((o) => o.id === id);
    if (!ob || !isCompeting(ob)) {
      toast("Start, mål och områden numreras inte");
      return;
    }
    let seq = numbering.seq;
    if (seq.includes(id)) {
      // Klick på senast numrerade hindret backar ett steg — övriga ignoreras.
      if (seq[seq.length - 1] !== id) return;
      seq = seq.slice(0, -1);
    } else {
      seq = [...seq, id];
    }
    applyNumbering({ ...numbering, seq });
  };

  const applyNumbering = (state: NonNullable<typeof numbering>) => {
    const current = draftRef.current.obstacles;
    const byId = new Map(current.map((o) => [o.id, o]));
    const base = state.baseIds.flatMap((bid) => (byId.has(bid) ? [byId.get(bid)!] : []));
    const extra = current.filter((o) => !state.baseIds.includes(o.id));
    const next = applyNumberingSequence([...base, ...extra], state.seq, state.keepFirst);
    if (!state.committed) commitDraft((d) => ({ ...d, obstacles: next }));
    else setDraft((d) => ({ ...d, obstacles: next }));
    const done = state.keepFirst + state.seq.length >= next.filter(isCompeting).length;
    if (done) {
      setNumbering(null);
      toast.success("Numreringen är klar", { description: "Ångra hela numreringen med Ctrl+Z." });
    } else {
      setNumbering({ ...state, committed: true });
    }
  };
  const numberingBack = () => {
    if (!numbering || numbering.seq.length === 0) return;
    applyNumbering({ ...numbering, seq: numbering.seq.slice(0, -1) });
  };
  const nextNumber = numbering ? Math.min(numbering.keepFirst + numbering.seq.length + 1, competingCount) : null;
  const numberedDone = useMemo(() => {
    if (!numbering) return null;
    const done = new Set(numbering.seq);
    numbered
      .filter((o) => o.number != null && (o.number as number) <= numbering.keepFirst)
      .forEach((o) => done.add(o.id));
    return done;
  }, [numbering, numbered]);

  const toggleMeasure = () => {
    setMeasureMode((on) => {
      if (on) setMeasure(null);
      return !on;
    });
    setPlacing(null);
    setNumbering(null);
    setMultiMode(false);
  };
  const toggleMultiMode = () => {
    setMultiMode((on) => !on);
    setPlacing(null);
    setNumbering(null);
    setMeasureMode(false);
    setMeasure(null);
  };
  const startPlacing = (type: ObstacleTypeV2 | null) => {
    setPlacing(type);
    if (type) {
      setNumbering(null);
      setMeasureMode(false);
      setMeasure(null);
      setMultiMode(false);
    }
  };

  // ── Pointer-hantering ───────────────────────────────────────
  /** Snäppradie mot hindrens mittpunkter för måttbandet (m). */
  const measureSnapM = () => clamp(14 / (pxPerMeterRef.current || 20), 0.35, 1.2);

  const startPinchIfTwo = () => {
    if (pointersRef.current.size !== 2) return false;
    const [a, b] = [...pointersRef.current.values()];
    pinchRef.current = { dist: Math.hypot(b.x - a.x, b.y - a.y) };
    panRef.current = null;
    dragRef.current = null;
    measureRef.current = null;
    if (marqueeRef.current) {
      marqueeRef.current = null;
      setMarquee(null);
    }
    return true;
  };

  // En pekare som släpps utanför planen (t.ex. över en panel som dök upp
  // under fingret) måste ändå glömmas — annars tolkas nästa tryck som nyp.
  useEffect(() => {
    const forget = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
    };
    window.addEventListener("pointerup", forget);
    window.addEventListener("pointercancel", forget);
    return () => {
      window.removeEventListener("pointerup", forget);
      window.removeEventListener("pointercancel", forget);
    };
  }, []);

  const onSvgPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Två fingrar = nyp-zoom + panorering
    if (startPinchIfTwo()) return;
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
    if (measureMode) {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      const snap = nearestObstacle(obstacles, pt, measureSnapM());
      const a = snap ? { x: snap.x, y: snap.y } : pt;
      measureRef.current = { id: e.pointerId };
      setMeasure({ a, b: a });
      return;
    }
    // Shift-dra (eller "välj flera" på pekskärm) = markeringsruta.
    if ((e.shiftKey || multiMode) && !numbering) {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      marqueeRef.current = { id: e.pointerId, base: selectionIds, a: pt, b: pt };
      setMarquee({ a: pt, b: pt });
      return;
    }
    // Ett finger/mus på tom yta: panorera vid drag, avmarkera vid klick.
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    panRef.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: false };
  };

  const onObstaclePointerDown = (e: React.PointerEvent, ob: PlacedObstacle) => {
    e.stopPropagation();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfTwo()) return;
    if (e.button === 1 || spaceRef.current) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      panRef.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: false };
      return;
    }
    if (measureMode) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      measureRef.current = { id: e.pointerId };
      setMeasure({ a: { x: ob.x, y: ob.y }, b: { x: ob.x, y: ob.y } });
      return;
    }
    if (numbering) {
      numberingClick(ob.id);
      return;
    }
    setPlacing(null);
    const modifier = e.shiftKey || e.ctrlKey || e.metaKey;
    // Shift/Ctrl-klick växlar alltid. I "välj flera" läggs omarkerade hinder
    // till direkt, medan ett markerat hinder kan dras (gruppen följer med)
    // eller tryckas bort ur markeringen.
    if (modifier || (multiMode && !selectionSet.has(ob.id))) {
      setSelection((sel) => {
        const live = sel.filter((id) => obstacleIds.has(id));
        return live.includes(ob.id) ? live.filter((id) => id !== ob.id) : [...live, ob.id];
      });
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pt = toField(e.clientX, e.clientY);
    // Drag på ett hinder i en flermarkering flyttar hela gruppen.
    const groupIds = selectionSet.has(ob.id) && (selectionIds.length > 1 || multiMode) ? selectionIds : [ob.id];
    if (!multiMode && groupIds.length === 1) setSelectedId(ob.id);
    const items = new Map<string, { x: number; y: number }>();
    for (const o of obstacles) {
      if (groupIds.includes(o.id) && !o.locked) items.set(o.id, { x: o.x, y: o.y });
    }
    dragRef.current = {
      anchorId: ob.id,
      items,
      grabDx: ob.x - pt.x,
      grabDy: ob.y - pt.y,
      moved: false,
      start: snapshotDraft(draftRef.current),
      toggleOffOnTap: multiMode ? ob.id : undefined,
    };
  };

  const onRotatePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    rotateRef.current = { id, start: snapshotDraft(draftRef.current) };
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
        panRef.current.moved = panRef.current.moved || Math.hypot(dx, dy) > 2;
        if (panRef.current.moved) panByPx(dx, dy);
        panRef.current.lastX = e.clientX;
        panRef.current.lastY = e.clientY;
      }
      if (panRef.current.moved) return;
    }
    const pt = toField(e.clientX, e.clientY);
    if (placing) setGhost(pt);
    if (measureRef.current && measureRef.current.id === e.pointerId) {
      const snap = nearestObstacle(obstacles, pt, measureSnapM());
      const b = snap ? { x: snap.x, y: snap.y } : pt;
      setMeasure((m) => (m ? { ...m, b } : m));
      return;
    }
    if (marqueeRef.current && marqueeRef.current.id === e.pointerId) {
      marqueeRef.current.b = pt;
      setMarquee({ a: marqueeRef.current.a, b: pt });
      return;
    }
    if (dragRef.current) {
      const drag = dragRef.current;
      const anchorStart = drag.items.get(drag.anchorId);
      if (!anchorStart) return; // ankaret är låst — inget flyttas
      const tx = snapM(clamp(pt.x + drag.grabDx, 0.5, w - 0.5));
      const ty = snapM(clamp(pt.y + drag.grabDy, 0.5, h - 0.5));
      const delta = clampGroupDelta([...drag.items.values()], tx - anchorStart.x, ty - anchorStart.y, arena);
      if (!drag.moved && Math.abs(delta.dx) < 1e-9 && Math.abs(delta.dy) < 1e-9) return;
      drag.moved = true;
      setDraft((d) => ({
        ...d,
        obstacles: d.obstacles.map((ob) => {
          const start = drag.items.get(ob.id);
          return start
            ? { ...ob, x: Math.round((start.x + delta.dx) * 100) / 100, y: Math.round((start.y + delta.dy) * 100) / 100 }
            : ob;
        }),
      }));
    }
    if (rotateRef.current) {
      const { id } = rotateRef.current;
      const target = obstacles.find((ob) => ob.id === id);
      if (target?.locked) return;
      // Shift = fri rotation i hela grader, annars 15°-steg.
      const step = e.shiftKey ? 1 : 15;
      setDraft((d) => ({
        ...d,
        obstacles: d.obstacles.map((ob) => {
          if (ob.id !== id) return ob;
          const ang = (Math.atan2(pt.y - ob.y, pt.x - ob.x) * 180) / Math.PI + 90;
          const snapped = Math.round(ang / step) * step;
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
      if (wasClick && !placing && !numbering) setSelection([]);
    }
    if (measureRef.current && (!e || measureRef.current.id === e.pointerId)) {
      measureRef.current = null;
      setMeasure((m) => (m && Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y) < 0.05 ? null : m));
    }
    if (marqueeRef.current && (!e || marqueeRef.current.id === e.pointerId)) {
      const { base, a, b } = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);
      const hits = idsInRect(draftRef.current.obstacles, a, b);
      setSelection([...new Set([...base, ...hits])]);
    }
    const tapped = dragRef.current && !dragRef.current.moved ? dragRef.current.toggleOffOnTap : undefined;
    if (tapped) setSelection((sel) => sel.filter((id) => id !== tapped));
    // Ett sammanhängande ångra-steg per dragning/rotation.
    if (dragRef.current?.moved) {
      const start = dragRef.current.start;
      if (!snapshotsEqual(start, snapshotDraft(draftRef.current))) {
        setPast((p) => pushHistory(p, start));
        setFuture([]);
      }
    }
    if (rotateRef.current) {
      const start = rotateRef.current.start;
      if (!snapshotsEqual(start, snapshotDraft(draftRef.current))) {
        setPast((p) => pushHistory(p, start));
        setFuture([]);
      }
    }
    dragRef.current = null;
    rotateRef.current = null;
  };

  // ── Klassmall / sport / arena ───────────────────────────────
  const applyClassTemplate = (key: ClassTemplateKey | null) => {
    const tpl = key ? getClassTemplate(key) : null;
    commitDraft((d) => ({
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
    commitDraft((d) => ({
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
    resetModes();
  };

  const setArena = (width: number, height: number) => {
    commitDraft((d) => ({
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
    resetModes();
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
      if (isExportCancelled(err)) return;
      console.error(err);
      toast.error("Exporten misslyckades — försök igen");
    } finally {
      setExporting(null);
    }
  };

  const shareUrlForQr = () =>
    `${Capacitor.isNativePlatform() ? SITE_URL + "/banplanerare" : window.location.origin + window.location.pathname}?bana=${encodeCourse(draft)}`;

  const onJudgePdf = () =>
    runExport("Domar-PDF", async () => {
      const [{ exportJudgePdf }, qrDataUrl] = await Promise.all([
        import("@/features/course-planner-v2/judgePdf"),
        makeQrDataUrl(shareUrlForQr()).catch(() => ""),
      ]);
      await exportJudgePdf({ ...pdfBase(), qrDataUrl });
      toast.success("Domar-PDF exporterad");
    });
  const onTrainingPdf = () =>
    runExport("Tränings-PDF", async () => {
      const [{ exportTrainingPdf }, qrDataUrl] = await Promise.all([
        import("@/features/course-planner-v2/trainingPdf"),
        makeQrDataUrl(shareUrlForQr()).catch(() => ""),
      ]);
      await exportTrainingPdf({ ...pdfBase(), qrDataUrl });
      toast.success("Tränings-PDF exporterad");
    });
  const onBuildPdf = () =>
    runExport("Bygg-PDF", async () => {
      const [{ exportBuildPdf }, qrDataUrl] = await Promise.all([
        import("@/features/course-planner-v2/buildPdf"),
        makeQrDataUrl(shareUrlForQr()).catch(() => ""),
      ]);
      await exportBuildPdf({ ...pdfBase(), qrDataUrl });
      toast.success("Bygg-PDF exporterad");
    });
  const onStartlistPdf = () =>
    runExport("Startlista", async () => {
      const { exportStartlistPdf } = await import("@/features/course-planner-v2/startlistPdf");
      await exportStartlistPdf({
        courseName: name, sport, sizeClass: draft.sizeClass,
        classTemplate: draft.classTemplate, obstacles: numbered,
        ruleSetId: draft.ruleSetId,
      });
      toast.success("Startlista exporterad");
    });
  const onJson = () =>
    runExport("JSON", async () => {
      const blob = new Blob([JSON.stringify({ ...pdfBase(), version: 2 }, null, 2)], { type: "application/json" });
      await exportFile(blob, `${name || "bana"}.json`);
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
      ruleSetId: c.ruleSetId,
      obstacles: normalizeObstacles(c.obstacles.map((ob) => ({ ...ob, id: uid() }))),
    });
    resetCourseIdentity(null);
    setPast([]);
    resetModes();
    setFuture([]);
    setSelectedId(null);
    toast.success(`Importerade "${c.name || "bana"}"`);
  };

  const exportPNG = () => runExport("PNG", async () => {
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
    try {
      const png = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = w * 60;
            canvas.height = h * 60;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Kunde inte skapa bilden");
            ctx.fillStyle = "#FCFAF4";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((result) => {
              if (result) resolve(result);
              else reject(new Error("Kunde inte skapa PNG-filen"));
            }, "image/png");
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error("Kunde inte läsa banbilden"));
        img.src = url;
      });
      await exportFile(png, `${name || "bana"}.png`);
      track("course_exported", { format: "png" });
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  // ── Dela ────────────────────────────────────────────────────
  const openShare = () => {
    track("course_shared");
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
    try {
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
      toast.success(IS_NATIVE_APP ? `"${targetName}" sparad på den här enheten` : `"${targetName}" sparad i den här webbläsaren`);
    } catch {
      toast.error('Banan kunde inte sparas. Exportera den som JSON för att behålla ditt arbete.');
    }
  };

  const handleSaveAs = () => setSaveAsOpen(true);

  const doNewCourse = () => {
    setDraft(defaultDraft(sport));
    setPast([]);
    resetModes();
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
    resetModes();
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
  const canPlay = numbered.filter((o) => o.number != null).length >= 2;
  const hasObstacles = obstacles.length > 0;
  const commands: PaletteCommand[] = useMemo(() => [
    { id: "undo", label: "Ångra", group: "Redigera", shortcut: ["Ctrl", "Z"], icon: <Undo2 className="h-4 w-4" />, run: undo, disabled: past.length === 0, hint: past.length === 0 ? "Inget att ångra ännu" : undefined },
    { id: "redo", label: "Gör om", group: "Redigera", shortcut: ["Ctrl", "Shift", "Z"], icon: <Redo2 className="h-4 w-4" />, run: redo, disabled: future.length === 0, hint: future.length === 0 ? "Inget att göra om" : undefined },
    { id: "duplicate", label: "Duplicera markerade hinder", group: "Redigera", shortcut: ["Ctrl", "D"], icon: <Copy className="h-4 w-4" />, run: duplicateSelected, disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "delete", label: "Ta bort markerade hinder", group: "Redigera", shortcut: ["Delete"], icon: <Trash2 className="h-4 w-4" />, run: deleteSelected, disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "select-all", label: "Markera alla hinder", group: "Redigera", shortcut: ["Ctrl", "A"], icon: <SquareDashedMousePointer className="h-4 w-4" />, run: selectAll, disabled: !hasObstacles, hint: hasObstacles ? undefined : "Banan är tom" },
    { id: "multi", label: multiMode ? "Avsluta välj flera" : "Välj flera hinder (tryck eller dra ruta)", group: "Redigera", icon: <SquareDashedMousePointer className="h-4 w-4" />, run: toggleMultiMode, disabled: !hasObstacles },
    { id: "copy", label: "Kopiera markerade hinder", group: "Redigera", shortcut: ["Ctrl", "C"], icon: <Copy className="h-4 w-4" />, run: () => copySelection(false), disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "cut", label: "Klipp ut markerade hinder", group: "Redigera", shortcut: ["Ctrl", "X"], icon: <Scissors className="h-4 w-4" />, run: () => copySelection(true), disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "paste", label: "Klistra in hinder", group: "Redigera", shortcut: ["Ctrl", "V"], icon: <ClipboardPaste className="h-4 w-4" />, run: pasteClipboard, disabled: clipboardCount === 0, hint: clipboardCount === 0 ? "Kopiera hinder först" : undefined },
    { id: "rotate-cw", label: "Rotera 45° medurs", group: "Redigera", shortcut: ["R"], icon: <RotateCw className="h-4 w-4" />, run: () => rotateBy(45), disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "rotate-ccw", label: "Rotera 45° moturs", group: "Redigera", shortcut: ["Shift", "R"], icon: <RotateCcw className="h-4 w-4" />, run: () => rotateBy(-45), disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "lock", label: "Lås/lås upp markerade hinder", group: "Redigera", shortcut: ["L"], icon: <Lock className="h-4 w-4" />, run: toggleLockSelected, disabled: !hasSelection, hint: hasSelection ? undefined : "Markera ett hinder först" },
    { id: "numbering", label: numbering ? "Avsluta numrering" : "Numrera banan — klicka hindren i ordning", group: "Redigera", shortcut: ["N"], icon: <ListOrdered className="h-4 w-4" />, run: toggleNumbering, disabled: competingCount < 2, hint: competingCount < 2 ? "Placera minst två tävlingshinder" : "Markera ett hinder först för att numrera om från det" },
    { id: "reverse", label: "Vänd banordningen", group: "Redigera", icon: <ArrowUpDown className="h-4 w-4" />, run: reverseOrder, disabled: competingCount < 2, hint: competingCount < 2 ? "Placera minst två tävlingshinder" : undefined },
    { id: "inspector", label: inspectorOpen ? "Dölj egenskapspanelen" : "Visa egenskapspanelen", group: "Redigera", icon: <SlidersHorizontal className="h-4 w-4" />, run: () => setInspectorOpen(!inspectorOpen) },
    { id: "clear", label: "Rensa banan", group: "Redigera", icon: <Eraser className="h-4 w-4" />, run: clearAll, disabled: !hasObstacles, hint: hasObstacles ? undefined : "Banan är redan tom" },
    { id: "line", label: showLine ? "Dölj springlinje" : "Visa springlinje", group: "Visa", icon: <Spline className="h-4 w-4" />, run: () => setShowLine((v) => !v) },
    { id: "numbers", label: showNumbers ? "Dölj nummer" : "Visa nummer", group: "Visa", run: () => setShowNumbers((v) => !v) },
    { id: "distances", label: showDistances ? "Dölj avstånd mellan hinder" : "Visa avstånd mellan hinder", group: "Visa", shortcut: ["D"], icon: <ArrowLeftRight className="h-4 w-4" />, run: () => setShowDistances((v) => !v) },
    { id: "measure", label: measureMode ? "Avsluta måttband" : "Måttband — mät mellan två punkter", group: "Visa", shortcut: ["M"], icon: <RulerDimensionLine className="h-4 w-4" />, run: toggleMeasure },
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
  ], [undo, redo, showLine, showNumbers, showGrid, showRulers, showDistances, selected, selectionIds, obstacles, draft, numbered, exporting, past.length, future.length, hasSelection, canPlay, hasObstacles, plannerProfile, numbering, measureMode, multiMode, competingCount, inspectorOpen, clipboardCount]);

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
      const overlay = !!t.closest?.("[role='dialog'], [role='listbox'], [role='menu'], [role='combobox'], [role='option']");
      const interactive = overlay || !!t.closest?.("button, a");
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing) return;
      if (e.key === "Escape") {
        if (playbackActive) { setPlaybackActive(false); return; }
        if (numbering) { setNumbering(null); return; }
        if (measureMode) { setMeasureMode(false); setMeasure(null); return; }
        if (multiMode) { setMultiMode(false); return; }
        setPlacing(null);
        setSelection([]);
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
      // Markera/kopiera/klistra in — bara när fokus inte ligger i en dialog
      // eller meny, så att webbläsarens vanliga textkopiering fungerar där.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !overlay) {
        if (key === "a") { e.preventDefault(); selectAll(); }
        if (key === "c" && hasSelection) { e.preventDefault(); copySelection(false); }
        if (key === "x" && hasSelection) { e.preventDefault(); copySelection(true); }
        if (key === "v" && clipboardRef.current.length) { e.preventDefault(); pasteClipboard(); }
      }
      // Alla enkeltangents-genvägar kräver att fokus inte ligger på en
      // interaktiv kontroll — annars kapar vi t.ex. Space på en knapp.
      if (e.metaKey || e.ctrlKey || e.altKey || overlay) return;
      // Ta bort och piltangenter fungerar även när fokus ligger kvar på en
      // verktygsknapp (de aktiverar aldrig knappar).
      if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) {
        deleteSelected();
        return;
      }
      if (e.key.startsWith("Arrow") && hasSelection) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.25;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeSelection(dx, dy);
        return;
      }
      if (interactive) return;
      if (key === "n") toggleNumbering();
      if (key === "m") toggleMeasure();
      if (key === "d") setShowDistances((v) => !v);
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
  const issueObstacleIds = useMemo(
    () => new Set(issues.filter((i) => i.obstacleId && i.level !== "info").map((i) => i.obstacleId as string)),
    [issues]
  );
  const segmentLabels = useMemo(() => {
    if (!showDistances) return [];
    const labels = computeSegmentLabels(numbered);
    // Nummerbrickorna ritas överst — flytta etiketter som annars skyms.
    const badges = showNumbers
      ? numbered.filter((o) => o.number != null).map((o) => ({ x: o.x + 1.0 * detail, y: o.y - 1.0 * detail }))
      : [];
    return placeLabelsAwayFrom(labels, badges, 1.45 * detail, 1.1 * detail);
  }, [showDistances, showNumbers, numbered, detail]);
  /** Avståndsvarningar från regelkontrollen, per "till"-hinder. */
  const distanceIssueLevel = useMemo(() => {
    const m = new Map<string, "error" | "warning">();
    for (const i of issues) {
      if (!i.obstacleId || !DISTANCE_ISSUE_CODES.has(i.code)) continue;
      if (i.level === "error") m.set(i.obstacleId, "error");
      else if (i.level === "warning" && !m.has(i.obstacleId)) m.set(i.obstacleId, "warning");
    }
    return m;
  }, [issues]);
  /** Minsta träffyta i meter (~40 CSS-pixlar). */
  const hitMinM = 40 / (pxPerMeter || 20);

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
      <AffiliateBanner compact />
      <Seo
        title={IS_NATIVE_APP ? "Banplanerare för agility och hoopers | AgilityManager" : "Banplanerare — rita agility- och hoopersbanor gratis | AgilityManager"}
        description={IS_NATIVE_APP ? "Rita agility- och hoopersbanor i meterskala i mobilappen. Hindereditor, banlinje, import, export och delningslänkar. Rita utan konto." : "Rita banor i meterskala direkt i webbläsaren. Hindereditor, live banlinje, PNG-export och delningslänkar för agility och hoopers — gratis, utan konto."}
        canonicalPath="/banplanerare"
      />
      <h1 className="sr-only">Banplanerare för agility och hoopers</h1>
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

          <div className="hidden 2xl:block">
            <Logo />
          </div>
          <div className="mx-1 hidden h-8 w-px bg-ink/15 2xl:block" />
          <input
            value={name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="w-0 min-w-0 flex-1 truncate rounded-xl border-2 border-transparent bg-transparent px-1.5 py-2 font-display text-base tracking-wide outline-none transition-colors hover:border-ink/15 focus:border-ink sm:px-2 sm:text-2xl md:max-w-md"
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
              role="status"
              aria-live="polite"
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors 2xl:px-3 ${
                saveState === "error"
                  ? "bg-red-600 text-white"
                  : saveState === "saved"
                    ? "bg-forest text-paper"
                    : "bg-cream text-ink/50"
              }`}
            >
              {/* På små skärmar finns bara en prick — texten läses ändå upp
                  av skärmläsare och syns i breda vyer. */}
              <span aria-hidden className="h-2 w-2 rounded-full bg-current 2xl:hidden" />
              <span className="sr-only 2xl:not-sr-only">{draftSaveStatusLabel(saveState)}</span>
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
              className="pressable shadow-hard-sm inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-forest px-3 text-sm font-bold text-paper disabled:opacity-40 sm:h-11 sm:px-3.5 xl:px-5"
              title={obstacles.length ? "Spara banan på din profil och välj publik eller privat" : "Placera minst ett hinder först"}
              aria-label="Spara och dela banan på din profil"
            >
              <CloudCheck className="h-4 w-4" />{" "}
              <span className="hidden xl:inline">Spara & dela</span>
            </button>
            <button
              onClick={openShare}
              disabled={!obstacles.length}
              className="pressable shadow-hard-sm inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-tang px-3 text-sm font-bold text-ink disabled:opacity-40 sm:h-11 sm:px-3.5 xl:px-5"
              title={obstacles.length ? "Skapa en länk med hela banan — mottagaren behöver inget konto" : "Placera minst ett hinder först"}
              aria-label="Dela banan via länk"
            >
              <Share2 className="h-4 w-4" /> <span className="hidden xl:inline">Dela bana</span>
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
              <span className="hidden max-w-[8rem] truncate 2xl:inline">
                {plannerProfile ? plannerProfile.name : "Din profil"}
              </span>
            </button>

          </div>
        </div>
      </header>

      {saveState === "error" && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-b-2 border-ink/10 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 sm:px-5"
        >
          <span>
            {saveError ?? (IS_NATIVE_APP ? "Kunde inte spara banan på den här enheten." : "Kunde inte spara banan i den här webbläsaren.")} {IS_NATIVE_APP ? "Banan finns kvar här tills du stänger appen." : "Banan finns kvar här tills du stänger fliken."}
          </span>
          <button
            type="button"
            onClick={retrySave}
            className="pressable rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold text-ink"
          >
            Försök spara igen
          </button>
          <button
            type="button"
            onClick={onJson}
            className="pressable rounded-full border-2 border-ink bg-tang px-3 py-1 text-xs font-bold text-ink"
          >
            Ladda ner som JSON-fil
          </button>
        </div>
      )}

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
                  onClick={() => commitDraft((d) => ({ ...d, sizeClass: sc.key }))}
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
                        onClick={() => startPlacing(placing === def.type ? null : def.type)}
                        title={def.description}
                        aria-pressed={placing === def.type}
                        aria-label={`Placera ${def.label.toLowerCase()} — ${def.description}`}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${
                          placing === def.type ? "border-ink bg-tang shadow-hard-sm" : "border-ink/10 bg-white hover:border-ink"
                        }`}
                      >
                        <ObstacleIcon type={def.type} className="h-11 w-11" />
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
                <rect x="0.15" y="0.15" width={w - 0.3} height={h - 0.3} fill="none" stroke="#161812" strokeOpacity="0.6" strokeWidth={(0.12 * detail) / Math.sqrt(zoom)} />

                {/* springlinje (hundens väg) */}
                {showLine && runLineD && (
                  <path d={runLineD} fill="none" stroke="#FF6900" strokeWidth={(0.24 * detail) / Math.sqrt(zoom)} strokeDasharray={`${(0.65 * detail) / Math.sqrt(zoom)} ${(0.45 * detail) / Math.sqrt(zoom)}`} strokeLinecap="round" opacity="0.85" />
                )}

                {/* hinder — fotavtryck, markering och symbol */}
                {numbered.map((ob) => {
                  const isSelected = selectionSet.has(ob.id);
                  const hasIssue = issueObstacleIds.has(ob.id);
                  const b = obstacleLocalBounds(ob);
                  const bw = b.maxX - b.minX;
                  const bh = b.maxY - b.minY;
                  const cx = (b.minX + b.maxX) / 2;
                  const cy = (b.minY + b.maxY) / 2;
                  const hitW = Math.max(bw + 0.8, hitMinM);
                  const hitH = Math.max(bh + 0.8, hitMinM);
                  const pad = 0.3 * detail;
                  const pending = numberedDone && ob.number != null && !numberedDone.has(ob.id);
                  return (
                    <g
                      key={ob.id}
                      data-obstacle-id={ob.id}
                      transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rotation})`}
                      onPointerDown={(e) => onObstaclePointerDown(e, ob)}
                      className={numbering ? "cursor-pointer" : measureMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}
                      opacity={ob.locked ? 0.75 : 1}
                    >
                      {/* träffyta — minst ~40 skärmpixlar så att hindret är lätt att träffa i mobilen */}
                      <rect x={cx - hitW / 2} y={cy - hitH / 2} width={hitW} height={hitH} fill="transparent" />
                      {/* fotavtryck i verklig storlek */}
                      <rect
                        x={b.minX - 0.12} y={b.minY - 0.12} width={bw + 0.24} height={bh + 0.24}
                        rx={Math.min(0.3, (bh + 0.24) / 2)}
                        fill={isSelected ? "#E24C00" : "#FFFFFF"}
                        fillOpacity={isSelected ? 0.08 : 0.6}
                        data-ui
                      />
                      {(isSelected || hasIssue) && (
                        <rect
                          x={b.minX - pad} y={b.minY - pad} width={bw + 2 * pad} height={bh + 2 * pad}
                          rx={Math.min(0.5 * detail, (bh + 2 * pad) / 2)}
                          fill="none"
                          stroke="#E24C00"
                          strokeOpacity={isSelected ? 0.95 : 0.7}
                          strokeWidth={(isSelected ? 0.09 : 0.07) * detail}
                          strokeDasharray={isSelected ? undefined : `${0.22 * detail} ${0.16 * detail}`}
                          data-ui
                        />
                      )}
                      <g opacity={pending ? 0.45 : 1}>
                        <ObstacleGlyph
                          type={ob.type}
                          stroke={isSelected || hasIssue ? "#E24C00" : "#161812"}
                          sw={0.1 * detail}
                          curveDeg={ob.curveDeg}
                          curveSide={ob.curveSide}
                        />
                      </g>
                      {ob.locked && (
                        <g transform={`translate(${b.maxX} ${b.maxY}) rotate(${-ob.rotation})`} data-ui>
                          <circle r={0.32 * detail} fill="#161812" />
                          <text y={0.13 * detail} textAnchor="middle" fontSize={0.36 * detail} fill="#F6F1E7">🔒</text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* avstånd mellan hinder i banordning */}
                {segmentLabels.map((lab) => {
                  const level = distanceIssueLevel.get(lab.toId);
                  const text = formatMeters(lab.centerDistanceM);
                  const fs = 0.5 * detail;
                  const pillW = text.length * fs * 0.56 + fs * 0.9;
                  const pillH = fs * 1.55;
                  return (
                    <g key={`d-${lab.fromId}-${lab.toId}`} transform={`translate(${lab.lx} ${lab.ly})`} pointerEvents="none" data-distance-label>
                      <title>{`Hinder ${lab.fromNumber}→${lab.toNumber}: ${formatMeters(lab.centerDistanceM, 2)} mitt–mitt · ${formatMeters(lab.pathDistanceM)} längs hundlinjen`}</title>
                      <rect
                        x={-pillW / 2} y={-pillH / 2} width={pillW} height={pillH} rx={pillH / 2}
                        fill={level === "error" ? "#E24C00" : level === "warning" ? "#FFB020" : "#FFFFFF"}
                        stroke="#161812" strokeOpacity="0.35" strokeWidth={0.04 * detail}
                      />
                      <text
                        y={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="800"
                        fill={level === "error" ? "#FFFFFF" : "#161812"} fontFamily="Archivo, sans-serif"
                      >
                        {text}
                      </text>
                    </g>
                  );
                })}

                {/* nummer — ritas överst så att de aldrig döljs av andra hinder */}
                {showNumbers && numbered.map((ob) => {
                  if (ob.number == null) return null;
                  const isSelected = selectionSet.has(ob.id);
                  const done = numberedDone ? numberedDone.has(ob.id) : null;
                  const off = 1.0 * detail;
                  const r = 0.56 * detail;
                  return (
                    <g
                      key={`n-${ob.id}`}
                      transform={`translate(${ob.x + off} ${ob.y - off})`}
                      onPointerDown={(e) => onObstaclePointerDown(e, ob)}
                      className={numbering ? "cursor-pointer" : "cursor-grab"}
                      data-number-badge={ob.number}
                      data-obstacle-ref={ob.id}
                    >
                      <circle
                        r={r}
                        fill={done === false ? "#FFFFFF" : done ? "#006937" : isSelected ? "#E24C00" : "#161812"}
                        stroke={done === false ? "#161812" : "#F6F1E7"}
                        strokeWidth={0.08 * detail}
                        strokeDasharray={done === false ? `${0.16 * detail} ${0.12 * detail}` : undefined}
                      />
                      <text
                        y={0.25 * detail} textAnchor="middle" fontSize={0.7 * detail} fontWeight="800"
                        fill={done === false ? "#161812" : "#F6F1E7"} fillOpacity={done === false ? 0.55 : 1}
                        fontFamily="Archivo, sans-serif"
                      >
                        {ob.number}
                      </text>
                    </g>
                  );
                })}

                {/* rotationshandtag för ett markerat, olåst hinder */}
                {selected && !selected.locked && !numbering && !measureMode && (() => {
                  const b = obstacleLocalBounds(selected);
                  const top = b.minY - 0.3 * detail;
                  const handleY = top - 1.2 * detail;
                  return (
                    <g transform={`translate(${selected.x} ${selected.y}) rotate(${selected.rotation})`} data-ui>
                      <line x1="0" y1={top} x2="0" y2={handleY} stroke="#E24C00" strokeWidth={0.07 * detail} strokeDasharray={`${0.14 * detail} ${0.12 * detail}`} />
                      <g
                        transform={`translate(0 ${handleY}) rotate(${-selected.rotation})`}
                        onPointerDown={(e) => onRotatePointerDown(e, selected.id)}
                        className="cursor-crosshair"
                        aria-label="Rotera hindret (Shift = fri vinkel)"
                      >
                        <circle r={0.9 * detail} fill="transparent" />
                        <circle r={0.5 * detail} fill="#E24C00" stroke="#F6F1E7" strokeWidth={0.1 * detail} />
                        <RotateCw width={0.5 * detail} height={0.5 * detail} x={-0.25 * detail} y={-0.25 * detail} color="#F6F1E7" />
                      </g>
                    </g>
                  );
                })()}

                {/* markeringsruta */}
                {marquee && (
                  <rect
                    x={Math.min(marquee.a.x, marquee.b.x)}
                    y={Math.min(marquee.a.y, marquee.b.y)}
                    width={Math.abs(marquee.b.x - marquee.a.x)}
                    height={Math.abs(marquee.b.y - marquee.a.y)}
                    fill="#E24C00"
                    fillOpacity="0.08"
                    stroke="#E24C00"
                    strokeWidth={0.06 * detail}
                    strokeDasharray={`${0.25 * detail} ${0.15 * detail}`}
                    pointerEvents="none"
                    data-ui
                  />
                )}

                {/* måttband */}
                {measure && (() => {
                  const dist = Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y);
                  const mx = (measure.a.x + measure.b.x) / 2;
                  const my = (measure.a.y + measure.b.y) / 2;
                  const text = formatMeters(dist, 2);
                  const fs = 0.62 * detail;
                  const pillW = text.length * fs * 0.56 + fs * 1.0;
                  const pillH = fs * 1.6;
                  return (
                    <g pointerEvents="none" data-ui data-measure={dist.toFixed(2)}>
                      <line x1={measure.a.x} y1={measure.a.y} x2={measure.b.x} y2={measure.b.y} stroke="#161812" strokeWidth={0.16 * detail} strokeOpacity="0.25" strokeLinecap="round" />
                      <line x1={measure.a.x} y1={measure.a.y} x2={measure.b.x} y2={measure.b.y} stroke="#006937" strokeWidth={0.08 * detail} strokeDasharray={`${0.3 * detail} ${0.15 * detail}`} strokeLinecap="round" />
                      {[measure.a, measure.b].map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={0.2 * detail} fill="#006937" stroke="#F6F1E7" strokeWidth={0.06 * detail} />
                      ))}
                      <g transform={`translate(${mx} ${my})`}>
                        <rect x={-pillW / 2} y={-pillH / 2} width={pillW} height={pillH} rx={pillH / 2} fill="#006937" />
                        <text y={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="800" fill="#F6F1E7" fontFamily="Archivo, sans-serif">
                          {text}
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* spökhinder vid placering */}
                {placing && ghost && (
                  <g transform={`translate(${ghost.x} ${ghost.y})`} opacity="0.55" data-ui>
                    <ObstacleGlyph type={placing} stroke="#006937" sw={0.1 * detail} />
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
              className={`absolute right-3 ${placing || numbering || measureMode || multiMode ? "top-[4.6rem] sm:top-[2.2rem]" : showRulers ? "top-[2.2rem]" : "top-3"} z-30 inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-2 text-xs font-bold shadow-hard-sm transition-all ${
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

            {/* Markerade hinder — åtgärdsrad */}
            {hasSelection && !playbackActive && !numbering && (
              <div
                role="toolbar"
                aria-label="Åtgärder för markerade hinder"
                className="absolute bottom-24 left-1/2 z-30 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1.5 rounded-2xl border-2 border-ink bg-paper p-1.5 shadow-hard sm:bottom-28"
              >
                <span className="hidden px-2 text-xs font-bold leading-tight text-ink/70 sm:block">
                  {selected ? (
                    <>
                      {selectedNumbered?.number != null && `#${selectedNumbered.number} `}{selectedDef?.label}
                      <span className="block font-semibold text-ink/45">
                        {selected.x.toFixed(2).replace(".", ",")} × {selected.y.toFixed(2).replace(".", ",")} m · {Math.round(((selected.rotation % 360) + 360) % 360)}°
                      </span>
                    </>
                  ) : (
                    <>
                      {selectionIds.length} hinder
                      <span className="block font-semibold text-ink/45">
                        {selectionLockedCount > 0 ? `${selectionLockedCount} låsta` : "Dra för att flytta gruppen"}
                      </span>
                    </>
                  )}
                </span>
                <span className="px-1 text-xs font-black text-ink/70 sm:hidden" aria-hidden>
                  {selectionIds.length > 1 ? selectionIds.length : selectedNumbered?.number != null ? `#${selectedNumbered.number}` : ""}
                </span>
                <ToolButton onClick={() => rotateBy(-45)} label="Rotera 45° moturs (Shift+R)" disabled={selectionMovable === 0}>
                  <RotateCcw className="h-4 w-4" />
                </ToolButton>
                <ToolButton onClick={() => rotateBy(45)} label="Rotera 45° medurs (R)" disabled={selectionMovable === 0}>
                  <RotateCw className="h-4 w-4" />
                </ToolButton>
                {selected && !NON_COMPETING.has(selected.type) && (
                  <span className="hidden gap-1.5 sm:flex">
                    <ToolButton onClick={() => moveSelectedInOrder(-1)} label="Flytta tidigare i banordningen" disabled={selectedNumbered?.number === 1}>
                      <ChevronDown className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton onClick={() => moveSelectedInOrder(1)} label="Flytta senare i banordningen" disabled={selectedNumbered?.number === competingCount}>
                      <ChevronUp className="h-4 w-4" />
                    </ToolButton>
                  </span>
                )}
                <ToolButton onClick={duplicateSelected} label="Duplicera (Ctrl+D)">
                  <Copy className="h-4 w-4" />
                </ToolButton>
                <ToolButton
                  onClick={toggleLockSelected}
                  label={selectionLockedCount === selectedObstacles.length ? "Lås upp (L)" : "Lås (L)"}
                  active={selectionLockedCount === selectedObstacles.length}
                >
                  {selectionLockedCount === selectedObstacles.length ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </ToolButton>
                <ToolButton onClick={deleteSelected} label="Ta bort (Delete)" disabled={selectionMovable === 0}>
                  <Trash2 className="h-4 w-4" />
                </ToolButton>
              </div>
            )}

            {/* Egenskaper: exakta mått, banordning, tunnelböjning, justering */}
            {hasSelection && !playbackActive && !numbering && (
              <ObstacleInspector
                className={`absolute inset-x-3 z-30 max-h-[45%] overflow-y-auto sm:inset-x-auto sm:left-3 sm:w-72 ${
                  // Mobil: under regelkontrollknappen (och ev. statusbanner),
                  // så att mitten av planen och åtgärdsraden syns.
                  placing || multiMode ? "top-[7.4rem]" : "top-[4.6rem]"
                } ${showRulers ? "sm:top-[2.2rem]" : "sm:top-3"}`}
                open={inspectorOpen}
                onOpenChange={setInspectorOpen}
                obstacle={selected}
                obstacleLabel={selectedDef?.label}
                number={selectedNumbered?.number ?? null}
                competingCount={competingCount}
                arena={arena}
                onPosition={setSelectedPosition}
                onRotation={setSelectedRotation}
                onNumber={setSelectedNumber}
                onTunnelCurve={setTunnelCurve}
                multiCount={selectionIds.length}
                multiLockedCount={selectionLockedCount}
                onAlign={alignSelection}
                onDistribute={distributeSelection}
              />
            )}

            {/* Numreringsläge */}
            {numbering && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3" role="status" aria-live="polite">
                <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border-2 border-ink bg-forest py-1.5 pl-3 pr-1.5 text-paper shadow-hard">
                  <ListOrdered className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold leading-tight">
                    Klicka hinder <span className="rounded bg-paper px-1.5 py-0.5 text-forest">#{nextNumber}</span>
                    <span className="hidden font-semibold text-paper/70 sm:inline"> · i den ordning hunden tar dem</span>
                  </span>
                  <button
                    type="button"
                    onClick={numberingBack}
                    disabled={numbering.seq.length === 0}
                    className="h-8 shrink-0 rounded-full bg-paper/20 px-3 text-xs font-bold transition-colors hover:bg-paper/35 disabled:opacity-40"
                  >
                    Backa
                  </button>
                  <button
                    type="button"
                    onClick={stopNumbering}
                    className="h-8 shrink-0 rounded-full bg-paper px-3 text-xs font-bold text-forest"
                  >
                    Klar
                  </button>
                </div>
              </div>
            )}

            {/* Måttband */}
            {measureMode && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3" role="status" aria-live="polite">
                <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border-2 border-ink bg-paper py-1.5 pl-3 pr-1.5 shadow-hard">
                  <RulerDimensionLine className="h-4 w-4 shrink-0 text-forest" />
                  <span className="text-xs font-bold leading-tight">
                    {measure
                      ? <>Avstånd <span className="tabular-nums">{formatMeters(Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y), 2)}</span></>
                      : "Dra mellan två punkter för att mäta"}
                    <span className="hidden font-semibold text-ink/50 sm:inline"> · snäpper mot hindrens mitt</span>
                  </span>
                  <button
                    type="button"
                    onClick={toggleMeasure}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/10 transition-colors hover:bg-ink/20"
                    aria-label="Avsluta måttband (Esc)"
                    title="Avsluta måttband (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Välj flera (pekskärm) */}
            {multiMode && !numbering && !measureMode && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3" role="status" aria-live="polite">
                <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border-2 border-ink bg-paper py-1.5 pl-3 pr-1.5 shadow-hard">
                  <SquareDashedMousePointer className="h-4 w-4 shrink-0 text-ember" />
                  <span className="text-xs font-bold leading-tight">
                    Tryck på hinder eller dra en ruta
                    <span className="font-semibold text-ink/50"> · {selectionIds.length} markerade</span>
                  </span>
                  <button
                    type="button"
                    onClick={toggleMultiMode}
                    className="h-8 shrink-0 rounded-full bg-ink px-3 text-xs font-bold text-paper"
                  >
                    Klar
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
                        onClick={() => startPlacing(palette[0].type)}
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
            <ToolButton onClick={() => setShowDistances((v) => !v)} active={showDistances} toggle label={showDistances ? "Dölj avstånd mellan hinder (D)" : "Visa avstånd mellan hinder (D)"}>
              <ArrowLeftRight className="h-5 w-5" />
            </ToolButton>
            <div className="mx-1.5 h-8 w-px bg-ink/15" />
            <ToolButton onClick={toggleNumbering} active={!!numbering} toggle label="Numrera — klicka hindren i ordning (N)" disabled={competingCount < 2 && !numbering}>
              <ListOrdered className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={toggleMeasure} active={measureMode} toggle label="Måttband — mät avstånd (M)">
              <RulerDimensionLine className="h-5 w-5" />
            </ToolButton>
            <ToolButton onClick={toggleMultiMode} active={multiMode} toggle label="Välj flera hinder (eller Shift-klicka / Shift-dra)" disabled={!obstacles.length && !multiMode}>
              <SquareDashedMousePointer className="h-5 w-5" />
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
              {[
                { key: "number", label: "Numrera", Icon: ListOrdered, on: !!numbering, run: toggleNumbering, disabled: competingCount < 2 && !numbering },
                { key: "measure", label: "Mät", Icon: RulerDimensionLine, on: measureMode, run: toggleMeasure, disabled: false },
                { key: "dist", label: "Avstånd", Icon: ArrowLeftRight, on: showDistances, run: () => setShowDistances((v) => !v), disabled: false },
                { key: "multi", label: "Välj flera", Icon: SquareDashedMousePointer, on: multiMode, run: toggleMultiMode, disabled: !obstacles.length && !multiMode },
              ].map(({ key, label, Icon, on, run, disabled }) => (
                <button
                  key={key}
                  onClick={run}
                  disabled={disabled}
                  aria-pressed={on}
                  className={`flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 disabled:opacity-30 ${
                    on ? "border-ink bg-tang" : "border-ink/15 bg-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[9px] font-bold leading-tight">{label}</span>
                </button>
              ))}
              <div className="mx-0.5 w-px shrink-0 self-stretch bg-ink/15" aria-hidden />
              {palette.map((def) => (
                <button
                  key={def.type}
                  onClick={() => startPlacing(placing === def.type ? null : def.type)}
                  aria-pressed={placing === def.type}
                  aria-label={`Placera ${def.label.toLowerCase()}`}
                  className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border-2 p-1.5 ${
                    placing === def.type ? "border-ink bg-tang" : "border-ink/10 bg-white"
                  }`}
                >
                  <ObstacleIcon type={def.type} className="h-8 w-8" />
                  <span className="text-[9px] font-bold leading-tight">{def.label}</span>
                </button>
              ))}
            </div>
            {/* Avbryt placering sker i bannern överst — ingen extra knapp här,
                annars hoppar planen när dockan växer. */}
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
        description={IS_NATIVE_APP ? "Nuvarande bana ersätts. Exportera den först om du vill behålla en kopia." : "Nuvarande bana ersätts (den är autosparad lokalt i webbläsaren)."}
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
