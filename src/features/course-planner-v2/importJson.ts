/**
 * Banplaneraren v2 — JSON-import
 * Spegelbild av handleExportJson i PlannerPage.
 *
 * Säkerhetsmodell (defense in depth mot illvilliga/korrupta filer):
 *  - Maximal filstorlek avvisas före JSON.parse (minne/CPU-skydd).
 *  - Strukturvalidering: toppobjekt + obstacles-lista krävs.
 *  - Max antal hinder — överskjutande hinder trunkeras med varning.
 *  - Metadata (namn, hinder-id:n) saniteras: styrtecken tas bort och
 *    längder begränsas. React escape:ar vid rendering, men namnet används
 *    även i PDF/SVG-export där vi inte litar på escape.
 *  - Okända fält strippas alltid — resultatet byggs upp fält för fält,
 *    så ingenting från indata läcker vidare till state/export.
 *  - Versioner: v2 är nuvarande export. v1/saknad version migreras
 *    (field:[w,h] → arenaWidthM/arenaHeightM, kind → type). Framtida
 *    versioner (> 2) försöker tolkas men varnar.
 *  - Okända hindertyper hoppas över (med varning) snarare än att krascha.
 * Defensiv: aldrig kasta — returnera alltid ett ImportResult.
 */
import {
  OBSTACLES_V2, SIZE_CLASSES, CLASS_TEMPLATES,
  type Sport, type SizeClassKey, type ObstacleTypeV2, type ClassTemplateKey,
} from "./config";
import { getDefaultRuleSetIdForSport, getRuleSet } from "./rules";

export interface ImportedObstacle {
  id: string;
  type: ObstacleTypeV2;
  x: number;
  y: number;
  rotation: number;
  number?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
  locked?: boolean;
  zIndex?: number;
}

export interface ImportedCourse {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ImportedObstacle[];
  /**
   * Valt regelverk. Alltid ett giltigt id som hör till `sport` — okända id
   * eller id från fel sport faller tillbaka till sportens default (med
   * varning) så att en bana aldrig kan blanda regelverk.
   */
  ruleSetId: string;
}

export type ImportResult =
  | { ok: true; course: ImportedCourse; warnings: string[] }
  | { ok: false; error: string };

/** Nuvarande exportversion (se handleExportJson i PlannerPage). */
export const CURRENT_EXPORT_VERSION = 2;
/** Max antal tecken i JSON-texten (~1 MB). Större filer avvisas direkt. */
export const MAX_IMPORT_JSON_CHARS = 1_000_000;
/** Max antal hinder som importeras. Fler än så trunkeras med varning. */
export const MAX_IMPORT_OBSTACLES = 400;
/** Max längd på banans namn efter sanering. */
export const MAX_IMPORT_NAME_CHARS = 120;
/** Max längd på ett hinder-id från filen. */
export const MAX_IMPORT_OBSTACLE_ID_CHARS = 64;

const VALID_SPORTS: Sport[] = ["agility", "hoopers"];
const VALID_SIZES = SIZE_CLASSES.map((s) => s.key);
const VALID_TYPES = new Set<ObstacleTypeV2>(OBSTACLES_V2.map((o) => o.type));
const VALID_TEMPLATES = new Set<ClassTemplateKey>(CLASS_TEMPLATES.map((t) => t.key));

/** Styrtecken (C0/C1) — aldrig meningsfulla i namn/id:n, potentiellt farliga i export. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;

function uid() { return Math.random().toString(36).slice(2, 10); }

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = num(v, fallback);
  return Math.max(min, Math.min(max, n));
}

/** Saniterad metadata-text: styrtecken bort, trimmad, längdbegränsad. */
function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_CHARS_RE, "").trim().slice(0, max);
}

/**
 * Migreringsstöd för äldre exportformat (v1 / versionslösa filer):
 * arenans mått kunde ligga som `field: [bredd, höjd]` och hindertypen
 * hette `kind` i stället för `type`.
 */
function legacyArenaSize(raw: unknown, axis: 0 | 1): number | undefined {
  if (Array.isArray(raw) && typeof raw[axis] === "number" && Number.isFinite(raw[axis])) {
    return raw[axis];
  }
  return undefined;
}

