/**
 * Sprint 1 — Banplaneraren v2
 * Konfiguration för sport, hindertyper, storleksklasser och klassmallar.
 * Källor: SAgiK regelverk 2022–2026 (agility) och SHoK 2022→ (hoopers).
 *
 * OBS: Hoopers-paletten och hoopers-klassmallar finns i datat men exponeras
 * först i Sprint 3. Sprint 1 fokuserar på agility.
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
  { key: "XS", label: "XS", jumpHeightCm: [20, 30], tireHeightCm: [35, 45], longJumpPlanks: 2, longJumpLengthCm: [40, 50], comboDistanceM: 2.0 },
  { key: "S",  label: "S",  jumpHeightCm: [25, 35], tireHeightCm: [45, 55], longJumpPlanks: 2, longJumpLengthCm: [40, 50], comboDistanceM: 2.5 },
  { key: "M",  label: "M",  jumpHeightCm: [35, 45], tireHeightCm: [55, 65], longJumpPlanks: 3, longJumpLengthCm: [70, 90], comboDistanceM: 3.0 },
  { key: "L",  label: "L",  jumpHeightCm: [45, 55], tireHeightCm: [65, 80], longJumpPlanks: 4, longJumpLengthCm: [120, 150], comboDistanceM: 4.0 },
  { key: "XL", label: "XL", jumpHeightCm: [55, 65], tireHeightCm: [75, 85], longJumpPlanks: 5, longJumpLengthCm: [120, 150], comboDistanceM: 4.0 },
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
  { type: "jump",     label: "Hopp",       category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 0.4 }, allowedInJumpClass: true,  description: "Enkel ribba mellan två stolpar" },
  { type: "wall",     label: "Mur",        category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 0.5 }, allowedInJumpClass: true,  description: "Mur / viadukt" },
  { type: "longjump", label: "Långhopp",   category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 1.5 }, allowedInJumpClass: true,  description: "Sluttande plankor, antal styrs av storleksklass" },
  { type: "tire",     label: "Däck",       category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.0, d: 1.0 }, allowedInJumpClass: true,  description: "Däck med innerdiameter 45–60 cm" },
  { type: "combo",    label: "Kombination", category: "Hopphinder", sport: ["agility"], sizeM: { w: 1.4, d: 0.6 }, allowedInJumpClass: true, description: "Oxer / dubbelhopp, max 3 i rad" },

  // Tunnlar
  { type: "tunnel",   label: "Tunnel",     category: "Tunnlar",    sport: ["agility", "hoopers"], sizeM: { w: 3.0, d: 0.6 }, allowedInJumpClass: true, description: "Böjbar tunnel, 0–180°" },

  // Slalom
  { type: "weave_8",  label: "Slalom 8",   category: "Slalom", sport: ["agility"], sizeM: { w: 0.4, d: 4.2 }, allowedInJumpClass: false, description: "Slalom med 8 pinnar" },
  { type: "weave_10", label: "Slalom 10",  category: "Slalom", sport: ["agility"], sizeM: { w: 0.4, d: 5.4 }, allowedInJumpClass: false, description: "Slalom med 10 pinnar" },
  { type: "weave_12", label: "Slalom 12",  category: "Slalom", sport: ["agility"], sizeM: { w: 0.4, d: 6.6 }, allowedInJumpClass: false, description: "Slalom med 12 pinnar (default)" },

  // Balans (kontaktfält)
  { type: "aframe",   label: "A-hinder",   category: "Balans", sport: ["agility"], sizeM: { w: 0.9, d: 2.7 }, allowedInJumpClass: false, hasContactZone: true, description: "A-hinder, sidor 270 cm" },
  { type: "dogwalk",  label: "Balansbom",  category: "Balans", sport: ["agility"], sizeM: { w: 0.3, d: 3.6 }, allowedInJumpClass: false, hasContactZone: true, description: "Tre sektioner, kontaktfält i ändarna" },
  { type: "seesaw",   label: "Gungbräda",  category: "Balans", sport: ["agility"], sizeM: { w: 0.3, d: 3.6 }, allowedInJumpClass: false, hasContactZone: true, description: "Vippbräda, kontaktfält i ändarna" },

  // Bord
  { type: "table",    label: "Bord",       category: "Bord",   sport: ["agility"], sizeM: { w: 1.0, d: 1.0 }, allowedInJumpClass: false, description: "Bord 90–120 cm sida" },

  // Bankontroll
  { type: "start",    label: "Start",      category: "Bankontroll", sport: ["agility", "hoopers"], sizeM: { w: 1.2, d: 0.2 }, allowedInJumpClass: true, description: "Startlinje" },
  { type: "finish",   label: "Mål",        category: "Bankontroll", sport: ["agility", "hoopers"], sizeM: { w: 1.2, d: 0.2 }, allowedInJumpClass: true, description: "Mållinje" },
  { type: "number",   label: "Nummer",     category: "Bankontroll", sport: ["agility", "hoopers"], sizeM: { w: 0.3, d: 0.3 }, allowedInJumpClass: true, description: "Numreringspunkt fristående från hinder" },

  // Hoopers (data finns men palett exponeras i Sprint 3)
  { type: "hoop",         label: "Hoop",            category: "Hoopers",  sport: ["hoopers"], sizeM: { w: 0.9, d: 0.4 }, allowedInJumpClass: true, description: "Båge, 88 cm bred" },
  { type: "barrel",       label: "Tunna",           category: "Hoopers",  sport: ["hoopers"], sizeM: { w: 0.6, d: 0.6 }, allowedInJumpClass: true, description: "Tunna, ~60 cm diameter" },
  { type: "fence",        label: "Staket",          category: "Hoopers",  sport: ["hoopers"], sizeM: { w: 1.2, d: 0.1 }, allowedInJumpClass: true, description: "Staket / grind, passeras bakom" },
  { type: "handler_zone", label: "Dirigeringsområde", category: "Områden", sport: ["hoopers"], sizeM: { w: 4.0, d: 4.0 }, allowedInJumpClass: true, description: "Förarens dirigeringsområde" },
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
  // Hoopers
  | "hoopers_1" | "hoopers_2" | "hoopers_3" | "hoopers_4";

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
}

const CONTACT_TYPES: ObstacleTypeV2[] = ["aframe", "dogwalk", "seesaw"];

export const CLASS_TEMPLATES: ClassTemplate[] = [
  // Hoppklasser — inga balanshinder
  { key: "agility_hopp_1", sport: "agility", label: "Hoppklass 1", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 18], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, "table"], refSpeedMs: 3.5, maxTimeFactor: 1.5, description: "Endast hopp, tunnel och slalom" },
  { key: "agility_hopp_2", sport: "agility", label: "Hoppklass 2", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [16, 20], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, "table"], refSpeedMs: 4.0, maxTimeFactor: 1.5, description: "Hopp, tunnel, slalom" },
  { key: "agility_hopp_3", sport: "agility", label: "Hoppklass 3", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [18, 20], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, "table"], refSpeedMs: 4.5, maxTimeFactor: 1.5, description: "Hopp, tunnel, slalom — högsta nivån" },
  // Agilityklasser — alla hinder
  { key: "agility_1", sport: "agility", label: "Agilityklass 1", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 18], defaultSize: "L", refSpeedMs: 2.5, maxTimeFactor: 1.5, description: "Alla hindertyper" },
  { key: "agility_2", sport: "agility", label: "Agilityklass 2", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [16, 20], defaultSize: "L", refSpeedMs: 3.0, maxTimeFactor: 1.5, description: "Alla hindertyper, högre tempo" },
  { key: "agility_3", sport: "agility", label: "Agilityklass 3", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [18, 20], defaultSize: "L", refSpeedMs: 3.5, maxTimeFactor: 1.5, description: "Alla hindertyper, högsta nivån" },
  // Hopplagklass
  { key: "agility_hopplag", sport: "agility", label: "Hopplagklass", arenaWidthM: 30, arenaHeightM: 40, obstacleRange: [15, 18], defaultSize: "L", forbiddenTypes: [...CONTACT_TYPES, "table"], refSpeedMs: 4.0, maxTimeFactor: 1.5, description: "Lagklass utan balanshinder" },
  // Nollklass
  { key: "noll_slalom", sport: "agility", label: "Nollklass — slalom", arenaWidthM: 25, arenaHeightM: 30, obstacleRange: [12, 14], defaultSize: "L", allowedTypes: ["jump", "wall", "tunnel", "weave_8", "weave_10", "weave_12", "start", "finish", "number"], refSpeedMs: 2.5, maxTimeFactor: 1.8, description: "Tränings­klass med fokus på slalom" },
  { key: "noll_balans", sport: "agility", label: "Nollklass — balansbom", arenaWidthM: 25, arenaHeightM: 30, obstacleRange: [12, 14], defaultSize: "L", allowedTypes: ["jump", "tunnel", "dogwalk", "start", "finish", "number"], refSpeedMs: 2.0, maxTimeFactor: 1.8, description: "Tränings­klass med fokus på balansbom" },
  { key: "noll_mur",    sport: "agility", label: "Nollklass — mur/långhopp", arenaWidthM: 25, arenaHeightM: 30, obstacleRange: [12, 14], defaultSize: "L", allowedTypes: ["jump", "wall", "longjump", "tunnel", "start", "finish", "number"], refSpeedMs: 2.5, maxTimeFactor: 1.8, description: "Tränings­klass med fokus på hopptyper" },
  // Hoopers (data, exponeras Sprint 3)
  { key: "hoopers_1", sport: "hoopers", label: "Hoopers klass 1", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [10, 14], defaultSize: "L", allowedTypes: ["hoop", "tunnel", "barrel", "fence", "handler_zone", "start", "finish", "number"], refSpeedMs: 2.0, maxTimeFactor: 2.0, description: "Inledande klass" },
  { key: "hoopers_2", sport: "hoopers", label: "Hoopers klass 2", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [12, 16], defaultSize: "L", allowedTypes: ["hoop", "tunnel", "barrel", "fence", "handler_zone", "start", "finish", "number"], refSpeedMs: 2.2, maxTimeFactor: 2.0, description: "Mer riktningsbyten" },
  { key: "hoopers_3", sport: "hoopers", label: "Hoopers klass 3", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [14, 18], defaultSize: "L", allowedTypes: ["hoop", "tunnel", "barrel", "fence", "handler_zone", "start", "finish", "number"], refSpeedMs: 2.4, maxTimeFactor: 2.0, description: "Större avstånd" },
  { key: "hoopers_4", sport: "hoopers", label: "Hoopers klass 4", arenaWidthM: 30, arenaHeightM: 30, obstacleRange: [16, 20], defaultSize: "L", allowedTypes: ["hoop", "tunnel", "barrel", "fence", "handler_zone", "start", "finish", "number"], refSpeedMs: 2.6, maxTimeFactor: 2.0, description: "Högsta klassen" },
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

export const ARENA_PRESETS = [
  { label: "15 × 30 m", width: 15, height: 30 },
  { label: "25 × 30 m", width: 25, height: 30 },
  { label: "30 × 40 m", width: 30, height: 40 },
  { label: "40 × 30 m", width: 40, height: 30 },
];
