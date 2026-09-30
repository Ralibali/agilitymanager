import { Link } from "react-router";
import {
  ArrowRight, BookOpen, CalendarDays, Check, CloudUpload, FileDown, Heart, MousePointer2, Pencil, Ruler,
  Search, ShieldCheck, Smartphone, Spline, Trophy, BarChart3, NotebookPen, Route,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Marquee } from "@/components/Marquee";
import { Reveal, RisingWords } from "@/components/Reveal";
import { CourseMap } from "@/components/CourseMap";
import { RotatingBadge } from "@/components/RotatingBadge";
import { Seo, SITE_URL } from "@/components/Seo";
import { CtaLink } from "@/components/CtaLink";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { courseFromBankEntry, type Course } from "@/lib/course";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import { ARTICLES } from "@/content/articles";
import { blogArticlePath } from "@/lib/routes";
import { fmtDate } from "@/lib/format";

const FEATURES = [
  { icon: MousePointer2, title: "Full hindereditor", text: "Placera, flytta, rotera, duplicera och numrera hinder. Komplett från första klicket — utan konto." },
  { icon: Ruler, title: "Riktig meterskala", text: "Plan i meter med rutnät, snap, zoom och avståndsmätning. Banlinjen beräknas live." },
  { icon: Spline, title: "Banlinje & analys", text: "Se hundens linje genom banan, totallängd och hinderspridning direkt medan du ritar." },
  { icon: ShieldCheck, title: "Agility + Hoopers", text: "Byt sport och få rätt hinderpalett, planstorlekar och regeltänk för just din gren." },
  { icon: FileDown, title: "Exportera & dela", text: "Spara som PNG för träningsgruppen, eller skicka en delningslänk som öppnar banan direkt hos mottagaren." },
  { icon: Smartphone, title: "Mobil på riktigt", text: "Touchdragning, pinch-zoom och en hinderpanel byggd för tummen — inte en krympt desktop." },
];

const JOURNEY = [
  {
    n: "01",
    eyebrow: "Tävlingskalender",
    title: "Hitta nästa mål",
    text: "Sök bland svenska agilitytävlingar, filtrera det som är relevant och spara favoriter så nästa tävling inte försvinner i bruset.",
    to: "/tavlingar",
    cta: "Öppna tävlingskalendern",
  },
  {
    n: "02",
    eyebrow: "Banbibliotek & guider",
    title: "Välj vad ni ska träna",
    text: "Utgå från en färdig agility- eller hoopersbana, läs en guide och gör träningspasset konkret i stället för att börja från ett blankt papper.",
    to: "/banor",
    cta: "Välj en träningsbana",
  },
  {
    n: "03",
    eyebrow: "Banplaneraren",
    title: "Bygg. Analysera. Dela.",
    text: "Ändra banan i meterskala, kontrollera linjer och regler, exportera den och skicka samma upplägg till hela träningsgruppen.",
    to: "/banplanerare",
    cta: "Börja rita gratis",
  },
];

/** Det som fungerar direkt, utan konto — respektive vad ett gratis konto lägger till. */
const NO_ACCOUNT = [
  "Hela banplaneraren — agility och hoopers",
  "Regelkontroll, banlinje och banlängd live",
  "Export som PNG/PDF och delningslänk",
  "Banbibliotek och tävlingskalender",
  "Autosparat i din webbläsare",
];
const WITH_ACCOUNT = [
  "Banorna sparas i molnet",
  "Synk mellan dator och telefon",
  "Kommentarer och delning med klubben",
  "Samma inloggning för träning och instruktör",
];

