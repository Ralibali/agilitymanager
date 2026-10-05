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
  CLASS_TEMPLATES, getObstacleDefV2,
  type ClassTemplate, type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";
import {
  buildDogPath, computeDogPathPairDistances, type CourseDogPathOverride,
} from "./dogPath";
import { computeApproachIssues } from "./courseAnalysis";
import {
  getRuleSet,
  getDefaultRuleSetIdForSport,
  isRuleFieldVerified,
  type RuleSet,
} from "./rules";
import { rotatedAabb, edgesOutsideArena, aabbsOverlap, type AABB } from "./geometry";
import { normalizeCurveDeg, tunnelWorldAabb } from "./tunnelGeometry";
import { obstacleSizeM } from "./obstacleSize";

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
  /** Tunnelns fysiska längd i meter (2–6). Saknas → standardtunnel. */
  lengthM?: number;
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
  const { w, d } = obstacleSizeM(ob, 0.4);
  // Böjd tunnel: bågen buktar utanför den raka rektangeln — använd
  // tunnelns faktiska geometri så att bounds-kontrollen stämmer.
  if (ob.type === "tunnel" && normalizeCurveDeg(ob.curveDeg) > 0) {
    return tunnelWorldAabb({ x: ob.x, y: ob.y }, w, d, ob.rotation, ob.curveDeg ?? 0, ob.curveSide);
  }
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
   * (FCI Hoopers: 180 s, SHoK: 90 s). Null annars.
   */
  fixedMaxCourseTimeS: number | null;
  /**
   * True när referenstiden är vår uppskattning (banlängd ÷ hastighet) —
   * t.ex. agility, där domaren fastställer referenstiden per bana (SAgiK
   * §3.4). False när regelverket anger en fast referenstid (SHoK 45 s).
   */
  refTimeIsEstimate: boolean;
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
  const fixedRef = rs.timeRules.fixedRefTimeS ?? null;
  const fixedMax = rs.timeRules.fixedMaxCourseTimeS ?? null;
  // Med fast referenstid finns ingen hastighetsmodell att visa.
  const refSpeed = classKey && fixedRef == null && fixedMax == null
    ? (rs.timeRules.refSpeedMsByClass[classKey] ??
        CLASS_TEMPLATES.find((t) => t.key === classKey)?.refSpeedMs ??
        null)
    : null;
  const maxFactor = classKey && fixedMax == null
    ? (rs.timeRules.maxTimeFactorByClass[classKey] ??
        CLASS_TEMPLATES.find((t) => t.key === classKey)?.maxTimeFactor ??
        null)
    : null;

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

  // Fasta tider (SHoK 45/90 s, FCI –/180 s) gäller oavsett banlängd. FCI
  // har ingen referenstid alls — refTimeS blir då null.
  if (fixedRef != null || fixedMax != null) {
    return {
      ...base,
      refTimeS: fixedRef,
      maxTimeS: fixedMax ?? (fixedRef != null && maxFactor ? Math.round(fixedRef * maxFactor) : null),
      refTimeIsEstimate: false,
    };
  }

  if (!refSpeed || !maxFactor || lengthAlongPathM <= 0) {
    return { ...base, refTimeS: null, maxTimeS: null, refTimeIsEstimate: true };
  }
  const refTimeS = Math.round(lengthAlongPathM / refSpeed);
  const maxTimeS = Math.round(refTimeS * maxFactor);
  return { ...base, refTimeS, maxTimeS, refTimeIsEstimate: true };
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

/** Tolerans för avståndsgränser — sparade koordinater har cm-precision. */
const DISTANCE_TOLERANCE_M = 0.05;

/** "6,4" — svensk decimal med en decimal. */
function formatM(m: number): string {
  return m.toFixed(1).replace(".", ",");
}

const JUMP_PASSAGE_TYPES = new Set<ObstacleTypeV2>(["jump", "wall", "longjump", "tire", "combo"]);
/** Nollklassens hoppassager: vanliga hopp plus mur/långhopp (inga däck/oxrar). */
const NOLL_JUMP_PASSAGE_TYPES = new Set<ObstacleTypeV2>(["jump", "wall", "longjump"]);
const WEAVE_TYPES = new Set<ObstacleTypeV2>(["weave_8", "weave_10", "weave_12"]);
/** Nollklassens specialhinder per variant — exakt en passage ska finnas. */
const NOLL_SPECIAL: Partial<Record<ClassTemplateKey, { types: ObstacleTypeV2[]; label: string }>> = {
  noll_slalom: { types: ["weave_12"], label: "en slalom" },
  noll_balans: { types: ["dogwalk"], label: "en balansbom" },
  noll_mur: { types: ["wall", "longjump"], label: "en mur eller ett långhopp" },
};

