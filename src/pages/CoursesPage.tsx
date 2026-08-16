import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, PenLine } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { CourseMap } from "@/components/CourseMap";
import { courseFromBankEntry, type Sport } from "@/lib/course";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import { getClassTemplate } from "@/features/course-planner-v2/config";

type SportFilter = "alla" | Sport;
type ClassFilter = "alla" | "1" | "2" | "3" | "noll";

function classOf(key: string): ClassFilter {
  if (key.startsWith("noll")) return "noll";
  if (/_(\d)$/.test(key)) return key.slice(-1) as ClassFilter;
  if (key.startsWith("hoopers")) return (key.slice(-1) as ClassFilter) ?? "alla";
  return "alla";
}

export default function CoursesPage() {
  const [sport, setSport] = useState<SportFilter>("alla");
  const [klass, setKlass] = useState<ClassFilter>("alla");

  const entries = useMemo(
    () =>
      COURSE_BANK.filter(
        (c) =>
          c.bankKind === "original" &&
          (sport === "alla" || c.sport === sport) &&
          (klass === "alla" || classOf(c.classTemplate) === klass)
      ),
    [sport, klass]
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteNav />
      <PageHero kicker="Banbibliotek" title="Officiellt inspirerade banor — granskade mot regelverket.">
        Tävlingsbanor och nollklasskurser byggda efter SAgiK/SKK och Svenska
        Hooperssällskapets regler. Öppna direkt i planeraren, justera och exportera.
        Allt är gratis — även utan konto.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            {(["alla", "agility", "hoopers"] as SportFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSport(f)}
                className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                  sport === f ? "border-ink bg-ink text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla sporter" : f}
              </button>
            ))}
            <span className="mx-2 hidden h-6 w-px bg-ink/15 sm:block" />
            {(["alla", "1", "2", "3", "noll"] as ClassFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setKlass(f)}
                className={`rounded-full border-2 px-4 py-2 text-xs font-bold transition-all ${
                  klass === f ? "border-ink bg-forest text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla klasser" : f === "noll" ? "Nollklass" : `Klass ${f}`}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {entries.map((entry, i) => {
            const c = courseFromBankEntry(entry);
            return (
              <Reveal key={entry.key} delay={Math.min(i, 6) * 80}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border-2 border-ink bg-[#FCFAF4] shadow-hard transition-transform duration-300 hover:-translate-y-1.5">
                  <div className="relative overflow-hidden border-b-2 border-ink">
                    <CourseMap course={c} className="zoom-slow w-full" />
                    <span className="absolute left-4 top-4 rounded-full border-2 border-ink bg-paper px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider shadow-hard-sm">
                      {c.sport}
                    </span>
                    {entry.qualityLabel && (
                      <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-forest px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-paper shadow-hard-sm">
                        <BadgeCheck className="h-3 w-3" /> Kvalitetsgranskad
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4 p-6">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight">{c.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-ink/50">
                        {getClassTemplate(entry.classTemplate)?.label} · {c.field[0]}×{c.field[1]} m
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-ink/60">{entry.description}</p>
                    </div>
                    <Link
                      to={`/banplanerare?template=${entry.key}`}
                      className="pressable shadow-hard-sm inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-forest px-5 font-bold text-paper"
                    >
                      <PenLine className="h-4 w-4" /> Redigera
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {entries.length === 0 && (
          <p className="mt-12 text-center text-lg font-semibold text-ink/50">
            Inga banor matchar filtren — prova en annan kombination.
          </p>
        )}

        <Reveal className="mt-16 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-5xl leading-[0.95] sm:text-6xl">
            Eller börja på en blank plan.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/banplanerare"
              className="pressable shadow-hard inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
            >
              Öppna tom plan <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/delade-banor"
              className="pressable shadow-hard inline-flex h-14 items-center gap-2 rounded-full border-2 border-ink bg-paper px-8 text-lg font-bold text-ink"
            >
              Se banor från communityn
            </Link>
          </div>
        </Reveal>

      </section>

      <SiteFooter />
    </div>
  );
}
