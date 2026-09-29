import { describe, expect, it } from "vitest";
import { buildCompetitionPages, esc, renderPage, sitemapUrls } from "./competitionPages";
import type { UnifiedCompetition } from "@/lib/competitionData";

const NOW = new Date("2026-09-29T12:00:00");

function comp(patch: Partial<UnifiedCompetition>): UnifiedCompetition {
  return {
    key: "a-1",
    id: "1",
    sport: "agility",
    name: "Höstagility",
    club: "Kungälvs BK",
    location: "Kungälv",
    county: "Västra Götalands",
    dateStart: "2026-10-10",
    dateEnd: null,
    registrationCloses: "2026-10-01",
    classes: ["Ag1", "Hopp1"],
    judges: ["Anna Andersson"],
    status: null,
    sourceUrl: "https://example.org/anmalan",
    path: "/tavlingar/1/kungalvs-bk-hostagility-2026-10-10",
    ...patch,
  };
}

const TEMPLATE = `<!doctype html><html><head><meta name="description" content="Start" /><meta name="robots" content="index,follow" /><link rel="canonical" href="https://agilitymanager.se/" /><meta property="og:title" content="Start" /><meta property="og:image" content="https://agilitymanager.se/og-image.png" /><title>Start</title></head><body><div id="root"></div></body></html>`;

describe("buildCompetitionPages", () => {
  const comps = [
    comp({}),
    comp({ key: "h-9", id: "9", sport: "hoopers", name: "Hoopers <3", club: "Malmö HK", location: "Malmö", county: "Skåne", path: "/tavlingar/hoopers/9/malmo-hk" }),
    comp({ key: "a-x", id: "x y", path: "/tavlingar/x%20y/konstig" }),
  ];
  const pages = buildCompetitionPages(comps, NOW);
  const byPath = new Map(pages.map((p) => [p.canonicalPath, p]));

  it("skapar kalender, klubbkatalog, alla län, varje klubb och varje tävling", () => {
    expect(byPath.has("/tavlingar")).toBe(true);
    expect(byPath.has("/klubbar")).toBe(true);
    expect(byPath.has("/tavlingar/lan/skane")).toBe(true);
    expect(byPath.has("/tavlingar/lan/gotlands")).toBe(true);
    expect(byPath.has("/tavlingar/klubb/kungalvs-bk")).toBe(true);
    expect(byPath.has("/tavlingar/1/kungalvs-bk-hostagility-2026-10-10")).toBe(true);
    expect(byPath.has("/tavlingar/hoopers/9/malmo-hk")).toBe(true);
  });

  it("hoppar över tävlingar med ovanliga tecken i adressen", () => {
    expect([...byPath.keys()].some((p) => p.includes("%"))).toBe(false);
  });

  it("länssidan listar bara länets tävlingar och har årtal i titeln", () => {
    const skane = byPath.get("/tavlingar/lan/skane")!;
    expect(skane.title).toBe("Agilitytävlingar i Skåne län 2026 | AgilityManager");
    expect(skane.body).toContain("Hoopers &lt;3");
    expect(skane.body).not.toContain("Höstagility");
    expect(byPath.get("/tavlingar/lan/gotlands")!.body).toContain("Inga kommande tävlingar");
  });

  it("tävlingssidan har fakta, länkar och SportsEvent-data", () => {
    const page = byPath.get("/tavlingar/1/kungalvs-bk-hostagility-2026-10-10")!;
    expect(page.body).toContain("<h1>Höstagility</h1>");
    expect(page.body).toContain("Ag1, Hopp1");
    expect(page.body).toContain('href="/tavlingar/klubb/kungalvs-bk"');
    expect(page.body).toContain('href="/tavlingar/lan/vastra-gotalands"');
    expect(page.jsonLd).toMatchObject({ "@type": "SportsEvent", startDate: "2026-10-10", sport: "Dog agility" });
  });
});

describe("renderPage", () => {
  const html = renderPage(TEMPLATE, {
    title: 'Tävling "A" & B',
    description: "Beskrivning <b>",
    canonicalPath: "/tavlingar/lan/skane",
    body: "<main><h1>Skåne</h1></main>",
    jsonLd: { name: "</script><script>alert(1)</script>" },
  });

  it("ersätter titel, beskrivning och canonical men behåller og:image", () => {
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain("<title>Tävling &quot;A&quot; &amp; B</title>");
    expect(html).toContain('content="Beskrivning &lt;b&gt;"');
    expect(html).toContain('<link rel="canonical" href="https://agilitymanager.se/tavlingar/lan/skane">');
    expect(html).not.toContain('href="https://agilitymanager.se/"');
    expect(html).toContain("og-image.png");
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it("lägger innehållet i #root och kan inte bryta sig ur JSON-LD", () => {
    expect(html).toContain('<div id="root"><main><h1>Skåne</h1></main></div>');
    expect(html).not.toContain("</script><script>alert");
  });
});

describe("sitemapUrls", () => {
  it("lägger bara till adresser som saknas", () => {
    const pages = buildCompetitionPages([comp({})], NOW);
    const extra = sitemapUrls(pages, "<loc>https://agilitymanager.se/tavlingar</loc>");
    expect(extra).not.toContain("<loc>https://agilitymanager.se/tavlingar</loc>");
    expect(extra).toContain("<loc>https://agilitymanager.se/tavlingar/klubb/kungalvs-bk</loc>");
  });
});

describe("esc", () => {
  it("escapar HTML-tecken", () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
