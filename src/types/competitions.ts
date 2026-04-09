export interface Competition {
  id: string;
  part_key: string | null;
  club_name: string | null;
  competition_name: string | null;
  location: string | null;
  indoor_outdoor: string | null;
  date_start: string | null;
  date_end: string | null;
  classes_agility: string[];
  classes_hopp: string[];
  classes_other: string[];
  judges: string[];
  last_registration_date: string | null;
  status: string | null;
  status_code: string | null;
  source_url: string | null;
  fetched_at: string | null;
  raw_lopp: string | null;
}

export interface CompetitionInterest {
  id: string;
  user_id: string;
  competition_id: string;
  status: 'interested' | 'registered';
  dog_name: string | null;
  class: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface CompetitionLogEntry {
  id: string;
  user_id: string;
  dog_name: string | null;
  competition_id: string | null;
  competition_name: string | null;
  city: string | null;
  date: string | null;
  discipline: string | null;
  class: string | null;
  starts: number | null;
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  competition_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
}

// Swedish counties for filtering
export const SWEDISH_COUNTIES = [
  'Blekinge', 'Dalarnas', 'Gotlands', 'Gävleborgs', 'Hallands',
  'Jämtlands', 'Jönköpings', 'Kalmar', 'Kronobergs', 'Norrbottens',
  'Skåne', 'Stockholms', 'Södermanlands', 'Uppsala', 'Värmlands',
  'Västerbottens', 'Västernorrlands', 'Västmanlands', 'Västra Götalands',
  'Örebro', 'Östergötlands', 'Nationell',
] as const;

// City coordinates for distance calculation
export const CITY_COORDS: Record<string, [number, number]> = {
  'Stockholm': [59.3293, 18.0686], 'Göteborg': [57.7089, 11.9746],
  'Malmö': [55.6050, 13.0038], 'Uppsala': [59.8586, 17.6389],
  'Västerås': [59.6099, 16.5448], 'Örebro': [59.2753, 15.2134],
  'Linköping': [58.4108, 15.6214], 'Helsingborg': [56.0465, 12.6945],
  'Jönköping': [57.7826, 14.1618], 'Norrköping': [58.5942, 16.1826],
  'Lund': [55.7047, 13.1910], 'Umeå': [63.8258, 20.2630],
  'Gävle': [60.6749, 17.1413], 'Borås': [57.7210, 12.9401],
  'Eskilstuna': [59.3666, 16.5077], 'Södertälje': [59.1955, 17.6253],
  'Karlstad': [59.3793, 13.5036], 'Täby': [59.4439, 18.0687],
  'Växjö': [56.8777, 14.8091], 'Halmstad': [56.6745, 12.8578],
  'Sundsvall': [62.3908, 17.3069], 'Luleå': [65.5848, 22.1547],
  'Trollhättan': [58.2837, 12.2886], 'Östersund': [63.1792, 14.6357],
  'Borlänge': [60.4858, 15.4364], 'Falun': [60.6065, 15.6355],
  'Kalmar': [56.6634, 16.3566], 'Skövde': [58.3866, 13.8458],
  'Kristianstad': [56.0294, 14.1567], 'Karlskrona': [56.1612, 15.5869],
  'Skellefteå': [64.7507, 20.9528], 'Uddevalla': [58.3498, 11.9382],
  'Lidköping': [58.5053, 13.1584], 'Motala': [58.5372, 15.0370],
  'Landskrona': [55.8708, 12.8302], 'Nyköping': [58.7530, 17.0086],
  'Enköping': [59.6360, 17.0764], 'Visby': [57.6348, 18.2948],
  'Varberg': [57.1058, 12.2508], 'Katrineholm': [58.9960, 16.2030],
  'Kiruna': [67.8558, 20.2253], 'Piteå': [65.3173, 21.4797],
  'Mariestad': [58.7094, 13.8236], 'Mora': [61.0048, 14.5449],
  'Arvika': [59.6553, 12.5854], 'Norrtälje': [59.7570, 18.7009],
  'Kumla': [59.1279, 15.1406], 'Sala': [59.9200, 16.6076],
  'Köping': [59.5139, 15.9925], 'Ystad': [55.4318, 13.8200],
  'Vetlanda': [57.4293, 15.0785],
};

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
