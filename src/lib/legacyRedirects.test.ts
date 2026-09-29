import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS, legacyCalendarPath } from "./legacyRedirects";
import { ARTICLES } from "@/content/articles";

const appRoutes = [...readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

describe("LEGACY_REDIRECTS", () => {
  it("pekar bara på sidor som finns", () => {
    const articlePaths = ARTICLES.map((a) => `/blogg/${a.slug}`);
    for (const target of Object.values(LEGACY_REDIRECTS)) {
      expect(appRoutes.includes(target) || articlePaths.includes(target), target).toBe(true);
    }
  });

  it("krockar inte med en befintlig route", () => {
    for (const from of Object.keys(LEGACY_REDIRECTS)) {
      expect(appRoutes.includes(from), from).toBe(false);
    }
  });
});

describe("legacyCalendarPath", () => {
  const path = (q: string) => legacyCalendarPath(new URLSearchParams(q));

  it("leder gamla länsfilter till länssidan", () => {
    expect(path("region=gotland")).toBe("/tavlingar/lan/gotlands");
    expect(path("region=skane")).toBe("/tavlingar/lan/skane");
    expect(path("region=ostergotland")).toBe("/tavlingar/lan/ostergotlands");
    expect(path("region=vasternorrland")).toBe("/tavlingar/lan/vasternorrlands");
    expect(path("region=dalarna&sport=agility")).toBe("/tavlingar/lan/dalarnas");
  });

  it("låter kalendern vara när filtret saknas eller är okänt", () => {
    expect(path("sport=agility")).toBeNull();
    expect(path("region=atlantis")).toBeNull();
  });
});
