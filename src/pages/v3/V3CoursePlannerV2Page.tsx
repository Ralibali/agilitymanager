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
import { useEffect, useMemo, useRef, useState, useCallback, type PointerEvent } from "react";
import { ArrowLeft, Save, Trash2, RotateCw, Hash, MousePointer2, Eraser, FileDown, AlertTriangle, AlertCircle, Info, CheckCircle2, Share2, Dumbbell, Cloud, CloudOff, Library, Undo2, Redo2, Copy, Magnet, ListOrdered } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  OBSTACLES_V2, SIZE_CLASSES, CLASS_TEMPLATES, getArenaPresetsBySport,
  getObstacleDefV2, getTemplatesBySport,
  type Sport, type SizeClassKey, type ObstacleTypeV2, type ClassTemplateKey, type ObstacleDefV2,
} from "@/features/course-planner-v2/config";
import { validateCourse, computeCourseTimes, summarizeIssues, type ValidationIssue } from "@/features/course-planner-v2/validation";
import { exportJudgePdf } from "@/features/course-planner-v2/judgePdf";
import { exportStartlistPdf } from "@/features/course-planner-v2/startlistPdf";
import CourseLibraryDialog from "@/features/course-planner-v2/CourseLibraryDialog";
import ClubShareDialog from "@/features/course-planner-v2/ClubShareDialog";
import CourseCommentsPanel from "@/features/course-planner-v2/CourseCommentsPanel";
import { instantiatePrebuilt, type PrebuiltCourse } from "@/features/course-planner-v2/templates";
import type { LibraryCourse } from "@/features/course-planner-v2/library";

const STORAGE_KEY = "am_course_planner_v2";

interface ObstacleV2 {
  id: string;
  type: ObstacleTypeV2;
  /** position i meter (0,0 = banans övre vänstra hörn). */
  x: number;
  y: number;
  rotation: number;
  number?: number;
}

interface CourseV2 {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleV2[];
}

const DEFAULT_COURSE: CourseV2 = {
  name: "Ny bana",
  sport: "agility",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  classTemplate: null,
  obstacles: [],
};

function loadCourse(): CourseV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COURSE;
    return { ...DEFAULT_COURSE, ...JSON.parse(raw) };
  } catch { return DEFAULT_COURSE; }
}

