import { Link } from "react-router";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Seo, SITE_URL } from "@/components/Seo";
import { Reveal } from "@/components/Reveal";
import { ARTICLES } from "@/content/articles";
import { blogArticlePath } from "@/lib/routes";
import { fmtDate } from "@/lib/format";

const CATEGORY_STYLE: Record<string, string> = {
  Banbyggande: "bg-forest text-paper",
  Hoopers: "bg-tang text-ink",
  Regler: "bg-ink text-paper",
  Träning: "bg-cream text-ink",
  Verktyg: "bg-pine text-paper",
};

export default function BlogIndexPage() {
  const sorted = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Blogg & kunskapsbank — agility, hoopers och banbyggande | AgilityManager"
        description="Guider om agility, hoopers, regler och bandesign på svenska. Lär dig rita säkra träningsbanor, förstå regelverken och planera träningen smartare."
        canonicalPath="/blogg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "AgilityManager — blogg & kunskapsbank",
          url: `${SITE_URL}/blogg`,
          inLanguage: "sv-SE",
          blogPost: sorted.map((a) => ({
            "@type": "BlogPosting",
            headline: a.title,
            description: a.description,
            datePublished: a.publishedAt,
            dateModified: a.updatedAt,
            url: `${SITE_URL}${blogArticlePath(a.slug)}`,
            inLanguage: "sv-SE",
          })),
        }}
      />
      <SiteNav />
      <PageHero kicker="Blogg & kunskapsbank" title="Bli bättre på banor.">
        Guider om bandesign, agility, hoopers och regler — skrivna för svenska
        förare och klubbar. Varje artikel slutar i planeraren, där du kan testa
        idéerna direkt.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a, i) => (
            <Reveal key={a.slug} delay={Math.min(i, 6) * 80} className="h-full">
              <article className="group flex h-full flex-col rounded-3xl border-2 border-ink bg-[#FCFAF4] p-6 shadow-hard transition-transform duration-300 hover:-translate-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border-2 border-ink px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-wider shadow-hard-sm ${CATEGORY_STYLE[a.category] ?? "bg-paper text-ink"}`}
                  >
                    {a.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden /> {a.readingMinutes} min
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight">
                  <Link to={blogArticlePath(a.slug)} className="hover:underline">
                    {a.title}
                  </Link>
                </h2>
                <p className="mt-3 flex-1 leading-relaxed text-ink/65">{a.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50">
                    <CalendarDays className="h-4 w-4" aria-hidden /> {fmtDate(a.publishedAt)}
                  </span>
                  <Link
                    to={blogArticlePath(a.slug)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-forest transition-colors hover:text-tang"
                    aria-label={`Läs artikeln: ${a.title}`}
                  >
                    Läs <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
