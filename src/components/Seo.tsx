import { useEffect } from "react";
import { SITE_ORIGIN } from "@/lib/firstByteSeo";

const SITE_URL = SITE_ORIGIN;

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
export function Seo({
  title,
  description,
  canonicalPath,
  jsonLd,
  noIndex,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex ? "noindex,follow" : "index,follow",
    );

    if (canonicalPath) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = `${SITE_URL}${canonicalPath}`;
      upsertMeta('meta[property="og:url"]', "property", "og:url", `${SITE_URL}${canonicalPath}`);
    }
  }, [title, description, canonicalPath, noIndex]);

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
