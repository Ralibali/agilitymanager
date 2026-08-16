// ── Geokoppling för tävlingar: koordinater och avståndssortering ───────────
import type { UnifiedCompetition } from "./competitionData";
import { coordsForLocation } from "./swedishCityCoords";
import { COUNTIES, distanceKm } from "./swedishCounties";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CompetitionWithDistance extends UnifiedCompetition {
  coords: GeoPoint;
  /** Fågelvägen i km från användarens position. */
  distanceKm: number;
  /** true när koordinaten är länets mittpunkt, inte exakt ort. */
  approximate: boolean;
}

/** Koordinat för en tävling: ortens position, annars länets mittpunkt. */
export function competitionCoords(
  comp: Pick<UnifiedCompetition, "location" | "county">,
): { point: GeoPoint; approximate: boolean } | null {
  const city = coordsForLocation(comp.location);
  if (city) return { point: city, approximate: false };

  const county = comp.county
    ? COUNTIES.find((c) => c.name.toLowerCase() === comp.county!.trim().toLowerCase())
    : undefined;
  if (county) return { point: { lat: county.lat, lng: county.lng }, approximate: true };

  return null;
}

/** Tävlingar med koordinat, sorterade efter avstånd från positionen. */
export function sortByDistance(
  comps: UnifiedCompetition[],
  from: GeoPoint,
): CompetitionWithDistance[] {
  return comps
    .flatMap((comp) => {
      const geo = competitionCoords(comp);
      if (!geo) return [];
      return [
        {
          ...comp,
          coords: geo.point,
          approximate: geo.approximate,
          distanceKm: distanceKm(from.lat, from.lng, geo.point.lat, geo.point.lng),
        },
      ];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** "12 km" / "120 km" — kort avståndsetikett på svenska. */
export function formatDistance(km: number): string {
  if (km < 1) return "under 1 km";
  return `${Math.round(km)} km`;
}
