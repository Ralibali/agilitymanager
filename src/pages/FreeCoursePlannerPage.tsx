import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Info,
  Library,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { trackGrowthEvent } from "@/lib/growth";
import { buildFreePlannerAuthUrl, FREE_PLANNER_DEFAULT_SOURCE } from "@/features/free-planner/freePlannerRoutes";
import {
  clampPercent,
  clientPointToPercent,
  FREE_MAX_COMPETITION_OBSTACLES,
  nextFreeObstaclePosition,
} from "@/features/free-planner/freePlannerGeometry";
import {
  metresBetween,
  validateAgilityCourse,
  type AgilityClass,
  type AgilityObstacleType,
  type CourseKind,
  type PlannerObstacle,
  type RingSize,
  type Ruleset,
} from "@/features/free-planner/agilityCourseRules";
import {
  COURSE_BANK,
  DEFAULT_COURSE_RING,
  PRIMARY_AGILITY_TEMPLATE,
  PRIMARY_JUMPING_TEMPLATE,
  cloneBankCourseObstacles,
  getBankCourse,
  type BankCourse,
  type CourseFocus,
} from "@/features/free-planner/courseBank";
import { FreeObstacleGlyph, type FreeObstacleGlyphType } from "@/components/free-planner/FreeObstacleGlyph";

type ViewMode = "editor" | "bank";
type BankKindFilter = "all" | CourseKind;
type BankClassFilter = "all" | AgilityClass;
type BankFocusFilter = "all" | CourseFocus;

interface ObstacleDef {
  type: AgilityObstacleType;
  label: string;
  glyph: FreeObstacleGlyphType;
  description: string;
}

const STORAGE_KEY = "agilitymanager_public_course_v2";

const OBSTACLES: ObstacleDef[] = [
  { type: "jump", label: "Hopphinder", glyph: "jump", description: "Vanligt enkelhopp" },
  { type: "spread", label: "Oxer", glyph: "spread", description: "Ej tillåtet i klass 1" },
  { type: "wall", label: "Mur", glyph: "wall", description: "Rak ansats i Sverige" },
  { type: "tyre", label: "Däck", glyph: "tyre", description: "Tas högst en gång" },
  { type: "longjump", label: "Långhopp", glyph: "longjump", description: "Rak ansats" },
  { type: "tunnel", label: "Tunnel", glyph: "tunnel", description: "Rund tunnel" },
  { type: "weave", label: "Slalom", glyph: "weave", description: "12 pinnar · 60 cm" },
  { type: "dogwalk", label: "Balansbom", glyph: "dogwalk", description: "Kontakthinder" },
  { type: "seesaw", label: "Gungbräda", glyph: "seesaw", description: "Kontakthinder" },
  { type: "aframe", label: "A-hinder", glyph: "aframe", description: "Kontakthinder" },
];

const GLYPH_BY_TYPE: Record<AgilityObstacleType, FreeObstacleGlyphType> = {
  jump: "jump",
  spread: "spread",
  wall: "wall",
  tyre: "tyre",
  longjump: "longjump",
  tunnel: "tunnel",
  weave: "weave",
  dogwalk: "dogwalk",
  seesaw: "seesaw",
  aframe: "aframe",
};

const LABEL_BY_TYPE: Record<AgilityObstacleType, string> = Object.fromEntries(
  OBSTACLES.map((item) => [item.type, item.label]),
) as Record<AgilityObstacleType, string>;

const FOCUS_LABELS: Record<CourseFocus, string> = {
  flow: "Flyt",
  handling: "Handling",
  contacts: "Kontaktfält",
  speed: "Fart",
  technical: "Teknik",
};

function renumber(items: PlannerObstacle[]): PlannerObstacle[] {
  return items.map((item, index) => ({ ...item, number: index + 1 }));
}

function createObstacle(type: AgilityObstacleType, index: number): PlannerObstacle {
  const pos = nextFreeObstaclePosition(index + 1);
  return {
    id: `${type}-${Date.now().toString(36)}-${index}`,
    type,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    number: index + 1,
  };
}

