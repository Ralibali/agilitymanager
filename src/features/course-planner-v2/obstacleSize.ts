/**
 * Banplaneraren v2 — hindrets verkliga fotavtryck.
 *
 * En enda källa till sanning för hur stort ett hinder är i planvy. Allt som
 * ritar, mäter eller kontrollerar ett hinder (2D, hundväg, regelkontroll,
 * PDF, 3D) ska gå via `obstacleSizeM` i stället för att läsa `sizeM` direkt —
 * annars får tunnlar med egen längd olika mått i olika vyer.
 *
 * Tunnlar: `lengthM` är tunneldukens fysiska längd. Utan `lengthM` (äldre
 * banor) behålls den gamla modellen där kordan alltid är hindrets standard-
 * bredd, så att sparade banor ser exakt likadana ut som förut.
 */
import { getObstacleDefV2, type ObstacleTypeV2 } from "./config";
import { tunnelChordFromLengthM, tunnelPathLengthM } from "./tunnelGeometry";

/** SAgiK 2022–2026: tunneln ska vara 3–6 m. Hoopers använder ofta kortare. */
export const TUNNEL_LENGTH_MIN_M = 2;
export const TUNNEL_LENGTH_MAX_M = 6;

export interface SizedObstacle {
  type: ObstacleTypeV2;
  lengthM?: number;
  curveDeg?: number;
}

export function clampTunnelLengthM(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(Math.max(TUNNEL_LENGTH_MIN_M, Math.min(TUNNEL_LENGTH_MAX_M, v)) * 100) / 100;
}

/** Bredd (w) × djup (d) i meter, oroterat. För tunnlar är `w` kordan. */
export function obstacleSizeM(ob: SizedObstacle, fallback = 1): { w: number; d: number } {
  const def = getObstacleDefV2(ob.type);
  const w = def?.sizeM.w ?? fallback;
  const d = def?.sizeM.d ?? fallback;
  if (ob.type === "tunnel") {
    const length = clampTunnelLengthM(ob.lengthM);
    if (length != null) return { w: tunnelChordFromLengthM(length, ob.curveDeg ?? 0), d };
  }
  return { w, d };
}

/** Tunneldukens fysiska längd (m) — det mått banbyggaren väljer tunnel efter. */
export function tunnelLengthM(ob: SizedObstacle): number {
  const length = clampTunnelLengthM(ob.lengthM);
  if (length != null) return length;
  const def = getObstacleDefV2("tunnel");
  return tunnelPathLengthM(def?.sizeM.w ?? 3, ob.curveDeg ?? 0);
}
