/**
 * Mapping of Swedish cities/towns to their county (län).
 * Used for smart filtering in the competition calendar.
 * Key: lowercase city name, Value: county name matching SWEDISH_COUNTIES
 */
export const CITY_TO_COUNTY: Record<string, string> = {
  // Blekinge
  'karlshamn': 'Blekinge', 'karlskrona': 'Blekinge', 'olofström': 'Blekinge',
  'ronneby': 'Blekinge', 'sölvesborg': 'Blekinge',

  // Dalarnas
  'avesta': 'Dalarnas', 'borlänge': 'Dalarnas', 'falun': 'Dalarnas',
  'gagnef': 'Dalarnas', 'hedemora': 'Dalarnas', 'leksand': 'Dalarnas',
  'ludvika': 'Dalarnas', 'malung': 'Dalarnas', 'mora': 'Dalarnas',
  'orsa': 'Dalarnas', 'rättvik': 'Dalarnas', 'säter': 'Dalarnas',
  'vansbro': 'Dalarnas', 'älvdalen': 'Dalarnas', 'smedjebacken': 'Dalarnas',

  // Gotlands
  'visby': 'Gotlands', 'gotland': 'Gotlands', 'roma': 'Gotlands',
  'hemse': 'Gotlands', 'slite': 'Gotlands', 'klintehamn': 'Gotlands',

  // Gävleborgs
  'gävle': 'Gävleborgs', 'sandviken': 'Gävleborgs', 'hudiksvall': 'Gävleborgs',
  'söderhamn': 'Gävleborgs', 'bollnäs': 'Gävleborgs', 'ljusdal': 'Gävleborgs',
  'ockelbo': 'Gävleborgs', 'ovanåker': 'Gävleborgs', 'nordanstig': 'Gävleborgs',
  'hofors': 'Gävleborgs', 'edsbyn': 'Gävleborgs',

  // Hallands
  'halmstad': 'Hallands', 'varberg': 'Hallands', 'kungsbacka': 'Hallands',
  'falkenberg': 'Hallands', 'laholm': 'Hallands', 'hylte': 'Hallands',

  // Jämtlands
  'östersund': 'Jämtlands', 'krokom': 'Jämtlands', 'strömsund': 'Jämtlands',
  'åre': 'Jämtlands', 'berg': 'Jämtlands', 'härjedalen': 'Jämtlands',
  'sveg': 'Jämtlands', 'bräcke': 'Jämtlands', 'ragunda': 'Jämtlands',
  'hammarstrand': 'Jämtlands',

  // Jönköpings
  'jönköping': 'Jönköpings', 'huskvarna': 'Jönköpings', 'nässjö': 'Jönköpings',
  'vetlanda': 'Jönköpings', 'värnamo': 'Jönköpings', 'tranås': 'Jönköpings',
  'eksjö': 'Jönköpings', 'gislaved': 'Jönköpings', 'vaggeryd': 'Jönköpings',
  'sävsjö': 'Jönköpings', 'aneby': 'Jönköpings', 'habo': 'Jönköpings',
  'mullsjö': 'Jönköpings',

  // Kalmar
  'kalmar': 'Kalmar', 'västervik': 'Kalmar', 'oskarshamn': 'Kalmar',
  'vimmerby': 'Kalmar', 'nybro': 'Kalmar', 'mörbylånga': 'Kalmar',
  'borgholm': 'Kalmar', 'emmaboda': 'Kalmar', 'hultsfred': 'Kalmar',
  'mönsterås': 'Kalmar', 'torsås': 'Kalmar', 'högsby': 'Kalmar',

  // Kronobergs
  'växjö': 'Kronobergs', 'ljungby': 'Kronobergs', 'älmhult': 'Kronobergs',
  'alvesta': 'Kronobergs', 'markaryd': 'Kronobergs', 'tingsryd': 'Kronobergs',
  'lessebo': 'Kronobergs', 'uppvidinge': 'Kronobergs',

  // Norrbottens
  'luleå': 'Norrbottens', 'piteå': 'Norrbottens', 'kiruna': 'Norrbottens',
  'gällivare': 'Norrbottens', 'boden': 'Norrbottens', 'kalix': 'Norrbottens',
  'haparanda': 'Norrbottens', 'älvsbyn': 'Norrbottens', 'jokkmokk': 'Norrbottens',
  'pajala': 'Norrbottens', 'arjeplog': 'Norrbottens', 'arvidsjaur': 'Norrbottens',
  'överkalix': 'Norrbottens', 'övertorneå': 'Norrbottens',

  // Skåne
  'malmö': 'Skåne', 'helsingborg': 'Skåne', 'lund': 'Skåne',
  'kristianstad': 'Skåne', 'landskrona': 'Skåne', 'trelleborg': 'Skåne',
  'ängelholm': 'Skåne', 'hässleholm': 'Skåne', 'eslöv': 'Skåne',
  'ystad': 'Skåne', 'höör': 'Skåne', 'staffanstorp': 'Skåne',
  'burlöv': 'Skåne', 'lomma': 'Skåne', 'svedala': 'Skåne',
  'sjöbo': 'Skåne', 'tomelilla': 'Skåne', 'simrishamn': 'Skåne',
  'klippan': 'Skåne', 'perstorp': 'Skåne', 'bjuv': 'Skåne',
  'svalöv': 'Skåne', 'höganäs': 'Skåne', 'båstad': 'Skåne',
  'östra göinge': 'Skåne', 'osby': 'Skåne', 'bromölla': 'Skåne',
  'skurup': 'Skåne', 'vellinge': 'Skåne', 'kävlinge': 'Skåne',
  'löddeköpinge': 'Skåne', 'arlöv': 'Skåne', 'åstorp': 'Skåne',
  'hörby': 'Skåne', 'örkelljunga': 'Skåne',

  // Stockholms
  'stockholm': 'Stockholms', 'södertälje': 'Stockholms', 'täby': 'Stockholms',
  'norrtälje': 'Stockholms', 'haninge': 'Stockholms', 'huddinge': 'Stockholms',
  'nacka': 'Stockholms', 'solna': 'Stockholms', 'sundbyberg': 'Stockholms',
  'sollentuna': 'Stockholms', 'lidingö': 'Stockholms', 'vallentuna': 'Stockholms',
  'tyresö': 'Stockholms', 'upplands väsby': 'Stockholms', 'värmdö': 'Stockholms',
  'gustavsberg': 'Stockholms', 'åkersberga': 'Stockholms', 'märsta': 'Stockholms',
  'sigtuna': 'Stockholms', 'tumba': 'Stockholms', 'nynäshamn': 'Stockholms',
  'ekerö': 'Stockholms', 'järfälla': 'Stockholms', 'upplands-bro': 'Stockholms',
  'vaxholm': 'Stockholms', 'danderyd': 'Stockholms', 'botkyrka': 'Stockholms',
  'salem': 'Stockholms', 'nykvarn': 'Stockholms',

  // Södermanlands
  'eskilstuna': 'Södermanlands', 'nyköping': 'Södermanlands', 'katrineholm': 'Södermanlands',
  'strängnäs': 'Södermanlands', 'flen': 'Södermanlands', 'oxelösund': 'Södermanlands',
  'trosa': 'Södermanlands', 'gnesta': 'Södermanlands', 'vingåker': 'Södermanlands',

  // Uppsala
  'uppsala': 'Uppsala', 'enköping': 'Uppsala', 'bålsta': 'Uppsala',
  'håbo': 'Uppsala', 'knivsta': 'Uppsala', 'tierp': 'Uppsala',
  'östhammar': 'Uppsala', 'älvkarleby': 'Uppsala', 'heby': 'Uppsala',

  // Värmlands
  'karlstad': 'Värmlands', 'arvika': 'Värmlands', 'kristinehamn': 'Värmlands',
  'hagfors': 'Värmlands', 'filipstad': 'Värmlands', 'sunne': 'Värmlands',
  'säffle': 'Värmlands', 'åmål': 'Värmlands', 'eda': 'Värmlands',
  'forshaga': 'Värmlands', 'grums': 'Värmlands', 'hammarö': 'Värmlands',
  'kil': 'Värmlands', 'munkfors': 'Värmlands', 'storfors': 'Värmlands',
  'torsby': 'Värmlands', 'årjäng': 'Värmlands',

  // Västerbottens
  'umeå': 'Västerbottens', 'skellefteå': 'Västerbottens',
  'lycksele': 'Västerbottens', 'vilhelmina': 'Västerbottens',
  'storuman': 'Västerbottens', 'nordmaling': 'Västerbottens',
  'vindeln': 'Västerbottens', 'vännäs': 'Västerbottens',
  'robertsfors': 'Västerbottens', 'norsjö': 'Västerbottens',
  'dorotea': 'Västerbottens', 'åsele': 'Västerbottens',
  'sorsele': 'Västerbottens', 'malå': 'Västerbottens',
  'bjurholm': 'Västerbottens',

  // Västernorrlands
  'sundsvall': 'Västernorrlands', 'härnösand': 'Västernorrlands',
  'örnsköldsvik': 'Västernorrlands', 'sollefteå': 'Västernorrlands',
  'kramfors': 'Västernorrlands', 'timrå': 'Västernorrlands',
  'ånge': 'Västernorrlands',

  // Västmanlands
  'västerås': 'Västmanlands', 'sala': 'Västmanlands', 'köping': 'Västmanlands',
  'arboga': 'Västmanlands', 'fagersta': 'Västmanlands', 'hallstahammar': 'Västmanlands',
  'surahammar': 'Västmanlands', 'kumla': 'Västmanlands', 'norberg': 'Västmanlands',
  'skinnskatteberg': 'Västmanlands', 'kungsör': 'Västmanlands',

  // Västra Götalands
  'göteborg': 'Västra Götalands', 'borås': 'Västra Götalands',
  'trollhättan': 'Västra Götalands', 'uddevalla': 'Västra Götalands',
  'skövde': 'Västra Götalands', 'lidköping': 'Västra Götalands',
  'mariestad': 'Västra Götalands', 'alingsås': 'Västra Götalands',
  'kungälv': 'Västra Götalands', 'mölndal': 'Västra Götalands',
  'lerum': 'Västra Götalands', 'partille': 'Västra Götalands',
  'stenungsund': 'Västra Götalands', 'vänersborg': 'Västra Götalands',
  'falköping': 'Västra Götalands', 'tidaholm': 'Västra Götalands',
  'vara': 'Västra Götalands', 'herrljunga': 'Västra Götalands',
  'ulricehamn': 'Västra Götalands', 'mark': 'Västra Götalands',
  'kinna': 'Västra Götalands', 'skara': 'Västra Götalands',
  'tibro': 'Västra Götalands', 'töreboda': 'Västra Götalands',
  'gullspång': 'Västra Götalands', 'götene': 'Västra Götalands',
  'hjo': 'Västra Götalands', 'karlsborg': 'Västra Götalands',
  'lysekil': 'Västra Götalands', 'munkedal': 'Västra Götalands',
  'orust': 'Västra Götalands', 'sotenäs': 'Västra Götalands',
  'strömstad': 'Västra Götalands', 'tanum': 'Västra Götalands',
  'åmål': 'Västra Götalands', 'bengtsfors': 'Västra Götalands',
  'dals-ed': 'Västra Götalands', 'färgelanda': 'Västra Götalands',
  'mellerud': 'Västra Götalands', 'lilla edet': 'Västra Götalands',
  'ale': 'Västra Götalands', 'härryda': 'Västra Götalands',
  'tjörn': 'Västra Götalands',

  // Örebro
  'örebro': 'Örebro', 'kumla': 'Örebro', 'hallsberg': 'Örebro',
  'lindesberg': 'Örebro', 'nora': 'Örebro', 'askersund': 'Örebro',
  'degerfors': 'Örebro', 'hällefors': 'Örebro', 'karlskoga': 'Örebro',
  'laxå': 'Örebro', 'ljusnarsberg': 'Örebro', 'lekeberg': 'Örebro',

  // Östergötlands
  'linköping': 'Östergötlands', 'norrköping': 'Östergötlands',
  'motala': 'Östergötlands', 'mjölby': 'Östergötlands',
  'finspång': 'Östergötlands', 'vadstena': 'Östergötlands',
  'söderköping': 'Östergötlands', 'åtvidaberg': 'Östergötlands',
  'kinda': 'Östergötlands', 'boxholm': 'Östergötlands',
  'ödeshög': 'Östergötlands', 'ydre': 'Östergötlands',
  'valdemarsvik': 'Östergötlands',
};

