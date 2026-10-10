import { describe, expect, it } from "vitest";
import { buildStaticPages } from "./staticPages";
import { renderPage } from "./competitionPages";
import { ARTICLES } from "@/content/articles";
import { PUBLIC_ROUTES } from "@/lib/routes";

const TEMPLATE = `<!doctype html><html lang="sv"><head><title>Start</title><meta name="description" content="x" /><meta name="robots" content="index,follow" /><link rel="canonical" href="https://agilitymanager.se/" /><meta property="og:title" content="x" /><meta property="og:image" content="https://agilitymanager.se/og-image.png" /><meta name="twitter:card" content="summary_large_image" /></head><body><div id="root"></div></body></html>`;

describe("förrenderade statiska sidor", () => {
  const pages = buildStaticPages(new Date("2026-10-05"));

  it("varje sida har egen canonical och titel", () => {
    const paths = pages.map((p) => p.canonicalPath);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/");
    for (const p of pages) expect(p.title).toMatch(/AgilityManager/);
  });

  it("täcker alla publika routes utom de som förrenderas på annat sätt", () => {
    const prerenderedElsewhere = new Set(["/jamfor-hundforsakring"]);
    const paths = new Set(pages.map((p) => p.canonicalPath));
    for (const r of PUBLIC_ROUTES) {
      if (!prerenderedElsewhere.has(r.path)) expect(paths.has(r.path), r.path).toBe(true);
    }
  });

  it("startsidan innehåller rubrik, navigation, strukturdata och egen og:url utan JavaScript", () => {
    const html = renderPage(TEMPLATE, pages.find(p => p.canonicalPath === "/")!);
    expect(html).toContain("<h1>Hitta tävlingen. Bygg träningen.</h1>");
    expect(html).toContain('property="og:url" content="https://agilitymanager.se/"');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html.match(/<a href=/g)!.length).toBeGreaterThan(10);
  });

  it("bloggindexet länkar till varje artikel", () => {
    const blog = pages.find((p) => p.canonicalPath === "/blogg")!;
    for (const a of ARTICLES) expect(blog.body).toContain(`href="/blogg/${a.slug}"`);
  });

  it("renderad HTML byter head men behåller delningsbilden", () => {
    const html = renderPage(TEMPLATE, pages.find((p) => p.canonicalPath === "/funktioner")!);
    expect(html).toContain('<link rel="canonical" href="https://agilitymanager.se/funktioner">');
    expect(html).not.toContain('href="https://agilitymanager.se/"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain("<h1>");
  });
});
