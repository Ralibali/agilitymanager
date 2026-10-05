/**
 * Banplaneraren v2 — UI-/datakonstanter.
 *
 * ⚠️ REGELMOTOR: Från och med Prompt A är allt regelinnehåll också tillgängligt
 * via det versionerade RuleSet-API:t i `./rules`. Värdena nedan är fortfarande
 * "single source of truth" som rules-modulen pekar in i — men varje numerisk
 * regelparameter ska verifieras mot officiella dokument (se checklista i
 * `./rules/skk-agility-2023.ts`). Värden markerade `TODO VERIFIERA` är
 * uppskattningar tills källa är bekräftad och citerad.
 *
 * Hindertyper, kategorier och rena UI-/canvaskonstanter (färger, ikoner)
 * bör ligga kvar här. Klassmallar, hopphöjder, säkerhetsavstånd och
 * tidsmodeller ska på sikt läsas via `getRuleSet(course.ruleSetId)` istället
 * för direkt från arrayerna nedan.
 *
 * Källor (att verifiera):
 *  - Agilityregler 2022-01-01–2026-12-31 (SAgiK/SKK) — agilityklubben.se/regler
 *  - "Säkra hinder" – anvisningar (SAgiK)
 *  - Referenstider – Information (reviderad 2023) (SAgiK)
 *  - Svenska Hoopersklubbens (SHoK) regelverk 2025-11-01–2028-10-31
 */

export type Sport = "agility" | "hoopers";

export type SizeClassKey = "XS" | "S" | "M" | "L" | "XL";

export interface SizeClassDef {
  key: SizeClassKey;
  label: string;
  /** Hopphöjd-intervall i cm (SAgiK 2022–2026). */
  jumpHeightCm: [number, number];
  /** Däckhöjd centrum mark→hål i cm. */
  tireHeightCm: [number, number];
  /** Antal plankor i långhopp. */
  longJumpPlanks: number;
  /** Total längd långhopp i cm (lågaste–högsta). */
  longJumpLengthCm: [number, number];
  /** Rekommenderat min-avstånd mellan hinder i kombination (m). */
  comboDistanceM: number;
}

export const SIZE_CLASSES: SizeClassDef[] = [
  // VERIFIERAT 2026-07 mot "Regler för agilitytävlingar 2022-01-01–2026-12-31"
  // (SAgiK/SKK), §4.5 Hopphinder, §4.7 Långhopp, §4.8 Däck:
  //  - jumpHeightCm: intervall klass 2–3 (klass 1 använder undre halvan,
  //    t.ex. L 40–45 i klass 1).
  //  - tireHeightCm: "hopphöjd till lägsta punkten på ringens innerkant".
  //  - longJump: XS 35–40 cm/2 delar, S 40–50/2, M 70–90/3, L 90–120/4,
  //    XL 120–150/4–5 delar.
  //  - comboDistanceM: Kombinationshindret togs bort ur regelverket 2022
  //    (endast oxer kvarstår, som är ETT hinder). Fältet används idag som
  //    minimigräns för parvis avstånd och följer huvudregeln 6–8 m (§3.1).
  { key: "XS", label: "XS", jumpHeightCm: [10, 20], tireHeightCm: [10, 20], longJumpPlanks: 2, longJumpLengthCm: [35, 40], comboDistanceM: 6.0 },
  { key: "S",  label: "S",  jumpHeightCm: [20, 30], tireHeightCm: [20, 30], longJumpPlanks: 2, longJumpLengthCm: [40, 50], comboDistanceM: 6.0 },
  { key: "M",  label: "M",  jumpHeightCm: [30, 40], tireHeightCm: [30, 40], longJumpPlanks: 3, longJumpLengthCm: [70, 90], comboDistanceM: 6.0 },
  { key: "L",  label: "L",  jumpHeightCm: [40, 50], tireHeightCm: [40, 50], longJumpPlanks: 4, longJumpLengthCm: [90, 120], comboDistanceM: 6.0 },
  { key: "XL", label: "XL", jumpHeightCm: [50, 60], tireHeightCm: [50, 60], longJumpPlanks: 4, longJumpLengthCm: [120, 150], comboDistanceM: 6.0 },
];

/* ─────────────────────────────────────────────────────────
   Hindertyper enligt regelverk
   ───────────────────────────────────────────────────────── */

