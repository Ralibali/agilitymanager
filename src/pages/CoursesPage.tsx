import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, PenLine } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { CourseMap } from "@/components/CourseMap";
import { SAMPLE_COURSES, type Sport } from "@/lib/course";

type Filter = "alla" | Sport;

export default function CoursesPage() {
  const [filter, setFilter] = useState<Filter>("alla");
  const courses = useMemo(
    () => SAMPLE_COURSES.filter((c) => filter === "alla" || c.sport === filter),
    [filter]
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteNav />
      <PageHero kicker="Banbibliotek" title="Färdiga banor att bygga vidare på.">
        Öppna en bana direkt i planeraren, justera efter er plan och exportera.
        Allt är gratis — även utan konto.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="flex flex-wrap gap-2">
            {(["alla", "agility", "hoopers"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                  filter === f ? "border-ink bg-ink text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla banor" : f}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {courses.map((c, i) => (
            <Reveal key={c.slug} delay={i * 100}>
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border-2 border-ink bg-[#FCFAF4] shadow-hard transition-transform duration-300 hover:-translate-y-1.5">
                <div className="relative overflow-hidden border-b-2 border-ink">
                  <CourseMap course={c} className="zoom-slow w-full" />
                  <span className="absolute left-4 top-4 rounded-full border-2 border-ink bg-paper px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider shadow-hard-sm">
                    {c.sport}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-between gap-4 p-6">
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-tight">{c.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-ink/50">
                      {c.level} · {c.field[0]}×{c.field[1]} m
                    </p>
                  </div>
                  <Link
                    to={`/banplanerare?template=${c.slug}`}
                    className="pressable shadow-hard-sm inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-forest px-5 font-bold text-paper"
                  >
                    <PenLine className="h-4 w-4" /> Redigera
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-5xl leading-[0.95] sm:text-6xl">
            Eller börja på en blank plan.
          </h2>
          <Link
            to="/banplanerare"
            className="pressable shadow-hard mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
          >
            Öppna tom plan <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