/** Varför en hindertyp är förbjuden i en klassmall — visas i regelkontrollen. */
function forbiddenReason(type: ObstacleTypeV2, classKey: ClassTemplateKey): string | undefined {
  if (type === "weave_8" || type === "weave_10") return "tävlingsslalom har alltid 12 pinnar";
  if (type === "table") return "bordet används inte i svenska tävlingar sedan 2017";
  if (type === "combo" && classKey.endsWith("_1")) return "oxer får inte användas i klass 1";
  if (CONTACT_TYPES.includes(type)) return "hoppklasser har inga balanshinder";
  return undefined;
}

function obstacleName(ob: ObstacleLite): string {
  const label = getObstacleDefV2(ob.type)?.label ?? ob.type;
  return ob.number != null ? `hinder ${ob.number} (${label.toLowerCase()})` : label.toLowerCase();
}

/** Avstånd från `point` längs `dir` till banområdets kant (m). */
function rayDistanceToBoundary(
  point: { x: number; y: number },
  dir: { x: number; y: number },
  width: number,
  height: number,
): number {
  const hits: number[] = [];
  if (Math.abs(dir.x) > 1e-9) {
    for (const x of [0, width]) {
      const t = (x - point.x) / dir.x;
      if (t >= 0) hits.push(t);
    }
  }
  if (Math.abs(dir.y) > 1e-9) {
    for (const y of [0, height]) {
      const t = (y - point.y) / dir.y;
      if (t >= 0) hits.push(t);
    }
  }
  return hits.length ? Math.min(...hits) : 0;
}

/**
 * Agility: avstånd mellan följdhinder mätt längs hundens väg (från ribba,
 * ring eller hinderände — samma sätt som domare mäter) samt banstrukturen i
 * SAgiK/SKK 2022–2026 §3.1 för klassmallar med `courseRules`.
 *
 * Fri planering får bara mjuka varningar för korta avstånd — där kan
 * avsiktligt täta träningsövningar förekomma.
 */
