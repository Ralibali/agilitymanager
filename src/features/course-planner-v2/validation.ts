/**
 * Sprint 2 — Realtidsvalidering för Banplaneraren v2.
 *
 * Prompt-B/K uppdatering: validering använder aktivt RuleSet (regelverk)
 * för säkerhetsvärden och tidsmodell istället för hårdkodade konstanter.
 * När regelverket inte är verifierat ("provisional") används copyn
 * "förhandskontrollens gräns" — vi hävdar inte att kontrollen speglar
 * officiellt regelverk innan värdena är citerade.
 *
 * Allt här är rena funktioner utan UI-beroenden så de kan testas/återanvändas.
 */
import {
  CLASS_TEMPLATES, SIZE_CLASSES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";
import { buildDogPath, type CourseDogPathOverride } from "./dogPath";
import { computeApproachIssues } from "./courseAnalysis";
import {
  getRuleSet,
  getDefaultRuleSetIdForSport,
  type RuleSet,
} from "./rules";
import { rotatedAabb, edgesOutsideArena, aabbsOverlap, type AABB } from "./geometry";

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
  /** Editbar override för hundens väg (Prompt B). */
  dogPath?: CourseDogPathOverride;
  /**
   * Id på versionerat regelverk. Om det inte anges eller är okänt används
   * default för banans sport (`getDefaultRuleSetIdForSport`).
   */
  ruleSetId?: string;
}

/* ───────────── Hjälpfunktioner ───────────── */

function resolveRuleSet(course: CourseLite): RuleSet {
  const id = course.ruleSetId ?? getDefaultRuleSetIdForSport(course.sport);
  const rs = getRuleSet(id) ?? getRuleSet(getDefaultRuleSetIdForSport(course.sport));
  if (!rs) {
    // Ska inte kunna hända — vi har alltid default. Kastar hellre än att
    // hitta på siffror.
    throw new Error(`Inget RuleSet hittades för sport ${course.sport}`);
  }
  return rs;
}

/**
 * Rätt bounding-box i meter för ett hinder — tar hinderdefinitionens
 * `widthM`/`depthM` från config och roterar enligt hinderets rotation.
 * Om hindret inte har en def (t.ex. `number`-markör) faller vi tillbaka
 * på en liten default så vi inte kraschar validation.
 */
function obstacleAabb(ob: ObstacleLite) {
  const def = getObstacleDefV2(ob.type);
  const w = def?.sizeM.w ?? 0.4;
  const d = def?.sizeM.d ?? 0.4;
  return rotatedAabb({ x: ob.x, y: ob.y }, w, d, ob.rotation);
}

/* ───────────── Banlängd & tider ───────────── */

/**
 * Klassisk banlängd: rak linje mellan numrerade hindrens mittpunkter.
 * Behålls för bakåtkompatibilitet och som teknisk uppgift bredvid
 * hundens väg (`computeCourseLengthAlongPath`).
 */
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

/**
 * Banlängd längs hundens förväntade väg (Catmull-Rom + obstacle-interna
 * längder — tunnelbåge, slalom, kontaktfält). Detta är den siffra som
 * stämmer med hur domare och banbyggare faktiskt mäter banor.
 */
export function computeCourseLengthAlongPath(
  obstacles: ObstacleLite[],
  override?: CourseDogPathOverride,
): number {
  return buildDogPath(obstacles, override).total;
}

export interface CourseTimes {
  /** Klassisk center-till-center-längd (m). */
  lengthM: number;
  /** Längd längs hundens väg (m). Används för ref-/maxtid. */
  lengthAlongPathM: number;
  refTimeS: number | null;
  maxTimeS: number | null;
  refSpeedMsByClass: number | null;
  maxTimeFactor: number | null;
  /**
   * True om regelverket bakom siffrorna inte är verifierat mot officiellt
   * dokument. UI:t ska då kalla värdet "beräknad tid", inte officiell referenstid.
   */
  isProvisional: boolean;
  /** Regelverkets id, exponeras så UI kan visa källa. */
  ruleSetId: string;
  /** Regelverkets verifieringsstatus. */
  ruleSetStatus: RuleSet["verificationStatus"];
  /** @deprecated Behålls för bakåtkompatibilitet; alias för refSpeedMsByClass. */
  refSpeedMs: number | null;
}

