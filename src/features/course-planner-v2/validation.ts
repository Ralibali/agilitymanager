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
  isRuleFieldVerified,
  type RuleSet,
} from "./rules";
import { rotatedAabb, edgesOutsideArena, aabbsOverlap, type AABB } from "./geometry";

export type IssueLevel = "error" | "warning" | "info";

/**
 * Vad ett valideringsissue vilar på — håll isär dessa i UI-copy:
 *  - "official_rule": direkt citerad regel i ett verifierat fält i aktivt
 *    RuleSet. Bär alltid ruleClause + sourceUrl.
 *  - "safety_heuristic": AgilityManagers konservativa säkerhetskontroll
 *    (t.ex. överlapp, ansatsvinkel) eller ett ännu overifierat regelvärde.
 *    Får ALDRIG marknadsföras som officiell regel.
 *  - "coaching_analysis": produkt-/coachlager (flöde, svårighet, hotspots).
 *    Ren planeringsanalys — inte regler och inte säkerhetslarm.
 */
export type IssueBasis = "official_rule" | "safety_heuristic" | "coaching_analysis";

export interface ValidationIssue {
  level: IssueLevel;
  /** Kort kod för programmatisk identifiering. */
  code: string;
  /** Mänskligt meddelande på svenska. */
  message: string;
  /** Ev. obstacle-id som issuet pekar på (för highlight). */
  obstacleId?: string;
  /** Kategori: officiell regel / säkerhetsheuristik / coachinganalys. */
  basis?: IssueBasis;
  /** RuleSet-id som kontrollen gjordes mot. */
  ruleSetId?: string;
  /** Paragraf/avsnitt i källdokumentet, t.ex. "SHoK §2.3" eller "FCI §3.1". */
  ruleClause?: string;
  /** Direktlänk till källdokumentet som regeln är citerad ur. */
  sourceUrl?: string;
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
   * Fast maxtid (s) när regelverket anger det istället för en faktor
   * (FCI Hoopers: 180 s, ingen referenstid). Null annars.
   */
  fixedMaxCourseTimeS: number | null;
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
  const fixedMax = rs.timeRules.fixedMaxCourseTimeS ?? null;

  const base = {
    lengthM,
    lengthAlongPathM,
    refSpeedMsByClass: refSpeed,
    maxTimeFactor: maxFactor,
    fixedMaxCourseTimeS: fixedMax,
    refSpeedMs: refSpeed,
    isProvisional,
    ruleSetId: rs.id,
    ruleSetStatus: rs.verificationStatus,
  };

  // Fast maxtid (t.ex. FCI Hoopers 180 s) behöver varken banlängd eller
  // referenshastighet. FCI har ingen referenstid — refTimeS blir null.
  if (fixedMax != null) {
    const refTimeS =
      refSpeed && lengthAlongPathM > 0 ? Math.round(lengthAlongPathM / refSpeed) : null;
    return { ...base, refTimeS, maxTimeS: fixedMax };
  }

  if (!refSpeed || !maxFactor || lengthAlongPathM <= 0) {
    return { ...base, refTimeS: null, maxTimeS: null };
  }
  const refTimeS = Math.round(lengthAlongPathM / refSpeed);
  const maxTimeS = Math.round(refTimeS * maxFactor);
  return { ...base, refTimeS, maxTimeS };
}

/* ───────────── Validering ───────────── */

const CONTACT_TYPES: ObstacleTypeV2[] = ["aframe", "dogwalk", "seesaw"];
/**
 * Typer som INTE räknas som tävlingshinder. Exkluderas från klassmallens
 * hinderantal, numrering, följdpar-säkerhet, edge-check och overlap-check.
 * `handler_zone` (hoopers dirigeringsområde) är en markerad yta för föraren,
 * inte ett fysiskt hinder, och behandlas därför som start/mål/number.
 */
const NON_COMPETING: ObstacleTypeV2[] = ["start", "finish", "number", "handler_zone"];
/**
 * Alias behållet för läsbarhet vid overlap-loopen. Samma lista som
 * `NON_COMPETING` — dessa typer är inte fysiska hinder.
 */
const NON_PHYSICAL_FOR_OVERLAP: ObstacleTypeV2[] = NON_COMPETING;

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

