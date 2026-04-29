/**
 * Open-Meteo väderprognos (gratis, ingen API-nyckel).
 * Vi visar prognos endast för datum 0–14 dagar framåt — annars är
 * prognosen meningslös.
 */
import { CITY_COORDS } from "@/types/competitions";

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  precip: number;
  weatherCode: number;
}

const CODE_LABEL: Record<number, string> = {
  0: "Klart",
  1: "Mest klart",
  2: "Delvis molnigt",
  3: "Mulet",
  45: "Dimma",
  48: "Frostdimma",
  51: "Lätt duggregn",
  53: "Duggregn",
  55: "Tätt duggregn",
  61: "Lätt regn",
  63: "Regn",
  65: "Kraftigt regn",
  71: "Lätt snöfall",
  73: "Snöfall",
  75: "Kraftigt snöfall",
  80: "Regnskurar",
  81: "Kraftiga skurar",
  82: "Mycket kraftiga skurar",
  95: "Åska",
  96: "Åska med hagel",
  99: "Kraftig åska",
};

export function describeWeather(code: number): string {
  return CODE_LABEL[code] ?? "Okänt";
}

/** Hämta koordinater för svensk stad. Robust mot spaces/comma i strängen. */
function findCityCoords(location: string | null | undefined): [number, number] | null {
  if (!location) return null;
  const parts = location.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (CITY_COORDS[p]) return CITY_COORDS[p];
    // Försök kapitalisera
    const cap = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (CITY_COORDS[cap]) return CITY_COORDS[cap];
  }
  return null;
}

/**
 * Hämtar prognos för enskilt datum. Returnerar null om utanför
 * prognosfönstret (>14 dagar) eller om hämtningen misslyckas.
 */
export async function fetchWeatherForDate(
  location: string | null | undefined,
  date: string | null | undefined,
): Promise<WeatherDay | null> {
  if (!date) return null;
  const coords = findCityCoords(location);
  if (!coords) return null;

  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((dateObj.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0 || diffDays > 14) return null;

  const [lat, lon] = coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code` +
    `&timezone=Europe/Stockholm&start_date=${date.slice(0, 10)}&end_date=${date.slice(0, 10)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.daily?.time?.length) return null;
    return {
      date: data.daily.time[0],
      tempMin: data.daily.temperature_2m_min[0],
      tempMax: data.daily.temperature_2m_max[0],
      precip: data.daily.precipitation_sum[0],
      weatherCode: data.daily.weather_code[0],
    };
  } catch {
    return null;
  }
}
