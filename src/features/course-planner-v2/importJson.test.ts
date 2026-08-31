import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_JSON_CHARS,
  MAX_IMPORT_NAME_CHARS,
  MAX_IMPORT_OBSTACLES,
  MAX_IMPORT_OBSTACLE_ID_CHARS,
  parseCourseJson,
} from "./importJson";

function validCourse(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 2,
    name: "Testbana",
    sport: "agility",
    sizeClass: "L",
    arenaWidthM: 30,
    arenaHeightM: 40,
    classTemplate: null,
    obstacles: [
      { id: "a", type: "jump", x: 5, y: 10, rotation: 90, number: 1 },
      { id: "b", type: "tunnel", x: 10, y: 15, rotation: 0, number: 2 },
    ],
    ...overrides,
  });
}

describe("parseCourseJson — ogiltig import", () => {
  it("avvisar trasig JSON", () => {
    const res = parseCourseJson("{ inte json");
    expect(res.ok).toBe(false);
  });

  it("avvisar tom fil", () => {
    expect(parseCourseJson("").ok).toBe(false);
  });

  it("avvisar icke-objekt och arrayer på toppnivå", () => {
    expect(parseCourseJson("42").ok).toBe(false);
    expect(parseCourseJson('"sträng"').ok).toBe(false);
    expect(parseCourseJson("[]").ok).toBe(false);
    expect(parseCourseJson("null").ok).toBe(false);
  });

  it("avvisar objekt utan obstacles-lista", () => {
    const res = parseCourseJson(JSON.stringify({ version: 2, name: "x" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("obstacles");
  });

  it("avvisar bana där alla hinder är ogiltiga", () => {
    const res = parseCourseJson(
      validCourse({ obstacles: [{ type: "laser", x: 1, y: 1 }, "skräp", null] }),
    );
    expect(res.ok).toBe(false);
  });

  it("hoppar över okända hindertyper men behåller giltiga", () => {
    const res = parseCourseJson(
      validCourse({
        obstacles: [
          { id: "a", type: "jump", x: 5, y: 10, rotation: 0 },
          { id: "evil", type: "<script>", x: 0, y: 0, rotation: 0 },
        ],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.course.obstacles).toHaveLength(1);
      expect(res.warnings.some((w) => w.includes("hoppades över"))).toBe(true);
    }
  });
});

describe("parseCourseJson — storleksgränser", () => {
  it("avvisar filer större än maxgränsen", () => {
    const big = validCourse({ name: "x".repeat(MAX_IMPORT_JSON_CHARS) });
    expect(big.length).toBeGreaterThan(MAX_IMPORT_JSON_CHARS);
    const res = parseCourseJson(big);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("för stor");
  });

  it("trunkerar hinderlistor över maxgränsen med varning", () => {
    const obstacles = Array.from({ length: MAX_IMPORT_OBSTACLES + 500 }, (_, i) => ({
      id: `o${i}`, type: "jump", x: 5, y: 5, rotation: 0,
    }));
    const res = parseCourseJson(validCourse({ obstacles }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.course.obstacles).toHaveLength(MAX_IMPORT_OBSTACLES);
      expect(res.warnings.some((w) => w.includes("hinder"))).toBe(true);
    }
  });
});

describe("parseCourseJson — metadata och XSS-säkerhet", () => {
  it("klipper långa namn till maxlängden", () => {
    const res = parseCourseJson(validCourse({ name: "n".repeat(500) }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.course.name).toHaveLength(MAX_IMPORT_NAME_CHARS);
  });

  it("tar bort styrtecken ur namn och hinder-id:n", () => {
    const res = parseCourseJson(
      validCourse({
        name: "Bana\r\n",
        obstacles: [{ id: "a\r\n\t", type: "jump", x: 1, y: 1, rotation: 0 }],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.course.name).toBe("Bana");
      // eslint-disable-next-line no-control-regex
      expect(res.course.obstacles[0].id).not.toMatch(/[\u0000-\u001F]/);
    }
  });

  it("begränsar längden på hinder-id:n", () => {
    const res = parseCourseJson(
      validCourse({ obstacles: [{ id: "i".repeat(500), type: "jump", x: 1, y: 1, rotation: 0 }] }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.course.obstacles[0].id).toHaveLength(MAX_IMPORT_OBSTACLE_ID_CHARS);
  });

  it("behåller HTML-liknande namn som ofarlig text (renderas escape:ad)", () => {
    const xss = '<img src=x onerror=alert(1)>';
    const res = parseCourseJson(validCourse({ name: xss }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.course.name).toBe(xss);
  });

  it("strippar okända fält från toppobjekt och hinder", () => {
    const res = parseCourseJson(
      validCourse({
        evilScript: "alert(1)",
        obstacles: [{ id: "a", type: "jump", x: 1, y: 1, rotation: 0, onerror: "x", __proto__: {} }],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(Object.keys(res.course).sort()).toEqual([
        "arenaHeightM", "arenaWidthM", "classTemplate", "name", "obstacles", "sizeClass", "sport",
      ]);
      expect(Object.keys(res.course.obstacles[0]).sort()).toEqual(["id", "rotation", "type", "x", "y"]);
    }
  });

  it("ger dubblett-id:n nya unika id:n", () => {
    const res = parseCourseJson(
      validCourse({
        obstacles: [
          { id: "samma", type: "jump", x: 1, y: 1, rotation: 0 },
          { id: "samma", type: "jump", x: 2, y: 2, rotation: 0 },
        ],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const ids = res.course.obstacles.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("klammer koordinater och rotation till giltiga intervall", () => {
    const res = parseCourseJson(
      validCourse({
        arenaWidthM: 30,
        arenaHeightM: 40,
        obstacles: [{ id: "a", type: "jump", x: 9999, y: -50, rotation: 720 }],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const ob = res.course.obstacles[0];
      expect(ob.x).toBeLessThanOrEqual(30);
      expect(ob.y).toBeGreaterThanOrEqual(0);
      expect(ob.rotation).toBeLessThanOrEqual(360);
    }
  });
});

describe("parseCourseJson — versionshantering och migrering", () => {
  it("accepterar nuvarande version (2) utan varning", () => {
    const res = parseCourseJson(validCourse());
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.warnings).toHaveLength(0);
  });

  it("migrerar legacy v1-format (field + kind)", () => {
    const res = parseCourseJson(
      JSON.stringify({
        version: 1,
        name: "Gammal bana",
        field: [25, 35],
        obstacles: [{ id: "a", kind: "jump", x: 3, y: 4, rotation: 10 }],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.course.arenaWidthM).toBe(25);
      expect(res.course.arenaHeightM).toBe(35);
      expect(res.course.obstacles[0].type).toBe("jump");
      expect(res.warnings.some((w) => w.includes("ldre"))).toBe(true);
    }
  });

  it("varnar för nyare okänd version men försöker tolka", () => {
    const res = parseCourseJson(validCourse({ version: 99 }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.warnings.some((w) => w.includes("99"))).toBe(true);
  });

  it("faller tillbaka på standardvärden för okänd sport och storleksklass", () => {
    const res = parseCourseJson(validCourse({ sport: "falconry", sizeClass: "XXL" }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.course.sport).toBe("agility");
      expect(res.course.sizeClass).toBe("L");
      expect(res.warnings.length).toBeGreaterThanOrEqual(2);
    }
  });
});