/**
 * Finns det överlappande AABB-yta mellan a och b?
 *
 * Steg 1: snabb bascheck via delad `aabbsOverlap` — om AABB:erna inte ens
 * möts finns ingen gemensam yta.
 * Steg 2: kräv att överlappet är tjockare än `tolM` på båda axlarna så att
 * hinder som bara nuddar (0 mm kant) eller ligger några cm ifrån varandra
 * inte flaggas. Vi kräver alltså verklig överlappningsyta, inte kontakt.
 */
function aabbsOverlapTolerant(a: AABB, b: AABB, tolM: number): boolean {
  if (!aabbsOverlap(a, b)) return false;
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
 * Källhänvisning för ett regelbaserat meddelande. Fältnivå-gating: endast
 * fält som ligger i regelverkets `verifiedFields` får officiell etikett
 * ("enligt <organisation> <paragraf>") — overifierade värden presenteras
 * som "förhandskontrollens gräns" även om regelverket är delverifierat.
 */
interface RuleRef {
  basis: IssueBasis;
  prefix: string;
  ruleClause?: string;
  sourceUrl?: string;
}

function ruleRef(rs: RuleSet, fieldPath: string, clause?: string): RuleRef {
  if (isRuleFieldVerified(rs, fieldPath)) {
    return {
      basis: "official_rule",
      prefix: `enligt ${rs.organization ?? rs.authority}${clause ? ` ${clause}` : ""}`,
      ruleClause: clause,
      sourceUrl: rs.sourceDocuments[0]?.url,
    };
  }
  return {
    basis: "safety_heuristic",
    prefix: "förhandskontrollens gräns",
    ruleClause: clause,
  };
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
  // Klassmallen slås upp i det aktiva RuleSet:et först (t.ex. FCI:s H1–H3
  // finns bara där), med fallback till globala CLASS_TEMPLATES för gamla
  // banor som saknar ruleSetId.
  const tpl = course.classTemplate
    ? (rs.classTemplates.find((t) => t.key === course.classTemplate) ??
        CLASS_TEMPLATES.find((t) => t.key === course.classTemplate) ??
        null)
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
    const countRef = ruleRef(rs, "classTemplates.obstacleRange");
    const competingCount = course.obstacles.filter((o) => !NON_COMPETING.includes(o.type));
    const [min, max] = tpl.obstacleRange;
    if (competingCount.length < min) {
      issues.push({
        level: "warning",
        code: "too_few_obstacles",
        message: `${tpl.label} kräver minst ${min} hinder (du har ${competingCount.length})`,
        basis: countRef.basis,
        ruleClause: countRef.ruleClause,
        sourceUrl: countRef.sourceUrl,
      });
    } else if (competingCount.length > max) {
      issues.push({
        level: "warning",
        code: "too_many_obstacles",
        message: `${tpl.label} tillåter max ${max} hinder (du har ${competingCount.length})`,
        basis: countRef.basis,
        ruleClause: countRef.ruleClause,
        sourceUrl: countRef.sourceUrl,
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
    const comboRef = ruleRef(rs, "safetyRules.minComboMBySize", "§3.1");
    const safeRef = ruleRef(rs, "safetyRules.minSafeM", "§3.1");

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
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m < ${minCombo} m (${comboRef.prefix} för ${sizeDef.label})`,
            obstacleId: b.id,
            basis: comboRef.basis,
            ruleClause: comboRef.ruleClause,
            sourceUrl: comboRef.sourceUrl,
          });
        } else if (d < minCombo) {
          issues.push({
            level: "warning",
            code: "obstacles_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m är mycket nära (under ${minCombo} m)`,
            obstacleId: b.id,
            basis: comboRef.basis,
            ruleClause: comboRef.ruleClause,
            sourceUrl: comboRef.sourceUrl,
          });
        } else if (d < minSafe) {
          issues.push({
            level: "warning",
            code: "obstacles_close",
            message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m är ovanligt nära`,
            obstacleId: b.id,
            basis: safeRef.basis,
            ruleClause: safeRef.ruleClause,
            sourceUrl: safeRef.sourceUrl,
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
          const contactRef = ruleRef(rs, "safetyRules.contactAfterTunnelMinM");
          issues.push({
            level: "warning",
            code: "contact_after_tunnel",
            message: `Kontaktfält direkt efter tunnel (${d.toFixed(1)} m < ${safety.contactAfterTunnelMinM} m, ${contactRef.prefix})`,
            obstacleId: cur.id,
            basis: contactRef.basis,
            ruleClause: contactRef.ruleClause,
            sourceUrl: contactRef.sourceUrl,
          });
        }
      }
    }
  }

  // 5b) Hoopers-specifika regler — styrs av aktivt RuleSet (SHoK eller FCI).
  if (course.sport === "hoopers") {
    const hasZone = course.obstacles.some((o) => o.type === "handler_zone");
    if (competing.length > 0 && !hasZone) {
      issues.push({
        level: "warning",
        code: "missing_handler_zone",
        message: "Hoopers-bana saknar dirigeringsområde (förarens zon)",
        basis: "safety_heuristic",
      });
    }

    // Min-avstånd mellan PÅ VARANDRA FÖLJANDE hinder, per klass.
    // SHoK §2.3 mäter "hundens tänkta väg", FCI §3.1 center-till-center;
    // planeraren approximerar alltid med centrumavstånd, vilket kan
    // underskatta SHoK-måttet något vid svängda linjer.
    const consecutiveRef = ruleRef(rs, "safetyRules.hoopersConsecutiveMinMByClass", rs.organization === "FCI" ? "§3.1" : "§2.3");
    const consecutiveMin = course.classTemplate
      ? safety.hoopersConsecutiveMinMByClass?.[course.classTemplate]
      : undefined;
    if (typeof consecutiveMin === "number") {
      for (let i = 0; i < numberedByNumber.length; i++) {
        for (let j = i + 1; j < numberedByNumber.length; j++) {
          const a = numberedByNumber[i];
          const b = numberedByNumber[j];
          if ((b.number as number) - (a.number as number) !== 1) continue;
          const d = dist(a, b);
          if (d < consecutiveMin) {
            issues.push({
              level: "error",
              code: "hoopers_too_close",
              message: `Hinder ${a.number}→${b.number}: ${d.toFixed(1)} m < ${consecutiveMin} m (${consecutiveRef.prefix})`,
              obstacleId: b.id,
              basis: consecutiveRef.basis,
              ruleClause: consecutiveRef.ruleClause,
              sourceUrl: consecutiveRef.sourceUrl,
            });
          }
        }
      }
    } else if (typeof safety.hoopersMinM === "number") {
      // Bakåtkompatibel fallback: regelverk utan klassuppdelade gränser
      // använder det generella hoopers-minvärdet för följdpar.
      const hoopersMin = safety.hoopersMinM;
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
              basis: "safety_heuristic",
            });
          }
        }
      }
    } else {
      issues.push({
        level: "info",
        code: "hoopers_min_distance_unverified",
        message: "Förhandskontrollen saknar ett verifierat gränsvärde för min-avstånd mellan hoopershinder. Kontrollera aktuellt regelverk.",
        basis: "safety_heuristic",
      });
    }

    // Min-avstånd mellan hinder som INTE följer på varandra i nummerföljden
    // (SHoK §4.4: 2,5 m från tänkta vägen; FCI §3.1: 2 m mellan hinder).
    if (typeof safety.hoopersMinM === "number" &&
        typeof consecutiveMin === "number") {
      const offSeqRef = ruleRef(rs, "safetyRules.hoopersMinM", rs.organization === "FCI" ? "§3.1" : "§4.4");
      const offSeqMin = safety.hoopersMinM;
      for (let i = 0; i < numberedByNumber.length; i++) {
        for (let j = i + 2; j < numberedByNumber.length; j++) {
          const a = numberedByNumber[i];
          const b = numberedByNumber[j];
          const d = dist(a, b);
          if (d < offSeqMin) {
            issues.push({
              level: "warning",
              code: "hoopers_off_sequence_too_close",
              message: `Hinder ${a.number} och ${b.number} (ej i följd) ligger bara ${d.toFixed(1)} m isär (${offSeqRef.prefix} ≥ ${offSeqMin} m)`,
              obstacleId: b.id,
              basis: offSeqRef.basis,
              ruleClause: offSeqRef.ruleClause,
              sourceUrl: offSeqRef.sourceUrl,
            });
          }
        }
      }
    }

    // Banan ska börja och sluta med en hoop (SHoK §4.4, FCI §3.1).
    if (safety.hoopersStartEndHoopRequired && numberedByNumber.length >= 2) {
      const hoopRef = ruleRef(rs, "safetyRules.hoopersStartEndHoopRequired", rs.organization === "FCI" ? "§3.1" : "§4.4");
      const first = numberedByNumber[0];
      const last = numberedByNumber[numberedByNumber.length - 1];
      if (first.type !== "hoop") {
        issues.push({
          level: "error",
          code: "hoopers_start_not_hoop",
          message: `Banan ska börja med en hoop — hinder ${first.number} är ${getObstacleDefV2(first.type)?.label ?? first.type} (${hoopRef.prefix})`,
          obstacleId: first.id,
          basis: hoopRef.basis,
          ruleClause: hoopRef.ruleClause,
          sourceUrl: hoopRef.sourceUrl,
        });
      }
      if (last.type !== "hoop") {
        issues.push({
          level: "error",
          code: "hoopers_finish_not_hoop",
          message: `Banan ska sluta med en hoop — hinder ${last.number} är ${getObstacleDefV2(last.type)?.label ?? last.type} (${hoopRef.prefix})`,
          obstacleId: last.id,
          basis: hoopRef.basis,
          ruleClause: hoopRef.ruleClause,
          sourceUrl: hoopRef.sourceUrl,
        });
      }
    }

    // Minsta andel hoops (FCI §3.1: minst 50 % av hindren).
    if (typeof safety.hoopersMinHoopShare === "number" && competing.length > 0) {
      const shareRef = ruleRef(rs, "safetyRules.hoopersMinHoopShare", "§3.1");
      const hoops = competing.filter((o) => o.type === "hoop").length;
      const share = hoops / competing.length;
      if (share < safety.hoopersMinHoopShare) {
        issues.push({
          level: "error",
          code: "hoopers_hoop_share",
          message: `Bara ${hoops} av ${competing.length} hinder är hoops — minst ${Math.round(safety.hoopersMinHoopShare * 100)} % krävs (${shareRef.prefix})`,
          basis: shareRef.basis,
          ruleClause: shareRef.ruleClause,
          sourceUrl: shareRef.sourceUrl,
        });
      }
    }

    // Minimi krav på banyta (FCI §3.1: 800 m², kortsida ≥ 20 m; undantag kan
    // godkännas av domaren → warning).
    if (typeof safety.arenaMinAreaM2 === "number" || typeof safety.arenaMinShortSideM === "number") {
      const arenaRef = ruleRef(rs, "safetyRules.arenaMinAreaM2", "§3.1");
      const area = course.arenaWidthM * course.arenaHeightM;
      const shortSide = Math.min(course.arenaWidthM, course.arenaHeightM);
      if (typeof safety.arenaMinAreaM2 === "number" && area < safety.arenaMinAreaM2) {
        issues.push({
          level: "warning",
          code: "hoopers_arena_below_min",
          message: `Banytan ${course.arenaWidthM}×${course.arenaHeightM} m (${area} m²) är under minimikravet ${safety.arenaMinAreaM2} m² (${arenaRef.prefix}; undantag kan godkännas av domaren)`,
          basis: arenaRef.basis,
          ruleClause: arenaRef.ruleClause,
          sourceUrl: arenaRef.sourceUrl,
        });
      }
      if (typeof safety.arenaMinShortSideM === "number" && shortSide < safety.arenaMinShortSideM) {
        issues.push({
          level: "warning",
          code: "hoopers_arena_short_side_below_min",
          message: `Banans kortsida ${shortSide} m är under minimikravet ${safety.arenaMinShortSideM} m (${arenaRef.prefix}; undantag kan godkännas av domaren)`,
          basis: arenaRef.basis,
          ruleClause: arenaRef.ruleClause,
          sourceUrl: arenaRef.sourceUrl,
        });
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

    // Förarzonen — max-avstånd till mest avlägsna hinder per klass
    // (SHoK §2.3: 13/15/20/25 m; FCI §3.1: 15/20/30 m Large). Planeraren
    // mäter centrum-till-centrum; regelverken mäter till hindrets kant —
    // därför warning, inte error.
    const zone = course.obstacles.find((o) => o.type === "handler_zone");
    const maxZoneDistance = course.classTemplate
      ? safety.hoopersMaxDistanceFromHandlerZoneMByClass?.[course.classTemplate]
      : undefined;
    if (zone && typeof maxZoneDistance === "number") {
      const maxRef = ruleRef(rs, "safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass", rs.organization === "FCI" ? "§3.1" : "§2.3");
      for (const ob of competing) {
        const d = dist(zone, ob);
        if (d > maxZoneDistance) {
          issues.push({
            level: "warning",
            code: "handler_zone_max_distance",
            message: `Hinder ${ob.number ?? "?"} ligger ${d.toFixed(1)} m från dirigeringsområdet (${maxRef.prefix} max ${maxZoneDistance} m)`,
            obstacleId: ob.id,
            basis: maxRef.basis,
            ruleClause: maxRef.ruleClause,
            sourceUrl: maxRef.sourceUrl,
          });
        }
      }
    }

    // Förarzonen — min-avstånd till hindren (endast om regelverket anger det)
    if (zone) {
      if (typeof safety.hoopersHandlerZoneMinM === "number") {
        const zoneMin = safety.hoopersHandlerZoneMinM;
        const minRef = ruleRef(rs, "safetyRules.hoopersHandlerZoneMinM");
        for (const ob of competing) {
          const d = dist(zone, ob);
          if (d < zoneMin) {
            issues.push({
              level: "warning",
              code: "handler_too_close",
              message: `Hinder ${ob.number ?? "?"} ligger ${d.toFixed(1)} m från dirigeringsområdet (${minRef.prefix} ≥ ${zoneMin} m)`,
              obstacleId: ob.id,
              basis: minRef.basis,
              ruleClause: minRef.ruleClause,
              sourceUrl: minRef.sourceUrl,
            });
          }
        }
      } else {
        issues.push({
          level: "info",
          code: "handler_zone_min_distance_unverified",
          message: "Förhandskontrollen saknar ett verifierat gränsvärde för min-avstånd mellan dirigeringsområdet och hinder. Kontrollera aktuellt regelverk.",
          basis: "safety_heuristic",
        });
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
        basis: "safety_heuristic",
      });
    }
  }

  // 6b) Överlappande hinder — verklig geometrisk kollisionscheck.
  // AABB efter rotation är en grov approximation; långsmala roterade hinder
  // kan ge falskpositiver. Vi använder därför försiktig copy vid rotation.
  {
    const overlaps = findObstacleOverlaps(course.obstacles);
    const emittedPairs = new Set<string>();
    for (const ov of overlaps) {
      const key = [ov.a.id, ov.b.id].sort().join("|");
      if (emittedPairs.has(key)) continue;
      emittedPairs.add(key);
      const zoneLike = ZONE_LIKE_TYPES.includes(ov.a.type) || ZONE_LIKE_TYPES.includes(ov.b.type);
      const level: IssueLevel = ov.strict && !zoneLike ? "error" : "warning";
      const aDef = getObstacleDefV2(ov.a.type);
      const bDef = getObstacleDefV2(ov.b.type);
      const aName = ov.a.number != null ? `#${ov.a.number}` : (aDef?.label ?? ov.a.type);
      const bName = ov.b.number != null ? `#${ov.b.number}` : (bDef?.label ?? ov.b.type);
      const message = level === "error"
        ? `Hindren ${aName} och ${bName} ligger ovanpå varandra`
        : `Hindren ${aName} och ${bName} ser ut att överlappa – kontrollera placeringen`;
      issues.push({ level, code: "obstacle_overlap", message, obstacleId: ov.a.id, basis: "safety_heuristic" });
      issues.push({ level, code: "obstacle_overlap", message, obstacleId: ov.b.id, basis: "safety_heuristic" });
    }
  }



  // 7) Ansatsvinkel-validering (Prompt C) — bygger på hundens väg
  if (course.sport === "agility") {
    issues.push(...computeApproachIssues(course.obstacles, course.dogPath));
  }

  // Alla issues bär aktivt regelverks id så UI kan visa källa utan att slå
  // upp det på nytt. Enskilda issues kan ha satt ruleClause/sourceUrl via
  // ruleRef(); övriga får bara ruleSetId.
  for (const issue of issues) {
    issue.ruleSetId ??= rs.id;
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