/** Försöker tolka godtycklig JSON-text som en exporterad bana. */
export function parseCourseJson(text: string): ImportResult {
  if (typeof text !== "string" || text.length === 0) {
    return { ok: false, error: "Filen är tom." };
  }
  if (text.length > MAX_IMPORT_JSON_CHARS) {
    return { ok: false, error: "Filen är för stor för att importeras (max ca 1 MB)." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Filen är inte giltig JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "JSON:en innehåller inte ett objekt." };
  }
  const r = raw as Record<string, unknown>;

  const warnings: string[] = [];

  // Versionshantering: v2 är nuvarande, v1/saknad migreras, > v2 försöks.
  const version = num(r.version, 1);
  const legacy = version < CURRENT_EXPORT_VERSION;
  if (legacy) {
    warnings.push("Äldre filformat — migrerar till nuvarande version.");
  } else if (version > CURRENT_EXPORT_VERSION) {
    warnings.push(`Nyare filformat (v${version}) — okända fält ignoreras.`);
  }

  if (!Array.isArray(r.obstacles)) {
    return { ok: false, error: "Filen saknar 'obstacles'-listan — det här ser inte ut som en exporterad bana." };
  }

  const sport: Sport = VALID_SPORTS.includes(r.sport as Sport)
    ? (r.sport as Sport)
    : (warnings.push("Okänd sport — använder agility."), "agility");

  const sizeClass: SizeClassKey = (VALID_SIZES as string[]).includes(r.sizeClass as string)
    ? (r.sizeClass as SizeClassKey)
    : (warnings.push("Okänd storleksklass — använder L."), "L");

  const arenaWidthM = clampNum(r.arenaWidthM ?? legacyArenaSize(r.field, 0), 5, 200, 30);
  const arenaHeightM = clampNum(r.arenaHeightM ?? legacyArenaSize(r.field, 1), 5, 200, 40);

  const name = cleanText(r.name, MAX_IMPORT_NAME_CHARS) || "Importerad bana";

  // Regelverk: behålls bara om det finns OCH gäller samma sport.
  const defaultRuleSetId = getDefaultRuleSetIdForSport(sport);
  let ruleSetId = defaultRuleSetId;
  if (typeof r.ruleSetId === "string" && r.ruleSetId.length > 0) {
    const rs = getRuleSet(r.ruleSetId);
    if (!rs) {
      warnings.push(`Okänt regelverk "${cleanText(r.ruleSetId, 60)}" — använder ${defaultRuleSetId}.`);
    } else if (rs.sport !== sport) {
      warnings.push(`Regelverket "${rs.id}" gäller inte ${sport} — använder ${defaultRuleSetId}.`);
    } else {
      ruleSetId = rs.id;
    }
  } else if (r.ruleSetId != null) {
    warnings.push(`Ogiltigt regelverksfält — använder ${defaultRuleSetId}.`);
  }

  // Klassmall: vissa regelverk (t.ex. FCI Hoopers) har EGNA klassmallar som
  // inte finns i den globala listan. Godta därför både globala mallar och
  // mallarna i det valda regelverket — annars tappas t.ex. hoopers_fci_h2.
  const ruleSetTemplateKeys = new Set<string>(
    (getRuleSet(ruleSetId)?.classTemplates ?? []).map((t) => t.key),
  );
  let classTemplate: ClassTemplateKey | null = null;
  const rawTemplate = typeof r.classTemplate === "string" ? r.classTemplate : null;
  if (
    rawTemplate &&
    (VALID_TEMPLATES.has(rawTemplate as ClassTemplateKey) || ruleSetTemplateKeys.has(rawTemplate))
  ) {
    classTemplate = rawTemplate as ClassTemplateKey;
  } else if (r.classTemplate != null) {
    warnings.push("Okänd klassmall — ignorerar.");
  }

  // Sanera hinder. Hårddcap: aldrig iterera över mer än MAX_IMPORT_OBSTACLES.
  const rawObstacles = r.obstacles as unknown[];
  if (rawObstacles.length > MAX_IMPORT_OBSTACLES) {
    warnings.push(`Banan hade ${rawObstacles.length} hinder — bara de ${MAX_IMPORT_OBSTACLES} första importeras.`);
  }
  const obstacles: ImportedObstacle[] = [];
  let skipped = 0;
  for (const o of rawObstacles.slice(0, MAX_IMPORT_OBSTACLES)) {
    if (!o || typeof o !== "object") { skipped++; continue; }
    const ob = o as Record<string, unknown>;
    // Legacy v1: hindertypen kunde heta "kind".
    const type = (ob.type ?? (legacy ? ob.kind : undefined)) as ObstacleTypeV2;
    if (!VALID_TYPES.has(type)) { skipped++; continue; }

    const imported: ImportedObstacle = {
      id: cleanText(ob.id, MAX_IMPORT_OBSTACLE_ID_CHARS) || uid(),
      type,
      x: clampNum(ob.x, 0, arenaWidthM, arenaWidthM / 2),
      y: clampNum(ob.y, 0, arenaHeightM, arenaHeightM / 2),
      rotation: clampNum(ob.rotation, -360, 360, 0),
    };

    if (typeof ob.number === "number" && Number.isFinite(ob.number) && ob.number > 0) {
      imported.number = Math.round(ob.number);
    }
    if (typeof ob.curveDeg === "number" && Number.isFinite(ob.curveDeg)) {
      imported.curveDeg = Math.max(0, Math.min(180, ob.curveDeg));
    }
    if (ob.curveSide === "left" || ob.curveSide === "right") {
      imported.curveSide = ob.curveSide;
    }
    if (ob.locked === true) imported.locked = true;
    if (typeof ob.zIndex === "number" && Number.isFinite(ob.zIndex)) {
      imported.zIndex = Math.round(ob.zIndex);
    }
    obstacles.push(imported);
  }
  if (skipped > 0) warnings.push(`${skipped} hinder hoppades över (okänd typ eller ogiltigt format).`);
  if (obstacles.length === 0) {
    return { ok: false, error: "Filen innehöll inga giltiga hinder." };
  }

  // Säkerställ unika id:n (om filen har dubletter)
  const seen = new Set<string>();
  for (const o of obstacles) {
    if (seen.has(o.id)) o.id = uid();
    seen.add(o.id);
  }

  return {
    ok: true,
    warnings,
    course: { name, sport, sizeClass, arenaWidthM, arenaHeightM, classTemplate, obstacles, ruleSetId },
  };
}
