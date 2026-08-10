import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, LayoutGrid, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import CourseLibraryPreview from "@/features/course-planner-v2/CourseLibraryPreview";
import { COURSE_BANK, type CourseBankEntry } from "@/features/course-planner-v2/courseBank";
import { getPublicCourseMeta, type PublicCourseMeta } from "@/features/course-planner-v2/publicCourseCatalog.mjs";
import { cn } from "@/lib/utils";

type LevelFilter = "all" | "noll" | "1" | "2" | "3" | "hoopers";
type DisciplineFilter = "all" | "agility" | "jumping" | "noll" | "hoopers";
type VariantFilter = "all" | "original" | "mirror";

interface PublicBankItem {
  course: CourseBankEntry;
  meta: PublicCourseMeta;
}

function disciplineKey(item: PublicBankItem): DisciplineFilter {
  if (item.meta.isHoopers) return "hoopers";
  if (item.meta.isNollklass) return "noll";
  if (item.course.classTemplate.startsWith("agility_hopp")) return "jumping";
  return "agility";
}

function levelKey(item: PublicBankItem): LevelFilter {
  if (item.meta.isHoopers) return "hoopers";
  if (item.meta.isNollklass) return "noll";
  if (item.meta.level.endsWith("1")) return "1";
  if (item.meta.level.endsWith("2")) return "2";
  return "3";
}

const ALL_ITEMS: PublicBankItem[] = COURSE_BANK.flatMap((course) => {
  const meta = getPublicCourseMeta(course.key);
  return meta ? [{ course, meta }] : [];
});

