import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, RefreshCw } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, SITE_URL } from "@/components/Seo";
import { NotFound } from "@/pages/NotFound";
import { getArticle, type ArticleBlock } from "@/content/articles";
import { blogArticlePath } from "@/lib/routes";
import { fmtDate } from "@/lib/format";

/** Renderar [text](/sökväg) som interna länkar, externa som vanliga a-taggar. */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return part;
    const [, label, href] = m;
    if (href.startsWith("/")) {
      return (
        <Link key={i} to={href} className="font-bold text-forest underline decoration-tang decoration-2 underline-offset-4 transition-colors hover:text-tang">
          {label}
        </Link>
      );
    }
    return (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-forest underline decoration-tang decoration-2 underline-offset-4">
        {label}
      </a>
    );
  });
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-12 font-display text-4xl leading-[0.95] tracking-[0.01em] sm:text-5xl">{block.text}</h2>;
    case "p":
      return <p className="mt-5 text-lg leading-relaxed text-ink/75">{renderInline(block.text)}</p>;
    case "ul":
      return (
        <ul className="mt-5 space-y-3">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-lg leading-relaxed text-ink/75">
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-tang" aria-hidden />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <aside className="mt-8 rounded-2xl border-2 border-ink bg-cream/70 p-5 shadow-hard-sm">
          <p className="text-[0.95rem] font-semibold leading-relaxed text-ink/80">{renderInline(block.text)}</p>
        </aside>
      );
  }
}

export default function BlogArticlePage() {
  const { slug = "" } = useParams();
  const article = getArticle(slug);

  if (!article) return <NotFound />;

  const related = article.related
    .map(getArticle)
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title={`${article.title} | AgilityManager`}
        description={article.description}
        canonicalPath={blogArticlePath(article.slug)}
        ogType="article"
        publishedAt={article.publishedAt}
        updatedAt={article.updatedAt}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          inLanguage: "sv-SE",
          mainEntityOfPage: `${SITE_URL}${blogArticlePath(article.slug)}`,
          author: { "@type": "Organization", name: "AgilityManager" },
          publisher: { "@type": "Organization", name: "AgilityManager" },
        }}
      />
      <SiteNav />

      <article className="mx-auto max-w-3xl px-4 pb-20 pt-[9.5rem] sm:px-6">
        <Link
          to="/blogg"
          className="inline-flex items-center gap-2 text-sm font-bold text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Alla artiklar
        </Link>

        <header className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-[0.75rem] font-extrabold uppercase tracking-[0.16em] shadow-hard-sm">
            <span className="h-2 w-2 rounded-full bg-tang" aria-hidden /> {article.category}
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[0.01em] sm:text-6xl">
            {article.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-ink/55">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Publicerad <time dateTime={article.publishedAt}>{fmtDate(article.publishedAt)}</time>
            </span>
            {article.updatedAt !== article.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" aria-hidden />
                Uppdaterad <time dateTime={article.updatedAt}>{fmtDate(article.updatedAt)}</time>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" aria-hidden /> {article.readingMinutes} min läsning
            </span>
          </div>
        </header>

        <div className="mt-8">
          {article.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        {/* Kontextuell CTA in till planeraren */}
        <div className="mt-14 rounded-3xl border-2 border-ink bg-forest p-7 text-paper shadow-hard sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-tang">Testa i praktiken</p>
          <h2 className="mt-3 font-display text-4xl leading-[0.95] sm:text-5xl">{article.cta.heading}</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-paper/75">{article.cta.text}</p>
          <Link
            to={article.cta.to}
            className="pressable pressable-light shadow-hard-paper mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
          >
            {article.cta.label} <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        {/* Interna vidareläsningar */}
        {related.length > 0 && (
          <nav className="mt-14" aria-label="Relaterade artiklar">
            <h2 className="font-display text-3xl tracking-[0.01em] sm:text-4xl">Läs vidare</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={blogArticlePath(r.slug)}
                  className="group rounded-2xl border-2 border-ink bg-[#FCFAF4] p-5 shadow-hard-sm transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-forest">{r.category}</span>
                  <h3 className="mt-2 font-extrabold leading-snug tracking-tight group-hover:underline">{r.title}</h3>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
