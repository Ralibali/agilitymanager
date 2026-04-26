import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Smoke-test: sitemap-genereringen producerar giltig XML och innehåller
 * minst förväntade publika sidor. Faller tillbaka på public/sitemap.xml
 * (committad version) om ingen ny build körts.
 */
describe("sitemap regression", () => {
  const root = resolve(__dirname, "../../..");
  const sitemapPath = resolve(root, "public/sitemap.xml");
  const pagesSitemapPath = resolve(root, "public/sitemap-pages.xml");

  it("public/sitemap.xml exists", () => {
    expect(existsSync(sitemapPath)).toBe(true);
  });

  it("public/sitemap-pages.xml exists and is valid XML", () => {
    expect(existsSync(pagesSitemapPath)).toBe(true);
    const xml = readFileSync(pagesSitemapPath, "utf-8");
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });

  it("contains critical public URLs", () => {
    const xml = readFileSync(pagesSitemapPath, "utf-8");
    // Dessa SEO-sidor får aldrig försvinna ur sitemap utan medvetet beslut.
    const required = [
      "https://agilitymanager.se/",
      "/blogg",
      "/tavlingar",
    ];
    for (const url of required) {
      expect(xml.includes(url), `sitemap saknar ${url}`).toBe(true);
    }
  });

  it("does not contain private app routes", () => {
    const xml = readFileSync(pagesSitemapPath, "utf-8");
    // Privata routes ska aldrig läcka in i sitemap.
    const forbidden = ["/auth", "/dashboard", "/v3", "/admin", "/settings"];
    for (const url of forbidden) {
      // Tillåt /v3 som substring i andra ord men inte som standalone path
      const pattern = new RegExp(`<loc>[^<]*${url}(/|<)`, "i");
      expect(
        pattern.test(xml),
        `sitemap innehåller privat route ${url}`
      ).toBe(false);
    }
  });
});