export type ObstacleTypeV2 =
  // Agility — hopp
  | "jump" | "wall" | "longjump" | "tire" | "combo"
  // Agility — tunnel
  | "tunnel"
  // Agility — slalom
  | "weave_8" | "weave_10" | "weave_12"
  // Agility — balans (kontaktfält)
  | "aframe" | "dogwalk" | "seesaw"
  // Agility — bord
  | "table"
  // Bankontroll (båda sporter)
  | "start" | "finish" | "number"
  // Hoopers
  | "hoop" | "barrel" | "fence" | "handler_zone";

export type ObstacleCategory =
  | "Hopphinder" | "Tunnlar" | "Slalom" | "Balans" | "Bord"
  | "Bankontroll" | "Hoopers" | "Områden";

export interface ObstacleDefV2 {
  type: ObstacleTypeV2;
  label: string;
  category: ObstacleCategory;
  sport: Sport[];
  /** Default-mått i meter (bredd × djup, top-down). */
  sizeM: { w: number; d: number };
  /** Tillåten i hoppklass (om false → bara agilityklass). */
  allowedInJumpClass: boolean;
  /** True för balanshinder med kontaktfält. */
  hasContactZone?: boolean;
  /** Kort beskrivning för tooltip. */
  description: string;
}

export const OBSTACLES_V2: ObstacleDefV2[] = [
  // Hopphinder
  { type: "jump",     label: "Hopp",       category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 0.4 }, allowedInJumpClass: true,  description: "Hopphinder — ribba mellan två stolpar" },
  { type: "wall",     label: "Mur",        category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 0.5 }, allowedInJumpClass: true,  description: "Mur / viadukt" },
  { type: "longjump", label: "Långhopp",   category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 1.5 }, allowedInJumpClass: true,  description: "Långhopp — antal delar och längd styrs av storleksklass" },
  { type: "tire",     label: "Däck",       category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.0, d: 1.0 }, allowedInJumpClass: true,  description: "Däck, ringens innerdiameter 45–60 cm" },
  { type: "combo",    label: "Oxer",       category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 0.6 }, allowedInJumpClass: true, description: "Oxer (två bommar) — tillåts endast i klass 2–3 (SAgiK 2022–2026 §3.1)" },

  // Tunnlar — standardlängd 3 m, ställbar 2–6 m i egenskapspanelen (SAgiK: 3–6 m).
  { type: "tunnel",   label: "Tunnel",     category: "Tunnlar",    sport: ["agility", "hoopers"], sizeM: { w: 3.0, d: 0.6 }, allowedInJumpClass: true, description: "Tunnel, 3–6 m lång, kan böjas 0–180°" },

  // Slalom — 60 cm mellan pinnarna. Tävlingsslalom har ALLTID 12 pinnar
  // (SAgiK 2022–2026); 8 och 10 pinnar finns kvar för träningsbanor.
  { type: "weave_8",  label: "Slalom 8",   category: "Slalom", sport: ["agility"], sizeM: { w: 0.4, d: 4.2 }, allowedInJumpClass: false, description: "Träningsslalom med 8 pinnar — inte tillåtet i tävling" },
  { type: "weave_10", label: "Slalom 10",  category: "Slalom", sport: ["agility"], sizeM: { w: 0.4, d: 5.4 }, allowedInJumpClass: false, description: "Träningsslalom med 10 pinnar — inte tillåtet i tävling" },
  { type: "weave_12", label: "Slalom 12",  category: "Slalom", sport: ["agility"], sizeM: { w: 0.4, d: 6.6 }, allowedInJumpClass: false, description: "Slalom med 12 pinnar (tävlingsstandard)" },

  // Balans (kontaktfält). Djupet är fotavtrycket i planvy:
  //  - A-hinder: två ramper à ca 2,7 m med toppen 1,70 m → ≈4,2 m på marken.
  //  - Balansbom: tre plankor à 3,6–3,8 m, höjd 1,20–1,30 m → ≈10,7 m.
  //  - Gungbräda: 3,65–4,25 m lång planka, 30 cm bred.
  { type: "aframe",   label: "A-hinder",   category: "Balans", sport: ["agility"], sizeM: { w: 0.9, d: 4.2 }, allowedInJumpClass: false, hasContactZone: true, description: "A-hinder — två ramper à ca 2,7 m, kontaktfält i båda ändar" },
  { type: "dogwalk",  label: "Balansbom",  category: "Balans", sport: ["agility"], sizeM: { w: 0.3, d: 10.7 }, allowedInJumpClass: false, hasContactZone: true, description: "Balansbom — tre plankor à 3,6–3,8 m, kontaktfält i båda ändar" },
  { type: "seesaw",   label: "Gungbräda",  category: "Balans", sport: ["agility"], sizeM: { w: 0.3, d: 3.7 }, allowedInJumpClass: false, hasContactZone: true, description: "Gungbräda, ca 3,7 m — kontaktfält i båda ändar" },

  // Bord — togs bort ur svenska tävlingsregler 2017; finns kvar för träning.
  { type: "table",    label: "Bord",       category: "Bord",   sport: ["agility"], sizeM: { w: 1.0, d: 1.0 }, allowedInJumpClass: false, description: "Bord — används inte i svenska tävlingar sedan 2017 (träning)" },

  // Bankontroll
  { type: "start",    label: "Start",      category: "Bankontroll", sport: ["agility", "hoopers"], sizeM: { w: 1.2, d: 0.2 }, allowedInJumpClass: true, description: "Startlinje" },
  { type: "finish",   label: "Mål",        category: "Bankontroll", sport: ["agility", "hoopers"], sizeM: { w: 1.2, d: 0.2 }, allowedInJumpClass: true, description: "Mållinje" },
  { type: "number",   label: "Nummer",     category: "Bankontroll", sport: ["agility", "hoopers"], sizeM: { w: 0.3, d: 0.3 }, allowedInJumpClass: true, description: "Numreringspunkt fristående från hinder" },

  // Hoopers
  { type: "hoop",         label: "Hoop",            category: "Hoopers",  sport: ["hoopers"], sizeM: { w: 0.9, d: 0.4 }, allowedInJumpClass: true, description: "Båge, 80–100 cm bred" },
  { type: "barrel",       label: "Tunna",           category: "Hoopers",  sport: ["hoopers"], sizeM: { w: 0.6, d: 0.6 }, allowedInJumpClass: true, description: "Tunna, ⌀45–70 cm — hunden rundar den" },
  { type: "fence",        label: "Staket",          category: "Hoopers",  sport: ["hoopers"], sizeM: { w: 1.2, d: 0.1 }, allowedInJumpClass: true, description: "Staket / grind — hunden passerar bakom" },
  { type: "handler_zone", label: "Dirigeringsområde", category: "Områden", sport: ["hoopers"], sizeM: { w: 4.0, d: 4.0 }, allowedInJumpClass: true, description: "Förarens dirigeringsområde (DO)" },
];

