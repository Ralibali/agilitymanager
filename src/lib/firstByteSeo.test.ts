import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyFirstByteSeo,
  assertFirstByteMoneyRoute,
  canonicalUrl,
  FIRST_BYTE_ROUTES,
  routeFromRequestPath,
  SITE_ORIGIN,
} from "./firstByteSeo";

const SHELL = `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <title>Placeholder</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

describe("first-byte SEO for money routes", () => {
  it("uses the apex host, never lovable.app", () => {
    expect(SITE_ORIGIN).toBe("https://agilitymanager.se");
    expect(canonicalUrl("/")).toBe("https://agilitymanager.se/");
    expect(canonicalUrl("/banplanerare")).toBe("https://agilitymanager.se/banplanerare");
    expect(canonicalUrl("/")).not.toMatch(/lovable\.app/i);
    expect(canonicalUrl("/banplanerare")).not.toMatch(/lovable\.app/i);
  });

  it("maps request paths to / and /banplanerare", () => {
    expect(routeFromRequestPath("/").path).toBe("/");
    expect(routeFromRequestPath("/index.html").path).toBe("/");
    expect(routeFromRequestPath("/banplanerare").path).toBe("/banplanerare");
    expect(routeFromRequestPath("/banplanerare/").path).toBe("/banplanerare");
    expect(routeFromRequestPath("/banplanerare/index.html").path).toBe("/banplanerare");
  });

  it("injects canonical + robots + title into an empty Vite shell", () => {
    for (const route of Object.values(FIRST_BYTE_ROUTES)) {
      const html = applyFirstByteSeo(SHELL, route);
      assertFirstByteMoneyRoute(html, route);
      expect(html).toMatch(/<meta name="robots" content="index,follow" \/>/);
      expect(html).toContain(`<link rel="canonical" href="${canonicalUrl(route.path)}" />`);
    }
  });

  it("replaces an existing homepage canonical when emitting /banplanerare", () => {
    const home = applyFirstByteSeo(SHELL, FIRST_BYTE_ROUTES["/"]);
    const planner = applyFirstByteSeo(home, FIRST_BYTE_ROUTES["/banplanerare"]);
    assertFirstByteMoneyRoute(planner, FIRST_BYTE_ROUTES["/banplanerare"]);
    expect(planner).not.toContain('href="https://agilitymanager.se/"');
    expect(planner.match(/rel="canonical"/g)).toHaveLength(1);
    expect(planner.match(/name="robots"/g)).toHaveLength(1);
  });

  it("keeps source index.html crawlable without JS", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    assertFirstByteMoneyRoute(html, FIRST_BYTE_ROUTES["/"]);
    expect(html.toLowerCase()).not.toContain("lovable.app");
  });
});