export default function PublicCourseBankPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [discipline, setDiscipline] = useState<DisciplineFilter>("all");
  const [variant, setVariant] = useState<VariantFilter>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("sv-SE");
    return ALL_ITEMS.filter((item) => {
      if (level !== "all" && levelKey(item) !== level) return false;
      if (discipline !== "all" && disciplineKey(item) !== discipline) return false;
      if (variant === "original" && item.meta.isMirror) return false;
      if (variant === "mirror" && !item.meta.isMirror) return false;
      if (!needle) return true;
      const haystack = [
        item.meta.title,
        item.meta.description,
        item.meta.discipline,
        item.meta.level,
        item.meta.isMirror ? "spegel spegelbana" : "original",
        `${item.meta.arenaWidthM}x${item.meta.arenaHeightM}`,
        `${item.meta.arenaWidthM}×${item.meta.arenaHeightM}`,
        ...item.meta.focus,
      ].join(" ").toLocaleLowerCase("sv-SE");
      return haystack.includes(needle);
    });
  }, [query, level, discipline, variant]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Banbank – 25 gratis agility-, Nollklass- & Hoopersbanor | AgilityManager</title>
        <meta name="description" content="Utforska 25 gratis färdiga kartor i AgilityManagers Banbank: agilityklass, hoppklass, 12 Nollklasskartor, spegelbanor och Hoopers. Se hundlinjen och öppna exakt samma bana i den fulla V2-planeraren." />
        <link rel="canonical" href="https://agilitymanager.se/banor" />
        <meta property="og:title" content="25 gratis banor i AgilityManagers Banbank" />
        <meta property="og:description" content="Filtrera klass 1–3, Nollklass, agility, hopp, spegel och Hoopers. Öppna varje karta direkt i den fulla gratis V2-planeraren." />
        <meta property="og:url" content="https://agilitymanager.se/banor" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "AgilityManager Banbank",
          description: "25 gratis färdiga kartor för agility, hopp, Nollklass och Hoopers.",
          url: "https://agilitymanager.se/banor",
          hasPart: ALL_ITEMS.map(({ meta }) => ({
            "@type": "CreativeWork",
            name: meta.title,
            url: `https://agilitymanager.se/banor/${meta.id}`,
            isAccessibleForFree: true,
          })),
        })}</script>
      </Helmet>

      <LandingNav />
      <main>
        <section className="border-b border-border bg-[radial-gradient(circle_at_80%_10%,hsl(var(--primary)/.12),transparent_38%)]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Gratis Banbank · samma V2-kartor som i editorn</div>
              <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-6xl">25 banor du kan <span className="text-primary">bygga, träna och ändra.</span></h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">Här finns inga fristående inspirationsbilder. Varje kort är en faktisk V2-layout med meterkoordinater, hinderrotationer och beräknad hundlinje. Klicka på en bana och öppna exakt samma layout i AgilityManagers fulla gratis banplanerare.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
                {["12 klass 1–3-kartor", "12 Nollklasskartor", "12 spegelvarianter", "1 Hoopersbana", "25 öppningsbara V2-layouts"].map((text) => <span key={text} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><Check className="h-4 w-4 text-primary" />{text}</span>)}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/banplanerare?view=bank" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground">Öppna banken i planaren <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/banplanerare" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 font-semibold hover:bg-muted"><LayoutGrid className="h-4 w-4" /> Rita från tom bana</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-primary/15 bg-primary/5 p-5 text-sm leading-7 text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck className="h-5 w-5 text-primary" /> Vad betyder regelkontrollerad?</div>
            <p className="mt-1">De 24 svenska kartorna går genom AgilityManagers maskinella kvalitetsgrindar för sin kategori och samma hundlinjemotor som V2-editorn använder. Kartorna är AgilityManager-original, inte officiella domarkartor. Fysisk säkerhet, utrustning, underlag och slutlig tävlingsbedömning måste alltid kontrolleras på plats.</p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök slalom, kontaktfält, 15×30, fart, spegel…" className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {(["all", "original", "mirror"] as VariantFilter[]).map((value) => <button key={value} onClick={() => setVariant(value)} className={cn("h-12 shrink-0 rounded-2xl border px-4 text-sm font-semibold", variant === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value === "all" ? "Alla varianter" : value === "original" ? "Original" : "Spegel"}</button>)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "noll", "1", "2", "3", "hoopers"] as LevelFilter[]).map((value) => <button key={value} onClick={() => setLevel(value)} className={cn("h-9 rounded-full border px-3 text-xs font-semibold", level === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value === "all" ? "Alla nivåer" : value === "noll" ? "Nollklass" : value === "hoopers" ? "Hoopers" : `Klass ${value}`}</button>)}
            <span className="mx-1 h-9 w-px bg-border" aria-hidden />
            {(["all", "agility", "jumping", "noll", "hoopers"] as DisciplineFilter[]).map((value) => <button key={value} onClick={() => setDiscipline(value)} className={cn("h-9 rounded-full border px-3 text-xs font-semibold", discipline === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value === "all" ? "Alla discipliner" : value === "agility" ? "Agilityklass" : value === "jumping" ? "Hoppklass" : value === "noll" ? "Nollklass" : "Hoopers"}</button>)}
            <span className="ml-auto self-center text-sm text-muted-foreground">{filtered.length} kartor</span>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">Inga kartor matchar filtren.</div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ course, meta }) => (
                <article key={course.key} className="rounded-3xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/30 hover:shadow-md">
                  <Link to={`/banor/${encodeURIComponent(course.key)}`} className="block"><CourseLibraryPreview course={course} /></Link>
                  <div className="px-2 pb-2">
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{meta.discipline}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{meta.level}</span>
                      {meta.isMirror && <span className="rounded-full border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">Spegel</span>}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{meta.arenaWidthM}×{meta.arenaHeightM}</span>
                    </div>
                    <h2 className="mt-3 font-display text-xl font-semibold"><Link to={`/banor/${encodeURIComponent(course.key)}`} className="hover:text-primary">{meta.title}</Link></h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{meta.description}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="text-muted-foreground">{meta.passages} passager</span>
                      <Link to={`/banor/${encodeURIComponent(course.key)}`} className="inline-flex items-center gap-1 font-bold text-primary">Visa kartan <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3">
            <article><h2 className="font-display text-2xl font-semibold">Klass 1–3</h2><p className="mt-2 leading-7 text-muted-foreground">Agility och hopp i varje klass, med original och spegel så samma tekniska idé kan tränas från båda handlingssidor.</p></article>
            <article><h2 className="font-display text-2xl font-semibold">Nollklass 2026</h2><p className="mt-2 leading-7 text-muted-foreground">Mur/Långhopp, Slalom och Balans i både 25×30 och 15×30 meter, plus spegelvarianter. Egna layouter byggda kring publicerad Nollklassram.</p></article>
            <article><h2 className="font-display text-2xl font-semibold">En karta – en motor</h2><p className="mt-2 leading-7 text-muted-foreground">Minikartan, publika sidan och editorn bygger på samma V2-data. Du slipper en inspirationsbild som förändras när du klickar “redigera”.</p></article>
          </div>
        </section>
      </main>
      <LandingFooterV2 />
    </div>
  );
}