function saveCourse(c: CourseV2) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function V3CoursePlannerV2Page() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourseRaw] = useState<CourseV2>(() => loadCourse());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "erase" | "number">("select");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(true);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [snap, setSnap] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY + "_cloud_id"); } catch { return null; }
  });
  const [savingCloud, setSavingCloud] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

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

  // Validering + tider — räknas live
  const issues = useMemo(() => validateCourse(course), [course]);
  const issueSummary = useMemo(() => summarizeIssues(issues), [issues]);
  const issueIdSet = useMemo(() => new Set(issues.filter((i) => i.obstacleId).map((i) => i.obstacleId!)), [issues]);
  const times = useMemo(() => computeCourseTimes(course), [course]);

  async function handleExportPdf() {
    try {
      await exportJudgePdf({
        name: course.name,
        sport: course.sport,
        sizeClass: course.sizeClass,
        arenaWidthM: course.arenaWidthM,
        arenaHeightM: course.arenaHeightM,
        classTemplate: course.classTemplate,
        obstacles: course.obstacles,
        svgElement: svgRef.current,
      });
      toast.success("Domar-PDF skapad");
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte skapa PDF");
    }
  }

  /** Sparar/uppdaterar banan i molnet (saved_courses). Returnerar id eller null. */
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
    if (course.obstacles.length > 0) {
      const ok = window.confirm("Att byta sport kräver tom bana. Vill du rensa banan och byta?");
      if (!ok) return;
      setCourse((c) => ({ ...c, sport: next, obstacles: [], classTemplate: null }));
      setSelectedId(null);
      return;
    }
    update({ sport: next, classTemplate: null });
  }

  function placeObstacle(type: ObstacleTypeV2) {
    const def = getObstacleDefV2(type);
    if (!def) return;
    if (!def.sport.includes(course.sport)) {
      toast.error(`${def.label} hör inte till ${course.sport === "agility" ? "agility" : "hoopers"}`);
      return;
    }
    const id = uid();
    const ob: ObstacleV2 = {
      id, type,
      x: snapM(course.arenaWidthM / 2),
      y: snapM(course.arenaHeightM / 2),
      rotation: 0,
    };
    setCourse((c) => ({ ...c, obstacles: [...c.obstacles, ob] }));
    setSelectedId(id);
    setTool("select");
  }

  function duplicateObstacle(id: string) {
    const ob = course.obstacles.find((o) => o.id === id);
    if (!ob) return;
    const newId = uid();
    const copy: ObstacleV2 = { ...ob, id: newId, x: snapM(ob.x + 1), y: snapM(ob.y + 1), number: undefined };
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
    setCourse((c) => ({ ...c, obstacles: c.obstacles.filter((o) => o.id !== id) }));
    setSelectedId(null);
  }

  function rotateObstacle(id: string, deg: number) {
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o) => o.id === id ? { ...o, rotation: (o.rotation + deg) % 360 } : o),
    }));
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

  function handlePointerDown(e: PointerEvent<SVGGElement>, id: string) {
    e.stopPropagation();
    if (tool === "erase") { deleteObstacle(id); return; }
    if (tool === "number") {
      const ob = course.obstacles.find((o) => o.id === id);
      const next = ob?.number ? undefined : ((Math.max(0, ...course.obstacles.map((x) => x.number ?? 0))) + 1);
      setObstacleNumber(id, next);
      return;
    }
    setSelectedId(id);
    setDraggingId(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  // Drag på SVG-koordinater → meter
  function handleSvgPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!draggingId) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    setCourse((c) => ({
      ...c,
      obstacles: c.obstacles.map((o) => o.id === draggingId
        ? { ...o, x: snapM(clamp(local.x, 0, c.arenaWidthM)), y: snapM(clamp(local.y, 0, c.arenaHeightM)) }
        : o),
    }));
  }

  function handleSvgPointerUp() { setDraggingId(null); }

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

  return (
    <div className="min-h-[100dvh] bg-[#f9f8f6] text-neutral-900">
      {/* TOPBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-black/5 px-4 py-2.5 flex items-center gap-3">
        <Link to="/v3/courses" className="h-9 w-9 grid place-items-center rounded-full bg-neutral-100 text-neutral-700" aria-label="Tillbaka">
          <ArrowLeft size={16} />
        </Link>
        <input
          value={course.name}
          onChange={(e) => update({ name: e.target.value })}
          className="h-9 min-w-0 flex-1 max-w-[320px] px-3 rounded-full border border-black/10 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-[#1a6b3c]/25"
        />
        <span className="hidden md:inline text-[11px] text-neutral-500">
          {savedAt ? `Autosparad ${savedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "Sparas…"}
        </span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SegmentedSport value={course.sport} onChange={switchSport} />
          <ValidationBadge summary={issueSummary} onClick={() => setIssuesOpen((v) => !v)} active={issuesOpen} />
          <button
            onClick={() => setLibraryOpen(true)}
            className="h-9 w-9 sm:w-auto sm:px-3 grid sm:inline-flex place-items-center sm:items-center rounded-full bg-white border border-black/10 text-[12px] font-semibold gap-1.5 hover:border-neutral-400"
            title="Öppna banbibliotek"
          >
            <Library size={14} /> <span className="hidden sm:inline">Bibliotek</span>
          </button>
          <button
            onClick={handleTrainThis}
            className="h-9 w-9 sm:w-auto sm:px-3 grid sm:inline-flex place-items-center sm:items-center rounded-full bg-white border border-black/10 text-[12px] font-semibold gap-1.5 hover:border-neutral-400"
            title="Skapa träningspass från denna bana"
          >
            <Dumbbell size={14} /> <span className="hidden sm:inline">Träna</span>
          </button>
          <button
            onClick={handleShare}
            disabled={!user}
            className="h-9 w-9 sm:w-auto sm:px-3 grid sm:inline-flex place-items-center sm:items-center rounded-full bg-white border border-black/10 text-[12px] font-semibold gap-1.5 hover:border-neutral-400 disabled:opacity-40"
            title={user ? "Dela banan (klubb / publik länk)" : "Logga in för att dela"}
          >
            <Share2 size={14} /> <span className="hidden sm:inline">Dela</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="h-9 w-9 sm:w-auto sm:px-3 grid sm:inline-flex place-items-center sm:items-center rounded-full bg-white border border-black/10 text-[12px] font-semibold gap-1.5 hover:border-neutral-400"
            title="Exportera domar-PDF"
          >
            <FileDown size={14} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={async () => {
              saveCourse(course);
              if (user) await saveToCloud();
              else toast.success("Bana sparad lokalt");
            }}
            disabled={savingCloud}
            className="h-9 px-3 rounded-full bg-[#1a6b3c] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
            title={user ? "Spara i molnet" : "Sparas lokalt — logga in för molnsynk"}
          >
            {user ? <Cloud size={14} /> : <CloudOff size={14} />}
            <span className="hidden xs:inline">Spara</span>
            <Save size={14} className="xs:hidden" />
          </button>
        </div>
      </header>

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

      {issuesOpen && (
        <div className="bg-white border-b border-black/5 px-4 py-3 max-h-[40vh] overflow-y-auto">
          <IssuesList issues={issues} onSelect={(id) => { if (id) setSelectedId(id); }} />
        </div>
      )}

      {/* MAIN GRID */}
      <main className="grid gap-3 p-3 lg:p-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* LEFT */}
        <aside className="rounded-2xl bg-white border border-black/6 p-3 space-y-4 max-h-[calc(100dvh-90px)] overflow-y-auto">
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
                        className="aspect-square rounded-lg border border-black/8 bg-neutral-50 hover:bg-[#1a6b3c]/5 hover:border-[#1a6b3c]/30 grid place-items-center text-[10px] font-medium text-neutral-700 leading-tight px-1 text-center transition"
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
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Klassmallar</h3>
            <div className="grid gap-1">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => applyTemplate(t.key)}
                  className={cn(
                    "h-9 px-2.5 rounded-lg text-left text-[12px] font-medium border transition",
                    course.classTemplate === t.key
                      ? "bg-[#1a6b3c] text-white border-[#1a6b3c]"
                      : "bg-white text-neutral-700 border-black/8 hover:border-[#1a6b3c]/30",
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
                      : "bg-white text-neutral-700 border-black/8 hover:border-neutral-400",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* CENTER — banyta */}
        <section className="rounded-2xl bg-white border border-black/6 p-3 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <ToolBtn active={tool === "select"} onClick={() => setTool("select")} icon={<MousePointer2 size={14} />}>Välj</ToolBtn>
              <ToolBtn active={tool === "erase"} onClick={() => setTool("erase")} icon={<Eraser size={14} />}>Sudda</ToolBtn>
              <ToolBtn active={tool === "number"} onClick={() => setTool("number")} icon={<Hash size={14} />}>Nummer</ToolBtn>
              <button onClick={autoRenumber} className="h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200">Auto-numrera</button>
              <button onClick={undo} disabled={historyRef.current.past.length === 0} title="Ångra (Ctrl+Z)" className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-black/8 hover:border-neutral-400 disabled:opacity-30"><Undo2 size={13} /></button>
              <button onClick={redo} disabled={historyRef.current.future.length === 0} title="Gör om (Ctrl+Shift+Z)" className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-black/8 hover:border-neutral-400 disabled:opacity-30"><Redo2 size={13} /></button>
              <button onClick={() => selected && duplicateObstacle(selected.id)} disabled={!selected} title="Duplicera (Ctrl+D)" className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-black/8 hover:border-neutral-400 disabled:opacity-30"><Copy size={13} /></button>
              <button onClick={() => setSnap((v) => !v)} title="Snap-to-grid (0,5 m)" className={cn("h-8 px-2.5 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1", snap ? "bg-[#1a6b3c] text-white border-[#1a6b3c]" : "bg-white text-neutral-700 border-black/8")}><Magnet size={12} /> Snap</button>
              <button onClick={() => exportStartlistPdf({ courseName: course.name, sport: course.sport, sizeClass: course.sizeClass, classTemplate: course.classTemplate, obstacles: course.obstacles })} className="h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-white border border-black/8 hover:border-neutral-400 inline-flex items-center gap-1" title="Startlista PDF"><ListOrdered size={12} /> Startlista</button>
              <button
                onClick={() => setShowPath((v) => !v)}
                className={cn(
                  "h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition",
                  showPath ? "bg-[#1a6b3c] text-white border-[#1a6b3c]" : "bg-white text-neutral-700 border-black/8",
                )}
                title="Visa banlinjen mellan numrerade hinder"
              >
                Banlinje
              </button>
            </div>
            <div className="text-[11px] text-neutral-500">
              {course.arenaWidthM} × {course.arenaHeightM} m · {times.lengthM.toFixed(1)} m · {course.obstacles.length} hinder
            </div>
          </div>
          <ArenaCanvas
            svgRef={svgRef}
            course={course}
            selectedId={selectedId}
            highlightIds={issueIdSet}
            showPath={showPath}
            onObstacleDown={handlePointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onBackgroundClick={() => setSelectedId(null)}
          />
        </section>

        {/* RIGHT */}
        <aside className="rounded-2xl bg-white border border-black/6 p-3 space-y-4 max-h-[calc(100dvh-90px)] overflow-y-auto">
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
                      ? "bg-[#c85d1e] text-white border-[#c85d1e]"
                      : "bg-white text-neutral-700 border-black/8 hover:border-[#c85d1e]/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-neutral-600 leading-snug">
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
            />
          ) : (
            <SummaryPanel course={course} />
          )}
          <CourseCommentsPanel courseId={cloudId} enabled={!!cloudId} />
        </aside>
      </main>
    </div>
  );
}

