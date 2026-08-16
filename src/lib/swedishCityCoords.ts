// ── Ungefärliga koordinater för svenska orter (tävlingsplatser) ────────────
// Används för kartmarkörer och avståndssortering. Nyckel: gemener utan diakritnormalisering.

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Skåne
  malmö: { lat: 55.605, lng: 13.0 },
  lund: { lat: 55.704, lng: 13.191 },
  helsingborg: { lat: 56.046, lng: 12.694 },
  kristianstad: { lat: 56.029, lng: 14.152 },
  ystad: { lat: 55.43, lng: 13.82 },
  hässleholm: { lat: 56.159, lng: 13.766 },
  landskrona: { lat: 55.87, lng: 12.83 },
  trelleborg: { lat: 55.376, lng: 13.157 },
  ängelholm: { lat: 56.243, lng: 12.862 },
  eslöv: { lat: 55.839, lng: 13.303 },
  staffanstorp: { lat: 55.641, lng: 13.209 },
  osby: { lat: 56.383, lng: 13.99 },
  sjöbo: { lat: 55.634, lng: 13.703 },
  simrishamn: { lat: 55.556, lng: 14.345 },
  höör: { lat: 55.935, lng: 13.545 },

  // Halland
  halmstad: { lat: 56.674, lng: 12.857 },
  varberg: { lat: 57.107, lng: 12.25 },
  falkenberg: { lat: 56.905, lng: 12.491 },
  kungsbacka: { lat: 57.487, lng: 12.076 },
  laholm: { lat: 56.512, lng: 13.043 },
  hyltebruk: { lat: 57.0, lng: 13.24 },

  // Västra Götaland
  göteborg: { lat: 57.708, lng: 11.974 },
  borås: { lat: 57.721, lng: 12.94 },
  trollhättan: { lat: 58.283, lng: 12.289 },
  skövde: { lat: 58.391, lng: 13.845 },
  uddevalla: { lat: 58.35, lng: 11.938 },
  vänersborg: { lat: 58.38, lng: 12.323 },
  alingsås: { lat: 57.93, lng: 12.533 },
  lidköping: { lat: 58.505, lng: 13.157 },
  mölndal: { lat: 57.655, lng: 12.014 },
  kungälv: { lat: 57.87, lng: 11.98 },
  falköping: { lat: 58.174, lng: 13.552 },
  mariestad: { lat: 58.71, lng: 13.822 },
  ulricehamn: { lat: 57.792, lng: 13.418 },
  strömstad: { lat: 58.937, lng: 11.174 },
  åmål: { lat: 59.051, lng: 12.703 },
  vara: { lat: 58.263, lng: 12.955 },
  herrljunga: { lat: 58.077, lng: 13.026 },
  tidaholm: { lat: 58.179, lng: 13.956 },
  partille: { lat: 57.74, lng: 12.106 },

  // Jönköping / Kronoberg / Kalmar / Blekinge / Gotland
  jönköping: { lat: 57.782, lng: 14.161 },
  värnamo: { lat: 57.184, lng: 14.043 },
  nässjö: { lat: 57.653, lng: 14.696 },
  vetlanda: { lat: 57.428, lng: 15.076 },
  tranås: { lat: 58.036, lng: 14.977 },
  eksjö: { lat: 57.667, lng: 14.971 },
  gislaved: { lat: 57.3, lng: 13.541 },
  växjö: { lat: 56.879, lng: 14.806 },
  ljungby: { lat: 56.833, lng: 13.941 },
  älmhult: { lat: 56.551, lng: 14.139 },
  alvesta: { lat: 56.899, lng: 14.556 },
  kalmar: { lat: 56.663, lng: 16.356 },
  oskarshamn: { lat: 57.264, lng: 16.448 },
  västervik: { lat: 57.758, lng: 16.638 },
  nybro: { lat: 56.745, lng: 15.909 },
  vimmerby: { lat: 57.666, lng: 15.858 },
  borgholm: { lat: 56.879, lng: 16.656 },
  karlskrona: { lat: 56.161, lng: 15.586 },
  karlshamn: { lat: 56.17, lng: 14.862 },
  ronneby: { lat: 56.21, lng: 15.276 },
  sölvesborg: { lat: 56.052, lng: 14.575 },
  visby: { lat: 57.638, lng: 18.296 },

  // Östergötland / Södermanland
  linköping: { lat: 58.41, lng: 15.622 },
  norrköping: { lat: 58.587, lng: 16.192 },
  motala: { lat: 58.537, lng: 15.036 },
  mjölby: { lat: 58.324, lng: 15.132 },
  finspång: { lat: 58.706, lng: 15.777 },
  söderköping: { lat: 58.481, lng: 16.322 },
  eskilstuna: { lat: 59.371, lng: 16.509 },
  nyköping: { lat: 58.753, lng: 17.008 },
  katrineholm: { lat: 58.996, lng: 16.207 },
  strängnäs: { lat: 59.377, lng: 17.031 },
  flen: { lat: 59.058, lng: 16.586 },

  // Stockholm / Uppsala
  stockholm: { lat: 59.329, lng: 18.069 },
  södertälje: { lat: 59.196, lng: 17.626 },
  norrtälje: { lat: 59.758, lng: 18.704 },
  nynäshamn: { lat: 58.903, lng: 17.947 },
  täby: { lat: 59.444, lng: 18.069 },
  sollentuna: { lat: 59.428, lng: 17.951 },
  haninge: { lat: 59.168, lng: 18.144 },
  märsta: { lat: 59.62, lng: 17.855 },
  bålsta: { lat: 59.567, lng: 17.527 },
  uppsala: { lat: 59.858, lng: 17.638 },
  enköping: { lat: 59.636, lng: 17.077 },
  tierp: { lat: 60.343, lng: 17.512 },
  östhammar: { lat: 60.259, lng: 18.372 },
  knivsta: { lat: 59.725, lng: 17.788 },

  // Västmanland / Örebro / Värmland / Dalarna
  västerås: { lat: 59.611, lng: 16.545 },
  köping: { lat: 59.513, lng: 15.996 },
  sala: { lat: 59.921, lng: 16.605 },
  fagersta: { lat: 59.978, lng: 15.79 },
  arboga: { lat: 59.394, lng: 15.838 },
  örebro: { lat: 59.275, lng: 15.213 },
  karlskoga: { lat: 59.327, lng: 14.524 },
  kumla: { lat: 59.128, lng: 15.142 },
  lindesberg: { lat: 59.591, lng: 15.226 },
  hallsberg: { lat: 59.065, lng: 15.11 },
  karlstad: { lat: 59.379, lng: 13.504 },
  arvika: { lat: 59.654, lng: 12.591 },
  kristinehamn: { lat: 59.309, lng: 14.108 },
  säffle: { lat: 59.133, lng: 12.925 },
  torsby: { lat: 60.139, lng: 13.0 },
  falun: { lat: 60.606, lng: 15.626 },
  borlänge: { lat: 60.484, lng: 15.437 },
  mora: { lat: 61.005, lng: 14.538 },
  ludvika: { lat: 60.151, lng: 15.191 },
  avesta: { lat: 60.145, lng: 16.168 },
  leksand: { lat: 60.73, lng: 14.999 },
  rättvik: { lat: 60.887, lng: 15.117 },
  hedemora: { lat: 60.278, lng: 15.985 },

  // Norrland
  gävle: { lat: 60.674, lng: 17.141 },
  sandviken: { lat: 60.617, lng: 16.776 },
  hudiksvall: { lat: 61.728, lng: 17.105 },
  söderhamn: { lat: 61.303, lng: 17.059 },
  bollnäs: { lat: 61.348, lng: 16.394 },
  ljusdal: { lat: 61.829, lng: 16.093 },
  sundsvall: { lat: 62.39, lng: 17.306 },
  härnösand: { lat: 62.632, lng: 17.939 },
  örnsköldsvik: { lat: 63.29, lng: 18.716 },
  sollefteå: { lat: 63.167, lng: 17.267 },
  kramfors: { lat: 62.93, lng: 17.78 },
  östersund: { lat: 63.179, lng: 14.636 },
  åre: { lat: 63.399, lng: 13.081 },
  umeå: { lat: 63.826, lng: 20.263 },
  skellefteå: { lat: 64.751, lng: 20.953 },
  lycksele: { lat: 64.596, lng: 18.673 },
  luleå: { lat: 65.584, lng: 22.155 },
  piteå: { lat: 65.317, lng: 21.479 },
  boden: { lat: 65.825, lng: 21.688 },
  kiruna: { lat: 67.855, lng: 20.226 },
  gällivare: { lat: 67.133, lng: 20.66 },
  kalix: { lat: 65.853, lng: 23.155 },
  haparanda: { lat: 65.836, lng: 24.144 },
};

/** Slår upp koordinat för en platssträng, t.ex. "Halmstad, Snöstorp". */
export function coordsForLocation(
  location: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!location) return null;
  const text = location.toLowerCase();
  const direct = CITY_COORDS[text.trim()];
  if (direct) return direct;

  const parts = text
    .split(/[,/()·–—-]| i | vid /)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (CITY_COORDS[part]) return CITY_COORDS[part];
  }
  // Sista utväg: hitta ortsnamn någonstans i strängen (längsta träffen först).
  const hit = Object.keys(CITY_COORDS)
    .filter((city) => city.length > 3 && text.includes(city))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? CITY_COORDS[hit] : null;
}
