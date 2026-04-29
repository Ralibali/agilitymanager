/**
 * Sprint 2 — Realtidsvalidering för Banplaneraren v2.
 * Källor: SAgiK regelverk 2022–2026 + Säkra hinder, SHoK 2022→.
 *
 * Allt här är rena funktioner utan UI-beroenden så de kan testas/återanvändas.
 */
import {
  CLASS_TEMPLATES, SIZE_CLASSES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";

export type IssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: IssueLevel;
  /** Kort kod för programmatisk identifiering. */
  code: string;
  /** Mänskligt meddelande på svenska. */
  message: string;
  /** Ev. obstacle-id som issuet pekar på (för highlight). */
  obstacleId?: string;
}

export interface ObstacleLite {
  id: string;
  type: ObstacleTypeV2;
  x: number; // m
  y: number; // m
  rotation: number;
  number?: number;
  /** Tunnel-böjning 0–90°. 0 = rak. Ignoreras om typen inte är tunnel. */
  curveDeg?: number;
  /** Riktning på böjningen. Default "right". */
  curveSide?: "left" | "right";
  /** Låst hinder kan inte flyttas, roteras eller raderas förrän upplåst. */
  locked?: boolean;
  /** Z-order för render-sortering (default 0). Sorteras stigande. */
  zIndex?: number;
}

export interface CourseLite {
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleLite[];
}

/* ───────────── Banlängd & tider ───────────── */

