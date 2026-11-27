/**
 * Bangeneratorn: varje klassmall i varje regelverk ska ge en bana som klarar
 * planerarens egen regelkontroll utan fel och varningar — samma krav som
 * banbanken (courseBank.test.ts) har.
 */
import { describe, expect, it } from "vitest";
import { buildRecipe, defaultObstacleCount, defaultStyleFor, generateCourse, mulberry32 } from "./generator";
import { getAllRuleSets, getRuleSet } from "./rules";
import { validateCourse } from "./validation";
import { NON_COMPETING } from "./editorOps";

const CONTACTS = new Set(["aframe", "dogwalk", "seesaw"]);

describe("bangeneratorn klarar regelkontrollen", () => {
  for (const rs of getAllRuleSets()) {
    for (const tpl of rs.classTemplates) {
      it(`${rs.id} · ${tpl.key}`, () => {
        const res = generateCourse({
          sport: rs.sport, ruleSetId: rs.id, classTemplate: tpl.key, sizeClass: "L",
          arenaWidthM: tpl.arenaWidthM, arenaHeightM: tpl.arenaHeightM, seed: 11,
        });
        expect(res).not.toBeNull();
        if (!res) return;
        // Oberoende kontroll — inte bara generatorns egen rapport.
        const issues = validateCourse({
          sport: rs.sport, sizeClass: "L", arenaWidthM: tpl.arenaWidthM, arenaHeightM: tpl.arenaHeightM,
          classTemplate: tpl.key, obstacles: res.obstacles, ruleSetId: rs.id,
        }).filter((i) => i.level !== "info").map((i) => `${i.level} ${i.code}: ${i.message}`);
        expect(issues).toEqual([]);
        const competing = res.obstacles.filter((o) => !NON_COMPETING.has(o.type));
        expect(competing.length).toBe(defaultObstacleCount(tpl));
        expect(competing.map((o) => o.number)).toEqual(competing.map((_, i) => i + 1));
        expect(res.obstacles.filter((o) => o.type === "start")).toHaveLength(1);
        expect(res.obstacles.filter((o) => o.type === "finish")).toHaveLength(1);
        if (rs.sport === "hoopers") expect(res.obstacles.some((o) => o.type === "handler_zone")).toBe(true);
        // Inga hinder utanför ytan och unika id:n.
        expect(new Set(res.obstacles.map((o) => o.id)).size).toBe(res.obstacles.length);
        for (const o of res.obstacles) {
          expect(o.x).toBeGreaterThanOrEqual(0);
          expect(o.y).toBeGreaterThanOrEqual(0);
          expect(o.x).toBeLessThanOrEqual(tpl.arenaWidthM);
          expect(o.y).toBeLessThanOrEqual(tpl.arenaHeightM);
        }
      });
    }
  }
});

describe("bangeneratorns egenskaper", () => {
  const base = {
    sport: "agility" as const, ruleSetId: "skk-agility-2023", classTemplate: "agility_2" as const,
    sizeClass: "L" as const, arenaWidthM: 30, arenaHeightM: 40,
  };

  it("samma seed ger samma bana, annan seed en annan", () => {
    const strip = (r: ReturnType<typeof generateCourse>) => r?.obstacles.map(({ id: _id, ...o }) => { void _id; return o; });
    const a = generateCourse({ ...base, seed: 42 });
    const b = generateCourse({ ...base, seed: 42 });
    const c = generateCourse({ ...base, seed: 43 });
    expect(strip(a)).toEqual(strip(b));
    expect(strip(a)).not.toEqual(strip(c));
  });

  it("respekterar valt antal hinder inom klassens intervall", () => {
    const few = generateCourse({ ...base, classTemplate: "agility_hopp_1", obstacleCount: 15, seed: 5 });
    const many = generateCourse({ ...base, classTemplate: "agility_hopp_1", obstacleCount: 99, seed: 5 });
    const count = (r: ReturnType<typeof generateCourse>) => r?.obstacles.filter((o) => o.number != null).length;
    expect(count(few)).toBe(15);
    expect(count(many)).toBe(22); // klampat till klassens max
    expect(few?.issues).toEqual([]);
    expect(many?.issues).toEqual([]);
  });

  it("fungerar för alla stilar och väljer stil efter klassnivå", () => {
    for (const style of ["flow", "balanced", "technical"] as const) {
      const res = generateCourse({ ...base, style, seed: 3 });
      expect(res?.issues).toEqual([]);
      expect(res?.style).toBe(style);
    }
    expect(defaultStyleFor("agility_1")).toBe("flow");
    expect(defaultStyleFor("agility_2")).toBe("balanced");
    expect(defaultStyleFor("agility_hopp_3")).toBe("technical");
    expect(defaultStyleFor("noll_slalom")).toBe("flow");
  });

  it("vägrar regelverk och klass från fel sport", () => {
    expect(generateCourse({ ...base, ruleSetId: "hoopers-shs-2022" })).toBeNull();
    expect(generateCourse({ ...base, classTemplate: "hoopers_2" })).toBeNull();
  });

  it("receptet: hopp först och sist, aldrig två kontaktfält i rad, ett slalom", () => {
    const rs = getRuleSet("skk-agility-2023")!;
    const tpl = rs.classTemplates.find((t) => t.key === "agility_3")!;
    const rng = mulberry32(9);
    for (let i = 0; i < 50; i++) {
      const recipe = buildRecipe("agility", tpl, 15 + (i % 8), rng)!;
      expect(recipe[0]).toBe("jump");
      expect(recipe[recipe.length - 1]).toBe("jump");
      expect(recipe.filter((t) => t === "weave_12")).toHaveLength(1);
      for (let k = 1; k < recipe.length; k++) {
        expect(CONTACTS.has(recipe[k]) && CONTACTS.has(recipe[k - 1])).toBe(false);
      }
    }
  });

  it("receptet för hoppklass 1 saknar balanshinder och oxer", () => {
    const tpl = getRuleSet("skk-agility-2023")!.classTemplates.find((t) => t.key === "agility_hopp_1")!;
    const recipe = buildRecipe("agility", tpl, 18, mulberry32(1))!;
    expect(recipe.some((t) => CONTACTS.has(t) || t === "combo")).toBe(false);
  });
});
