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
  /** Tunnelns fysiska längd (m). */
  lengthM?: number;
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
      { type: "start", x: 3.25, y: 33.63, rotation: -25 },
      { type: "jump", x: 6.15, y: 32.28, rotation: -136, number: 1 },
      { type: "jump", x: 12.68, y: 28.50, rotation: -176, number: 2 },
      { type: "tunnel", x: 21.07, y: 27.93, rotation: 16, number: 3 },
      { type: "jump", x: 22.55, y: 22.21, rotation: -259, number: 4 },
      { type: "dogwalk", x: 21.72, y: 10.49, rotation: -178, number: 5 },
      { type: "jump", x: 15.35, y: 5.74, rotation: -129, number: 6 },
      { type: "jump", x: 8.96, y: 9.47, rotation: 132, number: 7 },
      { type: "weave_12", x: 5.16, y: 17.93, rotation: 2, number: 8 },
      { type: "jump", x: 6.64, y: 27.87, rotation: 17, number: 9 },
      { type: "aframe", x: 14.12, y: 34.06, rotation: -48, number: 10 },
      { type: "jump", x: 20.80, y: 32.05, rotation: -265, number: 11 },
      { type: "tunnel", x: 24.70, y: 25.23, rotation: -73, number: 12 },
      { type: "jump", x: 24.26, y: 17.19, rotation: -96, number: 13 },
      { type: "seesaw", x: 18.22, y: 10.07, rotation: -223, number: 14 },
      { type: "jump", x: 11.40, y: 4.32, rotation: -26, number: 15 },
      { type: "wall", x: 5.61, y: 8.62, rotation: 66, number: 16 },
      { type: "jump", x: 2.27, y: 13.83, rotation: -191, number: 17 },
      { type: "jump", x: 2.30, y: 20.74, rotation: -5, number: 18 },
      { type: "finish", x: 2.30, y: 23.94, rotation: 90 },
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
      { type: "start", x: 5.32, y: 33.78, rotation: 0 },
      { type: "jump", x: 8.52, y: 33.78, rotation: -50, number: 1 },
      { type: "jump", x: 12.92, y: 29.39, rotation: -108, number: 2 },
      { type: "tunnel", x: 21.88, y: 30.11, rotation: 28, number: 3 },
      { type: "jump", x: 24.28, y: 24.72, rotation: -127, number: 4 },
      { type: "dogwalk", x: 16.47, y: 14.93, rotation: -228, number: 5 },
      { type: "jump", x: 16.28, y: 6.04, rotation: -245, number: 6 },
      { type: "combo", x: 10.11, y: 9.99, rotation: -292, number: 7 },
      { type: "jump", x: 2.59, y: 11.14, rotation: 30, number: 8 },
      { type: "weave_12", x: 3.49, y: 21.03, rotation: -1, number: 9 },
      { type: "jump", x: 9.54, y: 27.69, rotation: 68, number: 10 },
      { type: "aframe", x: 17.82, y: 26.62, rotation: -100, number: 11 },
      { type: "jump", x: 25.18, y: 22.46, rotation: 13, number: 12 },
      { type: "tunnel", x: 27.16, y: 15.20, rotation: -46, number: 13 },
      { type: "jump", x: 28.15, y: 7.85, rotation: -113, number: 14 },
      { type: "seesaw", x: 20.72, y: 5.87, rotation: -245, number: 15 },
      { type: "wall", x: 12.63, y: 4.25, rotation: -288, number: 16 },
      { type: "jump", x: 7.57, y: 9.32, rotation: 149, number: 17 },
      { type: "longjump", x: 5.55, y: 16.33, rotation: 8, number: 18 },
      { type: "jump", x: 9.55, y: 23.45, rotation: -223, number: 19 },
      { type: "finish", x: 10.90, y: 26.35, rotation: 65 },
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
      { type: "start", x: 8.26, y: 34.75, rotation: -80 },
      { type: "jump", x: 8.82, y: 31.60, rotation: -247, number: 1 },
      { type: "tire", x: 14.05, y: 26.77, rotation: -138, number: 2 },
      { type: "jump", x: 16.29, y: 20.20, rotation: -12, number: 3 },
      { type: "tunnel", x: 23.52, y: 18.82, rotation: 20, number: 4 },
      { type: "dogwalk", x: 22.55, y: 6.87, rotation: -180, number: 5 },
      { type: "jump", x: 16.19, y: 3.89, rotation: -138, number: 6 },
      { type: "combo", x: 9.25, y: 5.66, rotation: 78, number: 7 },
      { type: "jump", x: 2.96, y: 9.09, rotation: 50, number: 8 },
      { type: "weave_12", x: 7.30, y: 18.73, rotation: -33, number: 9 },
      { type: "jump", x: 5.45, y: 27.41, rotation: -30, number: 10 },
      { type: "aframe", x: 12.67, y: 32.25, rotation: -47, number: 11 },
      { type: "longjump", x: 21.52, y: 32.91, rotation: -81, number: 12 },
      { type: "jump", x: 26.28, y: 27.28, rotation: -201, number: 13 },
      { type: "tunnel", x: 27.02, y: 18.96, rotation: -103, number: 14 },
      { type: "seesaw", x: 24.85, y: 8.84, rotation: -196, number: 15 },
      { type: "jump", x: 18.90, y: 3.62, rotation: -217, number: 16 },
      { type: "wall", x: 12.15, y: 4.63, rotation: 101, number: 17 },
      { type: "combo", x: 6.44, y: 7.71, rotation: 47, number: 18 },
      { type: "jump", x: 4.94, y: 14.14, rotation: -31, number: 19 },
      { type: "jump", x: 2.37, y: 20.16, rotation: -31, number: 20 },
      { type: "finish", x: 1.81, y: 23.31, rotation: 100 },
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
      { type: "start", x: 3.67, y: 24.19, rotation: 0 },
      { type: "handler_zone", x: 15.00, y: 15.00, rotation: 0 },
      { type: "hoop", x: 7.67, y: 20.19, rotation: -32, number: 1 },
      { type: "hoop", x: 12.84, y: 22.36, rotation: 78, number: 2 },
      { type: "hoop", x: 18.06, y: 22.80, rotation: 4, number: 3 },
      { type: "tunnel", x: 21.41, y: 17.98, rotation: -23, number: 4 },
      { type: "hoop", x: 21.75, y: 12.56, rotation: 81, number: 5 },
      { type: "barrel", x: 16.69, y: 8.73, rotation: 41, number: 6 },
      { type: "hoop", x: 10.07, y: 7.71, rotation: -117, number: 7 },
      { type: "hoop", x: 8.01, y: 13.82, rotation: 39, number: 8 },
      { type: "tunnel", x: 12.29, y: 8.88, rotation: -284, number: 9 },
      { type: "hoop", x: 15.54, y: 4.03, rotation: -48, number: 10 },
      { type: "finish", x: 23.54, y: 4.03, rotation: 0 },
    ],
  },
];

export function getPrebuiltsBySport(sport: Sport): PrebuiltCourse[] {
  return PREBUILT_COURSES.filter((p) => p.sport === sport);
}
