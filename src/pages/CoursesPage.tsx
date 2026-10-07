import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, PenLine } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { CourseMap } from "@/components/CourseMap";
import { Seo } from "@/components/Seo";
import { PAGE_SEO, seoProps } from "@/lib/pageSeo";
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(0);

  const entries = useMemo(
    () =>
      COURSE_BANK.filter(
        (c) =>
          c.bankKind === "original" &&
          (sport === "alla" || c.sport === sport) &&
          (klass === "alla" || classOf(c.classTemplate) === klass) &&
          [c.label, c.description, c.sport, getClassTemplate(c.classTemplate)?.label, ...(c.focus ?? [])].join(" ").toLocaleLowerCase("sv-SE").includes(query.trim().toLocaleLowerCase("sv-SE"))
      ).sort((a, b) => sort === "name" ? a.label.localeCompare(b.label, "sv") : sort === "obstacles" ? a.obstacles.filter(o => o.number != null).length - b.obstacles.filter(o => o.number != null).length : 0),
    [sport, klass, query, sort]
  );
  const pages = Math.max(1, Math.ceil(entries.length / 12));
  const currentPage = Math.min(page, pages - 1);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        {...seoProps(PAGE_SEO.courses)}
      />
      <SiteNav />
      <PageHero kicker="Banbibliotek" title="Färdiga banor som klarar regelkontrollen.">
        Banor för svenska klass 1–3, Nollklass och hoopers — egna original som klarar
        planerarens kontroll mot SAgiK och SHoK. Öppna direkt i planeraren, justera och
        exportera. Allt är gratis — även utan konto.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="mb-5 flex flex-wrap gap-3">
            <input aria-label="Sök i banbiblioteket" placeholder="Sök namn, klass eller träningsfokus…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} className="h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-white px-4" />
            <select aria-label="Sortera banbiblioteket" value={sort} onChange={e => { setSort(e.target.value); setPage(0); }} className="h-12 rounded-xl border-2 border-ink/20 bg-white px-3">
              <option value="default">Rekommenderad ordning</option><option value="name">Namn A–Ö</option><option value="obstacles">Antal hinder</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["alla", "agility", "hoopers"] as SportFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setSport(f); setPage(0); }}
                aria-pressed={sport === f}
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
                onClick={() => { setKlass(f); setPage(0); }}
                aria-pressed={klass === f}
                className={`rounded-full border-2 px-4 py-2 text-xs font-bold transition-all ${
                  klass === f ? "border-ink bg-forest text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla klasser" : f === "noll" ? "Nollklass" : `Klass ${f}`}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink/60" role="status">{entries.length} banor · {entries.length ? `visar ${currentPage * 12 + 1}–${Math.min(entries.length, (currentPage + 1) * 12)}` : "inga träffar"}</p>
        </Reveal>

        <div className="mt-10 grid min-w-0 gap-6 sm:grid-cols-2">
          {entries.slice(currentPage * 12, currentPage * 12 + 12).map((entry, i) => {
            const c = courseFromBankEntry(entry);
            return (
              <Reveal key={entry.key} delay={Math.min(i, 6) * 80} className="min-w-0">
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
                <Link to={`/traning?template=${encodeURIComponent(entry.key)}`} className="mx-6 mb-5 inline-flex font-bold underline">Planera träning med banan</Link>
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
        <nav aria-label="Sidor i banbiblioteket" className="mt-8 flex items-center justify-between gap-3 text-sm font-semibold">
          <button className="min-h-11 rounded-lg border-2 px-4 disabled:opacity-40" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Föregående</button>
          <span>Sida {currentPage + 1} av {pages}</span>
          <button className="min-h-11 rounded-lg border-2 px-4 disabled:opacity-40" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Nästa</button>
        </nav>

        <Reveal className="mt-16 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-5xl leading-[1.02] sm:text-6xl">
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
