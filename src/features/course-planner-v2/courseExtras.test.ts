import { describe, expect, it } from "vitest";
import {
  EXERCISE_LIMITS, MARKUP_LIMITS, exerciseNumbersById, exerciseSequence, finalizeStroke,
  findPolylineCrossings, liveSteps, markupStats, nearestMarkupItem, nextExerciseName, polylineLength, sanitizeExercises,
  sanitizeMarkup, serializeExtras, simplifyStroke, smoothStrokePoints, strokeToSvgD,
  toggleExerciseStep, wrapNoteText, type CourseMarkup,
} from "./courseExtras";
import { parseCourseJson } from "./importJson";

const arena = { width: 30, height: 40 };

describe("förarplan — sanering", () => {
  it("bygger upp drag och markeringar fält för fält och strippar okänt", () => {
    const m = sanitizeMarkup({
      strokes: [
        { points: [[1, 1], [5, 2], { x: 9, y: 3 }], evil: "<script>" },
        { points: [[2, 2]] }, // för kort
        { points: "nej" },
      ],
      cues: [
        { kind: "front_cross", x: 4, y: 4, text: "ignoreras" },
        { kind: "note", x: 6, y: 6, text: "  Fokus\u0007 på 3  " },
        { kind: "note", x: 6, y: 6, text: "   " }, // tom anteckning
        { kind: "rocket", x: 1, y: 1 },
      ],
      extra: 1,
    }, arena);
    expect(m?.strokes).toHaveLength(1);
    expect(m?.strokes[0].points).toEqual([{ x: 1, y: 1 }, { x: 5, y: 2 }, { x: 9, y: 3 }]);
    expect(m?.cues.map((c) => c.kind)).toEqual(["front_cross", "note"]);
    expect(m?.cues[0].text).toBeUndefined();
    expect(m?.cues[1].text).toBe("Fokus på 3");
    expect(Object.keys(m!)).toEqual(["strokes", "cues"]);
  });

  it("klampar koordinater till ytan och har tak på mängden", () => {
    const many = Array.from({ length: 500 }, (_, i) => [i, i]);
    const m = sanitizeMarkup({
      strokes: Array.from({ length: 60 }, () => ({ points: many })),
      cues: Array.from({ length: 200 }, () => ({ kind: "handler", x: -50, y: 1e9 })),
    }, arena);
    expect(m!.strokes.length).toBeLessThanOrEqual(MARKUP_LIMITS.strokes);
    const total = m!.strokes.reduce((s, st) => s + st.points.length, 0);
    expect(total).toBeLessThanOrEqual(MARKUP_LIMITS.totalPoints);
    expect(m!.strokes.every((s) => s.points.every((p) => p.x <= 30 && p.y <= 40))).toBe(true);
    expect(m!.cues).toHaveLength(MARKUP_LIMITS.cues);
    expect(m!.cues[0]).toMatchObject({ x: 0, y: 40 });
  });

  it("tom eller ogiltig förarplan blir undefined", () => {
    expect(sanitizeMarkup(null, arena)).toBeUndefined();
    expect(sanitizeMarkup([], arena)).toBeUndefined();
    expect(sanitizeMarkup({ strokes: [], cues: [] }, arena)).toBeUndefined();
  });
});

