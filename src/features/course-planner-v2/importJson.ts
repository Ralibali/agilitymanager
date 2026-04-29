/**
 * Banplaneraren v2 — JSON-import
 * Spegelbild av handleExportJson i V3CoursePlannerV2Page.
 *
 * Validerar struktur + saniterar fält. Okända hindertyper hoppas över
 * (med varning i result.warnings) snarare än att hela importen kraschar.
 * Defensiv: aldrig kasta — returnera alltid ett ImportResult.
 */
import {
  OBSTACLES_V2, SIZE_CLASSES, CLASS_TEMPLATES,
  type Sport, type SizeClassKey, type ObstacleTypeV2, type ClassTemplateKey,
} from "./config";

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
}

export type ImportResult =
  | { ok: true; course: ImportedCourse; warnings: string[] }
  | { ok: false; error: string };

const VALID_SPORTS: Sport[] = ["agility", "hoopers"];
const VALID_SIZES = SIZE_CLASSES.map((s) => s.key);
const VALID_TYPES = new Set<ObstacleTypeV2>(OBSTACLES_V2.map((o) => o.type));
const VALID_TEMPLATES = new Set<ClassTemplateKey>(CLASS_TEMPLATES.map((t) => t.key));

function uid() { return Math.random().toString(36).slice(2, 10); }

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = num(v, fallback);
  return Math.max(min, Math.min(max, n));
}

/** Försöker tolka godtycklig JSON-text som en exporterad bana. */
export function parseCourseJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: "Filen är inte giltig JSON." };
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "JSON:en innehåller inte ett objekt." };
  }
  const r = raw as Record<string, unknown>;

  // version-check är informell — vi accepterar alla versioner men varnar för okända.
  const warnings: string[] = [];
  if (r.version !== undefined && r.version !== 2) {
    warnings.push(`Okänd version (${String(r.version)}) — försöker tolka ändå.`);
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

  const arenaWidthM = clampNum(r.arenaWidthM, 5, 200, 30);
  const arenaHeightM = clampNum(r.arenaHeightM, 5, 200, 40);

  let classTemplate: ClassTemplateKey | null = null;
  if (typeof r.classTemplate === "string" && VALID_TEMPLATES.has(r.classTemplate as ClassTemplateKey)) {
    classTemplate = r.classTemplate as ClassTemplateKey;
  } else if (r.classTemplate != null) {
    warnings.push("Okänd klassmall — ignorerar.");
  }

  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 120) : "Importerad bana";

  // Sanera hinder
  const obstacles: ImportedObstacle[] = [];
  let skipped = 0;
  for (const o of r.obstacles as unknown[]) {
    if (!o || typeof o !== "object") { skipped++; continue; }
    const ob = o as Record<string, unknown>;
    const type = ob.type as ObstacleTypeV2;
    if (!VALID_TYPES.has(type)) { skipped++; continue; }

    const imported: ImportedObstacle = {
      id: typeof ob.id === "string" && ob.id.length > 0 ? ob.id : uid(),
      type,
      x: clampNum(ob.x, 0, arenaWidthM, arenaWidthM / 2),
      y: clampNum(ob.y, 0, arenaHeightM, arenaHeightM / 2),
      rotation: clampNum(ob.rotation, -360, 360, 0),
    };

    if (typeof ob.number === "number" && Number.isFinite(ob.number) && ob.number > 0) {
      imported.number = Math.round(ob.number);
    }
    if (typeof ob.curveDeg === "number" && Number.isFinite(ob.curveDeg)) {
      imported.curveDeg = Math.max(0, Math.min(90, ob.curveDeg));
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
    course: { name, sport, sizeClass, arenaWidthM, arenaHeightM, classTemplate, obstacles },
  };
}
