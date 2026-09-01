import { useEffect } from "react";

const SITE_URL = "https://agilitymanager.se";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sätter titel, beskrivning, canonical, OG-taggar och valfri JSON-LD.
 * Rensar bara det den själv lagt till (JSON-LD) vid unmount.
 */
function removeMeta(selector: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.remove();
}

export function Seo({
  title,
  description,
  canonicalPath,
  jsonLd,
  noIndex,
  ogType = "website",
  publishedAt,
  updatedAt,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
  /** "article" för blogginlägg — sätter og:type och article:*-tidsstämplar */
  ogType?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
}) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:type"]', "property", "og:type", ogType);
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "sv_SE");
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "AgilityManager");
    upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_OG_IMAGE);
    upsertMeta('meta[property="og:image:width"]', "property", "og:image:width", "1200");
    upsertMeta('meta[property="og:image:height"]', "property", "og:image:height", "630");
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_OG_IMAGE);
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex ? "noindex,follow" : "index,follow",
    );

    if (ogType === "article" && publishedAt) {
      upsertMeta('meta[property="article:published_time"]', "property", "article:published_time", publishedAt);
    } else {
      removeMeta('meta[property="article:published_time"]');
    }
    if (ogType === "article" && updatedAt) {
      upsertMeta('meta[property="article:modified_time"]', "property", "article:modified_time", updatedAt);
    } else {
      removeMeta('meta[property="article:modified_time"]');
    }

    if (canonicalPath) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = `${SITE_URL}${canonicalPath}`;
      upsertMeta('meta[property="og:url"]', "property", "og:url", `${SITE_URL}${canonicalPath}`);
    } else {
      // SPA-navigation: noindex/404-sidor ska inte ärva förra sidans canonical.
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove();
      removeMeta('meta[property="og:url"]');
    }
  }, [title, description, canonicalPath, noIndex, ogType, publishedAt, updatedAt]);

  useEffect(() => {
    if (!jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = "page";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [jsonLd]);

  return null;
}

export { SITE_URL };