/** Vanliga invändningar innan man börjar — besvaras på startsidan. */
const FAQ = [
  {
    q: "Är banplaneraren verkligen gratis?",
    a: "Ja. Hela banplaneraren — alla hinder, mallar, regelkontroll, export och delningslänkar — är gratis. Det är ingen provperiod och du behöver inget kort.",
  },
  {
    q: "Måste jag skapa ett konto?",
    a: "Nej. Du kan rita, exportera och dela direkt. Banan autosparas i din webbläsare. Ett konto behövs först när du vill spara och synka dina banor mellan dator och telefon.",
  },
  {
    q: "Fungerar det i mobilen?",
    a: "Ja. Planeraren är byggd för touch med dragning, pinch-zoom och en hinderpanel anpassad för tummen — så du kan ändra banan ute på planen.",
  },
  {
    q: "Följer banorna de svenska reglerna?",
    a: "Planeraren har regelkontroll för agility enligt SAgiK/SKK:s regelverk och för hoopers (SHoK och FCI). Den varnar för sådant som planstorlek, antal hinder och avstånd — men ersätter inte domarens eller arrangörens bedömning.",
  },
  {
    q: "Hur delar jag banan med min träningsgrupp?",
    a: "Exportera en PNG eller PDF, eller skicka en delningslänk. Den som får länken öppnar banan direkt i sin egen planerare — utan konto.",
  },
];

/**
 * Utvalda banor på startsidan är riktiga banbiblioteks-poster, så kortens
 * namn, hinderantal och planstorlek alltid stämmer med banan som öppnas.
 */
const FEATURED_KEYS = [
  "sv_agility_3_master_01",
  "sv_agility_1_balans_01",
  "sv_hopp_2_teknik_01",
  "hoopers_1_basic",
];
const FEATURED_COURSES: Course[] = FEATURED_KEYS.map((key) => {
  const entry = COURSE_BANK.find((e) => e.key === key);
  if (!entry) throw new Error(`Banbiblioteket saknar ${key}`);
  return courseFromBankEntry(entry);
});

const heroCourse = FEATURED_COURSES[0];

/** Hinderantal och klassisk banlängd (rak linje mellan numrerade hinder). */
function heroStats(course: Course) {
  const numbered = course.obstacles
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const pts = numbered.length >= 2 ? numbered : course.obstacles;
  let lengthM = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    lengthM += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return { count: numbered.length || course.obstacles.length, lengthM: Math.round(lengthM) };
}

