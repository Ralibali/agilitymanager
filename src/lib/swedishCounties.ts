// ── Sveriges län: slug, centrumkoordinat och närhetsberäkning ──────────────
import { slugify } from "./competitionSlug";

export interface CountyInfo {
  /** Namn så som det används i tävlingsdatan, t.ex. "Västra Götalands". */
  name: string;
  /** URL-slug, t.ex. "vastra-gotalands". */
  slug: string;
  /** Ungefärlig mittpunkt för länet (grader). */
  lat: number;
  lng: number;
}

export const COUNTIES: CountyInfo[] = [
  { name: "Blekinge", slug: "blekinge", lat: 56.24, lng: 15.29 },
  { name: "Dalarnas", slug: "dalarnas", lat: 60.9, lng: 14.8 },
  { name: "Gotlands", slug: "gotlands", lat: 57.5, lng: 18.5 },
  { name: "Gävleborgs", slug: "gavleborgs", lat: 61.4, lng: 16.4 },
  { name: "Hallands", slug: "hallands", lat: 56.9, lng: 12.9 },
  { name: "Jämtlands", slug: "jamtlands", lat: 63.3, lng: 14.4 },
  { name: "Jönköpings", slug: "jonkopings", lat: 57.5, lng: 14.2 },
  { name: "Kalmar", slug: "kalmar", lat: 57.0, lng: 16.2 },
  { name: "Kronobergs", slug: "kronobergs", lat: 56.8, lng: 14.6 },
  { name: "Norrbottens", slug: "norrbottens", lat: 66.5, lng: 20.0 },
  { name: "Skåne", slug: "skane", lat: 55.9, lng: 13.5 },
  { name: "Stockholms", slug: "stockholms", lat: 59.35, lng: 18.05 },
  { name: "Södermanlands", slug: "sodermanlands", lat: 59.05, lng: 16.7 },
  { name: "Uppsala", slug: "uppsala", lat: 60.0, lng: 17.6 },
  { name: "Värmlands", slug: "varmlands", lat: 59.8, lng: 13.4 },
  { name: "Västerbottens", slug: "vasterbottens", lat: 64.8, lng: 18.5 },
  { name: "Västernorrlands", slug: "vasternorrlands", lat: 63.2, lng: 17.5 },
  { name: "Västmanlands", slug: "vastmanlands", lat: 59.7, lng: 16.3 },
  { name: "Västra Götalands", slug: "vastra-gotalands", lat: 58.3, lng: 12.8 },
  { name: "Örebro", slug: "orebro", lat: 59.3, lng: 15.0 },
  { name: "Östergötlands", slug: "ostergotlands", lat: 58.4, lng: 15.6 },
];

export function countySlug(name: string | null | undefined): string {
  if (!name) return "";
  const known = COUNTIES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  return known ? known.slug : slugify(name);
}

export function countyFromSlug(slug: string | undefined): CountyInfo | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  return COUNTIES.find((c) => c.slug === s) ?? null;
}

/** Rakt avstånd i km mellan två koordinater (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Närmaste län utifrån en position — används för "tävlingar nära dig". */
export function nearestCounty(lat: number, lng: number): CountyInfo {
  return COUNTIES.reduce((best, c) =>
    distanceKm(lat, lng, c.lat, c.lng) < distanceKm(lat, lng, best.lat, best.lng) ? c : best,
  );
}
