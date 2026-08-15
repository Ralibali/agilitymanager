/**
 * AgilityManagers förbyggda banor.
 *
 * Svenska tävlingsbanor här är EGNA original — inte kopior av domarkartor.
 * De är konstruerade efter SAgiK/SKK 2022–2026 §3.1 och kontrolleras i test
 * av officialCourseQuality.ts mot maskinellt verifierbara kärnregler:
 * 15–22 passager, start/slut med hopp, minst sju hoppassager, 6–8 m
 * beräknad hundväg mellan följdhinder, rak ansats till berörda hinder,
 * max ett slalom, klassbegränsningar och bankantsmarginal.
 *
 * Koordinater är meter (0,0 = övre vänstra hörnet).
 */
import type { ClassTemplateKey, ObstacleTypeV2, Sport, SizeClassKey } from "./config";

export interface PrebuiltObstacle {
  type: ObstacleTypeV2;
  x: number;
  y: number;
  rotation: number;
  number?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
}

export interface PrebuiltCourse {
  key: string;
  label: string;
  sport: Sport;
  classTemplate: ClassTemplateKey;
  arenaWidthM: number;
  arenaHeightM: number;
  defaultSize: SizeClassKey;
  description: string;
  focus?: string[];
  /** Visas i biblioteket; tävlingsbanor verifieras också maskinellt i CI. */
  qualityLabel?: string;
  obstacles: PrebuiltObstacle[];
}

function uid() { return Math.random().toString(36).slice(2, 10); }
export function instantiatePrebuilt(p: PrebuiltCourse) {
  return p.obstacles.map((o) => ({ ...o, id: uid() }));
}

