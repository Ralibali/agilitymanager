import type { ObstacleTypeV2 } from "./config";
import type { PrebuiltCourse, PrebuiltObstacle } from "./templates";

type SeqItem = { type: ObstacleTypeV2; x: number; y: number; curveDeg?: number; curveSide?: "left" | "right" };
type Point = readonly [number, number];
type NollKind = "mur" | "slalom" | "balans";
type NollSize = "large" | "compact";

function angleDeg(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function rotationFor(type: ObstacleTypeV2, travelDeg: number): number {
  // Tunnel färdas längs width-axeln. Övriga agilityhinder i dogPath.ts färdas
  // längs depth-axeln, dvs lokal +Y = rotation + 90°.
  return type === "tunnel" ? travelDeg : travelDeg - 90;
}

function offsetAlong(from: { x: number; y: number }, to: { x: number; y: number }, metres: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * metres, y: from.y + (dy / length) * metres };
}

function buildObstacles(sequence: SeqItem[]): PrebuiltObstacle[] {
  const numbered = sequence.map<PrebuiltObstacle>((item, index) => {
    const prev = sequence[index - 1];
    const next = sequence[index + 1];
    const travel = prev ? angleDeg(prev, item) : next ? angleDeg(item, next) : 0;
    return { ...item, rotation: rotationFor(item.type, travel), number: index + 1 };
  });

  const first = sequence[0];
  const second = sequence[1];
  const penultimate = sequence[sequence.length - 2];
  const last = sequence[sequence.length - 1];
  const start = offsetAlong(first, second, -2);
  const finish = offsetAlong(penultimate, last, 2);

  return [
    { type: "start", x: start.x, y: start.y, rotation: angleDeg(first, second) },
    ...numbered,
    { type: "finish", x: finish.x, y: finish.y, rotation: angleDeg(penultimate, last) },
  ];
}

const LARGE_BASE: Omit<PrebuiltCourse, "key" | "label" | "description" | "focus" | "qualityLabel" | "classTemplate" | "obstacles"> = {
  sport: "agility",
  arenaWidthM: 25,
  arenaHeightM: 30,
  defaultSize: "L",
};

const COMPACT_BASE: Omit<PrebuiltCourse, "key" | "label" | "description" | "focus" | "qualityLabel" | "classTemplate" | "obstacles"> = {
  sport: "agility",
  arenaWidthM: 15,
  arenaHeightM: 30,
  defaultSize: "L",
};

const MUR_TYPES: ObstacleTypeV2[] = [
  "jump", "jump", "tunnel", "jump", "longjump", "jump", "tunnel",
  "jump", "jump", "tunnel", "jump", "jump", "jump",
];
const SLALOM_TYPES: ObstacleTypeV2[] = [
  "jump", "jump", "tunnel", "jump", "weave_12", "jump", "tunnel",
  "jump", "jump", "tunnel", "jump", "jump", "jump",
];
const BALANS_TYPES: ObstacleTypeV2[] = [
  "jump", "jump", "tunnel", "jump", "dogwalk", "jump", "tunnel",
  "jump", "jump", "tunnel", "jump", "jump", "jump",
];

/**
 * Koordinater i meter. Varje layout är separat optimerad mot V2:s faktiska
 * Catmull-Rom-hundlinje — inte bara centrumavstånd — och hålls isär så att
 * slalom/balans/långhopp får rätt fysiskt utrymme för sina olika footprint.
 */