export function getObstacleDefV2(type: ObstacleTypeV2): ObstacleDefV2 | undefined {
  return OBSTACLES_V2.find((o) => o.type === type);
}

/* ─────────────────────────────────────────────────────────
   Klassmallar
   ───────────────────────────────────────────────────────── */

export type ClassTemplateKey =
  // Agility
  | "agility_hopp_1" | "agility_hopp_2" | "agility_hopp_3"
  | "agility_1" | "agility_2" | "agility_3"
  | "agility_hopplag"
  | "noll_slalom" | "noll_balans" | "noll_mur"
  // Hoopers (SHoK)
  | "hoopers_1" | "hoopers_2" | "hoopers_3" | "hoopers_4"
  // Hoopers (FCI) — mallar definieras i rules/hoopers-fci.ts, inte i
  // CLASS_TEMPLATES nedan, så att de inte dyker upp i vanliga mall-listor.
  | "hoopers_fci_h1" | "hoopers_fci_h2" | "hoopers_fci_h3";

export interface ClassTemplate {
  key: ClassTemplateKey;
  sport: Sport;
  label: string;
  arenaWidthM: number;
  arenaHeightM: number;
  /** Förväntat hinderantal (min, max). */
  obstacleRange: [number, number];
  /** Default storleksklass. */
  defaultSize: SizeClassKey;
  /** Hindertyper som är tillåtna. Tom = alla för sporten. */
  allowedTypes?: ObstacleTypeV2[];
  /** Förbjudna hindertyper (t.ex. balanshinder i hoppklass). */
  forbiddenTypes?: ObstacleTypeV2[];
  /** Referenshastighet m/s för referenstid (SAgiK 2023). */
  refSpeedMs: number;
  /** Maxtid faktor relativt referenstid. */
  maxTimeFactor: number;
  description: string;
  /**
   * Vilken uppsättning banregler som gäller för mallen:
   *  - "sagik_competition": officiell svensk tävlingsklass (SAgiK 2022–2026 §3.1)
   *  - "sagik_nollklass": SAgiK:s Nollklass (inofficiell startklass, 12–14 passager)
   * Saknas fältet görs bara de generella kontrollerna.
   */
  courseRules?: "sagik_competition" | "sagik_nollklass";
  /** Fler godkända banmått utöver arenaWidthM × arenaHeightM (t.ex. Nollklass 15×30 m). */
  alternativeArenaSizesM?: Array<[number, number]>;
}