export function computeCourseTimes(course: CourseLite): CourseTimes {
  const lengthM = computeCourseLength(course.obstacles);
  const lengthAlongPathM = computeCourseLengthAlongPath(course.obstacles, course.dogPath);
  const rs = resolveRuleSet(course);
  const isProvisional = rs.verificationStatus !== "verified";

  const classKey = course.classTemplate;
  const refSpeed = classKey
    ? (rs.timeRules.refSpeedMsByClass[classKey] ??
        CLASS_TEMPLATES.find((t) => t.key === classKey)?.refSpeedMs ??
        null)
    : null;
  const maxFactor = classKey
    ? (rs.timeRules.maxTimeFactorByClass[classKey] ??
        CLASS_TEMPLATES.find((t) => t.key === classKey)?.maxTimeFactor ??
        null)
    : null;

  const base = {
    lengthM,
    lengthAlongPathM,
    refSpeedMsByClass: refSpeed,
    maxTimeFactor: maxFactor,
    refSpeedMs: refSpeed,
    isProvisional,
    ruleSetId: rs.id,
    ruleSetStatus: rs.verificationStatus,
  };

  if (!refSpeed || !maxFactor || lengthAlongPathM <= 0) {
    return { ...base, refTimeS: null, maxTimeS: null };
  }
  const refTimeS = Math.round(lengthAlongPathM / refSpeed);
  const maxTimeS = Math.round(refTimeS * maxFactor);
  return { ...base, refTimeS, maxTimeS };
}

/* ───────────── Validering ───────────── */

const CONTACT_TYPES: ObstacleTypeV2[] = ["aframe", "dogwalk", "seesaw"];
const NON_COMPETING: ObstacleTypeV2[] = ["start", "finish", "number"];
/**
 * Typer som inte räknas som fysiska hinder vid överlappnings-check.
 * Utöver start/mål/number är även `handler_zone` en yta/markör, inte
 * ett hinder — den får ligga över hinder utan att vi flaggar.
 */
const NON_PHYSICAL_FOR_OVERLAP: ObstacleTypeV2[] = ["start", "finish", "number", "handler_zone"];

/**
 * Typer med stor dekorativ/zonliknande fotavtryck där en AABB-överlappning
 * lätt blir falskpositiv. Sådana par nedgraderas till varning.
 */
const ZONE_LIKE_TYPES: ObstacleTypeV2[] = ["table"];

/** Avstånd mellan två hinder i meter (centrum-till-centrum). */
function dist(a: ObstacleLite, b: ObstacleLite) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface ObstacleOverlap {
  a: ObstacleLite;
  b: ObstacleLite;
  aabbA: AABB;
  aabbB: AABB;
  /** True om båda är fysiska fasta hinder och båda AABB:erna är axelinriktade
   *  (dvs. rotationsfria) — då är AABB-överlapp inte en grov falskpositiv. */
  strict: boolean;
}

/** Finns det överlappande AABB-yta mellan a och b (med liten tolerans)? */
function aabbsOverlapTolerant(a: AABB, b: AABB, tolM: number): boolean {
  return !(
    a.maxX < b.minX + tolM ||
    b.maxX < a.minX + tolM ||
    a.maxY < b.minY + tolM ||
    b.maxY < a.minY + tolM
  );
}

/**
 * Rena helper: hitta alla unika hinderpar vars roterade AABB:er överlappar.
 * Exkluderar start/finish/number/handler_zone. Testbar utan RuleSet.
 */
export function findObstacleOverlaps(
  obstacles: ObstacleLite[],
  tolM = 0.02,
): ObstacleOverlap[] {
  const competing = obstacles.filter((o) => !NON_PHYSICAL_FOR_OVERLAP.includes(o.type));
  const aabbs = competing.map((o) => ({ o, box: obstacleAabb(o), rotated: (o.rotation % 180) !== 0 }));
  const out: ObstacleOverlap[] = [];
  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      const a = aabbs[i];
      const b = aabbs[j];
      if (!aabbsOverlapTolerant(a.box, b.box, tolM)) continue;
      const strict = !a.rotated && !b.rotated;
      out.push({ a: a.o, b: b.o, aabbA: a.box, aabbB: b.box, strict });
    }
  }
  return out;
}

/**
 * Källfras för meddelanden. Verifierade regelverk får hänvisa till
 * utgivaren; provisional/partially får INTE göra det — då säger vi
 * "förhandskontrollens gräns" så användaren vet att siffran inte är citerad.
 */
function safetyMessagePrefix(rs: RuleSet): string {
  if (rs.verificationStatus === "verified") return `enligt ${rs.authority}`;
  return "förhandskontrollens gräns";
}