const POINTS: Record<NollSize, Record<NollKind, readonly Point[]>> = {
  large: {
    mur: [
      [6.50, 22.50], [13.20, 22.20], [20.30, 18.00], [20.40, 9.40], [13.10, 5.20],
      [5.20, 6.60], [3.20, 14.20], [7.00, 20.30], [13.50, 20.20], [9.74, 13.05],
      [10.46, 18.46], [16.66, 21.70], [15.81, 15.00],
    ],
    slalom: [
      [6.50, 22.50], [13.20, 22.20], [20.30, 18.00], [15.78, 13.70], [5.74, 12.18],
      [7.41, 16.39], [8.41, 24.72], [6.74, 19.56], [13.50, 20.20], [5.20, 17.59],
      [2.70, 10.44], [7.40, 5.40], [13.79, 2.73],
    ],
    balans: [
      [6.50, 22.50], [13.20, 22.20], [20.30, 18.00], [20.40, 9.40], [13.10, 5.20],
      [5.20, 6.60], [3.20, 14.20], [7.00, 20.30], [13.50, 20.20], [9.74, 13.05],
      [10.46, 18.46], [16.66, 21.70], [15.81, 15.00],
    ],
  },
  compact: {
    mur: [
      [7.50, 22.80], [11.44, 16.76], [8.07, 9.11], [2.86, 12.71], [5.93, 6.08],
      [11.12, 10.18], [6.69, 17.06], [10.18, 23.62], [3.71, 25.82], [9.94, 20.83],
      [7.80, 14.15], [3.58, 8.86], [4.00, 15.50],
    ],
    slalom: [
      [7.50, 22.80], [1.99, 18.27], [6.57, 11.39], [2.85, 4.80], [11.03, 10.22],
      [9.98, 17.68], [3.80, 12.70], [5.34, 17.96], [3.15, 24.52], [9.91, 20.51],
      [10.74, 13.11], [5.29, 8.73], [4.00, 15.50],
    ],
    balans: [
      [7.50, 22.80], [7.21, 15.71], [9.84, 7.72], [3.76, 4.24], [11.69, 2.66],
      [12.96, 9.02], [5.26, 11.66], [5.89, 18.74], [3.96, 25.63], [11.48, 22.76],
      [10.57, 15.87], [7.34, 9.62], [4.00, 15.50],
    ],
  },
};

function seq(points: readonly Point[], types: ObstacleTypeV2[]): SeqItem[] {
  return points.map(([x, y], i) => ({ type: types[i], x, y }));
}

function course(size: NollSize, type: NollKind): PrebuiltCourse {
  const large = size === "large";
  const base = large ? LARGE_BASE : COMPACT_BASE;
  const types = type === "mur" ? MUR_TYPES : type === "slalom" ? SLALOM_TYPES : BALANS_TYPES;
  const points = POINTS[size][type];
  const sizeLabel = large ? "25×30" : "15×30";

  const meta = type === "mur"
    ? {
        key: `noll_2026_mur_${large ? "25x30" : "15x30"}`,
        label: `Nollklass Mur/Långhopp · ${sizeLabel}`,
        classTemplate: "noll_mur" as const,
        description: `AgilityManager-original för Nollklass med 13 passager, vanliga hopp och tunnlar samt långhopp. ${sizeLabel} m, clear round utan tid.`,
        focus: ["Nollklass", "långhopp", "grundhandling", large ? "stor yta" : "kompakt yta"],
      }
    : type === "slalom"
      ? {
          key: `noll_2026_slalom_${large ? "25x30" : "15x30"}`,
          label: `Nollklass Slalom · ${sizeLabel}`,
          classTemplate: "noll_slalom" as const,
          description: `AgilityManager-original för Nollklass med 13 passager, vanliga hopp och tunnlar samt ett 12-pinnars slalom. ${sizeLabel} m, clear round utan tid.`,
          focus: ["Nollklass", "slalom", "ingång", large ? "stor yta" : "kompakt yta"],
        }
      : {
          key: `noll_2026_balans_${large ? "25x30" : "15x30"}`,
          label: `Nollklass Balans · ${sizeLabel}`,
          classTemplate: "noll_balans" as const,
          description: `AgilityManager-original för Nollklass med 13 passager, vanliga hopp och tunnlar samt balansbom. ${sizeLabel} m, clear round utan tid.`,
          focus: ["Nollklass", "balansbom", "kontaktfält", large ? "stor yta" : "kompakt yta"],
        };

  return {
    ...base,
    ...meta,
    qualityLabel: "Kontrollerad mot SAgiK:s Nollklassram 2026 · AgilityManager-original",
    obstacles: buildObstacles(seq(points, types)),
  };
}

export const NOLLKLASS_COURSES: PrebuiltCourse[] = [
  course("large", "mur"),
  course("compact", "mur"),
  course("large", "slalom"),
  course("compact", "slalom"),
  course("large", "balans"),
  course("compact", "balans"),
];