function badgeOffset(index: number, obstacles: PlannerObstacle[], ring: RingSize) {
  const current = obstacles[index];
  const reference = index === 0 ? obstacles[1] : obstacles[index - 1];
  if (!reference) return { x: -30, y: -30 };
  const dx = ((current.x - reference.x) / 100) * ring.widthM;
  const dy = ((current.y - reference.y) / 100) * ring.heightM;
  const angle = Math.atan2(dy, dx);
  return { x: -Math.cos(angle) * 29, y: -Math.sin(angle) * 29 };
}

function PreviewObstacle({ obstacle }: { obstacle: PlannerObstacle }) {
  const y = obstacle.y * 0.75;
  const transform = `translate(${obstacle.x} ${y}) rotate(${obstacle.rotation})`;

  if (obstacle.type === "tunnel") {
    return <path d="M-3.5 2 Q0 -3.5 3.5 2" transform={transform} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />;
  }
  if (obstacle.type === "weave") {
    return (
      <g transform={transform}>
        {[-4, -2.4, -0.8, 0.8, 2.4, 4].map((x) => <circle key={x} cx={x} cy="0" r="0.55" fill="currentColor" />)}
      </g>
    );
  }
  if (obstacle.type === "tyre") {
    return <circle cx={obstacle.x} cy={y} r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />;
  }
  if (obstacle.type === "dogwalk" || obstacle.type === "seesaw") {
    return <rect x="-4.5" y="-1" width="9" height="2" rx="0.5" transform={transform} fill="currentColor" opacity="0.9" />;
  }
  if (obstacle.type === "aframe") {
    return <path d="M-4 1.8 L0 -2.2 L4 1.8" transform={transform} fill="none" stroke="currentColor" strokeWidth="1.4" />;
  }
  if (obstacle.type === "longjump") {
    return (
      <g transform={transform}>
        {[-3, -1, 1, 3].map((x) => <rect key={x} x={x - 0.45} y="-2.3" width="0.9" height="4.6" rx="0.3" fill="currentColor" />)}
      </g>
    );
  }

  return <line x1="-3.6" y1="0" x2="3.6" y2="0" transform={transform} stroke="currentColor" strokeWidth={obstacle.type === "spread" ? 2.1 : 1.5} strokeLinecap="round" />;
}

function CoursePreview({ course }: { course: BankCourse }) {
  const sorted = [...course.obstacles].sort((a, b) => a.number - b.number);
  const points = sorted.map((item) => `${item.x},${item.y * 0.75}`).join(" ");
  return (
    <svg viewBox="0 0 100 75" className="h-full w-full text-foreground" aria-label={`Förhandsvisning av ${course.title}`}>
      {Array.from({ length: 9 }, (_, index) => index * 12.5).map((position) => (
        <line key={`v-${position}`} x1={position} y1="0" x2={position} y2="75" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 7 }, (_, index) => index * 12.5).map((position) => (
        <line key={`h-${position}`} x1="0" y1={position} x2="100" y2={position} stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.5" />
      ))}
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      {sorted.map((item) => <PreviewObstacle key={item.id} obstacle={item} />)}
      {sorted.map((item) => (
        <g key={`n-${item.id}`} transform={`translate(${Math.min(97, item.x + 2.6)} ${Math.max(3, item.y * 0.75 - 2.6)})`}>
          <circle r="1.55" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="0.55" />
          <text y="0.72" textAnchor="middle" fontSize="2.1" fontWeight="700" fill="currentColor">{item.number}</text>
        </g>
      ))}
    </svg>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-bold", good ? "text-foreground" : "text-amber-700")}>{value}</div>
    </div>
  );
}