/** Sorterar numrerade hinder och returnerar deras väg-längd i meter. */
export function computeCourseLength(obstacles: ObstacleLite[]): number {
  const numbered = obstacles
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  let length = 0;
  for (let i = 1; i < numbered.length; i++) {
    const a = numbered[i - 1];
    const b = numbered[i];
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return length;
}

export interface CourseTimes {
  lengthM: number;
  refTimeS: number | null;
  maxTimeS: number | null;
  refSpeedMs: number | null;
  maxTimeFactor: number | null;
}

export function computeCourseTimes(course: CourseLite): CourseTimes {
  const lengthM = computeCourseLength(course.obstacles);
  const tpl = course.classTemplate
    ? CLASS_TEMPLATES.find((t) => t.key === course.classTemplate)
    : null;
  if (!tpl || lengthM <= 0) {
    return {
      lengthM,
      refTimeS: null,
      maxTimeS: null,
      refSpeedMs: tpl?.refSpeedMs ?? null,
      maxTimeFactor: tpl?.maxTimeFactor ?? null,
    };
  }
  const refTimeS = Math.round(lengthM / tpl.refSpeedMs);
  const maxTimeS = Math.round(refTimeS * tpl.maxTimeFactor);
  return { lengthM, refTimeS, maxTimeS, refSpeedMs: tpl.refSpeedMs, maxTimeFactor: tpl.maxTimeFactor };
}

/* ───────────── Validering ───────────── */

const CONTACT_TYPES: ObstacleTypeV2[] = ["aframe", "dogwalk", "seesaw"];

/** Avstånd mellan två hinder i meter (centrum-till-centrum). */
function dist(a: ObstacleLite, b: ObstacleLite) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function validateCourse(course: CourseLite): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tpl = course.classTemplate
    ? CLASS_TEMPLATES.find((t) => t.key === course.classTemplate)
    : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === course.sizeClass);

  // 1) Sport-konsistens
  for (const ob of course.obstacles) {
    const def = getObstacleDefV2(ob.type);
    if (!def) continue;
    if (!def.sport.includes(course.sport)) {
      issues.push({
        level: "error",
        code: "wrong_sport",
        message: `${def.label} hör inte till ${course.sport === "agility" ? "agility" : "hoopers"}`,
        obstacleId: ob.id,
      });
    }
  }

  // 2) Klassmall – tillåtna/förbjudna typer + antal
  if (tpl) {
    for (const ob of course.obstacles) {
      const def = getObstacleDefV2(ob.type);
      if (!def) continue;
      if (tpl.allowedTypes && tpl.allowedTypes.length > 0 && !tpl.allowedTypes.includes(ob.type) && ob.type !== "start" && ob.type !== "finish" && ob.type !== "number") {
        issues.push({
          level: "error",
          code: "type_not_allowed",
          message: `${def.label} är inte tillåten i ${tpl.label}`,
          obstacleId: ob.id,
        });
      }
      if (tpl.forbiddenTypes?.includes(ob.type)) {
        issues.push({
          level: "error",
          code: "type_forbidden",
          message: `${def.label} är förbjuden i ${tpl.label}`,
          obstacleId: ob.id,
        });
      }
    }

    // Antal hinder (exkl. start/finish/number-markörer)
    const competing = course.obstacles.filter((o) => !["start", "finish", "number"].includes(o.type));
    const [min, max] = tpl.obstacleRange;
    if (competing.length < min) {
      issues.push({
        level: "warning",
        code: "too_few_obstacles",
        message: `${tpl.label} kräver minst ${min} hinder (du har ${competing.length})`,
      });
    } else if (competing.length > max) {
      issues.push({
        level: "warning",
        code: "too_many_obstacles",
        message: `${tpl.label} tillåter max ${max} hinder (du har ${competing.length})`,
      });
    }

    // Banstorlek matchar mall?
    if (course.arenaWidthM !== tpl.arenaWidthM || course.arenaHeightM !== tpl.arenaHeightM) {
      issues.push({
        level: "info",
        code: "arena_size_differs",
        message: `Mallens rekommenderade banstorlek är ${tpl.arenaWidthM}×${tpl.arenaHeightM} m`,
      });
    }
  }

  // 3) Start och Mål
  const starts = course.obstacles.filter((o) => o.type === "start");
  const finishes = course.obstacles.filter((o) => o.type === "finish");
  if (course.obstacles.length > 0 && starts.length === 0) {
    issues.push({ level: "warning", code: "missing_start", message: "Banan saknar startlinje" });
  }
  if (course.obstacles.length > 0 && finishes.length === 0) {
    issues.push({ level: "warning", code: "missing_finish", message: "Banan saknar mållinje" });
  }
  if (starts.length > 1) issues.push({ level: "warning", code: "multiple_starts", message: "Flera startlinjer" });
  if (finishes.length > 1) issues.push({ level: "warning", code: "multiple_finishes", message: "Flera mållinjer" });

  // 4) Numrering – ska vara 1..N utan dubletter eller hål för tävlande hinder
  const competing = course.obstacles.filter((o) => !["start", "finish", "number"].includes(o.type));
  const numbers = competing.map((o) => o.number).filter((n): n is number => n != null).sort((a, b) => a - b);
  const seen = new Set<number>();
  for (const n of numbers) {
    if (seen.has(n)) {
      issues.push({ level: "error", code: "duplicate_number", message: `Hindernummer ${n} används flera gånger` });
    }
    seen.add(n);
  }
  if (numbers.length > 0 && numbers.length !== competing.length) {
    issues.push({
      level: "warning",
      code: "unnumbered_obstacles",
      message: `${competing.length - numbers.length} hinder saknar nummer`,
    });
  }
  if (numbers.length > 0) {
    const first = numbers[0];
    const last = numbers[numbers.length - 1];
    if (first !== 1) {
      issues.push({ level: "warning", code: "numbering_not_from_1", message: `Numreringen börjar på ${first}, bör börja på 1` });
    }
    // hål?
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] !== numbers[i - 1] + 1) {
        issues.push({ level: "warning", code: "numbering_gap", message: `Numreringen har lucka mellan ${numbers[i - 1]} och ${numbers[i]}` });
        break;
      }
    }
    if (last > competing.length) {
      issues.push({ level: "info", code: "numbering_gt_count", message: `Högsta nummer (${last}) överstiger antal tävlingshinder (${competing.length})` });
    }
  }

  // 5) Säkerhet — avstånd mellan hinder (SAgiK Säkra hinder)
  if (sizeDef && course.sport === "agility") {
    const minSafe = 4.0; // generell minimumavstånd vid full fart
    const minCombo = sizeDef.comboDistanceM;
    for (let i = 0; i < competing.length; i++) {
      for (let j = i + 1; j < competing.length; j++) {
        const a = competing[i], b = competing[j];
        // bara i nummerföljd
        if (a.number == null || b.number == null) continue;
        if (Math.abs(a.number - b.number) !== 1) continue;
        const d = dist(a, b);
        const aDef = getObstacleDefV2(a.type);
        const bDef = getObstacleDefV2(b.type);
        if (!aDef || !bDef) continue;
        const aIsJumpish = ["jump", "wall", "longjump", "tire", "combo"].includes(a.type);
        const bIsJumpish = ["jump", "wall", "longjump", "tire", "combo"].includes(b.type);
        if (aIsJumpish && bIsJumpish && d < minCombo) {
          issues.push({
            level: "error",
            code: "jump_too_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m < ${minCombo} m (säkerhetsavstånd för ${sizeDef.label})`,
            obstacleId: b.id,
          });
        } else if (d < minSafe && d >= minCombo) {
          issues.push({
            level: "warning",
            code: "obstacles_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m är ovanligt nära`,
            obstacleId: b.id,
          });
        }
      }
    }

    // Kontaktfält direkt efter tunnel — riskvarning enligt Säkra hinder
    for (let i = 1; i < competing.length; i++) {
      const prev = competing[i - 1];
      const cur = competing[i];
      if (prev.number == null || cur.number == null) continue;
      if (cur.number - prev.number !== 1) continue;
      if (prev.type === "tunnel" && CONTACT_TYPES.includes(cur.type)) {
        const d = dist(prev, cur);
        if (d < 5) {
          issues.push({
            level: "warning",
            code: "contact_after_tunnel",
            message: `Kontaktfält direkt efter tunnel (${d.toFixed(1)} m) — risk enligt Säkra hinder`,
            obstacleId: cur.id,
          });
        }
      }
    }
  }

  // 5b) SHoK-specifika regler för hoopers
  if (course.sport === "hoopers") {
    const hasZone = course.obstacles.some((o) => o.type === "handler_zone");
    if (competing.length > 0 && !hasZone) {
      issues.push({
        level: "warning",
        code: "missing_handler_zone",
        message: "Hoopers-bana saknar dirigeringsområde (förarens zon)",
      });
    }

    // Min-avstånd mellan på varandra följande hoopers-hinder (SHoK ≥ 3 m)
    const HOOPERS_MIN_M = 3.0;
    for (let i = 0; i < competing.length; i++) {
      for (let j = i + 1; j < competing.length; j++) {
        const a = competing[i], b = competing[j];
        if (a.number == null || b.number == null) continue;
        if (Math.abs(a.number - b.number) !== 1) continue;
        const d = dist(a, b);
        if (d < HOOPERS_MIN_M) {
          issues.push({
            level: "error",
            code: "hoopers_too_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m < ${HOOPERS_MIN_M} m (SHoK min-avstånd)`,
            obstacleId: b.id,
          });
        }
      }
    }

    // Inga agilityhinder i hoopers
    for (const ob of course.obstacles) {
      if (CONTACT_TYPES.includes(ob.type) || ob.type === "table" || ob.type === "weave_8" || ob.type === "weave_10" || ob.type === "weave_12" || ob.type === "jump" || ob.type === "wall" || ob.type === "longjump" || ob.type === "tire" || ob.type === "combo") {
        const def = getObstacleDefV2(ob.type);
        issues.push({
          level: "error",
          code: "agility_obstacle_in_hoopers",
          message: `${def?.label ?? ob.type} används inte i hoopers`,
          obstacleId: ob.id,
        });
      }
    }

    // Föraren får inte komma för nära hindren från sin zon (SHoK ≥ 3 m till närmsta hinder)
    const zone = course.obstacles.find((o) => o.type === "handler_zone");
    if (zone) {
      for (const ob of competing) {
        const d = dist(zone, ob);
        if (d < 3) {
          issues.push({
            level: "warning",
            code: "handler_too_close",
            message: `Hinder ${ob.number ?? "?"} ligger ${d.toFixed(1)} m från dirigeringsområdet (SHoK ≥ 3 m)`,
            obstacleId: ob.id,
          });
        }
      }
    }
  }

  // 6) Hinder utanför banytan
  for (const ob of course.obstacles) {
    if (ob.x < 0.2 || ob.x > course.arenaWidthM - 0.2 || ob.y < 0.2 || ob.y > course.arenaHeightM - 0.2) {
      issues.push({
        level: "warning",
        code: "obstacle_near_edge",
        message: "Hinder ligger nära/utanför banytan",
        obstacleId: ob.id,
      });
    }
  }

  return issues;
}

export function summarizeIssues(issues: ValidationIssue[]) {
  return {
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
    info: issues.filter((i) => i.level === "info").length,
  };
}