const CONTACT_TYPES: ObstacleTypeV2[] = ["aframe", "dogwalk", "seesaw"];
/** Slalom med färre än 12 pinnar och bordet används inte i svensk tävling. */
const NOT_IN_SWEDISH_COMPETITION: ObstacleTypeV2[] = ["weave_8", "weave_10", "table"];

// VERIFIERAT 2026-07 mot officiella dokument:
//  - Agility (SAgiK/SKK 2022–2026 §3.1, §3.4): banan ska ha 15–22
//    hinderpassager; banområdet bör vara 30×40 m; oxer får EJ användas i
//    klass 1; slalom har alltid 12 pinnar; bordet togs bort 2017; maxtiden
//    är 2 × referenstiden. Referenstiden sätts av domaren per bana —
//    refSpeedMs nedan är en uppskattning för planering, inte en regelparameter.
//  - Nollklass (SAgiK 2026): 25×30 eller 15×30 m, 12–14 hinder: hopp och
//    tunnlar plus ETT specialhinder (mur/långhopp, slalom eller balansbom).
//  - Hoopers (SHoK 2025-11-01): startklass 10–15 hinder (5–7 m), klass 1
//    13–20 (6–8 m), klass 2 17–22 (6–9 m), klass 3 20–24 (6–9 m).
//    Referenstiden är 45 s i alla klasser, maxtid 90 s.
//    Banområdet bör vara 30×30 m. Banan börjar och slutar alltid med hoop.
const HOOPERS_TYPES: ObstacleTypeV2[] = ["hoop", "tunnel", "barrel", "fence", "handler_zone", "start", "finish", "number"];