/**
 * Given a location string (e.g. "Olofström" or "Olofström, Blekinge"),
 * returns the county it belongs to, or null if unknown.
 */
export function getCountyForLocation(location: string | null): string | null {
  if (!location) return null;
  const loc = location.toLowerCase().trim();

  // First check if the location string directly contains a county name
  // (some data already has county info)
  const counties = [
    'blekinge', 'dalarnas', 'gotlands', 'gävleborgs', 'hallands',
    'jämtlands', 'jönköpings', 'kalmar', 'kronobergs', 'norrbottens',
    'skåne', 'stockholms', 'södermanlands', 'uppsala', 'värmlands',
    'västerbottens', 'västernorrlands', 'västmanlands', 'västra götalands',
    'örebro', 'östergötlands',
  ];
  for (const county of counties) {
    if (loc.includes(county)) {
      // Capitalize first letter to match SWEDISH_COUNTIES format
      return county.charAt(0).toUpperCase() + county.slice(1);
    }
  }

  // Try to find a city match — split on common separators and check each word
  const parts = loc.split(/[,\s\/\-]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && CITY_TO_COUNTY[trimmed]) {
      return CITY_TO_COUNTY[trimmed];
    }
  }

  // Try the full string as well (for multi-word cities)
  if (CITY_TO_COUNTY[loc]) {
    return CITY_TO_COUNTY[loc];
  }

  return null;
}