export default function Home() {
  const latestArticles = [...ARTICLES]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="AgilityManager — planera, träna och tävla i agility och hoopers"
        description="Rita banor gratis i meterskala, planera träningen, följ instruktörens uppgifter och hitta svenska agility- och hooperstävlingar. Banplaneraren är gratis, konto behövs bara för synk."
        canonicalPath="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "AgilityManager",
            url: SITE_URL,
            inLanguage: "sv-SE",
            description: "Banplanerare, träningsplanering, tävlingskalender och kunskapsbank för agility och hoopers.",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <SiteNav />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-[6.5rem]">
        <div className="field-grid pointer-events-none absolute inset-0 [background-size:56px_56px]" aria-hidden />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-forest/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-52 top-72 h-[26rem] w-[26rem] rounded-full bg-tang/10 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:pb-28 lg:pt-14">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] shadow-hard-sm sm:text-[0.8rem] sm:tracking-[0.14em]">
                <span className="h-2 w-2 rounded-full bg-forest" />
                Gratis · Inget konto · Agility & hoopers
              </span>
            </Reveal>
            <h1 className="mt-6 font-display text-[4rem] leading-[1.02] tracking-[0.01em] sm:text-[5.8rem] lg:text-[5rem] xl:text-[6.6rem]">
              <RisingWords text="Hitta tävlingen." startDelay={150} />
              <br />
              <span className="text-forest">
                <RisingWords text="Bygg" startDelay={450} />
              </span>{" "}
              <span className="text-tang">
                <RisingWords text="träningen." startDelay={560} />
              </span>
            </h1>
            <Reveal delay={650}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75 sm:text-xl">
                Rita agility- och hoopersbanor i meterskala med regelkontroll, hitta
                svenska tävlingar som passar din hund och dela träningen med gruppen —
                direkt i webbläsaren, på svenska.
              </p>
            </Reveal>
            <Reveal delay={780}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CtaLink
                  to="/banplanerare"
                  placement="home_hero_primary"
                  className="pressable shadow-hard inline-flex h-14 items-center justify-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
                >
                  <Pencil className="h-5 w-5" /> Börja rita gratis <ArrowRight className="h-5 w-5" />
                </CtaLink>
                <CtaLink
                  to="/tavlingar"
                  placement="home_hero_secondary"
                  className="pressable shadow-hard inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-ink bg-paper px-8 text-lg font-bold text-ink"
                >
                  <CalendarDays className="h-5 w-5" /> Hitta nästa tävling
                </CtaLink>
              </div>
              <p className="mt-3 text-sm font-medium text-ink/60">
                Inget konto, inget kort — banan sparas automatiskt i din webbläsare.
              </p>
            </Reveal>
            <Reveal delay={900}>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink/75">
                {["Svensk tävlingskalender", "Agility + Hoopers", "Regelkontroll", "PDF, PNG & delningslänk"].map((x) => (
                  <span key={x} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-forest" strokeWidth={3} /> {x}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Animerad bankarta + tävlingsflöde */}
          <Reveal delay={400} className="relative">
            <RotatingBadge className="absolute -right-6 -top-10 z-10 hidden text-ink md:grid" />
            <CtaLink
              to={`/banplanerare?template=${heroCourse.slug}`}
              placement="home_hero_course"
              aria-label={`Öppna banan ${heroCourse.name} i banplaneraren`}
              className="group relative block rounded-[1.75rem] border-2 border-ink bg-[#FCFAF4] p-3 shadow-hard transition-transform duration-300 hover:-translate-y-1 sm:p-4"
            >
              <div className="flex items-center justify-between px-2 pb-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-tang" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">
                    Live bankarta<span className="hidden sm:inline"> · Agility</span>
                  </span>
                </div>
                <span className="rounded-full bg-forest px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-paper">
                  {heroCourse.name}
                </span>
              </div>
              <div className="relative">
                <CourseMap
                  course={heroCourse}
                  animate
                  className="w-full rounded-xl border border-ink/15"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-tang px-3.5 py-1.5 text-xs font-extrabold text-ink shadow-hard-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                  Öppna & redigera banan <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  [`${heroStats(heroCourse).count}`, "hinder"],
                  [`${heroStats(heroCourse).lengthM} m`, "banlängd"],
                  [`${heroCourse.field[0]}×${heroCourse.field[1]}`, "meter"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-cream/70 px-2 py-2.5">
                    <b className="block font-display text-2xl leading-none tracking-wide">{v}</b>
                    <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink/50">{l}</span>
                  </div>
                ))}
              </div>
            </CtaLink>

            <div className="pointer-events-none absolute -left-10 top-[44%] z-20 hidden w-56 rotate-[-2deg] rounded-2xl border-2 border-ink bg-paper p-4 shadow-hard lg:block">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-forest">Tävlingskalender</span>
                <CalendarDays className="h-4 w-4 text-forest" />
              </div>
              <p className="mt-2 text-lg font-extrabold leading-tight">Från tävling till träningsbana</p>
              <div className="mt-3 space-y-2 text-xs font-bold text-ink/65">
                <span className="flex items-center gap-2"><Search className="h-3.5 w-3.5 text-tang" /> Hitta rätt tävling</span>
                <span className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-tang" /> Spara som favorit</span>
                <span className="flex items-center gap-2"><Route className="h-3.5 w-3.5 text-tang" /> Bygg träningen mot målet</span>
              </div>
            </div>

          </Reveal>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <div className="overflow-hidden">
        <Marquee
          items={["Tävlingskalender", "Favoriter", "Gratis banplanerare", "Agility", "Hoopers", "Regelkontroll", "Dela din bana"]}
          className="rotate-[-1.2deg] scale-[1.02] border-y-2 border-ink bg-tang text-ink"
        />
      </div>

      {/* ── PRODUKTFLÖDET ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-forest">Från tävling till träningsplan</p>
          <h2 className="mt-3 max-w-4xl font-display text-5xl leading-[1.02] tracking-[0.01em] sm:text-7xl">
            Ett flöde. Inte tre lösa verktyg.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/65">
            Börja med målet, bygg träningen och ta samma plan hela vägen ut på planen.
            Det är där AgilityManager börjar kännas som ett riktigt verktyg för sporten.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {JOURNEY.map((s, i) => (
            <Reveal key={s.n} delay={i * 140} className="h-full">
              <CtaLink to={s.to} placement={`home_journey_${s.n}`} className="group block h-full">
                <article
                  className={`relative flex h-full flex-col rounded-3xl border-2 border-ink p-7 shadow-hard transition-all duration-300 group-hover:-translate-y-2 ${
                    i === 1 ? "bg-tang text-ink" : i === 2 ? "bg-ink text-paper" : "bg-[#FCFAF4] text-ink"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className={`font-display text-6xl leading-none ${i === 2 ? "text-tang" : "text-forest"}`}>{s.n}</span>
                    <ArrowRight className={`mt-2 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1.5 ${i === 2 ? "text-tang" : "text-ink"}`} />
                  </div>
                  <span className={`mt-7 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] ${i === 2 ? "text-paper/55" : "text-ink/45"}`}>
                    {s.eyebrow}
                  </span>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{s.title}</h3>
                  <p className={`mt-3 flex-1 leading-relaxed ${i === 2 ? "text-paper/65" : "text-ink/65"}`}>{s.text}</p>
                  <span className={`mt-6 inline-flex items-center gap-2 text-sm font-extrabold ${i === 2 ? "text-tang" : "text-forest"}`}>
                    {s.cta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </article>
              </CtaLink>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FUNKTIONER (grön sektion) ────────────────────────── */}
      <section className="border-y-2 border-ink bg-forest text-paper">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-tang">En verktygslåda, inte en demo</p>
              <h2 className="mt-3 max-w-xl font-display text-5xl leading-[1.02] sm:text-7xl">
                Byggd för planen.<br />Inte för skrivbordet.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="max-w-md text-lg leading-relaxed text-paper/70">
                Full kraft från första klicket. Hela banplaneraren är gratis —
                du behöver varken konto eller kort för att rita, exportera och dela.
              </p>
            </Reveal>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border-2 border-paper/20 bg-paper/20 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90} className="h-full">
                <article className="group flex h-full flex-col bg-forest p-7 transition-colors duration-300 hover:bg-pine">
                  <div className="flex items-center justify-between">
                    <f.icon className="h-7 w-7 text-tang" strokeWidth={2.2} />
                    <span className="font-display text-2xl text-paper/25">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-8 text-xl font-extrabold tracking-tight">{f.title}</h3>
                  <p className="mt-2.5 leading-relaxed text-paper/65">{f.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <CtaLink
                to="/banplanerare"
                placement="home_features"
                className="pressable pressable-light shadow-hard-paper inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
              >
                Testa banplaneraren <ArrowRight className="h-5 w-5" />
              </CtaLink>
              <Link to="/funktioner" className="group inline-flex items-center gap-2 font-bold text-paper/80 transition-colors hover:text-tang">
                Se alla funktioner
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BANBIBLIOTEK ─────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-forest">Banbiblioteket</p>
              <h2 className="mt-3 font-display text-5xl leading-[1.02] sm:text-7xl">
                Låna en bana.<br />Gör den till din.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <Link
                to="/banor"
                className="group inline-flex items-center gap-2 text-lg font-bold text-ink transition-colors hover:text-tang"
              >
                Se alla banor
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Reveal>
          </div>
        </div>
        <Reveal delay={200}>
          <div className="no-scrollbar mt-12 flex gap-6 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
            {FEATURED_COURSES.map((c, i) => (
              <Link
                key={c.slug}
                to={`/banplanerare?template=${c.slug}`}
                className="group w-[19rem] shrink-0 sm:w-[22rem]"
                style={{ transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)` }}
              >
                <article className="overflow-hidden rounded-3xl border-2 border-ink bg-[#FCFAF4] shadow-hard transition-transform duration-300 group-hover:-translate-y-2">
                  <div className="overflow-hidden">
                    <CourseMap course={c} className="zoom-slow w-full" showNumbers={false} />
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-ink px-5 py-4">
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight">{c.name}</h3>
                      <p className="text-sm font-semibold text-ink/50">{c.level}</p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-paper transition-colors duration-300 group-hover:bg-tang group-hover:text-ink">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── PLANERAR-CALLOUT (svart sektion) ─────────────────── */}
      <section className="relative overflow-hidden border-y-2 border-ink bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-tang">Banplaneraren</p>
              <h2 className="mt-3 font-display text-5xl leading-[1.02] sm:text-7xl lg:text-8xl">
                Gratis att rita.<br />Inget konto.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-paper/65">
                Dra, rotera och numrera hinder i äkta meterskala. Banlinjen ritar sig
                själv, längden räknas live och exporten är ett klick bort. Autosparat
                i webbläsaren — du börjar utan konto och utan att betala.
              </p>
            </Reveal>
            <Reveal delay={280}>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <CtaLink
                  to="/banplanerare"
                  placement="home_planner_callout"
                  className="pressable pressable-light shadow-hard-paper inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
                >
                  Börja rita nu <ArrowRight className="h-5 w-5" />
                </CtaLink>
                <RotatingBadge text="ÖPPNA DIREKT • INGEN INLOGGNING • " className="hidden text-paper/80 sm:grid" size={118} />
              </div>
            </Reveal>
          </div>
          <Reveal delay={250}>
            <div className="rounded-[1.75rem] border-2 border-paper/25 bg-pine p-3 shadow-hard-paper sm:p-4">
              <div className="flex items-center justify-between px-2 pb-3 pt-1 text-paper/70">
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Hoopersläge</span>
                <span className="rounded-full bg-tang px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-ink">{FEATURED_COURSES[3].field[0]} × {FEATURED_COURSES[3].field[1]} m</span>
              </div>
              <CourseMap course={FEATURED_COURSES[3]} variant="dark" className="w-full rounded-xl border border-paper/15" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GRATIS UTAN KONTO / MED KONTO ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-forest">Gratis att börja</p>
          <h2 className="mt-3 max-w-4xl font-display text-5xl leading-[1.02] sm:text-7xl">
            Börja direkt. <span className="text-tang">Spara när du vill.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
            Du behöver inte registrera dig för att se om verktyget passar dig. Rita första
            banan på en minut — skapa ett konto först när du vill ha banorna med dig överallt.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="flex h-full flex-col rounded-3xl border-2 border-ink bg-tang p-7 shadow-hard sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-paper">
                  Utan konto
                </span>
                <span className="font-display text-4xl leading-none">0 kr</span>
              </div>
              <h3 className="mt-6 text-2xl font-extrabold tracking-tight">Öppna och rita — direkt</h3>
              <ul className="mt-5 flex-1 space-y-3 font-semibold">
                {NO_ACCOUNT.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={3} /> {f}
                  </li>
                ))}
              </ul>
              <CtaLink
                to="/banplanerare"
                placement="home_plans_free"
                className="pressable shadow-hard mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-8 text-lg font-bold text-paper"
              >
                Börja rita gratis <ArrowRight className="h-5 w-5" />
              </CtaLink>
            </div>
          </Reveal>
          <Reveal delay={150} className="h-full">
            <div className="flex h-full flex-col rounded-3xl border-2 border-ink bg-[#FCFAF4] p-7 shadow-hard sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-forest px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-paper">
                  Med konto
                </span>
                <CloudUpload className="h-8 w-8 text-forest" />
              </div>
              <h3 className="mt-6 text-2xl font-extrabold tracking-tight">Allt följer med dig</h3>
              <p className="mt-2 text-ink/65">Allt från vänster, plus:</p>
              <ul className="mt-4 flex-1 space-y-3 font-semibold text-ink/80">
                {WITH_ACCOUNT.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-forest" strokeWidth={3} /> {f}
                  </li>
                ))}
              </ul>
              <CtaLink
                to="/mitt-agilitymanager"
                placement="home_plans_account"
                className="pressable shadow-hard mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-ink bg-paper px-8 text-lg font-bold text-ink"
              >
                Skapa konto eller logga in
              </CtaLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BLOGG / KUNSKAPSBANK ─────────────────────────────── */}
      <section className="border-b-2 border-ink bg-cream/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-forest">Blogg & kunskapsbank</p>
              <h2 className="mt-3 font-display text-5xl leading-[1.02] sm:text-7xl">
                Lär dig banan.<br />Innan du bygger den.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <Link
                to="/blogg"
                className="group inline-flex items-center gap-2 text-lg font-bold text-ink transition-colors hover:text-tang"
              >
                Alla guider
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {latestArticles.map((a, i) => (
              <Reveal key={a.slug} delay={i * 120} className="h-full">
                <Link to={blogArticlePath(a.slug)} className="group block h-full">
                  <article className="flex h-full flex-col rounded-3xl border-2 border-ink bg-[#FCFAF4] p-7 shadow-hard transition-transform duration-300 group-hover:-translate-y-1.5">
                    <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-forest">
                      {a.category} · {fmtDate(a.publishedAt)}
                    </span>
                    <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-tight group-hover:underline">
                      {a.title}
                    </h3>
                    <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink/60">{a.description}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-forest">
                      Läs guiden <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </article>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── VANLIGA FRÅGOR ───────────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-forest">Vanliga frågor</p>
          <h2 className="mt-3 font-display text-5xl leading-[1.02] sm:text-6xl">
            Innan du sätter igång.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/70">
            Hittar du inte svaret? Läs guiderna i kunskapsbanken eller se vad som ingår gratis.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            <Link to="/priser" className="group inline-flex items-center gap-2 font-bold text-ink transition-colors hover:text-tang">
              Priser <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/blogg" className="group inline-flex items-center gap-2 font-bold text-ink transition-colors hover:text-tang">
              Kunskapsbanken <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <Accordion type="single" collapsible defaultValue="faq-0" className="space-y-3">
            {FAQ.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`faq-${i}`}
                className="rounded-2xl border-2 border-ink bg-[#FCFAF4] px-6 transition-shadow data-[state=open]:shadow-hard-sm"
              >
                <AccordionTrigger className="py-5 text-left text-lg font-bold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-ink/70">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* ── SLUT-CTA ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t-2 border-ink bg-tang text-ink">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <Reveal>
            <Trophy className="mx-auto h-10 w-10" strokeWidth={2.2} />
            <h2 className="mx-auto mt-5 max-w-4xl font-display text-6xl leading-[1.02] sm:text-8xl">
              Hitta målet. Bygg vägen dit.
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold text-ink/75">
              Rita första banan på en minut — gratis och utan konto. AgilityManager
              håller ihop resan från nästa start till nästa träningsbana.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CtaLink
                to="/banplanerare"
                placement="home_final_primary"
                className="pressable shadow-hard inline-flex h-16 items-center gap-2.5 rounded-full bg-ink px-10 text-xl font-bold text-paper"
              >
                Börja rita gratis <ArrowRight className="h-6 w-6" />
              </CtaLink>
              <CtaLink
                to="/tavlingar"
                placement="home_final_secondary"
                className="pressable shadow-hard inline-flex h-16 items-center gap-2.5 rounded-full border-2 border-ink bg-tang px-10 text-xl font-bold"
              >
                <CalendarDays className="h-6 w-6" /> Hitta tävling
              </CtaLink>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-bold uppercase tracking-wider text-ink/60">
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Hitta tävling</span>
              <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Lär & välj bana</span>
              <span className="flex items-center gap-2"><NotebookPen className="h-4 w-4" /> Rita & dela</span>
              <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Träna mot målet</span>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}