export const CLASS_TEMPLATES: ClassTemplate[] = [
  // Hoppklasser — inga balanshinder; oxer ("combo") ej tillåten i klass 1
  { key: "agility_hopp_1", sport: "agility", label: "Hoppklass 1", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, ...NOT_IN_SWEDISH_COMPETITION, "combo"], refSpeedMs: 3.5, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Hopp, tunnel och slalom — oxer ej tillåten i klass 1" },
  { key: "agility_hopp_2", sport: "agility", label: "Hoppklass 2", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, ...NOT_IN_SWEDISH_COMPETITION], refSpeedMs: 4.0, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Hopp, oxer, tunnel och slalom" },
  { key: "agility_hopp_3", sport: "agility", label: "Hoppklass 3", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, ...NOT_IN_SWEDISH_COMPETITION], refSpeedMs: 4.5, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Hopp, oxer, tunnel och slalom — högsta nivån" },
  // Agilityklasser — alla tävlingshinder; oxer ("combo") ej tillåten i klass 1
  { key: "agility_1", sport: "agility", label: "Agilityklass 1", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...NOT_IN_SWEDISH_COMPETITION, "combo"], refSpeedMs: 2.5, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Alla tävlingshinder inkl. balanshinder — oxer ej tillåten i klass 1" },
  { key: "agility_2", sport: "agility", label: "Agilityklass 2", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...NOT_IN_SWEDISH_COMPETITION], refSpeedMs: 3.0, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Alla tävlingshinder, högre tempo" },
  { key: "agility_3", sport: "agility", label: "Agilityklass 3", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...NOT_IN_SWEDISH_COMPETITION], refSpeedMs: 3.5, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Alla tävlingshinder, högsta nivån" },
  // Hopplagklass
  { key: "agility_hopplag", sport: "agility", label: "Hopplagklass", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 22], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, ...NOT_IN_SWEDISH_COMPETITION], refSpeedMs: 4.0, maxTimeFactor: 2.0, courseRules: "sagik_competition", description: "Lagklass utan balanshinder" },
  // Nollklass (SAgiK:s inofficiella startklass): hopp + tunnel + ETT specialhinder.
  { key: "noll_slalom", sport: "agility", label: "Nollklass — slalom", arenaWidthM: 25, arenaHeightM: 30, alternativeArenaSizesM: [[15, 30]], obstacleRange: [12, 14], defaultSize: "L", allowedTypes: ["jump", "tunnel", "weave_12", "start", "finish", "number"], refSpeedMs: 2.5, maxTimeFactor: 2.0, courseRules: "sagik_nollklass", description: "Hopp och tunnlar plus en slalom (12 pinnar)" },
  { key: "noll_balans", sport: "agility", label: "Nollklass — balansbom", arenaWidthM: 25, arenaHeightM: 30, alternativeArenaSizesM: [[15, 30]], obstacleRange: [12, 14], defaultSize: "L", allowedTypes: ["jump", "tunnel", "dogwalk", "start", "finish", "number"], refSpeedMs: 2.0, maxTimeFactor: 2.0, courseRules: "sagik_nollklass", description: "Hopp och tunnlar plus en balansbom" },
  { key: "noll_mur",    sport: "agility", label: "Nollklass — mur/långhopp", arenaWidthM: 25, arenaHeightM: 30, alternativeArenaSizesM: [[15, 30]], obstacleRange: [12, 14], defaultSize: "L", allowedTypes: ["jump", "wall", "longjump", "tunnel", "start", "finish", "number"], refSpeedMs: 2.5, maxTimeFactor: 2.0, courseRules: "sagik_nollklass", description: "Hopp och tunnlar plus en mur eller ett långhopp" },
  // Hoopers — VERIFIERAT mot SHoK 2025-11-01: hinderantal per klass.
  { key: "hoopers_1", sport: "hoopers", label: "Hoopers startklass", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [10, 15], defaultSize: "L", allowedTypes: HOOPERS_TYPES, refSpeedMs: 2.0, maxTimeFactor: 2.0, description: "Inledande klass — hinder 5–7 m isär, max 13 m från DO" },
  { key: "hoopers_2", sport: "hoopers", label: "Hoopers klass 1", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [13, 20], defaultSize: "L", allowedTypes: HOOPERS_TYPES, refSpeedMs: 2.2, maxTimeFactor: 2.0, description: "Hinder 6–8 m isär, max 15 m från DO" },
  { key: "hoopers_3", sport: "hoopers", label: "Hoopers klass 2", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [17, 22], defaultSize: "L", allowedTypes: HOOPERS_TYPES, refSpeedMs: 2.4, maxTimeFactor: 2.0, description: "Hinder 6–9 m isär, max 20 m från DO" },
  { key: "hoopers_4", sport: "hoopers", label: "Hoopers klass 3", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [20, 24], defaultSize: "L", allowedTypes: HOOPERS_TYPES, refSpeedMs: 2.6, maxTimeFactor: 2.0, description: "Högsta klassen — hinder 6–9 m isär, max 25 m från DO" },
];

export function getClassTemplate(key: ClassTemplateKey): ClassTemplate | undefined {
  return CLASS_TEMPLATES.find((t) => t.key === key);
}

export function getTemplatesBySport(sport: Sport): ClassTemplate[] {
  return CLASS_TEMPLATES.filter((t) => t.sport === sport);
}

/* ─────────────────────────────────────────────────────────
   Bana-storlekar (snabbval)
   ───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
   Bana-storlekar (snabbval) — sport-specifikt
   ───────────────────────────────────────────────────────── */

export interface ArenaPreset { label: string; width: number; height: number; sport: Sport[] }

export const ARENA_PRESETS: ArenaPreset[] = [
  // Agility (SAgiK rekommenderar ~30×40 m)
  { label: "20 × 30 m", width: 20, height: 30, sport: ["agility"] },
  { label: "25 × 30 m", width: 25, height: 30, sport: ["agility"] },
  { label: "30 × 40 m", width: 30, height: 40, sport: ["agility"] },
  { label: "40 × 30 m", width: 40, height: 30, sport: ["agility"] },
  // Hoopers (SHoK: 30×30 m rekommenderat; FCI: minst 800 m², kortsida ≥ 20 m)
  { label: "20 × 20 m", width: 20, height: 20, sport: ["hoopers"] },
  { label: "25 × 25 m", width: 25, height: 25, sport: ["hoopers"] },
  { label: "30 × 30 m", width: 30, height: 30, sport: ["hoopers"] },
  { label: "35 × 35 m", width: 35, height: 35, sport: ["hoopers"] },
  { label: "20 × 40 m", width: 20, height: 40, sport: ["hoopers"] },
  { label: "30 × 40 m", width: 30, height: 40, sport: ["hoopers"] },
];

export function getArenaPresetsBySport(sport: Sport): ArenaPreset[] {
  return ARENA_PRESETS.filter((p) => p.sport.includes(sport));
}

