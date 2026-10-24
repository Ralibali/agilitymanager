import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, Search, Users } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Seo } from "@/components/Seo";
import { PlannerProfileDialog } from "@/features/planner-social/PlannerProfileDialog";
import { usePlannerProfile } from "@/lib/plannerProfile";
import { CourseInstructorWorkspace } from "@/features/courses/CourseInstructorWorkspace";
import { CourseRegistrationPanel, MyCourseRegistrations } from "@/features/courses/CourseRegistration";
import {
  courseDate, coursePrice, getTrainingCourse, listTrainingCourses, sessionTime,
  type TrainingCourse,
} from "@/features/courses/courses";

export default function TrainingCoursesPage() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const rawView = search.get("vy");
  const view = rawView === "instruktor" || rawView === "anmalningar" ? rawView : "kurser";
  const { profile } = usePlannerProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  return <div className="min-h-screen bg-paper text-ink">
    <Seo title="Hundkurser och kursanmälan – AgilityManager Courses" description="Hitta din nästa agility- eller hooperskurs. För instruktörer: skapa kurser, ta emot anmälningar och hantera deltagare och väntelista." canonicalPath={id ? `/kurser/${id}` : "/kurser"} noIndex={Boolean(id || view !== "kurser")} />
    <SiteNav />
    {!id && <PageHero kicker="AgilityManager Courses" title="Träna tillsammans.">Hitta nästa steg för dig och din hund. Håller du egna kurser? Samla datum, deltagare och väntelista på ett ställe.</PageHero>}
    <main id="main" className={`mx-auto max-w-6xl px-4 pb-20 sm:px-6 ${id ? "pt-32 sm:pt-40" : "pt-8 sm:pt-10"}`}>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink/15 pb-5">
        <nav aria-label="Kurser" className="flex flex-wrap gap-2">
          {[{ key: "kurser", label: "Hitta kurs", to: "/kurser" }, { key: "anmalningar", label: "Mina anmälningar", to: "/kurser?vy=anmalningar" }, { key: "instruktor", label: "För instruktörer", to: "/kurser?vy=instruktor" }].map((tab) => <Link key={tab.key} to={tab.to} aria-current={!id && view === tab.key ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-bold ${!id && view === tab.key ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white hover:border-ink"}`}>{tab.label}</Link>)}
        </nav>
        <button onClick={() => setProfileOpen(true)} className="min-h-11 max-w-full break-words rounded-full border-2 border-ink px-4 py-2 text-left text-sm font-bold">{profile ? `Banprofil: ${profile.name}` : "Öppna banprofil"}</button>
      </div>
      {profile && <p className="mb-6 max-w-3xl rounded-xl border border-ink/15 bg-white/60 px-4 py-3 text-xs leading-relaxed text-ink/70" data-private="true">Din banprofil ger tillgång till kurser och anmälningar. Profilnyckeln sparas i den här webbläsaren. Behåll profilen och använd samma webbläsare för att kunna administrera dina uppgifter.</p>}
      {id ? <TrainingCourseDetail key={id} id={id} onProfile={() => setProfileOpen(true)} /> : view === "kurser" ? <TrainingCourseCatalog /> : profile ? view === "instruktor" ? <CourseInstructorWorkspace key={profile.id} /> : <MyCourseRegistrations key={profile.id} /> : <section className="rounded-3xl border-2 border-ink bg-white p-6 sm:p-8">
        <h2 className="font-display text-3xl">{view === "instruktor" ? "Din kurs börjar här" : "Samla dina kursanmälningar"}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink/70">{view === "instruktor" ? "Använd din befintliga banprofil för att skapa utkast, publicera kurser och hantera deltagare. Kurserna är skilda från dina träningsgrupper och använder samma profil." : "Öppna samma banprofil som du använde vid anmälan för att se dina platser, betalningsinformation och väntelistan."}</p>
        <button onClick={() => setProfileOpen(true)} className="pressable shadow-hard-sm mt-5 min-h-12 rounded-full border-2 border-ink bg-tang px-6 font-bold">Öppna banprofil</button>
      </section>}
    </main>
    <SiteFooter />
    <PlannerProfileDialog open={profileOpen} onOpenChange={setProfileOpen} reason="Använd din befintliga banprofil för kurser och anmälningar, eller skapa en ny profil." emailHint="Vid en kursanmälan delar du namn och e-post med kursens instruktör. Din profilnyckel sparas i den här webbläsaren." />
  </div>;
}

function TrainingCourseCatalog() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("all");
  useEffect(() => {
    let live = true;
    void listTrainingCourses().then((rows) => { if (live) { setCourses(rows); setError(""); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Kunde inte hämta kurserna."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [refresh]);
  const filtered = useMemo(() => courses.filter((course) => (sport === "all" || course.sport === sport) && `${course.title} ${course.location} ${course.instructor_name} ${course.level}`.toLocaleLowerCase("sv-SE").includes(query.trim().toLocaleLowerCase("sv-SE"))), [courses, query, sport]);
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-forest">Nästa steg för ditt ekipage</p><h2 className="mt-2 font-display text-4xl">Hitta din kurs</h2></div><Link to="/kurser?vy=instruktor" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline">Håller du egna kurser? <ArrowUpRight aria-hidden className="h-4 w-4" /></Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_200px]">
      <label className="relative block"><span className="mb-1 block text-sm font-bold">Sök kurser</span><Search aria-hidden className="absolute bottom-4 left-4 h-5 w-5 text-ink/45" /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-14 w-full rounded-2xl border-2 border-ink/25 bg-white pl-12 pr-4 text-base focus:border-ink focus:outline-none" placeholder="Kurs, ort eller instruktör" /></label>
      <label className="block text-sm font-bold">Sport<select value={sport} onChange={(e) => setSport(e.target.value)} className="mt-1 min-h-14 w-full rounded-2xl border-2 border-ink/25 bg-white px-4 text-base"><option value="all">Alla sporter</option><option value="agility">Agility</option><option value="hoopers">Hoopers</option></select></label>
    </div>
    {loading && <p role="status" className="py-10">Hämtar kurser…</p>}
    {error && <div role="alert" className="mt-6 rounded-2xl border border-ember/25 bg-white p-6"><h3 className="font-display text-2xl">Kurserna kunde inte hämtas</h3><p className="mt-2 text-sm text-ink/70">{error}</p><button onClick={() => { setLoading(true); setRefresh((n) => n + 1); }} className="mt-4 min-h-11 rounded-full border-2 border-ink px-5 text-sm font-bold">Försök igen</button></div>}
    {!loading && !error && filtered.length === 0 && <div className="mt-7 rounded-3xl border-2 border-dashed border-ink/25 p-7"><h3 className="font-display text-3xl">{courses.length === 0 ? "Nya kurser på väg" : "Ingen kurs matchar din sökning"}</h3><p className="mt-3 text-ink/70">{courses.length === 0 ? "När en instruktör publicerar sin kurs visas den här. Håller du egna kurser kan du skapa ditt första utkast redan nu." : "Prova en annan ort, instruktör eller sport."}</p>{courses.length === 0 && <Link className="mt-5 inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-tang px-5 text-sm font-bold" to="/kurser?vy=instruktor">Skapa en kurs</Link>}</div>}
    {!loading && !error && filtered.length > 0 && <><p className="mt-6 text-sm text-ink/65" role="status">{filtered.length} {filtered.length === 1 ? "kurs" : "kurser"}</p><div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((course) => <TrainingCourseCard key={course.id} course={course} />)}</div></>}
  </section>;
}

function TrainingCourseCard({ course }: { course: TrainingCourse }) {
  return <article className="flex min-w-0 flex-col rounded-3xl border-2 border-ink bg-white p-5 shadow-hard-sm sm:p-6">
    <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-forest/10 px-3 py-1.5 text-forest">{course.sport === "agility" ? "Agility" : "Hoopers"}</span><span className="rounded-full bg-paper px-3 py-1.5">{course.available_places > 0 ? `${course.available_places} ${course.available_places === 1 ? "plats kvar" : "platser kvar"}` : "Väntelista"}</span></div>
    <h3 className="mt-4 break-words font-display text-3xl leading-tight"><Link to={`/kurser/${course.id}`} className="underline-offset-4 hover:underline">{course.title}</Link></h3>
    <p className="mt-2 text-sm text-ink/65">Med {course.instructor_name}</p>
    <div className="mt-5 space-y-3 text-sm"><p className="flex items-start gap-2"><CalendarDays aria-hidden className="h-4 w-4 shrink-0" />{course.sessions[0] ? courseDate(course.sessions[0].starts_at) : "Datum kommer"} · {course.sessions.length} tillfällen</p><p className="flex items-start gap-2"><MapPin aria-hidden className="h-4 w-4 shrink-0" /><span className="break-words">{course.location}</span></p><p className="flex items-start gap-2"><Users aria-hidden className="h-4 w-4 shrink-0" /><span className="break-words">{course.level} · max {course.max_teams} ekipage</span></p></div>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-5"><p className="mt-5 font-bold">{coursePrice(course.price_sek)}<span className="block text-xs font-normal text-ink/65">hela kursen / ekipage</span></p><Link to={`/kurser/${course.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-tang px-5 text-sm font-bold">Läs mer och anmäl</Link></div>
  </article>;
}

function TrainingCourseDetail({ id, onProfile }: { id: string; onProfile: () => void }) {
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const { profile } = usePlannerProfile();
  useEffect(() => {
    let live = true;
    void getTrainingCourse(id).then((row) => { if (live) { setCourse(row); setError(""); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Kunde inte hämta kursen."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id, refresh]);
  if (loading) return <p role="status" className="py-10">Hämtar kursen…</p>;
  if (error || !course) return <section className="rounded-3xl border-2 border-ink bg-white p-6"><h1 className="font-display text-4xl">Kursen kunde inte öppnas</h1><p role="alert" className="mt-3 text-ink/70">{error || "Kursen finns inte eller är inte publicerad."}</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/kurser" className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-tang px-5 font-bold">Hitta andra kurser</Link><button className="min-h-11 rounded-full border-2 border-ink px-5 font-bold" onClick={() => { setLoading(true); setRefresh((n) => n + 1); }}>Försök igen</button></div></section>;
  return <>
    <Link to="/kurser" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline"><ArrowLeft aria-hidden className="h-4 w-4" /> Alla kurser</Link>
    <div className="mt-5 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <article className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-forest">{course.sport === "agility" ? "Agility" : "Hoopers"} · {course.level}</p>
        <h1 className="mt-3 break-words font-display text-5xl leading-tight sm:text-6xl">{course.title}</h1>
        <p className="mt-3 text-lg text-ink/70">Med {course.instructor_name}</p>
        <div className="mt-6 grid gap-4 rounded-2xl border-2 border-ink bg-white p-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-ink/60">Träningsplats</p><p className="mt-2 break-words font-semibold">{course.location}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-ink/60">Platser</p><p className="mt-2 font-semibold">{course.available_places > 0 ? `${course.available_places} av ${course.max_teams} platser kvar` : `Fullbokad · ${course.waitlist_count} på väntelistan`}</p></div></div>
        <h2 className="mt-8 font-display text-3xl">Om kursen</h2><p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-ink/80">{course.description}</p>
        <h2 className="mt-8 font-display text-3xl">Datum och tider</h2><ol className="mt-4 space-y-3">{course.sessions.map((session, index) => <li className="flex items-start gap-3 rounded-xl border border-ink/15 bg-white p-4" key={session.starts_at}><CalendarDays aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-forest" /><div><p className="text-xs font-bold uppercase tracking-wider text-ink/60">Tillfälle {index + 1}</p><p className="mt-1 font-semibold">{sessionTime(session)}</p></div></li>)}</ol><p className="mt-2 text-xs text-ink/60">Alla tider visas i svensk tid (Stockholm).</p>
        <h2 className="mt-8 font-display text-3xl">Pris och villkor</h2><p className="mt-3 font-bold">{coursePrice(course.price_sek)} för hela kursen per ekipage</p>{course.price_sek > 0 && <><p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-ink/75">{course.payment_instructions}</p><p className="mt-3 text-sm text-ink/65">Betalning sker direkt till instruktören när du fått en bekräftad plats. Väntelistan kostar inget. Eventuell återbetalning hanteras direkt mellan dig och instruktören.</p></>}
      </article>
      <div className="min-w-0 lg:self-start">{profile?.id === course.profile_id ? <section className="rounded-3xl border-2 border-ink bg-white p-6"><h2 className="font-display text-3xl">Det här är din kurs</h2><p className="mt-3 text-ink/70">Hantera deltagare, väntelista och betalningsstatus i instruktörsvyn.</p><Link to="/kurser?vy=instruktor" className="mt-5 inline-flex min-h-12 items-center rounded-full border-2 border-ink bg-tang px-5 font-bold">Till mina kurser</Link></section> : <CourseRegistrationPanel course={course} onProfile={onProfile} onChanged={() => setRefresh((n) => n + 1)} />}</div>
    </div>
  </>;
}
