/**
 * Regelverksdrivna valideringstester: känt giltiga/ogiltiga banor,
 * gränsvärden, samt samma bana under SHoK vs FCI där reglerna skiljer sig.
 */
import { describe, expect, it } from "vitest";
import {
  validateCourse,
  computeCourseTimes,
  type CourseLite,
  type ObstacleLite,
} from "./validation";
import { HOOPERS_FCI_2026, HOOPERS_SHS_2022 } from "./rules";

function ob(
  id: string,
  type: ObstacleLite["type"],
  number: number | undefined,
  x: number,
  y: number,
): ObstacleLite {
  return { id, type, number, x, y, rotation: 0 };
}

function baseCourse(partial: Partial<CourseLite>): CourseLite {
  return {
    sport: "hoopers",
    sizeClass: "L",
    arenaWidthM: 30,
    arenaHeightM: 30,
    classTemplate: null,
    obstacles: [],
    ...partial,
  };
}

/**
 * Serpentin-layout: `cols`×`rows` hoops med `spacing` m mellanrum.
 * Följdavstånd = spacing, diagonala/icke-följd-par ligger längre isär.
 */
function serpentineHoops(
  count: number,
  spacing: number,
  startX: number,
  startY: number,
  cols: number,
): ObstacleLite[] {
  const out: ObstacleLite[] = [];
  let n = 1;
  let row = 0;
  while (n <= count) {
    const colsThisRow = Math.min(cols, count - n + 1);
    for (let c = 0; c < colsThisRow; c++) {
      const col = row % 2 === 0 ? c : colsThisRow - 1 - c;
      out.push(ob(`h${n}`, "hoop", n, startX + col * spacing, startY + row * spacing));
      n++;
    }
    row++;
  }
  return out;
}

/* ───────────── Känt giltig bana (SHoK klass 2) ───────────── */

function validShokClass2(): CourseLite {
  // 17 hoops (klass 2: 17–22), 6–7 m mellan följdhinder (regel: 6–9 m),
  // börjar och slutar med hoop, 30×30 m bana, dirigeringsområde på plats.
  const obstacles = serpentineHoops(17, 6, 2, 4, 5);
  // Radbryten i serpentinen blir 6 m vertikalt — men följdparet (5→6,
  // 10→11, 15→16) ligger i samma kolumn: vertikalt avstånd 6 m. OK (≥6).
  obstacles.push(ob("start", "start", undefined, 2, 1.5));
  obstacles.push(ob("finish", "finish", undefined, 26, 27));
  obstacles.push(ob("zone", "handler_zone", undefined, 14, 14.5));
  return baseCourse({
    classTemplate: "hoopers_3",
    ruleSetId: "hoopers-shs-2022",
    obstacles,
  });
}

