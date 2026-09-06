/**
 * Regelverket ska överleva hela vägen: export → import → validering.
 * Testet använder medvetet ett ICKE-standard Hoopers-regelverk (FCI), så att
 * ett fel som bara syns när default används inte kan gömma sig.
 */
import { describe, expect, it } from "vitest";
import { parseCourseJson } from "./importJson";
import { validateCourse, computeCourseTimes } from "./validation";
import {
  DEFAULT_HOOPERS_RULESET_ID,
  DEFAULT_RULESET_ID,
  FCI_HOOPERS_RULESET_ID,
} from "./rules";

const hoopersCourse = (ruleSetId?: string) => ({
  version: 2,
  name: "Testbana",
  sport: "hoopers",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  classTemplate: null,
  ...(ruleSetId !== undefined ? { ruleSetId } : {}),
  obstacles: [
    { id: "1", type: "hoop", x: 10, y: 10, rotation: 0, number: 1 },
    { id: "2", type: "hoop", x: 15, y: 15, rotation: 0, number: 2 },
    { id: "3", type: "barrel", x: 20, y: 20, rotation: 0, number: 3 },
  ],
});

const parse = (obj: unknown) => parseCourseJson(JSON.stringify(obj));

describe("regelverk genom JSON-roundtrip", () => {
  it("behåller ett icke-standard Hoopers-regelverk (FCI)", () => {
    const res = parse(hoopersCourse(FCI_HOOPERS_RULESET_ID));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.course.ruleSetId).toBe(FCI_HOOPERS_RULESET_ID);
    expect(res.course.ruleSetId).not.toBe(DEFAULT_HOOPERS_RULESET_ID);
  });

  it("roundtrip export → import behåller valt regelverk", () => {
    const first = parse(hoopersCourse(FCI_HOOPERS_RULESET_ID));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Så här ser planerarens JSON-export ut (pdfBase + version).
    const exported = { ...first.course, version: 2 };
    const second = parse(exported);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.course.ruleSetId).toBe(FCI_HOOPERS_RULESET_ID);
  });

  it("gammal bana utan regelverk får sportens default", () => {
    const hoopers = parse(hoopersCourse());
    expect(hoopers.ok && hoopers.course.ruleSetId).toBe(DEFAULT_HOOPERS_RULESET_ID);
    const agility = parse({ ...hoopersCourse(), sport: "agility" });
    expect(agility.ok && agility.course.ruleSetId).toBe(DEFAULT_RULESET_ID);
  });

  it("okänt regelverk faller tillbaka och varnar — aldrig blandat", () => {
    const res = parse(hoopersCourse("skk-agility-2099"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.course.ruleSetId).toBe(DEFAULT_HOOPERS_RULESET_ID);
    expect(res.warnings.some((w) => w.toLowerCase().includes("regelverk"))).toBe(true);
  });

  it("regelverk för FEL sport avvisas med varning", () => {
    const res = parse(hoopersCourse(DEFAULT_RULESET_ID)); // agility-regelverk på hoopersbana
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.course.ruleSetId).toBe(DEFAULT_HOOPERS_RULESET_ID);
    expect(res.warnings.some((w) => w.includes("gäller inte"))).toBe(true);
  });

  it("validering/tider använder det importerade regelverket", () => {
    const res = parse(hoopersCourse(FCI_HOOPERS_RULESET_ID));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const course = {
      sport: res.course.sport,
      sizeClass: res.course.sizeClass,
      arenaWidthM: res.course.arenaWidthM,
      arenaHeightM: res.course.arenaHeightM,
      classTemplate: res.course.classTemplate,
      obstacles: res.course.obstacles,
      ruleSetId: res.course.ruleSetId,
    };
    expect(computeCourseTimes(course).ruleSetId).toBe(FCI_HOOPERS_RULESET_ID);
    const issues = validateCourse(course);
    for (const issue of issues) {
      if (issue.ruleSetId) expect(issue.ruleSetId).toBe(FCI_HOOPERS_RULESET_ID);
    }
    // Ett annat regelverk ⇒ annan referens i utdata (ingen tyst default).
    expect(computeCourseTimes({ ...course, ruleSetId: DEFAULT_HOOPERS_RULESET_ID }).ruleSetId)
      .toBe(DEFAULT_HOOPERS_RULESET_ID);
  });
});