export default function FreeCoursePlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const source = (searchParams.get("source") ?? "").trim() || FREE_PLANNER_DEFAULT_SOURCE;
  const view: ViewMode = searchParams.get("view") === "bank" ? "bank" : "editor";
  const requestedCourse = getBankCourse(searchParams.get("course"));
  const initialCourse = requestedCourse ?? PRIMARY_AGILITY_TEMPLATE;

  const [ring, setRing] = useState<RingSize>(() => ({ ...initialCourse.ring }));
  const [ruleset, setRuleset] = useState<Ruleset>(initialCourse.ruleset);
  const [kind, setKind] = useState<CourseKind>(initialCourse.kind);
  const [competitionClass, setCompetitionClass] = useState<AgilityClass>(initialCourse.competitionClass);
  const [obstacles, setObstacles] = useState<PlannerObstacle[]>(() => cloneBankCourseObstacles(initialCourse));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [bankKind, setBankKind] = useState<BankKindFilter>("all");
  const [bankClass, setBankClass] = useState<BankClassFilter>("all");
  const [bankFocus, setBankFocus] = useState<BankFocusFilter>("all");
  const [bankSearch, setBankSearch] = useState("");
  const hydratedRef = useRef(false);

  const signupUrl = buildFreePlannerAuthUrl({ mode: "signup", source, sport: "agility" });
  const loginUrl = buildFreePlannerAuthUrl({ mode: "login", source, sport: "agility" });

  useEffect(() => {
    trackGrowthEvent("free_planner_opened", { source, sport: "agility", version: "public_rule_aware" });
  }, [source]);

  useEffect(() => {
    if (requestedCourse) {
      hydratedRef.current = true;
      const params = new URLSearchParams(searchParams);
      params.delete("course");
      params.delete("view");
      setSearchParams(params, { replace: true });
      trackGrowthEvent("course_bank_course_opened_from_link", { course_id: requestedCourse.id });
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as {
          ring?: RingSize;
          ruleset?: Ruleset;
          kind?: CourseKind;
          competitionClass?: AgilityClass;
          obstacles?: PlannerObstacle[];
        };
        if (stored.ring) setRing(stored.ring);
        if (stored.ruleset) setRuleset(stored.ruleset);
        if (stored.kind) setKind(stored.kind);
        if (stored.competitionClass) setCompetitionClass(stored.competitionClass);
        if (Array.isArray(stored.obstacles) && stored.obstacles.length) setObstacles(renumber(stored.obstacles));
      }
    } catch {
      // Trasig lokal data ska aldrig stoppa editorn.
    } finally {
      hydratedRef.current = true;
    }
    // Vi vill bara hydrera en gång vid mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ring, ruleset, kind, competitionClass, obstacles }));
      setSavedAt(new Date());
    } catch {
      // Privat läge kan blockera localStorage.
    }
  }, [ring, ruleset, kind, competitionClass, obstacles]);

  const sorted = useMemo(() => [...obstacles].sort((a, b) => a.number - b.number), [obstacles]);
  const selected = useMemo(() => obstacles.find((item) => item.id === selectedId) ?? null, [obstacles, selectedId]);
  const validation = useMemo(
    () => validateAgilityCourse(obstacles, ring, kind, competitionClass, ruleset),
    [obstacles, ring, kind, competitionClass, ruleset],
  );
  const errorCount = validation.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = validation.issues.filter((issue) => issue.severity === "warning").length;

  const filteredCourses = useMemo(() => {
    const query = bankSearch.trim().toLocaleLowerCase("sv-SE");
    return COURSE_BANK.filter((course) => {
      if (bankKind !== "all" && course.kind !== bankKind) return false;
      if (bankClass !== "all" && course.competitionClass !== bankClass) return false;
      if (bankFocus !== "all" && !course.focus.includes(bankFocus)) return false;
      if (!query) return true;
      return [course.title, course.description, ...course.tags, ...course.focus.map((focus) => FOCUS_LABELS[focus])]
        .join(" ")
        .toLocaleLowerCase("sv-SE")
        .includes(query);
    });
  }, [bankClass, bankFocus, bankKind, bankSearch]);

  const changeView = useCallback((next: ViewMode) => {
    const params = new URLSearchParams(searchParams);
    params.delete("course");
    if (next === "bank") params.set("view", "bank");
    else params.delete("view");
    setSearchParams(params, { replace: true });
    trackGrowthEvent("course_bank_view_changed", { view: next });
  }, [searchParams, setSearchParams]);

  const loadCourse = useCallback((course: BankCourse) => {
    setRing({ ...course.ring });
    setRuleset(course.ruleset);
    setKind(course.kind);
    setCompetitionClass(course.competitionClass);
    setObstacles(cloneBankCourseObstacles(course));
    setSelectedId(null);
    changeView("editor");
    trackGrowthEvent("course_bank_course_copied", { course_id: course.id, class: course.competitionClass, kind: course.kind });
  }, [changeView]);

  const addObstacle = useCallback((type: AgilityObstacleType) => {
    if (obstacles.length >= FREE_MAX_COMPETITION_OBSTACLES) return;
    setObstacles((items) => [...items, createObstacle(type, items.length)]);
    setPaletteOpen(false);
    trackGrowthEvent("free_planner_obstacle_added", { obstacle_type: type, count: obstacles.length + 1 });
  }, [obstacles.length]);

  const updateSelected = useCallback((patch: Partial<PlannerObstacle>) => {
    if (!selectedId) return;
    setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
  }, [selectedId]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setObstacles((items) => renumber(items.filter((item) => item.id !== selectedId)));
    setSelectedId(null);
  }, [selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected || obstacles.length >= FREE_MAX_COMPETITION_OBSTACLES) return;
    const clone: PlannerObstacle = {
      ...selected,
      id: `${selected.type}-${Date.now().toString(36)}-copy`,
      x: clampPercent(selected.x + 4),
      y: clampPercent(selected.y + 4),
      number: obstacles.length + 1,
    };
    setObstacles((items) => [...items, clone]);
  }, [selected, obstacles.length]);

  const moveOrder = useCallback((delta: number) => {
    if (!selected) return;
    setObstacles((items) => {
      const ordered = [...items].sort((a, b) => a.number - b.number);
      const index = ordered.findIndex((item) => item.id === selected.id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= ordered.length) return items;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      return renumber(ordered);
    });
  }, [selected]);

  const resetCourse = useCallback(() => {
    const course = kind === "agility" ? PRIMARY_AGILITY_TEMPLATE : PRIMARY_JUMPING_TEMPLATE;
    setRing({ ...course.ring });
    setRuleset(course.ruleset);
    setCompetitionClass(course.competitionClass);
    setObstacles(cloneBankCourseObstacles(course));
    setSelectedId(null);
    trackGrowthEvent("free_planner_reset", { kind });
  }, [kind]);

  const saveNow = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ring, ruleset, kind, competitionClass, obstacles }));
      setSavedAt(new Date());
      trackGrowthEvent("course_saved_local", { obstacle_count: obstacles.length, ruleset, kind });
    } catch {
      // Autosave är best effort.
    }
  }, [ring, ruleset, kind, competitionClass, obstacles]);

  const exportJson = useCallback(() => {
    const payload = JSON.stringify({ version: 2, ring, ruleset, kind, competitionClass, obstacles }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agilitybana-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    trackGrowthEvent("course_exported_json", { obstacle_count: obstacles.length });
  }, [ring, ruleset, kind, competitionClass, obstacles]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(null);

  const pointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>, obstacle: PlannerObstacle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const point = clientPointToPercent(canvas.getBoundingClientRect(), e.clientX, e.clientY);
    dragRef.current = { id: obstacle.id, offsetX: point.x - obstacle.x, offsetY: point.y - obstacle.y, moved: false };
    setSelectedId(obstacle.id);
  }, []);

  const pointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag) return;
    const point = clientPointToPercent(canvas.getBoundingClientRect(), e.clientX, e.clientY);
    const x = clampPercent(point.x - drag.offsetX);
    const y = clampPercent(point.y - drag.offsetY);
    setObstacles((items) => items.map((item) => {
      if (item.id !== drag.id) return item;
      if (Math.abs(item.x - x) < 0.02 && Math.abs(item.y - y) < 0.02) return item;
      drag.moved = true;
      return { ...item, x, y };
    }));
  }, []);

  const pointerUp = useCallback(() => {
    if (dragRef.current?.moved) trackGrowthEvent("free_planner_obstacle_moved", { obstacle_id: dragRef.current.id });
    dragRef.current = null;
  }, []);

  const selectedIndex = selected ? sorted.findIndex((item) => item.id === selected.id) : -1;
  const previous = selectedIndex > 0 ? sorted[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 && selectedIndex < sorted.length - 1 ? sorted[selectedIndex + 1] : null;

  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{view === "bank" ? "Banbank – agilitybanor klass 1–3" : "Rita agilitybana gratis"} | AgilityManager</title>
        <meta
          name="description"
          content={view === "bank"
            ? "Hitta gratis agility- och hoppbanor för klass 1, 2 och 3. Filtrera, förhandsgranska, kopiera och redigera direkt i AgilityManagers banplanerare."
            : "Rita agilitybanor gratis direkt i webbläsaren. Svensk regelkontroll, riktig meterskala, 15–22 hinder, autosparning och banbank – utan konto."}
        />
        <link rel="canonical" href={view === "bank" ? "https://agilitymanager.se/banplanerare?view=bank" : "https://agilitymanager.se/banplanerare"} />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="mr-auto font-display text-lg font-semibold tracking-tight">
            Agility<span className="text-primary">Manager</span>
          </Link>
          <button
            type="button"
            onClick={() => changeView(view === "bank" ? "editor" : "bank")}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            {view === "bank" ? <ArrowLeft size={16} /> : <Library size={16} />}
            {view === "bank" ? "Till ritbordet" : "Banbanken"}
          </button>
          <Link to={loginUrl} className="hidden h-10 items-center rounded-full px-3 text-sm font-medium sm:inline-flex">Logga in</Link>
          <Link to={signupUrl} className="hidden h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground md:inline-flex">
            Gratis konto
          </Link>
        </div>
      </header>

      {view === "bank" ? (
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Library size={13} /> Gratis banbank · {COURSE_BANK.length} banor
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Hitta en bana. Kopiera den. Gör den till din.</h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Alla banor här är AgilityManager-original byggda på 40 × 30 meter och testas automatiskt mot den svenska planritningsbara regelkontrollen. Välj klass, bantyp eller träningsfokus och öppna banan direkt i ritbordet.
            </p>
          </div>

          <section className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-label="Filtrera banbanken">
            <div className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={17} /> Filtrera banor</div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={bankSearch}
                  onChange={(event) => setBankSearch(event.target.value)}
                  placeholder="Sök tunnel, kontaktfält, fart…"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <select value={bankKind} onChange={(event) => setBankKind(event.target.value as BankKindFilter)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                <option value="all">Alla bantyper</option>
                <option value="agility">Agilityklass</option>
                <option value="jumping">Hoppklass</option>
              </select>
              <select value={bankClass} onChange={(event) => setBankClass(event.target.value === "all" ? "all" : Number(event.target.value) as AgilityClass)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                <option value="all">Alla klasser</option>
                <option value="1">Klass 1</option>
                <option value="2">Klass 2</option>
                <option value="3">Klass 3</option>
              </select>
              <select value={bankFocus} onChange={(event) => setBankFocus(event.target.value as BankFocusFilter)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                <option value="all">Alla fokus</option>
                {Object.entries(FOCUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{filteredCourses.length} av {COURSE_BANK.length} banor visas</span>
              {(bankKind !== "all" || bankClass !== "all" || bankFocus !== "all" || bankSearch) && (
                <button type="button" onClick={() => { setBankKind("all"); setBankClass("all"); setBankFocus("all"); setBankSearch(""); }} className="font-semibold text-primary hover:underline">Rensa filter</button>
              )}
            </div>
          </section>

          {filteredCourses.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course) => (
                <article key={course.id} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="aspect-[4/3] bg-muted p-4 text-foreground">
                    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-background p-2">
                      <CoursePreview course={course} />
                      <span className="absolute left-2 top-2 rounded-lg border border-border bg-background/90 px-2 py-1 text-[10px] font-bold">{course.ring.widthM} × {course.ring.heightM} m</span>
                      <span className="absolute bottom-2 right-2 rounded-lg bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">{course.obstacles.length} hinder</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">Klass {course.competitionClass}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold">{course.kind === "agility" ? "Agility" : "Hopp"}</span>
                      {course.focus.slice(0, 2).map((focus) => <span key={focus} className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{FOCUS_LABELS[focus]}</span>)}
                    </div>
                    <h2 className="mt-3 font-display text-xl font-semibold">{course.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{course.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-emerald-700">
                      <ShieldCheck size={14} /> Automatisk svensk bancheck
                    </div>
                    <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => loadCourse(course)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Copy size={16} /> Använd banan
                      </button>
                      <Link
                        to={`/banplanerare?course=${encodeURIComponent(course.id)}`}
                        aria-label={`Direktlänk till ${course.title}`}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
                      >
                        Länk
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center">
              <Search className="mx-auto h-7 w-7 text-muted-foreground" />
              <h2 className="mt-3 font-display text-xl font-semibold">Ingen bana matchar filtret</h2>
              <p className="mt-1 text-sm text-muted-foreground">Rensa något filter eller sök på ett annat träningsfokus.</p>
            </div>
          )}

          <section className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="text-sm font-bold">1. Välj en bana</div>
              <p className="mt-2 text-sm text-muted-foreground">Filtrera på klass, Agility/Hopp och vad du vill träna.</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="text-sm font-bold">2. Kopiera till ritbordet</div>
              <p className="mt-2 text-sm text-muted-foreground">Banan öppnas som en egen kopia. Originalet ändras aldrig.</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="text-sm font-bold">3. Anpassa efter din plan</div>
              <p className="mt-2 text-sm text-muted-foreground">Flytta, rotera och byt hinder medan bancheck och mått uppdateras.</p>
            </div>
          </section>

          <div className="mt-8 rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
            <h2 className="font-display text-xl font-semibold">Banbanken ska växa med användarna</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Ritandet och de öppna banorna är gratis. Ett gratiskonto ska senare ge molnsparning, favoriter och möjlighet att publicera egna banor under eget namn.
            </p>
            <Link to={signupUrl} className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Skapa gratis konto</Link>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck size={13} /> Svensk regelkontroll 2022–2026 · FCI-läge finns
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Rita en riktig agilitybana.</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Ritbordet använder riktig meterskala. Numren placeras på ansatssidan, hundlinjen mäts live och banan autosparas på den här enheten. Ingen registrering krävs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-card px-3 py-1.5">{obstacles.length}/22 hinder</span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5">≈ {Math.round(validation.approximateLengthM)} m raklinjesumma</span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5">Autosparad {savedAt ? savedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "lokalt"}</span>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[245px_minmax(0,1fr)_300px]">
            <aside className="order-2 rounded-3xl border border-border bg-card p-4 xl:order-1 xl:h-fit">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Hinder</h2>
                <span className="text-xs text-muted-foreground">max 22</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {OBSTACLES.map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    disabled={obstacles.length >= FREE_MAX_COMPETITION_OBSTACLES}
                    onClick={() => addObstacle(def.type)}
                    className="group rounded-2xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40"
                  >
                    <FreeObstacleGlyph type={def.glyph} size={30} />
                    <span className="mt-2 block text-xs font-semibold">{def.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">{def.description}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={resetCourse} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium hover:bg-muted">
                <RotateCcw size={15} /> Återställ grundbana
              </button>
            </aside>

            <div className="order-1 min-w-0 xl:order-2">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-foreground/5">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
                  <select value={ruleset} onChange={(event) => setRuleset(event.target.value as Ruleset)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-medium">
                    <option value="sweden">Svenska regler</option>
                    <option value="fci">FCI</option>
                  </select>
                  <select value={kind} onChange={(event) => {
                    const nextKind = event.target.value as CourseKind;
                    setKind(nextKind);
                    const template = nextKind === "agility" ? PRIMARY_AGILITY_TEMPLATE : PRIMARY_JUMPING_TEMPLATE;
                    if (obstacles.length === 20) {
                      setCompetitionClass(template.competitionClass);
                      setRuleset(template.ruleset);
                      setRing({ ...template.ring });
                      setObstacles(cloneBankCourseObstacles(template));
                    }
                  }} className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-medium">
                    <option value="agility">Agilityklass</option>
                    <option value="jumping">Hoppklass</option>
                  </select>
                  <select value={competitionClass} onChange={(event) => setCompetitionClass(Number(event.target.value) as AgilityClass)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-medium">
                    <option value={1}>Klass 1</option>
                    <option value={2}>Klass 2</option>
                    <option value={3}>Klass 3</option>
                  </select>
                  <div className="ml-auto flex items-center gap-1.5">
                    <label className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                      Ring
                      <input type="number" min={18} max={80} value={ring.widthM} onChange={(event) => setRing((current) => ({ ...current, widthM: Math.max(1, Number(event.target.value) || 1) }))} className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-center text-xs" />
                      ×
                      <input type="number" min={18} max={80} value={ring.heightM} onChange={(event) => setRing((current) => ({ ...current, heightM: Math.max(1, Number(event.target.value) || 1) }))} className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-center text-xs" />
                      m
                    </label>
                  </div>
                </div>

                <div className="bg-muted p-2 sm:p-3">
                  <div
                    ref={canvasRef}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                    onPointerCancel={pointerUp}
                    onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}
                    className="relative mx-auto w-full overflow-hidden rounded-2xl border-2 border-foreground/20 bg-background select-none"
                    style={{ aspectRatio: `${ring.widthM} / ${ring.heightM}`, touchAction: "none" }}
                    aria-label={`Agilitybana ${ring.widthM} gånger ${ring.heightM} meter`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-60"
                      style={{
                        backgroundImage: "linear-gradient(to right, hsl(var(--foreground) / 0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
                        backgroundSize: `${100 / ring.widthM}% ${100 / ring.heightM}%`,
                      }}
                    />
                    <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-background/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
                      1 ruta = 1 m · {ring.widthM} × {ring.heightM} m
                    </div>

                    {sorted.length > 1 && (
                      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                        <polyline
                          points={sorted.map((item) => `${item.x},${item.y}`).join(" ")}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeOpacity="0.22"
                          strokeWidth="2"
                          strokeDasharray="5 5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}

                    {sorted.map((obstacle) => {
                      const isSelected = obstacle.id === selectedId;
                      return (
                        <button
                          key={obstacle.id}
                          type="button"
                          onPointerDown={(event) => pointerDown(event, obstacle)}
                          className={cn(
                            "absolute z-20 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border bg-card shadow-sm transition-shadow sm:h-14 sm:w-14",
                            isSelected ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40",
                          )}
                          style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%`, touchAction: "none" }}
                          aria-label={`${obstacle.number}. ${LABEL_BY_TYPE[obstacle.type]}`}
                        >
                          <span style={{ transform: `rotate(${obstacle.rotation}deg)` }}>
                            <FreeObstacleGlyph type={GLYPH_BY_TYPE[obstacle.type]} size={34} />
                          </span>
                        </button>
                      );
                    })}

                    {sorted.map((obstacle, index) => {
                      const offset = badgeOffset(index, sorted, ring);
                      return (
                        <span
                          key={`number-${obstacle.id}`}
                          className="pointer-events-none absolute z-30 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-background bg-foreground text-[10px] font-bold text-background shadow"
                          style={{ left: `calc(${obstacle.x}% + ${offset.x}px)`, top: `calc(${obstacle.y}% + ${offset.y}px)` }}
                        >
                          {obstacle.number}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border p-3 sm:p-4">
                  <button type="button" onClick={() => setPaletteOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground xl:hidden">
                    <Plus size={16} /> Hinder
                  </button>
                  <button type="button" onClick={saveNow} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
                    <Save size={16} /> Spara på enheten
                  </button>
                  <button type="button" onClick={exportJson} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
                    <Download size={16} /> Exportera
                  </button>
                  <button type="button" onClick={() => changeView("bank")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
                    <Library size={16} /> Banbank
                  </button>
                </div>
              </div>

              {selected && (
                <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card shadow-sm">
                      <FreeObstacleGlyph type={GLYPH_BY_TYPE[selected.type]} size={31} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-primary">Hinder {selected.number}</div>
                          <h3 className="font-display text-lg font-semibold">{LABEL_BY_TYPE[selected.type]}</h3>
                        </div>
                        <button type="button" onClick={() => setSelectedId(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-background"><X size={15} /></button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateSelected({ rotation: selected.rotation - 15 })} className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium">↺ 15°</button>
                        <button type="button" onClick={() => updateSelected({ rotation: selected.rotation + 15 })} className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium">↻ 15°</button>
                        <button type="button" onClick={() => moveOrder(-1)} disabled={selected.number <= 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium disabled:opacity-40"><ChevronUp size={13} /> Tidigare</button>
                        <button type="button" onClick={() => moveOrder(1)} disabled={selected.number >= obstacles.length} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium disabled:opacity-40"><ChevronDown size={13} /> Senare</button>
                        <button type="button" onClick={duplicateSelected} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium"><Copy size={13} /> Duplicera</button>
                        <button type="button" onClick={removeSelected} className="inline-flex h-9 items-center gap-1 rounded-lg border border-destructive/20 bg-card px-3 text-xs font-medium text-destructive"><Trash2 size={13} /> Ta bort</button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        {previous && <span>Från #{previous.number}: <strong className="text-foreground">{metresBetween(previous, selected, ring).toFixed(1)} m</strong></span>}
                        {next && <span>Till #{next.number}: <strong className="text-foreground">{metresBetween(selected, next, ring).toFixed(1)} m</strong></span>}
                        <span>Rotation: <strong className="text-foreground">{Math.round(selected.rotation)}°</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="order-3 rounded-3xl border border-border bg-card p-4 xl:h-fit">
              <div className="flex items-center gap-3">
                <div className={cn("grid h-10 w-10 place-items-center rounded-full", errorCount === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>
                  {errorCount === 0 ? <Check size={19} /> : <TriangleAlert size={19} />}
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Bancheck</h2>
                  <p className="text-xs text-muted-foreground">{errorCount} fel · {warningCount} varningar</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="Hinder" value={`${obstacles.length}`} good={obstacles.length >= 15 && obstacles.length <= 22} />
                <Stat label="Hopp" value={`${validation.jumpPassages}`} good={validation.jumpPassages >= 7} />
                <Stat label="Längd" value={`≈${Math.round(validation.approximateLengthM)}m`} good />
              </div>

              <div className="mt-4 max-h-[430px] space-y-2 overflow-auto pr-1">
                {validation.issues.length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
                    <strong className="block">Inga automatiska regelbrott hittades.</strong>
                    Banan klarar de kontroller som kan mätas från planritningen.
                  </div>
                ) : validation.issues.map((issue, index) => (
                  <button
                    key={`${issue.code}-${index}`}
                    type="button"
                    onClick={() => issue.obstacleIds?.[0] && setSelectedId(issue.obstacleIds[0])}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left text-xs",
                      issue.severity === "error" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-border bg-muted/60 text-foreground",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      {issue.severity === "error" ? <TriangleAlert size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
                      <span>{issue.message}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Viktigt:</strong> automatiken kontrollerar regler som kan avgöras från planritningen. Hundens verkliga linje, fysisk hinderutrustning, säkerhet och slutlig bankonstruktion måste alltid verifieras av behörig domare/arrangör för officiell tävling.
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-7">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Gratis på riktigt</p>
              <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Rita först. Konto först när det faktiskt ger värde.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Du kan rita, ändra, kontrollera, spara lokalt, exportera och kopiera banor från Banbanken utan att registrera dig. Ett konto är tänkt för sådant som kräver en identitet: molnsynk, favoriter, publicering och delning mellan enheter.
              </p>
            </div>
          </section>
        </main>
      )}

      {paletteOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" aria-label="Stäng" className="absolute inset-0 bg-black/40" onClick={() => setPaletteOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-auto rounded-t-3xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Lägg till hinder</h2>
                <p className="text-xs text-muted-foreground">{obstacles.length}/22 hinderpassager</p>
              </div>
              <button type="button" onClick={() => setPaletteOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-muted"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OBSTACLES.map((def) => (
                <button key={def.type} type="button" onClick={() => addObstacle(def.type)} disabled={obstacles.length >= FREE_MAX_COMPETITION_OBSTACLES} className="rounded-2xl border border-border bg-background p-3 text-left disabled:opacity-40">
                  <FreeObstacleGlyph type={def.glyph} size={32} />
                  <span className="mt-2 block text-sm font-semibold">{def.label}</span>
                  <span className="text-[11px] text-muted-foreground">{def.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