describe("övningar — sanering och steg", () => {
  const resolve = (ref: unknown) =>
    typeof ref === "string" && ["a", "b", "c"].includes(ref) ? ref : typeof ref === "number" ? ["a", "b", "c"][ref] ?? null : null;

  it("löser referenser, tar bort okända och dubbletter i rad", () => {
    const ex = sanitizeExercises([
      { name: "Nivå 1", steps: ["a", "b", "b", "x", 2, 0, "a"] },
      { steps: [] },
    ], resolve, arena);
    expect(ex).toHaveLength(2);
    expect(ex![0].name).toBe("Nivå 1");
    expect(ex![0].steps).toEqual(["a", "b", "c", "a"]);
    expect(ex![1].name).toBe("Övning A");
  });

  it("har tak på antal övningar och steg", () => {
    const steps = Array.from({ length: 300 }, (_, i) => (i % 2 ? "a" : "b"));
    const ex = sanitizeExercises(Array.from({ length: 40 }, () => ({ name: "x", steps })), resolve, arena);
    expect(ex!.length).toBe(EXERCISE_LIMITS.exercises);
    expect(ex![0].steps.length).toBe(EXERCISE_LIMITS.steps);
  });

  it("stegväxling: samma hinder igen backar, annars läggs det till", () => {
    expect(toggleExerciseStep(["a", "b"], "b")).toEqual(["a"]);
    expect(toggleExerciseStep(["a", "b"], "a")).toEqual(["a", "b", "a"]);
  });

  it("liveSteps tar bort borttagna hinder och slår ihop dubbletter", () => {
    expect(liveSteps(["a", "x", "a", "b"], new Set(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("nästa lediga namn", () => {
    expect(nextExerciseName([])).toBe("Övning A");
    expect(nextExerciseName([{ name: "Övning A" }, { name: "övning b" }])).toBe("Övning C");
  });

  it("sekvens och nummer per hinder med upprepningar", () => {
    const obs = [
      { id: "a", type: "jump", x: 5, y: 5, rotation: 0 },
      { id: "b", type: "jump", x: 11, y: 5, rotation: 0 },
    ];
    const seq = exerciseSequence(["a", "b", "a"], obs);
    expect(seq.map((o) => [o.id, o.sourceId, o.number])).toEqual([["a~1", "a", 1], ["b~2", "b", 2], ["a~3", "a", 3]]);
    expect([...exerciseNumbersById(["a", "b", "a"], new Set(["a", "b"]))]).toEqual([["a", [1, 3]], ["b", [2]]]);
  });
});

describe("förarlinjens geometri", () => {
  it("RDP förenklar en rak linje till två punkter", () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 0.5, y: 3 }));
    expect(simplifyStroke(pts)).toEqual([{ x: 0, y: 3 }, { x: 9.5, y: 3 }]);
  });

  it("finalizeStroke avvisar prickar och avrundar", () => {
    expect(finalizeStroke([{ x: 1, y: 1 }, { x: 1.1, y: 1.1 }], arena)).toBeNull();
    const s = finalizeStroke([{ x: 1.234567, y: 1 }, { x: 3, y: 2 }, { x: 6, y: 1.0001 }], arena)!;
    expect(s[0]).toEqual({ x: 1.23, y: 1 });
    expect(s.length).toBeGreaterThanOrEqual(2);
  });

  it("mjuk kurva går genom kontrollpunkterna", () => {
    const pts = [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }];
    const smooth = smoothStrokePoints(pts, 6);
    expect(smooth[0]).toEqual(pts[0]);
    expect(smooth.some((p) => Math.hypot(p.x - 5, p.y - 5) < 1e-9)).toBe(true);
    expect(smooth[smooth.length - 1]).toEqual(pts[2]);
    expect(strokeToSvgD(pts)).toMatch(/^M 0 0 C /);
  });

  it("hittar korsningar mellan förarlinje och hundlinje", () => {
    const dog = [{ x: 0, y: 5 }, { x: 20, y: 5 }];
    const handler = [{ x: 2, y: 0 }, { x: 2, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 0 }];
    const hits = findPolylineCrossings(handler, dog);
    expect(hits).toHaveLength(2);
    expect(hits[0].x).toBeCloseTo(2);
    expect(hits[1].x).toBeCloseTo(8);
  });

  it("statistik: längd, korsningar och antal byten", () => {
    const markup: CourseMarkup = {
      strokes: [{ id: "s", points: [{ x: 2, y: 0 }, { x: 2, y: 10 }] }],
      cues: [
        { id: "c1", kind: "front_cross", x: 2, y: 5 },
        { id: "c2", kind: "blind_cross", x: 4, y: 5 },
        { id: "c3", kind: "note", x: 4, y: 5, text: "Hej" },
      ],
    };
    const st = markupStats(markup, [{ x: 0, y: 5 }, { x: 20, y: 5 }]);
    expect(st.handlerLengthM).toBeCloseTo(10);
    expect(st.crossings).toHaveLength(1);
    expect(st.crossCues).toBe(2);
    expect(st.cueCounts.note).toBe(1);
  });

  it("suddet tar bara det närmaste — linjen eller markeringen", () => {
    const markup: CourseMarkup = {
      strokes: [{ id: "s", points: [{ x: 0, y: 0 }, { x: 0, y: 10 }] }],
      cues: [{ id: "c", kind: "front_cross", x: 1, y: 5 }],
    };
    expect(nearestMarkupItem(markup, { x: 0.1, y: 5 }, 1.2)).toEqual({ kind: "stroke", id: "s" });
    expect(nearestMarkupItem(markup, { x: 0.9, y: 5 }, 1.2)).toEqual({ kind: "cue", id: "c" });
    expect(nearestMarkupItem(markup, { x: 5, y: 5 }, 1.2)).toBeNull();
  });

  it("radbryter anteckningar", () => {
    expect(wrapNoteText("Kort")).toEqual(["Kort"]);
    const lines = wrapNoteText("Framförbyte efter tunneln och sedan rakt mot slalom innan belöning ges vid mål", 20, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBe(5);
  });
});

describe("serialisering och import tur och retur", () => {
  const obstacles = [
    { id: "s", type: "start", x: 2, y: 20, rotation: 90 },
    { id: "a", type: "jump", x: 5, y: 20, rotation: 90, number: 1 },
    { id: "b", type: "jump", x: 11, y: 20, rotation: 90, number: 2 },
    { id: "c", type: "tunnel", x: 17, y: 20, rotation: 90, number: 3 },
  ];
  const markup: CourseMarkup = {
    strokes: [{ id: "x", points: [{ x: 3.14159, y: 18 }, { x: 9, y: 17.06 }] }],
    cues: [{ id: "y", kind: "note", x: 8, y: 8, text: "Lugn start" }],
  };
  const exercises = [
    { id: "e", name: "Snurran", steps: ["a", "b", "a", "c", "gone"], markup },
  ];

  it("indexläge (delningslänk) pekar på hinderlistans platser", () => {
    const out = serializeExtras({ obstacles, markup, exercises }, "indices");
    expect(out.exercises![0].steps).toEqual([1, 2, 1, 3]);
    expect(out.markup!.strokes![0].points[0]).toEqual([3.1, 18]);
    // Inga interna id:n i länken.
    expect(JSON.stringify(out)).not.toContain('"id"');
  });

  it("länkformatet läses in igen med nya hinder-id:n", () => {
    const linkObstacles = obstacles.map(({ id: _id, ...rest }) => { void _id; return rest; });
    const json = JSON.stringify({
      version: 2, name: "Länk", sport: "agility", sizeClass: "L", arenaWidthM: 30, arenaHeightM: 40,
      obstacles: linkObstacles, ...serializeExtras({ obstacles, markup, exercises }, "indices"),
    });
    const res = parseCourseJson(json);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const ids = res.course.obstacles.map((o) => o.id);
    expect(res.course.exercises![0].steps).toEqual([ids[1], ids[2], ids[1], ids[3]]);
    expect(res.course.exercises![0].name).toBe("Snurran");
    expect(res.course.markup!.cues[0].text).toBe("Lugn start");
  });

  it("id-läge (JSON-fil) behåller id-referenser", () => {
    const json = JSON.stringify({
      version: 2, name: "Fil", sport: "agility", sizeClass: "L", arenaWidthM: 30, arenaHeightM: 40,
      obstacles, ...serializeExtras({ obstacles, markup, exercises }, "ids"),
    });
    const res = parseCourseJson(json);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.course.exercises![0].steps).toEqual(["a", "b", "a", "c"]);
    expect(res.course.exercises![0].markup!.strokes[0].points[0]).toEqual({ x: 3.14, y: 18 });
  });

  it("bana utan lager får inga lagerfält", () => {
    const res = parseCourseJson(JSON.stringify({ version: 2, sport: "agility", obstacles }));
    expect(res.ok && res.course.markup).toBeFalsy();
    expect(res.ok && res.course.exercises).toBeFalsy();
    expect(serializeExtras({ obstacles }, "ids")).toEqual({});
  });
});