export const PREBUILT_COURSES: PrebuiltCourse[] = [
  {
    key: "sv_hopp_1_flow_01",
    label: "Hoppklass 1 — Mjukt flow",
    sport: "agility",
    classTemplate: "agility_hopp_1",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "18 passager med tydlig rytm, mjuka riktningsbyten och raka ansatser till långhopp och däck.",
    focus: ["flow", "grundhandling", "linjer"],
    qualityLabel: "Kontrollerad mot svenska klassregler",
    obstacles: [
      { type: "start", x: 4.74, y: 35.26, rotation: -45 },
      { type: "jump", x: 7, y: 33, rotation: -135, number: 1 },
      { type: "jump", x: 12.24, y: 27.76, rotation: -135, number: 2 },
      { type: "wall", x: 18.34, y: 23.49, rotation: -125, number: 3 },
      { type: "jump", x: 22.13, y: 16.93, rotation: -150, number: 4 },
      { type: "longjump", x: 18.94, y: 10.10, rotation: -205, number: 5 },
      { type: "jump", x: 14.81, y: 4.19, rotation: -215, number: 6 },
      { type: "jump", x: 7.49, y: 4.19, rotation: -270, number: 7 },
      { type: "tire", x: 3.12, y: 10.43, rotation: 35, number: 8 },
      { type: "jump", x: 3.77, y: 17.84, rotation: -5, number: 9 },
      { type: "jump", x: 7.59, y: 24.46, rotation: -30, number: 10 },
      { type: "jump", x: 15.12, y: 25.12, rotation: -85, number: 11 },
      { type: "wall", x: 22.52, y: 24.47, rotation: -95, number: 12 },
      { type: "jump", x: 26.15, y: 18.18, rotation: -150, number: 13 },
      { type: "jump", x: 26.82, y: 10.54, rotation: -175, number: 14 },
      { type: "longjump", x: 21.26, y: 5.88, rotation: -230, number: 15 },
      { type: "jump", x: 13.96, y: 7.84, rotation: 75, number: 16 },
      { type: "jump", x: 11.47, y: 14.66, rotation: 20, number: 17 },
      { type: "jump", x: 15.79, y: 20.82, rotation: -35, number: 18 },
      { type: "finish", x: 17.63, y: 23.44, rotation: 55 },
    ],
  },
  {
    key: "sv_agility_1_balans_01",
    label: "Agilityklass 1 — Balans & flyt",
    sport: "agility",
    classTemplate: "agility_1",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "18 passager med tunnel, balansbom, slalom, A-hinder och gungbräda placerade för naturliga och raka ansatser.",
    focus: ["kontaktfält", "flow", "slalom"],
    qualityLabel: "Kontrollerad mot svenska klassregler",
    obstacles: [
      { type: "start", x: 4.10, y: 34.35, rotation: -25 },
      { type: "jump", x: 7, y: 33, rotation: -115, number: 1 },
      { type: "jump", x: 13.21, y: 30.10, rotation: -115, number: 2 },
      { type: "tunnel", x: 21.14, y: 27.98, rotation: -15, number: 3 },
      { type: "jump", x: 25.93, y: 21.13, rotation: -145, number: 4 },
      { type: "dogwalk", x: 25.17, y: 12.47, rotation: -185, number: 5 },
      { type: "jump", x: 17.71, y: 8.16, rotation: -240, number: 6 },
      { type: "jump", x: 10.76, y: 9.38, rotation: 80, number: 7 },
      { type: "weave_12", x: 6.54, y: 18.43, rotation: 25, number: 8 },
      { type: "jump", x: 6.54, y: 28.55, rotation: 0, number: 9 },
      { type: "aframe", x: 13.23, y: 33.23, rotation: -55, number: 10 },
      { type: "jump", x: 21.20, y: 32.53, rotation: -95, number: 11 },
      { type: "tunnel", x: 25.32, y: 25.41, rotation: -60, number: 12 },
      { type: "jump", x: 23.85, y: 17.10, rotation: -190, number: 13 },
      { type: "seesaw", x: 20.97, y: 9.16, rotation: -200, number: 14 },
      { type: "jump", x: 13.64, y: 4.93, rotation: -240, number: 15 },
      { type: "wall", x: 6.68, y: 6.16, rotation: 80, number: 16 },
      { type: "jump", x: 3.67, y: 12.61, rotation: 25, number: 17 },
      { type: "jump", x: 3.67, y: 19.54, rotation: 0, number: 18 },
      { type: "finish", x: 3.67, y: 22.74, rotation: 90 },
    ],
  },
  {
    key: "sv_hopp_2_teknik_01",
    label: "Hoppklass 2 — Teknik & rytm",
    sport: "agility",
    classTemplate: "agility_hopp_2",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "19 passager med tunnel, slalom, däck, långhopp och oxer i ett snabbare men läsbart klass 2-flöde.",
    focus: ["teknik", "slalom", "tempoväxling"],
    qualityLabel: "Kontrollerad mot svenska klassregler",
    obstacles: [
      { type: "start", x: 6.44, y: 36.15, rotation: -80 },
      { type: "jump", x: 7, y: 33, rotation: -170, number: 1 },
      { type: "jump", x: 8.24, y: 25.96, rotation: -170, number: 2 },
      { type: "tunnel", x: 9.67, y: 17.83, rotation: -80, number: 3 },
      { type: "jump", x: 7.56, y: 9.95, rotation: -195, number: 4 },
      { type: "combo", x: 12.18, y: 4.45, rotation: -140, number: 5 },
      { type: "jump", x: 19.13, y: 5.05, rotation: -85, number: 6 },
      { type: "weave_12", x: 24.10, y: 13.67, rotation: -30, number: 7 },
      { type: "jump", x: 22.37, y: 23.49, rotation: 10, number: 8 },
      { type: "tire", x: 19.93, y: 30.18, rotation: 20, number: 9 },
      { type: "jump", x: 14.78, y: 35.33, rotation: 45, number: 10 },
      { type: "wall", x: 7.79, y: 35.95, rotation: 85, number: 11 },
      { type: "jump", x: 3.33, y: 30.64, rotation: -220, number: 12 },
      { type: "tunnel", x: 5.45, y: 22.71, rotation: -75, number: 13 },
      { type: "jump", x: 8.98, y: 15.14, rotation: -155, number: 14 },
      { type: "longjump", x: 16.53, y: 13.81, rotation: -100, number: 15 },
      { type: "jump", x: 21.84, y: 19.11, rotation: -45, number: 16 },
      { type: "combo", x: 25.84, y: 24.83, rotation: -35, number: 17 },
      { type: "jump", x: 25.21, y: 31.94, rotation: 5, number: 18 },
      { type: "jump", x: 19.31, y: 35.35, rotation: 60, number: 19 },
      { type: "finish", x: 16.54, y: 36.95, rotation: 150 },
    ],
  },
  {
    key: "sv_agility_2_handling_01",
    label: "Agilityklass 2 — Handling & kontakt",
    sport: "agility",
    classTemplate: "agility_2",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "19 passager med två tunnlar, balansbom, slalom, A-hinder, gungbräda, oxer och långhopp.",
    focus: ["handling", "kontaktfält", "teknik"],
    qualityLabel: "Kontrollerad mot svenska klassregler",
    obstacles: [
      { type: "start", x: 3.80, y: 33, rotation: 0 },
      { type: "jump", x: 7, y: 33, rotation: -90, number: 1 },
      { type: "jump", x: 13.85, y: 33, rotation: -90, number: 2 },
      { type: "tunnel", x: 21.54, y: 29.41, rotation: -25, number: 3 },
      { type: "jump", x: 25, y: 22, rotation: -155, number: 4 },
      { type: "dogwalk", x: 20.76, y: 14.65, rotation: -210, number: 5 },
      { type: "jump", x: 16.51, y: 7.30, rotation: -210, number: 6 },
      { type: "combo", x: 9.51, y: 6.68, rotation: -265, number: 7 },
      { type: "jump", x: 3.83, y: 10.66, rotation: 55, number: 8 },
      { type: "weave_12", x: 3.83, y: 20.66, rotation: 0, number: 9 },
      { type: "jump", x: 8.02, y: 29.64, rotation: -25, number: 10 },
      { type: "aframe", x: 16.21, y: 31.08, rotation: -80, number: 11 },
      { type: "jump", x: 22, y: 25.29, rotation: -135, number: 12 },
      { type: "tunnel", x: 26.67, y: 18.63, rotation: -55, number: 13 },
      { type: "jump", x: 25.94, y: 10.29, rotation: -185, number: 14 },
      { type: "seesaw", x: 19.94, y: 4.29, rotation: -225, number: 15 },
      { type: "wall", x: 11.23, y: 3.53, rotation: -265, number: 16 },
      { type: "jump", x: 5.31, y: 7.67, rotation: 55, number: 17 },
      { type: "longjump", x: 3.33, y: 15.07, rotation: 15, number: 18 },
      { type: "jump", x: 6.53, y: 21.94, rotation: -25, number: 19 },
      { type: "finish", x: 7.88, y: 24.84, rotation: 65 },
    ],
  },
  {
    key: "sv_hopp_3_fart_01",
    label: "Hoppklass 3 — Fart & linjeval",
    sport: "agility",
    classTemplate: "agility_hopp_3",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "20 passager med högre fart, två däckpassager, tunnel, slalom, oxrar och långhopp med säkra ansatser.",
    focus: ["fart", "linjeval", "avancerad handling"],
    qualityLabel: "Kontrollerad mot svenska klassregler",
    obstacles: [
      { type: "start", x: 3.91, y: 32.17, rotation: 15 },
      { type: "jump", x: 7, y: 33, rotation: -75, number: 1 },
      { type: "tire", x: 14.06, y: 34.89, rotation: -75, number: 2 },
      { type: "jump", x: 21.17, y: 35.51, rotation: -85, number: 3 },
      { type: "tunnel", x: 26.51, y: 29.15, rotation: -50, number: 4 },
      { type: "jump", x: 26.51, y: 20.90, rotation: -180, number: 5 },
      { type: "combo", x: 25.30, y: 14.02, rotation: -190, number: 6 },
      { type: "jump", x: 21.29, y: 8.30, rotation: -215, number: 7 },
      { type: "weave_12", x: 11.22, y: 8.30, rotation: -270, number: 8 },
      { type: "jump", x: 3.52, y: 14.76, rotation: 50, number: 9 },
      { type: "longjump", x: 4.16, y: 22.12, rotation: -5, number: 10 },
      { type: "jump", x: 4.83, y: 29.79, rotation: -5, number: 11 },
      { type: "tunnel", x: 10.59, y: 35.55, rotation: 45, number: 12 },
      { type: "wall", x: 18.99, y: 34.07, rotation: -100, number: 13 },
      { type: "jump", x: 23.56, y: 28.62, rotation: -140, number: 14 },
      { type: "combo", x: 21.73, y: 21.82, rotation: -195, number: 15 },
      { type: "jump", x: 26.24, y: 16.45, rotation: -140, number: 16 },
      { type: "jump", x: 26.24, y: 9.59, rotation: -180, number: 17 },
      { type: "tire", x: 21.51, y: 3.96, rotation: -220, number: 18 },
      { type: "jump", x: 14.41, y: 4.58, rotation: 85, number: 19 },
      { type: "jump", x: 7.63, y: 5.17, rotation: 85, number: 20 },
      { type: "finish", x: 4.44, y: 5.45, rotation: 175 },
    ],
  },
  {
    key: "sv_agility_3_master_01",
    label: "Agilityklass 3 — Mästerskapsflow",
    sport: "agility",
    classTemplate: "agility_3",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "20 passager med varierad fart, kontaktfält, slalom, långhopp, tunnlar och oxrar i ett avancerat men säkerhetsorienterat flöde.",
    focus: ["avancerad handling", "kontaktfält", "fart"],
    qualityLabel: "Kontrollerad mot svenska klassregler",
    obstacles: [
      { type: "start", x: 6.44, y: 36.15, rotation: -80 },
      { type: "jump", x: 7, y: 33, rotation: -170, number: 1 },
      { type: "tire", x: 8.24, y: 25.98, rotation: -170, number: 2 },
      { type: "jump", x: 14.90, y: 22.87, rotation: -115, number: 3 },
      { type: "tunnel", x: 21.79, y: 18.05, rotation: -35, number: 4 },
      { type: "dogwalk", x: 21.79, y: 8.33, rotation: -180, number: 5 },
      { type: "jump", x: 14.67, y: 3.34, rotation: -235, number: 6 },
      { type: "combo", x: 7.52, y: 3.97, rotation: 85, number: 7 },
      { type: "jump", x: 4.03, y: 10.02, rotation: 30, number: 8 },
      { type: "weave_12", x: 5.76, y: 19.83, rotation: -10, number: 9 },
      { type: "jump", x: 5.76, y: 29.95, rotation: 0, number: 10 },
      { type: "aframe", x: 12.48, y: 34.66, rotation: -55, number: 11 },
      { type: "longjump", x: 21.09, y: 33.91, rotation: -95, number: 12 },
      { type: "jump", x: 24.94, y: 27.25, rotation: -150, number: 13 },
      { type: "tunnel", x: 25.67, y: 18.88, rotation: -85, number: 14 },
      { type: "seesaw", x: 26.53, y: 9.05, rotation: -175, number: 15 },
      { type: "jump", x: 19.97, y: 3.55, rotation: -230, number: 16 },
      { type: "wall", x: 12.99, y: 5.42, rotation: 75, number: 17 },
      { type: "combo", x: 7.56, y: 9.97, rotation: 50, number: 18 },
      { type: "jump", x: 6.31, y: 17.07, rotation: 10, number: 19 },
      { type: "jump", x: 5.11, y: 23.90, rotation: 10, number: 20 },
      { type: "finish", x: 4.55, y: 27.05, rotation: 100 },
    ],
  },
  {
    key: "hoopers_1_basic",
    label: "Hoopers startklass — Grund",
    sport: "hoopers",
    classTemplate: "hoopers_1",
    arenaWidthM: 30,
    arenaHeightM: 30,
    defaultSize: "L",
    description: "Mjuk hoopers-bana med hoopar, tunna och tunnel. Hoopers kvalitetssäkras mot sitt separata regelverk.",
    focus: ["grundlinjer", "distans"],
    qualityLabel: "Hoopers — separat regelprofil",
    obstacles: [
      { type: "start", x: 4, y: 26, rotation: 0 },
      { type: "handler_zone", x: 15, y: 15, rotation: 0 },
      { type: "hoop", x: 8, y: 22, rotation: 0, number: 1 },
      { type: "hoop", x: 14, y: 24, rotation: 0, number: 2 },
      { type: "hoop", x: 20, y: 22, rotation: 0, number: 3 },
      { type: "tunnel", x: 24, y: 18, rotation: 90, number: 4 },
      { type: "hoop", x: 22, y: 12, rotation: 0, number: 5 },
      { type: "barrel", x: 16, y: 8, rotation: 0, number: 6 },
      { type: "hoop", x: 10, y: 10, rotation: 0, number: 7 },
      { type: "hoop", x: 6, y: 14, rotation: 0, number: 8 },
      { type: "tunnel", x: 8, y: 6, rotation: 0, number: 9 },
      { type: "hoop", x: 18, y: 4, rotation: 0, number: 10 },
      { type: "finish", x: 26, y: 4, rotation: 0 },
    ],
  },
];

export function getPrebuiltsBySport(sport: Sport): PrebuiltCourse[] {
  return PREBUILT_COURSES.filter((p) => p.sport === sport);
}
