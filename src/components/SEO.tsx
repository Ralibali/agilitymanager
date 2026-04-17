import { Helmet } from "react-helmet-async";

interface ArticleMeta {
  publishedTime?: string; // ISO 8601
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

interface SEOProps {
  /** Sidans titel (max 60 tecken). Suffix " | AgilityManager" läggs till automatiskt om den inte redan finns. */
  title: string;
  /** Meta description (max 160 tecken). */
  description: string;
  /** Kanonisk URL relativt domänen (t.ex. /blogg/hoopers-hund) eller absolut URL. */
  canonical?: string;
  /** OG image URL. Default: /og-default.png */
  ogImage?: string;
  /** Sidtyp för Open Graph. Default: website */
  ogType?: "website" | "article" | "profile";
  /** Sätt till true om sidan inte ska indexeras (admin, kvitto, m.m.). */
  noIndex?: boolean;
  /** Article-specifik metadata för Open Graph + JSON-LD. */
  article?: ArticleMeta;
  /** Valfri JSON-LD struktur. Lägg gärna BreadcrumbList eller FAQPage här. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = "https://agilitymanager.se";
const SITE_NAME = "AgilityManager";
const DEFAULT_OG = `${SITE_URL}/og-default.png`;

function buildCanonical(canonical?: string): string {
  if (!canonical) {
    if (typeof window !== "undefined") {
      return `${SITE_URL}${window.location.pathname}`;
    }
    return SITE_URL;
  }
  if (canonical.startsWith("http")) return canonical;
  return `${SITE_URL}${canonical.startsWith("/") ? "" : "/"}${canonical}`;
}

function buildTitle(title: string): string {
  const suffix = ` | ${SITE_NAME}`;
  if (title.endsWith(suffix)) return title;
  // Lämna utrymme – om titeln redan är >60 tecken, lägg inte till suffix
  if (title.length + suffix.length > 65) return title;
  return `${title}${suffix}`;
}

/**
 * SEO-komponent: hanterar title, meta description, canonical, Open Graph,
 * Twitter Cards och valfri JSON-LD.
 *
 * Använd på alla publika sidor (landing, blogg, hoopers, om-agility, etc.).
 * Renderas via react-helmet-async och uppdaterar <head> klient-sidan.
 *
 * Exempel:
 *   <SEO
 *     title="Hoopers för hund – allt du behöver veta"
 *     description="Lär dig allt om hoopers..."
 *     canonical="/blogg/hoopers-hund"
 *     ogType="article"
 *     article={{ publishedTime: "2025-04-01", author: "AgilityManager" }}
 *   />
 */
export function SEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG,
  ogType = "website",
  noIndex = false,
  article,
  jsonLd,
}: SEOProps) {
  const fullTitle = buildTitle(title);
  const fullCanonical = buildCanonical(canonical);
  const fullOgImage = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;

  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="sv_SE" />

      {/* Article-specifika OG-taggar */}
      {ogType === "article" && article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {ogType === "article" && article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {ogType === "article" && article?.author && (
        <meta property="article:author" content={article.author} />
      )}
      {ogType === "article" && article?.section && (
        <meta property="article:section" content={article.section} />
      )}
      {ogType === "article" &&
        article?.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* JSON-LD */}
      {jsonLdArray.map((schema, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

/** Hjälpare för Article/BlogPosting-schema (JSON-LD).
 *  Sätt `type: "BlogPosting"` för blogginlägg — ger rikare sökresultat i Google. */
export function buildArticleSchema(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedTime: string;
  modifiedTime?: string;
  author?: string;
  type?: "Article" | "BlogPosting" | "NewsArticle";
  section?: string;
  keywords?: string[];
}): Record<string, unknown> {
  const fullImage = opts.image
    ? (opts.image.startsWith("http") ? opts.image : `${SITE_URL}${opts.image}`)
    : DEFAULT_OG;
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": opts.type ?? "Article",
    headline: opts.title.slice(0, 110), // Google rekommenderar <110 tecken
    description: opts.description,
    image: [fullImage],
    datePublished: opts.publishedTime,
    dateModified: opts.modifiedTime ?? opts.publishedTime,
    author: {
      "@type": "Person",
      name: opts.author ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
    url: fullUrl,
  };

  if (opts.section) schema.articleSection = opts.section;
  if (opts.keywords?.length) schema.keywords = opts.keywords.join(", ");

  return schema;
}

/** Hjälpare för BreadcrumbList-schema (JSON-LD) */
export function buildBreadcrumbSchema(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}
