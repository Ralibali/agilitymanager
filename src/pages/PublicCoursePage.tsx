import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, LayoutGrid, Ruler, ShieldCheck, Target } from "lucide-react";
import { FreeObstacleGlyph, type FreeObstacleGlyphType } from "@/components/free-planner/FreeObstacleGlyph";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { getBankCourse, type CourseFocus } from "@/features/free-planner/courseBank";
import { validateAgilityCourse, type AgilityObstacleType } from "@/features/free-planner/agilityCourseRules";

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

const FOCUS_LABELS: Record<CourseFocus, string> = {
  flow: "Flyt",
  handling: "Handling",
  contacts: "Kontaktfält",
  speed: "Fart",
  technical: "Teknik",
};

export default function PublicCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = getBankCourse(courseId);

  if (!course) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Helmet><title>Banan hittades inte | AgilityManager</title><meta name="robots" content="noindex" /></Helmet>
        <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-5 font-display text-4xl font-semibold">Banan hittades inte</h1>
          <p className="mt-3 text-muted-foreground">Den här banan finns inte i AgilityManagers öppna Banbank.</p>
          <Link to="/banplanerare?view=bank" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">Öppna Banbanken <ArrowRight className="h-4 w-4" /></Link>
        </main>
      </div>
    );
  }

  const validation = validateAgilityCourse(course.obstacles, course.ring, course.kind, course.competitionClass, course.ruleset);
  const errorCount = validation.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = validation.issues.filter((issue) => issue.severity === "warning").length;
  const sorted = [...course.obstacles].sort((a, b) => a.number - b.number);
  const canonical = `https://agilitymanager.se/banor/${course.id}`;
  const description = `${course.description} Gratis banritning för ${course.kind === "agility" ? "agilityklass" : "hoppklass"} ${course.competitionClass}, ${course.ring.widthM} × ${course.ring.heightM} m.`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{course.title} – gratis agilitybana | AgilityManager</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${course.title} | AgilityManager`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: course.title,
          description,
          url: canonical,
          creator: { "@type": "Organization", name: "AgilityManager" },
          about: ["Agility", `Klass ${course.competitionClass}`, course.kind === "agility" ? "Agilityklass" : "Hoppklass"],
          isAccessibleForFree: true,
        })}</script>
      </Helmet>

      <header className="border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="mr-auto font-display text-lg font-semibold">Agility<span className="text-primary">Manager</span></Link>
          <Link to="/banplanerare?view=bank" className="hidden h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted sm:inline-flex"><LayoutGrid className="h-4 w-4" /> Banbanken</Link>
          <Link to={`/banplanerare?course=${encodeURIComponent(course.id)}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"><Copy className="h-4 w-4" /> Använd banan</Link>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <Link to="/banplanerare?view=bank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Till Banbanken</Link>
            <div className="mt-5 grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Klass {course.competitionClass}</span>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold">{course.kind === "agility" ? "Agilityklass" : "Hoppklass"}</span>
                  {course.focus.map((focus) => <span key={focus} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">{FOCUS_LABELS[focus]}</span>)}
                </div>
                <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{course.title}</h1>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">{course.description}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link to={`/banplanerare?course=${encodeURIComponent(course.id)}`} className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20"><Copy className="h-4 w-4" /> Kopiera & redigera gratis</Link>
                  <Link to="/banplanerare?view=bank" className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold hover:bg-muted"><LayoutGrid className="h-4 w-4" /> Fler banor</Link>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Ingen registrering krävs. När du öppnar banan skapas en egen redigerbar kopia.</p>
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-3 shadow-xl sm:p-4">
                <div
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-foreground/15 bg-background"
                  style={{
                    backgroundImage: "linear-gradient(to right,hsl(var(--foreground)/.07) 1px,transparent 1px),linear-gradient(to bottom,hsl(var(--foreground)/.07) 1px,transparent 1px)",
                    backgroundSize: "2.5% 3.333%",
                  }}
                >
                  <div className="absolute left-3 top-3 z-30 rounded-lg border border-border bg-background/90 px-2.5 py-1 text-[10px] font-bold">1 ruta = 1 m · {course.ring.widthM} × {course.ring.heightM} m</div>
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    <polyline points={sorted.map((obstacle) => `${obstacle.x},${obstacle.y}`).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeOpacity=".25" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {sorted.map((obstacle) => (
                    <div key={obstacle.id} className="absolute z-20 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center sm:h-12 sm:w-12" style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%` }}>
                      <span style={{ transform: `rotate(${obstacle.rotation}deg)` }}><FreeObstacleGlyph type={GLYPH_BY_TYPE[obstacle.type]} size={30} /></span>
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-foreground text-[9px] font-bold text-background">{obstacle.number}</span>
                    </div>
                  ))}
                  <div className="absolute bottom-3 left-3 z-30 rounded-lg bg-background/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">AgilityManager-original</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-5"><LayoutGrid className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{course.obstacles.length}</div><div className="text-sm text-muted-foreground">hinderpassager</div></div>
            <div className="rounded-3xl border border-border bg-card p-5"><Ruler className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">≈ {Math.round(validation.approximateLengthM)} m</div><div className="text-sm text-muted-foreground">raklinjesumma</div></div>
            <div className="rounded-3xl border border-border bg-card p-5"><Target className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{validation.jumpPassages}</div><div className="text-sm text-muted-foreground">hoppassager</div></div>
            <div className="rounded-3xl border border-border bg-card p-5"><ShieldCheck className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{errorCount === 0 ? "Godkänd" : `${errorCount} fel`}</div><div className="text-sm text-muted-foreground">automatisk bancheck</div></div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold">Vad tränar den här banan?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{course.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">{course.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{tag}</span>)}</div>
              <h3 className="mt-7 font-display text-xl font-semibold">Så använder du banan</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {["Öppna en egen kopia", "Flytta hinder efter din plan", "Följ mått och bancheck live"].map((text, index) => <div key={text} className="rounded-2xl bg-muted/60 p-4 text-sm"><span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>{text}</div>)}
              </div>
            </article>

            <aside className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-semibold">Svensk bancheck</h2><p className="text-xs text-muted-foreground">{errorCount} fel · {warningCount} varningar</p></div></div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Den här originalbanan testas i kod mot de svenska regler som kan kontrolleras från planritningen, exempelvis hinderantal, hoppassager, kontaktpassager, vissa hinderbegränsningar och avstånd.</p>
              <div className="mt-4 rounded-2xl border border-border bg-muted/50 p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Det är ett planeringsstöd.</strong> Verklig hundlinje, fysisk utrustning, säkerhet och slutlig tävlingsbana måste fortfarande bedömas på plats av domare/arrangör.</div>
              <Link to={`/banplanerare?course=${encodeURIComponent(course.id)}`} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><Copy className="h-4 w-4" /> Använd banan gratis</Link>
            </aside>
          </div>
        </section>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