/* ───────────────── Sub-components ───────────────── */

function SegmentedSport({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <div className="inline-flex h-9 rounded-full bg-neutral-100 p-0.5">
      {(["agility", "hoopers"] as Sport[]).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            "h-8 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wide transition",
            value === s ? "bg-white text-[#1a6b3c] shadow-sm" : "text-neutral-500",
          )}
        >
          {s === "agility" ? "Agility" : "Hoopers"}
        </button>
      ))}
    </div>
  );
}

function ToolBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition border",
        active ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-700 border-black/8 hover:border-neutral-400",
      )}
    >
      {icon}{children}
    </button>
  );
}

function ArenaCanvas({
  svgRef, course, selectedId, highlightIds, showPath,
  onObstacleDown, onPointerMove, onPointerUp, onBackgroundClick,
}: {
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  course: CourseV2;
  selectedId: string | null;
  highlightIds: Set<string>;
  showPath: boolean;
  onObstacleDown: (e: PointerEvent<SVGGElement>, id: string) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onBackgroundClick: () => void;
}) {
  const w = course.arenaWidthM;
  const h = course.arenaHeightM;
  const padding = 1;
  const numbered = course.obstacles
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const pathD = numbered.length > 1
    ? numbered.map((o, i) => `${i === 0 ? "M" : "L"} ${o.x} ${o.y}`).join(" ")
    : "";
  return (
    <div className="rounded-xl bg-[#e8efe0] p-2 overflow-auto">
      <svg
        ref={svgRef}
        viewBox={`${-padding} ${-padding} ${w + padding * 2} ${h + padding * 2}`}
        className="w-full h-auto max-h-[calc(100dvh-200px)] touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
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
        {showPath && pathD && (
          <path d={pathD} fill="none" stroke="#c85d1e" strokeWidth={0.18} strokeDasharray="0.5 0.3" strokeLinecap="round" opacity={0.85} />
        )}
        {course.obstacles.map((ob) => (
          <ObstacleSvg
            key={ob.id}
            obstacle={ob}
            selected={selectedId === ob.id}
            hasIssue={highlightIds.has(ob.id)}
            onPointerDown={(e) => onObstacleDown(e, ob.id)}
          />
        ))}
      </svg>
    </div>
  );
}

