/**
 * Sprint 5 — Publik domarvy.
 * Route: /v3/course-planner-v2/judge/:slug
 * Visar en delad bana skrivskyddat så domare/bedömare kan öppna utan inlogg.
 * Innehåller bana, numrerad startlista och sammanfattning + kommentarer.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileDown, ListOrdered, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchPublicCourse, type LibraryCourse } from "@/features/course-planner-v2/library";
import {
  CLASS_TEMPLATES, SIZE_CLASSES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "@/features/course-planner-v2/config";
import { computeCourseTimes, validateCourse, summarizeIssues } from "@/features/course-planner-v2/validation";
import { exportJudgePdf } from "@/features/course-planner-v2/judgePdf";
import { exportStartlistPdf } from "@/features/course-planner-v2/startlistPdf";
import CourseCommentsPanel from "@/features/course-planner-v2/CourseCommentsPanel";
import { useRef } from "react";

interface PublicCourseData {
  version?: number;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: { id: string; type: ObstacleTypeV2; x: number; y: number; rotation: number; number?: number }[];
}

export default function V3CoursePlannerV2JudgePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<LibraryCourse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPublicCourse(slug)
      .then((c) => { if (!c) setError("Banan finns inte eller är inte publik."); else setCourse(c); })
      .catch((e) => { console.error(e); setError("Kunde inte ladda banan."); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-[100dvh] grid place-items-center bg-background"><Loader2 className="animate-spin text-[#1a6b3c]" /></div>;
  }
  if (error || !course) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 mb-2">Banan kunde inte visas</h1>
          <p className="text-sm text-neutral-500 mb-4">{error}</p>
          <Link to="/v3" className="text-[#1a6b3c] underline text-sm">Till startsidan</Link>
        </div>
      </div>
    );
  }

  const data = course.course_data as PublicCourseData;
  if (!data?.obstacles) {
    return <div className="min-h-[100dvh] grid place-items-center bg-background p-6 text-sm text-neutral-500">Banan har ett okänt format.</div>;
  }

  const issues = validateCourse({
    sport: data.sport, sizeClass: data.sizeClass, arenaWidthM: data.arenaWidthM,
    arenaHeightM: data.arenaHeightM, classTemplate: data.classTemplate, obstacles: data.obstacles,
  });
  const summary = summarizeIssues(issues);
  const times = computeCourseTimes({
    sport: data.sport, sizeClass: data.sizeClass, arenaWidthM: data.arenaWidthM,
    arenaHeightM: data.arenaHeightM, classTemplate: data.classTemplate, obstacles: data.obstacles,
  });
  const tpl = data.classTemplate ? CLASS_TEMPLATES.find((t) => t.key === data.classTemplate) : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === data.sizeClass);
  const numbered = [...data.obstacles].filter((o) => o.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  async function handlePdf() {
    try {
      await exportJudgePdf({
        name: course.name, sport: data.sport, sizeClass: data.sizeClass,
        arenaWidthM: data.arenaWidthM, arenaHeightM: data.arenaHeightM,
        classTemplate: data.classTemplate, obstacles: data.obstacles, svgElement: svgRef.current,
      });
      toast.success("Domar-PDF skapad");
    } catch (e) { console.error(e); toast.error("Kunde inte skapa PDF"); }
  }

  function handleStartlist() {
    try {
      exportStartlistPdf({ courseName: course.name, sport: data.sport, sizeClass: data.sizeClass, classTemplate: data.classTemplate, obstacles: data.obstacles });
      toast.success("Startlista skapad");
    } catch (e) { console.error(e); toast.error("Kunde inte skapa startlista"); }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-neutral-900">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-2.5 flex items-center gap-3">
        <Link to="/v3" className="h-9 w-9 grid place-items-center rounded-full bg-neutral-100"><ArrowLeft size={16} /></Link>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">Domarvy · skrivskyddad</div>
          <h1 className="text-sm font-semibold truncate">{course.name}</h1>
        </div>
        <button onClick={handleStartlist} className="h-9 px-3 rounded-full bg-card border border-border text-[12px] font-semibold inline-flex items-center gap-1.5 hover:border-neutral-400">
          <ListOrdered size={14} /> <span className="hidden sm:inline">Startlista</span>
        </button>
        <button onClick={handlePdf} className="h-9 px-3 rounded-full bg-[#1a6b3c] text-white text-[12px] font-semibold inline-flex items-center gap-1.5">
          <FileDown size={14} /> <span className="hidden sm:inline">PDF</span>
        </button>
      </header>

      <main className="grid gap-3 p-3 lg:p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl bg-card border border-border p-3">
          <ReadOnlyArena svgRef={svgRef} data={data} />
          <div className="mt-2 text-[11px] text-neutral-500 flex flex-wrap gap-x-3 gap-y-1">
            <span>{data.arenaWidthM} × {data.arenaHeightM} m</span>
            <span>{times.lengthM.toFixed(1)} m</span>
            <span>{data.obstacles.length} hinder</span>
            {summary.errors > 0 && <span className="text-red-600 font-semibold">{summary.errors} fel</span>}
            {summary.warnings > 0 && <span className="text-amber-600 font-semibold">{summary.warnings} varningar</span>}
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl bg-card border border-border p-3 text-[12px] space-y-1.5">
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-1">Översikt</h3>
            <Row label="Sport" value={data.sport === "agility" ? "Agility" : "Hoopers"} />
            <Row label="Klass" value={tpl?.label ?? "—"} />
            <Row label="Storleksklass" value={sizeDef?.label ?? "—"} />
            <Row label="Banlängd" value={`${times.lengthM.toFixed(1)} m`} />
            {times.refTimeS != null && <Row label="Referenstid" value={`${times.refTimeS} s`} />}
            {times.maxTimeS != null && <Row label="Maxtid" value={`${times.maxTimeS} s`} />}
          </section>

          <section className="rounded-2xl bg-card border border-border p-3">
            <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2">Numrerad ordning</h3>
            <ol className="text-[12px] space-y-0.5">
              {numbered.length === 0 ? <li className="text-neutral-400">Inga numrerade hinder</li>
              : numbered.map((o) => {
                const def = getObstacleDefV2(o.type);
                return <li key={o.id} className="flex items-center gap-2">
                  <span className="h-5 w-5 grid place-items-center rounded-full bg-neutral-900 text-white text-[10px] font-bold">{o.number}</span>
                  <span>{def?.label ?? o.type}</span>
                </li>;
              })}
            </ol>
          </section>

          <CourseCommentsPanel courseId={course.id} enabled />
        </aside>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><span className="text-neutral-500">{label}</span><span className="font-semibold">{value}</span></div>;
}

/* ───────── Read-only canvas ───────── */
function ReadOnlyArena({ svgRef, data }: { svgRef: React.MutableRefObject<SVGSVGElement | null>; data: PublicCourseData }) {
  const w = data.arenaWidthM; const h = data.arenaHeightM; const padding = 1;
  const numbered = [...data.obstacles].filter((o) => o.number != null).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const pathD = numbered.length > 1 ? numbered.map((o, i) => `${i === 0 ? "M" : "L"} ${o.x} ${o.y}`).join(" ") : "";
  return (
    <div className="rounded-xl bg-[#e8efe0] p-2 overflow-auto">
      <svg ref={svgRef} viewBox={`${-padding} ${-padding} ${w + padding * 2} ${h + padding * 2}`}
        className="w-full h-auto max-h-[calc(100dvh-180px)] select-none">
        <rect x={0} y={0} width={w} height={h} fill="#dce5cf" stroke="#173d2c" strokeWidth={0.05} />
        {Array.from({ length: w + 1 }).map((_, i) => (
          <line key={`vx${i}`} x1={i} y1={0} x2={i} y2={h} stroke="#173d2c" strokeWidth={i % 5 === 0 ? 0.04 : 0.015} opacity={i % 5 === 0 ? 0.45 : 0.25} />
        ))}
        {Array.from({ length: h + 1 }).map((_, i) => (
          <line key={`hz${i}`} x1={0} y1={i} x2={w} y2={i} stroke="#173d2c" strokeWidth={i % 5 === 0 ? 0.04 : 0.015} opacity={i % 5 === 0 ? 0.45 : 0.25} />
        ))}
        {pathD && <path d={pathD} fill="none" stroke="#c85d1e" strokeWidth={0.18} strokeDasharray="0.5 0.3" strokeLinecap="round" opacity={0.85} />}
        {data.obstacles.map((ob) => {
          const def = getObstacleDefV2(ob.type);
          if (!def) return null;
          const { w: ow, d: od } = def.sizeM;
          return (
            <g key={ob.id} transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rotation})`}>
              <rect x={-ow / 2} y={-od / 2} width={ow} height={od} rx={ob.type === "tunnel" ? od / 2 : 0.05} fill={fillFor(ob.type)} stroke="#173d2c" strokeWidth={0.06} />
              {ob.number != null && (
                <g transform={`translate(${ow / 2 + 0.3} ${-od / 2 - 0.3})`}>
                  <circle r={0.55} fill="#173d2c" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={0.7} fill="#fff" fontWeight={700}>{ob.number}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function fillFor(t: ObstacleTypeV2): string {
  switch (t) {
    case "tunnel": return "#cfe2f3";
    case "aframe": case "barrel": return "#f4d6c0";
    case "table": return "#fde9d3";
    case "fence": return "#173d2c";
    case "start": return "#22c55e";
    case "finish": return "#111827";
    case "handler_zone": return "rgba(26,107,60,0.18)";
    default: return "#fff";
  }
}