export function validateCourse(course: CourseLite): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rs = resolveRuleSet(course);
  const tpl = course.classTemplate
    ? CLASS_TEMPLATES.find((t) => t.key === course.classTemplate)
    : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === course.sizeClass);

  const safety = rs.safetyRules;
  const prefix = safetyMessagePrefix(rs);

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
      if (
        tpl.allowedTypes && tpl.allowedTypes.length > 0 &&
        !tpl.allowedTypes.includes(ob.type) &&
        !NON_COMPETING.includes(ob.type)
      ) {
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
    const competingCount = course.obstacles.filter((o) => !NON_COMPETING.includes(o.type));
    const [min, max] = tpl.obstacleRange;
    if (competingCount.length < min) {
      issues.push({
        level: "warning",
        code: "too_few_obstacles",
        message: `${tpl.label} kräver minst ${min} hinder (du har ${competingCount.length})`,
      });
    } else if (competingCount.length > max) {
      issues.push({
        level: "warning",
        code: "too_many_obstacles",
        message: `${tpl.label} tillåter max ${max} hinder (du har ${competingCount.length})`,
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
  const competing = course.obstacles.filter((o) => !NON_COMPETING.includes(o.type));
  // Sortera efter number så att alla nummer-baserade jämförelser görs i rätt ordning,
  // oberoende av array-ordningen. Onumrerade läggs sist och exkluderas ur pair-loops.
  const competingByNumber = [...competing].sort((a, b) => {
    const an = a.number ?? Number.POSITIVE_INFINITY;
    const bn = b.number ?? Number.POSITIVE_INFINITY;
    return an - bn;
  });
  const numberedByNumber = competingByNumber.filter((o) => o.number != null);

  const numbers = numberedByNumber.map((o) => o.number as number);
  const seenNumbers = new Map<number, ObstacleLite[]>();
  for (const o of numberedByNumber) {
    const list = seenNumbers.get(o.number as number) ?? [];
    list.push(o);
    seenNumbers.set(o.number as number, list);
  }
  for (const [n, list] of seenNumbers) {
    if (list.length > 1) {
      for (const o of list) {
        issues.push({
          level: "error",
          code: "duplicate_number",
          message: `Hindernummer ${n} används flera gånger`,
          obstacleId: o.id,
        });
      }
    }
  }
  if (numbers.length > 0 && numbers.length !== competing.length) {
    // markera de faktiskt onumrerade
    for (const o of competing) {
      if (o.number == null) {
        issues.push({
          level: "warning",
          code: "unnumbered_obstacle",
          message: `Hinder saknar nummer`,
          obstacleId: o.id,
        });
      }
    }
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
        issues.push({
          level: "warning",
          code: "numbering_gap",
          message: `Numreringen har lucka mellan ${numbers[i - 1]} och ${numbers[i]}`,
          obstacleId: numberedByNumber[i].id,
        });
        break;
      }
    }
    if (last > competing.length) {
      issues.push({ level: "info", code: "numbering_gt_count", message: `Högsta nummer (${last}) överstiger antal tävlingshinder (${competing.length})` });
    }
  }

  // 5) Säkerhet — avstånd mellan hinder (agility)
  if (sizeDef && course.sport === "agility") {
    const minSafe = safety.minSafeM;
    const minCombo = safety.minComboMBySize[course.sizeClass] ?? sizeDef.comboDistanceM;

    // Följdpar bedöms i NUMMERORDNING — inte array-ordning. Vi jämför både
    // (n, n+1)-par (adjacent numbers) och alla numrerade hinderpar för
    // säkerhet, exakt som förr, men på en sorterad lista.
    for (let i = 0; i < numberedByNumber.length; i++) {
      for (let j = i + 1; j < numberedByNumber.length; j++) {
        const a = numberedByNumber[i];
        const b = numberedByNumber[j];
        // Följd = |n - n±1| = 1
        if ((b.number as number) - (a.number as number) !== 1) continue;
        const d = dist(a, b);
        const aDef = getObstacleDefV2(a.type);
        const bDef = getObstacleDefV2(b.type);
        if (!aDef || !bDef) continue;
        const jumpish = ["jump", "wall", "longjump", "tire", "combo"];
        const aIsJumpish = jumpish.includes(a.type);
        const bIsJumpish = jumpish.includes(b.type);
        const tooCloseForJumps = aIsJumpish && bIsJumpish && d < minCombo;
        if (tooCloseForJumps) {
          issues.push({
            level: "error",
            code: "jump_too_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m < ${minCombo} m (${prefix} för ${sizeDef.label})`,
            obstacleId: b.id,
          });
        } else if (d < minCombo) {
          issues.push({
            level: "warning",
            code: "obstacles_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m är mycket nära (under ${minCombo} m)`,
            obstacleId: b.id,
          });
        } else if (d < minSafe) {
          issues.push({
            level: "warning",
            code: "obstacles_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m är ovanligt nära`,
            obstacleId: b.id,
          });
        }
      }
    }

    // Kontaktfält direkt efter tunnel — riskvarning (nummerordning)
    for (let i = 1; i < numberedByNumber.length; i++) {
      const prev = numberedByNumber[i - 1];
      const cur = numberedByNumber[i];
      if ((cur.number as number) - (prev.number as number) !== 1) continue;
      if (prev.type === "tunnel" && CONTACT_TYPES.includes(cur.type)) {
        const d = dist(prev, cur);
        if (d < safety.contactAfterTunnelMinM) {
          issues.push({
            level: "warning",
            code: "contact_after_tunnel",
            message: `Kontaktfält direkt efter tunnel (${d.toFixed(1)} m < ${safety.contactAfterTunnelMinM} m, ${prefix})`,
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

    const hoopersMin = safety.hoopersMinM ?? 3.0;
    for (let i = 0; i < numberedByNumber.length; i++) {
      for (let j = i + 1; j < numberedByNumber.length; j++) {
        const a = numberedByNumber[i];
        const b = numberedByNumber[j];
        if ((b.number as number) - (a.number as number) !== 1) continue;
        const d = dist(a, b);
        if (d < hoopersMin) {
          issues.push({
            level: "error",
            code: "hoopers_too_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m < ${hoopersMin} m (${prefix})`,
            obstacleId: b.id,
          });
        }
      }
    }

    // Inga agilityhinder i hoopers
    const forbiddenInHoopers = new Set<ObstacleTypeV2>([
      ...CONTACT_TYPES,
      "table",
      "weave_8",
      "weave_10",
      "weave_12",
      "jump",
      "wall",
      "longjump",
      "tire",
      "combo",
    ]);
    for (const ob of course.obstacles) {
      if (forbiddenInHoopers.has(ob.type)) {
        const def = getObstacleDefV2(ob.type);
        issues.push({
          level: "error",
          code: "agility_obstacle_in_hoopers",
          message: `${def?.label ?? ob.type} används inte i hoopers`,
          obstacleId: ob.id,
        });
      }
    }

    // Förarzonen — min-avstånd till hindren
    const zone = course.obstacles.find((o) => o.type === "handler_zone");
    const zoneMin = safety.hoopersHandlerZoneMinM ?? 3.0;
    if (zone) {
      for (const ob of competing) {
        const d = dist(zone, ob);
        if (d < zoneMin) {
          issues.push({
            level: "warning",
            code: "handler_too_close",
            message: `Hinder ${ob.number ?? "?"} ligger ${d.toFixed(1)} m från dirigeringsområdet (${prefix} ≥ ${zoneMin} m)`,
            obstacleId: ob.id,
          });
        }
      }
    }
  }

  // 6) Hinder utanför banytan — roterad bounding box, säger vilken kant
  for (const ob of course.obstacles) {
    // Start/mål/number-markörer räknas inte som tävlingshinder — hoppa deras edge-check
    // för att inte skapa falska varningar när användaren medvetet lägger startlinjen
    // mot arenans kant.
    if (NON_COMPETING.includes(ob.type)) continue;
    const aabb = obstacleAabb(ob);
    const edges = edgesOutsideArena(aabb, course.arenaWidthM, course.arenaHeightM, 0);
    if (edges.length > 0) {
      const worst = edges.reduce((a, b) => (a.overshootM > b.overshootM ? a : b));
      issues.push({
        level: "warning",
        code: "obstacle_outside_arena",
        message: `Hinder ${ob.number ?? ""} sticker ut ${worst.overshootM.toFixed(2)} m över ${worst.edge}kanten`,
        obstacleId: ob.id,
      });
    }
  }

  // 7) Ansatsvinkel-validering (Prompt C) — bygger på hundens väg
  if (course.sport === "agility") {
    issues.push(...computeApproachIssues(course.obstacles, course.dogPath));
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