function ObstacleSvg({ obstacle, selected, hasIssue, onPointerDown }: {
  obstacle: ObstacleV2;
  selected: boolean;
  hasIssue?: boolean;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
}) {
  const def = getObstacleDefV2(obstacle.type);
  if (!def) return null;
  const { w, d } = def.sizeM;
  return (
    <g
      transform={`translate(${obstacle.x} ${obstacle.y}) rotate(${obstacle.rotation})`}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: "grab" }}
    >
      {hasIssue && !selected && (
        <circle r={Math.max(w, d) / 2 + 0.35} fill="#ef4444" opacity={0.18} />
      )}
      <ObstacleShape def={def} selected={selected} />
      {selected && (
        <circle r={Math.max(w, d) / 2 + 0.4} fill="none" stroke="#1a6b3c" strokeWidth={0.12} strokeDasharray="0.3 0.2" />
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

function ObstacleShape({ def, selected }: { def: ObstacleDefV2; selected: boolean }) {
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
    case "tunnel":
      return <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={d / 2} ry={d / 2} fill="#cfe2f3" stroke={stroke} strokeWidth={sw} />;
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

function SelectedPanel({ obstacle, size, onRotate, onDelete, onNumberChange }: {
  obstacle: ObstacleV2;
  size: SizeClassKey;
  onRotate: (deg: number) => void;
  onDelete: () => void;
  onNumberChange: (n: number | undefined) => void;
}) {
  const def = getObstacleDefV2(obstacle.type)!;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === size)!;
  const showJumpHeight = ["jump", "wall", "combo", "longjump"].includes(def.type);
  const showTireHeight = def.type === "tire";
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Valt hinder</h3>
      <div className="rounded-xl border border-black/8 p-3 bg-neutral-50 space-y-2">
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
        <button onClick={() => onRotate(15)} className="h-9 rounded-lg bg-white border border-black/10 text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:border-neutral-400">
          <RotateCw size={13} /> Rotera 15°
        </button>
        <button onClick={() => onRotate(90)} className="h-9 rounded-lg bg-white border border-black/10 text-[12px] font-semibold hover:border-neutral-400">
          Rotera 90°
        </button>
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
          className="h-9 w-20 px-2 rounded-lg border border-black/10 text-[12px]"
        />
      </div>
      <button onClick={onDelete} className="mt-3 w-full h-9 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[12px] font-semibold inline-flex items-center justify-center gap-1.5">
        <Trash2 size={13} /> Ta bort hinder
      </button>
    </section>
  );
}

function SummaryPanel({ course }: { course: CourseV2 }) {
  const numbered = course.obstacles.filter((o) => o.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  let length = 0;
  for (let i = 1; i < numbered.length; i++) {
    const a = numbered[i - 1]; const b = numbered[i];
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  const tpl = course.classTemplate ? CLASS_TEMPLATES.find((t) => t.key === course.classTemplate) : null;
  const refTime = tpl && length > 0 ? Math.round(length / tpl.refSpeedMs) : null;
  const maxTime = tpl && refTime ? Math.round(refTime * tpl.maxTimeFactor) : null;
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Översikt</h3>
      <div className="rounded-xl border border-black/8 p-3 bg-neutral-50 space-y-1.5 text-[12px]">
        <Row label="Sport" value={course.sport === "agility" ? "Agility" : "Hoopers"} />
        <Row label="Klass" value={tpl?.label ?? "Ingen mall"} />
        <Row label="Banstorlek" value={`${course.arenaWidthM} × ${course.arenaHeightM} m`} />
        <Row label="Hinder" value={`${course.obstacles.length}${tpl ? ` (krav ${tpl.obstacleRange[0]}–${tpl.obstacleRange[1]})` : ""}`} />
        <Row label="Banlängd" value={`${length.toFixed(1)} m`} />
        {refTime != null && <Row label="Referenstid" value={`${refTime} s`} />}
        {maxTime != null && <Row label="Maxtid" value={`${maxTime} s`} />}
      </div>
      <p className="mt-2 text-[10px] text-neutral-500 leading-snug">
        Banlängden räknas mellan numrerade hinder. Referens- och maxtid kommer från klassmallen.
      </p>
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