function validateAgilityCourse(
  course: CourseLite,
  rs: RuleSet,
  tpl: ClassTemplate | null,
  sequence: ObstacleLite[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mode = tpl?.courseRules;
  const strict = mode != null;
  const rules = rs.courseRules;
  const minM = rs.safetyRules.minSafeM;
  const maxM = rules?.maxConsecutiveM;
  const minRef = ruleRef(rs, "safetyRules.minSafeM", "§3.1");
  const maxRef = ruleRef(rs, "courseRules.maxConsecutiveM", "§3.1");
  const range = maxM != null ? `${formatM(minM)}–${formatM(maxM)} m` : `minst ${formatM(minM)} m`;

  // a) Avstånd mellan följdhinder längs hundens väg.
  const pairs = computeDogPathPairDistances(sequence, course.dogPath);
  for (const pair of pairs) {
    const d = pair.distanceM;
    if (d < minM - DISTANCE_TOLERANCE_M) {
      issues.push({
        level: strict ? "error" : "warning",
        code: "distance_too_short",
        message: strict
          ? `Hinder ${pair.fromNumber}→${pair.toNumber}: ${formatM(d)} m längs hundens väg (${minRef.prefix}: ${range})`
          : `Hinder ${pair.fromNumber}→${pair.toNumber}: ${formatM(d)} m längs hundens väg — kortare än tävlingsbanornas ${formatM(minM)} m`,
        obstacleId: pair.toId,
        basis: minRef.basis,
        ruleClause: minRef.ruleClause,
        sourceUrl: minRef.sourceUrl,
      });
    } else if (strict && maxM != null && d > maxM + DISTANCE_TOLERANCE_M) {
      issues.push({
        level: "warning",
        code: "distance_too_long",
        message: `Hinder ${pair.fromNumber}→${pair.toNumber}: ${formatM(d)} m längs hundens väg (${maxRef.prefix}: ${range})`,
        obstacleId: pair.toId,
        basis: maxRef.basis,
        ruleClause: maxRef.ruleClause,
        sourceUrl: maxRef.sourceUrl,
      });
    }
  }

  // b) Kontaktfält direkt efter tunnel — konservativ säkerhetsheuristik.
  for (const pair of pairs) {
    const from = sequence.find((o) => o.id === pair.fromId);
    const to = sequence.find((o) => o.id === pair.toId);
    if (!from || !to || from.type !== "tunnel" || !CONTACT_TYPES.includes(to.type)) continue;
    if (pair.distanceM < rs.safetyRules.contactAfterTunnelMinM) {
      const contactRef = ruleRef(rs, "safetyRules.contactAfterTunnelMinM");
      issues.push({
        level: "warning",
        code: "contact_after_tunnel",
        message: `Kontaktfältshinder direkt efter tunnel (${formatM(pair.distanceM)} m < ${formatM(rs.safetyRules.contactAfterTunnelMinM)} m, ${contactRef.prefix})`,
        obstacleId: to.id,
        basis: contactRef.basis,
        ruleClause: contactRef.ruleClause,
        sourceUrl: contactRef.sourceUrl,
      });
    }
  }

  if (!strict || !rules || !tpl) return issues;

  // c) Banstruktur enligt klassmallens regler.
  const ref = (field: string) => ruleRef(rs, field, "§3.1");
  const push = (
    level: IssueLevel,
    code: string,
    message: string,
    field: string,
    obstacleId?: string,
  ) => {
    const r = ref(field);
    issues.push({
      level, code, obstacleId,
      message: `${message} (${r.prefix})`,
      basis: r.basis, ruleClause: r.ruleClause, sourceUrl: r.sourceUrl,
    });
  };

  if (rules.startEndJumpRequired && sequence.length >= 2) {
    const first = sequence[0];
    const last = sequence[sequence.length - 1];
    const lastOk = mode === "sagik_nollklass" ? last.type === "jump" : last.type === "jump" || last.type === "combo";
    if (first.type !== "jump") {
      push("error", "start_not_jump", `Banan ska inledas med ett hopphinder — ${obstacleName(first)} är först`, "courseRules.startEndJumpRequired", first.id);
    }
    if (!lastOk) {
      push(
        "error", "finish_not_jump",
        `Banan ska avslutas med ${mode === "sagik_nollklass" ? "ett hopphinder" : "ett hopphinder eller en oxer"} — ${obstacleName(last)} är sist`,
        "courseRules.startEndJumpRequired", last.id,
      );
    }
  }

  const jumpTypes = mode === "sagik_nollklass" ? NOLL_JUMP_PASSAGE_TYPES : JUMP_PASSAGE_TYPES;
  const jumpPassages = sequence.filter((o) => jumpTypes.has(o.type)).length;
  if (sequence.length > 0 && jumpPassages < rules.minJumpPassages) {
    push("warning", "too_few_jump_passages", `Banan har ${jumpPassages} hoppassager — minst ${rules.minJumpPassages} krävs`, "courseRules.minJumpPassages");
  }

  const weaves = sequence.filter((o) => WEAVE_TYPES.has(o.type));
  if (weaves.length > rules.maxWeavePassages) {
    push("error", "too_many_weaves", `Banan har ${weaves.length} slalompassager — högst ${rules.maxWeavePassages} är tillåten`, "courseRules.maxWeavePassages", weaves[weaves.length - 1].id);
  }

  if (mode === "sagik_nollklass") {
    const special = NOLL_SPECIAL[tpl.key];
    if (special && sequence.length > 0) {
      const count = sequence.filter((o) => special.types.includes(o.type)).length;
      if (count !== 1) {
        issues.push({
          level: "warning",
          code: "noll_special_count",
          message: `${tpl.label} ska innehålla exakt ${special.label} — banan har ${count}`,
          basis: "official_rule",
          ruleClause: "Nollklass",
        });
      }
    }
  } else {
    // FCI:s säkerhetsanvisningar avråder från kontaktfält direkt efter varandra.
    for (let i = 1; i < sequence.length; i++) {
      if (CONTACT_TYPES.includes(sequence[i - 1].type) && CONTACT_TYPES.includes(sequence[i].type)) {
        issues.push({
          level: "warning",
          code: "consecutive_contacts",
          message: `Kontaktfältshinder ${sequence[i - 1].number} och ${sequence[i].number} ligger direkt efter varandra — undvik det i en tävlingsbana`,
          obstacleId: sequence[i].id,
          basis: "safety_heuristic",
        });
      }
    }
  }

  // d) Avstånd till bankanten (hinder som sticker ut rapporteras separat).
  for (const ob of sequence) {
    const box = obstacleAabb(ob);
    const clearance = Math.min(box.minX, box.minY, course.arenaWidthM - box.maxX, course.arenaHeightM - box.maxY);
    if (clearance >= 0 && clearance < rules.minBorderClearanceM - DISTANCE_TOLERANCE_M / 5) {
      push(
        "warning", "border_clearance",
        `${obstacleName(ob).replace(/^h/, "H")} ligger ${formatM(clearance)} m från bankanten — minst ${formatM(rules.minBorderClearanceM)} m krävs`,
        "courseRules.minBorderClearanceM", ob.id,
      );
    }
  }

  // e) Ansats före första och utgång efter sista hindret, rakt mot bankanten.
  const path = buildDogPath(sequence, course.dogPath);
  if (path.anchors.length >= 1) {
    const first = path.anchors[0];
    const last = path.anchors[path.anchors.length - 1];
    const before = rayDistanceToBoundary(first.entry, { x: -first.entryDir.x, y: -first.entryDir.y }, course.arenaWidthM, course.arenaHeightM);
    const after = rayDistanceToBoundary(last.exit, last.exitDir, course.arenaWidthM, course.arenaHeightM);
    if (before < rules.minRunUpM - DISTANCE_TOLERANCE_M) {
      push("warning", "start_runup_short", `Ansatsen före första hindret är ${formatM(before)} m till bankanten — minst ${formatM(rules.minRunUpM)} m krävs`, "courseRules.minRunUpM", first.obstacle.id);
    }
    if (path.anchors.length >= 2 && after < rules.minRunUpM - DISTANCE_TOLERANCE_M) {
      push("warning", "finish_runout_short", `Utgången efter sista hindret är ${formatM(after)} m till bankanten — minst ${formatM(rules.minRunUpM)} m krävs`, "courseRules.minRunUpM", last.obstacle.id);
    }
  }

  return issues;
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
        const reason = forbiddenReason(ob.type, tpl.key);
        const ref = ruleRef(rs, "classTemplates.forbiddenTypes", "§3.1");
        issues.push({
          level: "error",
          code: "type_forbidden",
          message: `${def.label} är inte tillåten i ${tpl.label}${reason ? ` — ${reason}` : ""}`,
          obstacleId: ob.id,
          basis: ref.basis,
          ruleClause: ref.ruleClause,
          sourceUrl: ref.sourceUrl,
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

    // Banstorlek matchar mall (eller ett av mallens alternativa mått)?
    const sizes: Array<[number, number]> = [[tpl.arenaWidthM, tpl.arenaHeightM], ...(tpl.alternativeArenaSizesM ?? [])];
    const sameSize = sizes.some(([sw, sh]) =>
      (course.arenaWidthM === sw && course.arenaHeightM === sh) ||
      (course.arenaWidthM === sh && course.arenaHeightM === sw));
    if (!sameSize) {
      issues.push({
        level: "info",
        code: "arena_size_differs",
        message: `Mallens rekommenderade banstorlek är ${sizes.map(([sw, sh]) => `${sw}×${sh}`).join(" eller ")} m`,
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

  // 5) Agility — avstånd längs hundens väg och banstruktur (SAgiK §3.1)
  if (course.sport === "agility") {
    issues.push(...validateAgilityCourse(course, rs, tpl, numberedByNumber));
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

    // Max-avstånd mellan följdhinder (SHoK §2.3: 7/8/9/9 m, FCI §3.1: 8/10/12 m).
    const consecutiveMax = course.classTemplate
      ? safety.hoopersConsecutiveMaxMByClass?.[course.classTemplate]
      : undefined;
    if (typeof consecutiveMax === "number") {
      const maxRef = ruleRef(rs, "safetyRules.hoopersConsecutiveMaxMByClass", rs.organization === "FCI" ? "§3.1" : "§2.3");
      for (let i = 1; i < numberedByNumber.length; i++) {
        const a = numberedByNumber[i - 1];
        const b = numberedByNumber[i];
        if ((b.number as number) - (a.number as number) !== 1) continue;
        const d = dist(a, b);
        if (d > consecutiveMax + DISTANCE_TOLERANCE_M) {
          issues.push({
            level: "warning",
            code: "hoopers_too_far",
            message: `Hinder ${a.number}→${b.number}: ${formatM(d)} m > ${formatM(consecutiveMax)} m (${maxRef.prefix})`,
            obstacleId: b.id,
            basis: maxRef.basis,
            ruleClause: maxRef.ruleClause,
            sourceUrl: maxRef.sourceUrl,
          });
        }
      }
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
    // Storlekskategori Small (FCI ≤ 40 cm) har kortare maxavstånd när
    // regelverket anger det. XS/S räknas som Small, övriga som Large.
    const isSmall = course.sizeClass === "XS" || course.sizeClass === "S";
    const smallTable = isSmall ? safety.hoopersMaxDistanceFromHandlerZoneMByClassSmall : undefined;
    const maxZoneDistance = course.classTemplate
      ? (smallTable?.[course.classTemplate] ?? safety.hoopersMaxDistanceFromHandlerZoneMByClass?.[course.classTemplate])
      : undefined;
    if (zone && typeof maxZoneDistance === "number") {
      const maxRef = ruleRef(
        rs,
        smallTable?.[course.classTemplate ?? ""] != null
          ? "safetyRules.hoopersMaxDistanceFromHandlerZoneMByClassSmall"
          : "safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass",
        rs.organization === "FCI" ? "§3.1" : "§2.3",
      );
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