describe("known-valid: SHoK klass 2-bana", () => {
  const issues = validateCourse(validShokClass2());

  it("ger inga fel", () => {
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("ger inga regelbaserade hoopers-varningar", () => {
    const ruleCodes = [
      "hoopers_too_close",
      "hoopers_off_sequence_too_close",
      "hoopers_start_not_hoop",
      "hoopers_finish_not_hoop",
      "too_few_obstacles",
      "too_many_obstacles",
      "missing_handler_zone",
      "handler_zone_max_distance",
    ];
    expect(issues.filter((i) => ruleCodes.includes(i.code))).toEqual([]);
  });

  it("alla issues bär aktivt ruleSetId", () => {
    for (const issue of issues) {
      expect(issue.ruleSetId).toBe("hoopers-shs-2022");
    }
  });
});

/* ───────────── Känt ogiltiga banor ───────────── */

describe("known-invalid: SHoK-regelbrott", () => {
  it("följdhinder närmare än klassens minimiavstånd → error med källa", () => {
    const course = baseCourse({
      classTemplate: "hoopers_3", // klass 2: min 6 m
      ruleSetId: "hoopers-shs-2022",
      obstacles: [
        ob("h1", "hoop", 1, 5, 10),
        ob("h2", "hoop", 2, 10, 10), // 5,0 m < 6 m
        ob("zone", "handler_zone", undefined, 7.5, 20),
      ],
    });
    const issues = validateCourse(course);
    const hit = issues.find((i) => i.code === "hoopers_too_close");
    expect(hit).toBeDefined();
    expect(hit?.level).toBe("error");
    expect(hit?.obstacleId).toBe("h2");
    // Fältet är verifierat → officiell etikett med paragraf och käll-URL.
    expect(hit?.basis).toBe("official_rule");
    expect(hit?.ruleSetId).toBe("hoopers-shs-2022");
    expect(hit?.ruleClause).toBe("§2.3");
    expect(hit?.sourceUrl).toContain("svenskahoopersklubben.se");
    expect(hit?.message).toContain("enligt SHoK");
  });

  it("banan måste börja och sluta med hoop (SHoK §4.4)", () => {
    const course = baseCourse({
      classTemplate: "hoopers_1",
      ruleSetId: "hoopers-shs-2022",
      obstacles: [
        ob("h1", "barrel", 1, 5, 10),
        ob("h2", "hoop", 2, 11, 10),
        ob("h3", "tunnel", 3, 17, 10),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "hoopers_start_not_hoop" && i.obstacleId === "h1")).toBe(true);
    expect(issues.some((i) => i.code === "hoopers_finish_not_hoop" && i.obstacleId === "h3")).toBe(true);
  });

  it("icke-följdhinder närmare än 2,5 m → varning (SHoK §4.4)", () => {
    const course = baseCourse({
      classTemplate: "hoopers_1",
      ruleSetId: "hoopers-shs-2022",
      obstacles: [
        ob("h1", "hoop", 1, 5, 5),
        ob("h2", "hoop", 2, 11, 5),
        ob("h3", "hoop", 3, 17, 5),
        ob("h4", "hoop", 4, 6.2, 5), // 1,2 m från hinder 1, ej i följd
      ],
    });
    const issues = validateCourse(course);
    const hit = issues.find((i) => i.code === "hoopers_off_sequence_too_close");
    expect(hit).toBeDefined();
    expect(hit?.level).toBe("warning");
    expect(hit?.basis).toBe("official_rule");
    expect(hit?.ruleClause).toBe("§4.4");
  });

  it("provisoriska värde får aldrig officiell etikett", () => {
    // hoopersHandlerZoneMinM (3,0 m) är deklarerat provisional i SHoK-verket.
    const course = baseCourse({
      classTemplate: "hoopers_1",
      ruleSetId: "hoopers-shs-2022",
      obstacles: [
        ob("h1", "hoop", 1, 7, 10),
        ob("h2", "hoop", 2, 13, 10),
        ob("zone", "handler_zone", undefined, 5, 10), // 2,0 m från hinder 1
      ],
    });
    const issues = validateCourse(course);
    const hit = issues.find((i) => i.code === "handler_too_close");
    expect(hit).toBeDefined();
    expect(hit?.basis).toBe("safety_heuristic");
    expect(hit?.sourceUrl).toBeUndefined();
    expect(hit?.message).toContain("förhandskontrollens gräns");
    expect(hit?.message).not.toContain("enligt");
  });

  it("FCI: under 50 % hoops → error (FCI §3.1); SHoK saknar motsvarande regel", () => {
    const obstacles = [
      ob("h1", "hoop", 1, 4, 10),
      ob("h2", "barrel", 2, 9.5, 10),
      ob("h3", "fence", 3, 15, 10),
      ob("h4", "barrel", 4, 20.5, 10),
      ob("h5", "tunnel", 5, 26, 10),
      ob("h6", "hoop", 6, 26, 16),
    ]; // 2/6 hoops = 33 % < 50 %
    const fci = validateCourse(baseCourse({
      classTemplate: "hoopers_fci_h1",
      ruleSetId: "hoopers-fci-2026",
      obstacles,
    }));
    const shok = validateCourse(baseCourse({
      classTemplate: "hoopers_1",
      ruleSetId: "hoopers-shs-2022",
      obstacles,
    }));
    const fciHit = fci.find((i) => i.code === "hoopers_hoop_share");
    expect(fciHit).toBeDefined();
    expect(fciHit?.level).toBe("error");
    expect(fciHit?.basis).toBe("official_rule");
    expect(fciHit?.sourceUrl).toContain("fci.be");
    expect(shok.some((i) => i.code === "hoopers_hoop_share")).toBe(false);
  });

  it("FCI: banyta under 800 m² → varning (undantag kan godkännas av domaren)", () => {
    const course = baseCourse({
      classTemplate: "hoopers_fci_h1",
      ruleSetId: "hoopers-fci-2026",
      arenaWidthM: 20,
      arenaHeightM: 20, // 400 m² < 800 m²
      obstacles: serpentineHoops(12, 5.5, 3, 3, 4),
    });
    const issues = validateCourse(course);
    const hit = issues.find((i) => i.code === "hoopers_arena_below_min");
    expect(hit).toBeDefined();
    expect(hit?.level).toBe("warning");
    expect(hit?.ruleClause).toBe("§3.1");
  });
});

/* ───────────── Gränsvärden ───────────── */

describe("boundary values", () => {
  function twoHoops(distance: number, classTemplate: CourseLite["classTemplate"], ruleSetId: string) {
    return validateCourse(baseCourse({
      classTemplate,
      ruleSetId,
      obstacles: [
        ob("h1", "hoop", 1, 5, 10),
        ob("h2", "hoop", 2, 5 + distance, 10),
        ob("zone", "handler_zone", undefined, 8, 25),
      ],
    }));
  }

  it("SHoK klass 2: exakt 6,0 m är OK, 5,99 m är fel", () => {
    expect(twoHoops(6.0, "hoopers_3", "hoopers-shs-2022")
      .some((i) => i.code === "hoopers_too_close")).toBe(false);
    expect(twoHoops(5.99, "hoopers_3", "hoopers-shs-2022")
      .some((i) => i.code === "hoopers_too_close")).toBe(true);
  });

  it("FCI H3: exakt 7,0 m är OK, 6,99 m är fel", () => {
    expect(twoHoops(7.0, "hoopers_fci_h3", "hoopers-fci-2026")
      .some((i) => i.code === "hoopers_too_close")).toBe(false);
    expect(twoHoops(6.99, "hoopers_fci_h3", "hoopers-fci-2026")
      .some((i) => i.code === "hoopers_too_close")).toBe(true);
  });

  it("SHoK klass 3: 20 hinder OK (min), 24 OK (max)", () => {
    for (const count of [20, 24]) {
      const issues = validateCourse(baseCourse({
        classTemplate: "hoopers_4",
        ruleSetId: "hoopers-shs-2022",
        obstacles: serpentineHoops(count, 7.1, 1, 1, 5),
      }));
      expect(issues.some((i) => i.code === "too_few_obstacles" || i.code === "too_many_obstacles"))
        .toBe(false);
    }
  });

  it("maxavstånd dirigeringsområde: SHoK startklass 13 m", () => {
    const mk = (h3x: number) => validateCourse(baseCourse({
      classTemplate: "hoopers_1", // startklass: max 13 m från DO
      ruleSetId: "hoopers-shs-2022",
      obstacles: [
        ob("h1", "hoop", 1, 6, 15),
        ob("h2", "hoop", 2, 12, 15),
        ob("h3", "hoop", 3, h3x, 15),
        ob("zone", "handler_zone", undefined, 9, 8),
      ],
    }));
    // Alla hinder inom 13 m från zonen (9,8) → ingen varning.
    expect(mk(9).some((i) => i.code === "handler_zone_max_distance")).toBe(false);
    // Hinder 3 på (23,15): hypot(14,7) ≈ 15,7 m > 13 m → varning.
    const hit = mk(23).find((i) => i.code === "handler_zone_max_distance");
    expect(hit).toBeDefined();
    expect(hit?.obstacleId).toBe("h3");
    expect(hit?.basis).toBe("official_rule");
  });
});

/* ───────────── Samma bana, olika regelverk ───────────── */

describe("samma bana — olika utfall under SHoK vs FCI", () => {
  // 25 hoops i serpentin, 7,1 m följdavstånd (OK för båda: SHoK 6 m, FCI H3 7 m).
  const obstacles = serpentineHoops(25, 7.1, 1, 1, 5);

  it("25 hinder: giltigt i FCI H3 (20–26), för många i SHoK klass 3 (20–24)", () => {
    const fci = validateCourse(baseCourse({
      classTemplate: "hoopers_fci_h3",
      ruleSetId: "hoopers-fci-2026",
      obstacles,
    }));
    const shok = validateCourse(baseCourse({
      classTemplate: "hoopers_4",
      ruleSetId: "hoopers-shs-2022",
      obstacles,
    }));
    expect(fci.some((i) => i.code === "too_many_obstacles")).toBe(false);
    const shokHit = shok.find((i) => i.code === "too_many_obstacles");
    expect(shokHit).toBeDefined();
    expect(shokHit?.basis).toBe("official_rule");
  });

  it("6,5 m följdavstånd: OK i SHoK klass 3 (6–9 m), fel i FCI H3 (7–12 m)", () => {
    const tight = [
      ob("h1", "hoop", 1, 5, 10),
      ob("h2", "hoop", 2, 11.5, 10),
    ];
    const shok = validateCourse(baseCourse({
      classTemplate: "hoopers_4", ruleSetId: "hoopers-shs-2022", obstacles: tight,
    }));
    const fci = validateCourse(baseCourse({
      classTemplate: "hoopers_fci_h3", ruleSetId: "hoopers-fci-2026", obstacles: tight,
    }));
    expect(shok.some((i) => i.code === "hoopers_too_close")).toBe(false);
    expect(fci.some((i) => i.code === "hoopers_too_close")).toBe(true);
  });
});

/* ───────────── Tidsmodeller ───────────── */

describe("tidsberäkning per regelverk", () => {
  const obstacles = [
    ob("h1", "hoop", 1, 5, 10),
    ob("h2", "hoop", 2, 12, 10),
    ob("h3", "hoop", 3, 19, 10),
  ];

  it("FCI: fast maxtid 180 s, ingen beräknad referenstid", () => {
    const times = computeCourseTimes(baseCourse({
      classTemplate: "hoopers_fci_h2",
      ruleSetId: "hoopers-fci-2026",
      obstacles,
    }));
    expect(times.fixedMaxCourseTimeS).toBe(180);
    expect(times.maxTimeS).toBe(180);
    expect(times.refTimeS).toBeNull();
    expect(times.ruleSetId).toBe("hoopers-fci-2026");
    expect(times.isProvisional).toBe(true); // partially_verified
  });

  it("SHoK: maxtid = 2 × referenstid (45/90-modellen)", () => {
    const times = computeCourseTimes(baseCourse({
      classTemplate: "hoopers_1",
      ruleSetId: "hoopers-shs-2022",
      obstacles,
    }));
    expect(times.fixedMaxCourseTimeS).toBeNull();
    expect(times.refTimeS).not.toBeNull();
    expect(times.maxTimeS).toBe(Math.round((times.refTimeS as number) * 2.0));
    expect(times.ruleSetId).toBe("hoopers-shs-2022");
  });

  it("okänt ruleSetId faller tillbaka på sportens default", () => {
    const times = computeCourseTimes(baseCourse({
      classTemplate: "hoopers_1",
      ruleSetId: "finns-inte",
      obstacles,
    }));
    expect(times.ruleSetId).toBe(HOOPERS_SHS_2022.id);
    void HOOPERS_FCI_2026;
  });
});
