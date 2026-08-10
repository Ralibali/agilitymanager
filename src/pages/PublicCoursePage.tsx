import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, Footprints, LayoutGrid, Ruler, ShieldCheck, Target } from "lucide-react";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import CourseLibraryPreview from "@/features/course-planner-v2/CourseLibraryPreview";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import {
  getPublicCourseMeta,
  resolvePublicCourseId,
} from "@/features/course-planner-v2/publicCourseCatalog.mjs";
import {
  isOfficialSwedishCompetitionTemplate,
  validateOfficialSwedishCourse,
} from "@/features/course-planner-v2/officialCourseQuality";
import { isNollklassTemplate, validateNollklassCourse } from "@/features/course-planner-v2/nollklassQuality";
import { buildDogPath } from "@/features/course-planner-v2/dogPath";

export default function PublicCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const resolvedId = resolvePublicCourseId(courseId);
  const course = COURSE_BANK.find((entry) => entry.key === resolvedId);
  const meta = getPublicCourseMeta(resolvedId);

  if (courseId && resolvedId && courseId !== resolvedId) {
    return <Navigate to={`/banor/${encodeURIComponent(resolvedId)}`} replace />;
  }

  if (!course || !meta) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Helmet><title>Banan hittades inte | AgilityManager</title><meta name="robots" content="noindex" /></Helmet>
        <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-5 font-display text-4xl font-semibold">Banan hittades inte</h1>
          <p className="mt-3 text-muted-foreground">Den här banan finns inte i AgilityManagers öppna V2-Banbank.</p>
          <Link to="/banplanerare?view=bank" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">Öppna Banbanken <ArrowRight className="h-4 w-4" /></Link>
        </main>
      </div>
    );
  }

  const isSwedishClass = isOfficialSwedishCompetitionTemplate(course.classTemplate);
  const isNoll = isNollklassTemplate(course.classTemplate);
  const qualityIssues = isSwedishClass
    ? validateOfficialSwedishCourse({
        classTemplate: course.classTemplate,
        arenaWidthM: course.arenaWidthM,
        arenaHeightM: course.arenaHeightM,
        defaultSize: course.defaultSize,
        obstacles: course.obstacles.map((obstacle, index) => ({ ...obstacle, id: `${course.key}-${index}` })),
      })
    : isNoll
      ? validateNollklassCourse(course)
      : [];
  const qualityErrors = qualityIssues.filter((issue) => issue.level === "error").length;
  const dogPath = buildDogPath(course.obstacles.map((obstacle, index) => ({ ...obstacle, id: `${course.key}-path-${index}` })));
  const numbered = course.obstacles.filter((obstacle) => obstacle.number != null).length;
  const jumpPassages = course.obstacles.filter((obstacle) => ["jump", "wall", "longjump", "tire", "combo"].includes(obstacle.type)).length;
  const canonical = `https://agilitymanager.se/banor/${course.key}`;
  const titleSuffix = meta.isNollklass ? "gratis Nollklassbana" : meta.isHoopers ? "gratis Hoopersbana" : "gratis agilitybana";
  const description = `${meta.description} ${meta.arenaWidthM}×${meta.arenaHeightM} m. Öppna och redigera gratis i AgilityManagers fulla V2-banplanerare.`;
  const checkedLabel = isNoll
    ? "Nollklass-grind 2026"
    : isSwedishClass
      ? "Svensk klassgrind"
      : "Separat Hoopers-profil";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{meta.title} – {titleSuffix} | AgilityManager</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${meta.title} | AgilityManager`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: meta.title,
          description,
          url: canonical,
          creator: { "@type": "Organization", name: "AgilityManager" },
          about: [meta.discipline, meta.level, ...meta.focus],
          isAccessibleForFree: true,
          spatialCoverage: `${meta.arenaWidthM}×${meta.arenaHeightM} m`,
        })}</script>
      </Helmet>

      <header className="border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="mr-auto font-display text-lg font-semibold">Agility<span className="text-primary">Manager</span></Link>
          <Link to="/banplanerare?view=bank" className="hidden h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted sm:inline-flex"><LayoutGrid className="h-4 w-4" /> 25 banor</Link>
          <Link to={`/banplanerare?course=${encodeURIComponent(course.key)}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"><Copy className="h-4 w-4" /> Använd banan</Link>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <Link to="/banplanerare?view=bank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Till Banbanken</Link>
            <div className="mt-5 grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{meta.level}</span>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold">{meta.discipline}</span>
                  {meta.isMirror && <span className="rounded-full border border-primary/25 bg-card px-3 py-1 text-xs font-bold text-primary">Spegel</span>}
                  {meta.isNollklass && <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">Clear round</span>}
                  {meta.focus.map((focus) => <span key={focus} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">{focus}</span>)}
                </div>
                <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{meta.title}</h1>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">{meta.description}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link to={`/banplanerare?course=${encodeURIComponent(course.key)}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20"><Copy className="h-4 w-4" /> Kopiera exakt V2-bana</Link>
                  <Link to="/banplanerare?view=bank" className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold hover:bg-muted"><LayoutGrid className="h-4 w-4" /> Se alla 25</Link>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Ingen registrering krävs. Samma hinder, koordinater, rotationer och hundlinje öppnas i den riktiga V2-editorn.</p>
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-3 shadow-xl sm:p-4">
                <CourseLibraryPreview course={course} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                  <span>1 rutnät följer V2-kartan · {course.arenaWidthM} × {course.arenaHeightM} m</span>
                  <span className="font-semibold text-foreground">AgilityManager-original</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-5"><LayoutGrid className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{numbered}</div><div className="text-sm text-muted-foreground">hinderpassager</div></div>
            <div className="rounded-3xl border border-border bg-card p-5"><Footprints className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">≈ {Math.round(dogPath.total)} m</div><div className="text-sm text-muted-foreground">beräknad hundlinje</div></div>
            <div className="rounded-3xl border border-border bg-card p-5"><Target className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{jumpPassages}</div><div className="text-sm text-muted-foreground">hoppassager</div></div>
            <div className="rounded-3xl border border-border bg-card p-5"><ShieldCheck className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{qualityErrors === 0 ? "0 fel" : `${qualityErrors} fel`}</div><div className="text-sm text-muted-foreground">{checkedLabel}</div></div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold">Vad tränar den här banan?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{meta.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">{meta.focus.map((tag) => <span key={tag} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{tag}</span>)}</div>
              <h3 className="mt-7 font-display text-xl font-semibold">Från Google till ritbordet utan konvertering</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {["Välj den riktiga V2-kartan", "Öppna exakt samma layout", "Flytta hinder och exportera gratis"].map((text, index) => <div key={text} className="rounded-2xl bg-muted/60 p-4 text-sm"><span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>{text}</div>)}
              </div>
            </article>

            <aside className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Check className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-semibold">{checkedLabel}</h2><p className="text-xs text-muted-foreground">{qualityErrors} maskinella fel i den publicerade layouten</p></div></div>
              {meta.isHoopers ? (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">Hoopers-banan använder V2-planerarens separata Hoopers-profil och märks inte som verifierad mot agilityreglerna.</p>
              ) : meta.isNollklass ? (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">Den här egna kartan testas mot AgilityManagers maskinella Nollklass-grind för 2026, inklusive hinderantal, rätt specialhinder, hundlinje, bankant och start/mål-utrymme.</p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">Den här AgilityManager-originalbanan testas i CI mot de svenska klassregler som kan kontrolleras från planritningen och samma beräknade hundlinje som editorn visar.</p>
              )}
              <div className="mt-4 rounded-2xl border border-border bg-muted/50 p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Planeringsstöd – inte en officiell domarkarta.</strong> Fysisk utrustning, underlag, verklig hundlinje och slutlig säkerhet måste fortfarande bedömas på plats.</div>
              <Link to={`/banplanerare?course=${encodeURIComponent(course.key)}`} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><Ruler className="h-4 w-4" /> Öppna i V2 gratis</Link>
            </aside>
          </div>
        </section>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
