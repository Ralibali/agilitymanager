import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import { COMPETITIONS, STATUS_LABEL, type Competition } from "@/lib/course";

type Filter = "alla" | "agility" | "hoopers";

const STATUS_STYLE: Record<Competition["status"], string> = {
  open: "bg-forest text-paper",
  soon: "bg-tang text-ink",
  closed: "bg-ink/10 text-ink/45",
};

export default function CompetitionsPage() {
  const [filter, setFilter] = useState<Filter>("alla");

  const groups = useMemo(() => {
    const list = COMPETITIONS.filter((c) => filter === "alla" || c.sport === filter);
    const byMonth = new Map<string, Competition[]>();
    list.forEach((c) => {
      byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), c]);
    });
    return [...byMonth.entries()];
  }, [filter]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteNav />
      <PageHero kicker="Tävlingskalender" title="Hitta er nästa start.">
        Agility och hoopers över hela landet — med anmälningsstatus,
        klasser och plats. Planera säsongen på en minut.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            {(["alla", "agility", "hoopers"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                  filter === f ? "border-ink bg-ink text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla sporter" : f}
              </button>
            ))}
            <span className="ml-auto text-sm font-semibold text-ink/45">
              Exempeldata i redesignkonceptet
            </span>
          </div>
        </Reveal>

        {groups.map(([month, comps], gi) => (
          <div key={month} className="mt-14">
            <Reveal>
              <h2 className="flex items-baseline gap-4 font-display text-5xl tracking-wide">
                {month}
                <span className="text-xl text-ink/40">2026</span>
              </h2>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {comps.map((c, i) => (
                <Reveal key={c.id} delay={i * 80}>
                  <article className="group flex h-full flex-col rounded-3xl border-2 border-ink bg-[#FCFAF4] p-6 shadow-hard transition-transform duration-300 hover:-translate-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`rounded-full px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider ${STATUS_STYLE[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                        <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{c.name}</h3>
                      </div>
                      <span className="grid h-16 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-cream text-center font-display leading-none">
                        <span>
                          <span className="block text-2xl">{c.date.split(" ")[0]}</span>
                          <span className="block text-sm uppercase">{c.date.split(" ")[1]}</span>
                        </span>
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-ink/55">
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-forest" /> {c.place}</span>
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-forest" /> {c.club}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-ink/10 pt-4">
                      <span className="text-sm font-bold text-ink/60">{c.classes}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                          c.sport === "agility" ? "bg-forest/10 text-forest" : "bg-tang/15 text-ember"
                        }`}
                      >
                        {c.sport}
                      </span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            {gi === groups.length - 1 && groups.length === 0 && (
              <p className="mt-6 text-ink/50">Inga tävlingar matchar filtret.</p>
            )}
          </div>
        ))}

        <Reveal className="mt-16">
          <div className="mx-auto grid max-w-4xl items-center gap-8 rounded-3xl border-2 border-ink bg-ink p-8 text-paper shadow-hard sm:p-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="font-display text-4xl leading-[0.95] sm:text-5xl">
                Tävlingar är bättre med en plan.
              </h2>
              <p className="mt-4 leading-relaxed text-paper/60">
                Rita träningsbanan inför starten, dela den med klubben — och få
                tävlingspåminnelser och nya banor i nyhetsbrevet.
              </p>
              <Link
                to="/banplanerare"
                className="group mt-5 inline-flex items-center gap-2 font-bold text-tang"
              >
                Öppna planeraren
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </div>
            <EmailCapture variant="dark" compact />
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
