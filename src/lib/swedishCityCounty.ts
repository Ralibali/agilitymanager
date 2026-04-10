/**
 * Mapping of Swedish cities/towns/villages to their county (län).
 * Used for smart filtering in the competition calendar.
 * Key: lowercase city name, Value: county name matching SWEDISH_COUNTIES
 */
export const CITY_TO_COUNTY: Record<string, string> = {
  // Blekinge
  'karlshamn': 'Blekinge', 'karlskrona': 'Blekinge', 'olofström': 'Blekinge',
  'ronneby': 'Blekinge', 'sölvesborg': 'Blekinge', 'mörrum': 'Blekinge',
  'nättraby': 'Blekinge', 'bräkne-hoby': 'Blekinge', 'jämjö': 'Blekinge',
  'svängsta': 'Blekinge', 'kallinge': 'Blekinge', 'asarum': 'Blekinge',
  'lyckeby': 'Blekinge', 'mjällby': 'Blekinge',

  // Dalarnas
  'avesta': 'Dalarnas', 'borlänge': 'Dalarnas', 'falun': 'Dalarnas',
  'gagnef': 'Dalarnas', 'hedemora': 'Dalarnas', 'leksand': 'Dalarnas',
  'ludvika': 'Dalarnas', 'malung': 'Dalarnas', 'mora': 'Dalarnas',
  'orsa': 'Dalarnas', 'rättvik': 'Dalarnas', 'säter': 'Dalarnas',
  'vansbro': 'Dalarnas', 'älvdalen': 'Dalarnas', 'smedjebacken': 'Dalarnas',
  'dala floda': 'Dalarnas', 'djurås': 'Dalarnas', 'mockfjärd': 'Dalarnas',
  'bjursås': 'Dalarnas', 'siljansnäs': 'Dalarnas', 'insjön': 'Dalarnas',
  'vikarbyn': 'Dalarnas', 'enviken': 'Dalarnas', 'furudal': 'Dalarnas',
  'grycksbo': 'Dalarnas', 'krylbo': 'Dalarnas', 'nås': 'Dalarnas',
  'svärdsjö': 'Dalarnas', 'tällberg': 'Dalarnas', 'idre': 'Dalarnas',
  'särna': 'Dalarnas', 'dala-järna': 'Dalarnas', 'nyhammar': 'Dalarnas',
  'grängesberg': 'Dalarnas', 'horndal': 'Dalarnas', 'fors': 'Dalarnas',

  // Gotlands
  'visby': 'Gotlands', 'gotland': 'Gotlands', 'roma': 'Gotlands',
  'hemse': 'Gotlands', 'slite': 'Gotlands', 'klintehamn': 'Gotlands',
  'fröjel': 'Gotlands', 'fårösund': 'Gotlands', 'lärbro': 'Gotlands',
  'dalhem': 'Gotlands', 'stånga': 'Gotlands', 'havdhem': 'Gotlands',
  'burgsvik': 'Gotlands',

  // Gävleborgs
  'gävle': 'Gävleborgs', 'sandviken': 'Gävleborgs', 'hudiksvall': 'Gävleborgs',
  'söderhamn': 'Gävleborgs', 'bollnäs': 'Gävleborgs', 'ljusdal': 'Gävleborgs',
  'ockelbo': 'Gävleborgs', 'ovanåker': 'Gävleborgs', 'nordanstig': 'Gävleborgs',
  'hofors': 'Gävleborgs', 'edsbyn': 'Gävleborgs', 'gårdskär': 'Gävleborgs',
  'bergsjö': 'Gävleborgs', 'järbo': 'Gävleborgs', 'storvik': 'Gävleborgs',
  'skutskär': 'Gävleborgs', 'valbo': 'Gävleborgs', 'forsbacka': 'Gävleborgs',
  'kilafors': 'Gävleborgs', 'delsbo': 'Gävleborgs', 'arbrå': 'Gävleborgs',
  'los': 'Gävleborgs', 'färila': 'Gävleborgs', 'hamrånge': 'Gävleborgs',

  // Hallands
  'halmstad': 'Hallands', 'varberg': 'Hallands', 'kungsbacka': 'Hallands',
  'falkenberg': 'Hallands', 'laholm': 'Hallands', 'hylte': 'Hallands',
  'genevad': 'Hallands', 'getinge': 'Hallands', 'oskarström': 'Hallands',
  'träslövsläge': 'Hallands', 'åsa': 'Hallands', 'onsala': 'Hallands',
  'vallda': 'Hallands', 'tvååker': 'Hallands', 'torup': 'Hallands',
  'vessige': 'Hallands', 'enslöv': 'Hallands', 'harplinge': 'Hallands',
  'eldsberga': 'Hallands', 'unnaryd': 'Hallands', 'knäred': 'Hallands',

  // Jämtlands
  'östersund': 'Jämtlands', 'krokom': 'Jämtlands', 'strömsund': 'Jämtlands',
  'åre': 'Jämtlands', 'berg': 'Jämtlands', 'härjedalen': 'Jämtlands',
  'sveg': 'Jämtlands', 'bräcke': 'Jämtlands', 'ragunda': 'Jämtlands',
  'hammarstrand': 'Jämtlands', 'lit': 'Jämtlands', 'hallen': 'Jämtlands',
  'brunflo': 'Jämtlands', 'ås': 'Jämtlands', 'undersåker': 'Jämtlands',
  'järpen': 'Jämtlands', 'mörsil': 'Jämtlands', 'gäddede': 'Jämtlands',
  'hoting': 'Jämtlands', 'hammerdal': 'Jämtlands', 'oviken': 'Jämtlands',
  'myrviken': 'Jämtlands', 'svenstavik': 'Jämtlands', 'funäsdalen': 'Jämtlands',
  'hede': 'Jämtlands', 'vemdalen': 'Jämtlands', 'linsell': 'Jämtlands',

  // Jönköpings
  'jönköping': 'Jönköpings', 'huskvarna': 'Jönköpings', 'nässjö': 'Jönköpings',
  'vetlanda': 'Jönköpings', 'värnamo': 'Jönköpings', 'tranås': 'Jönköpings',
  'eksjö': 'Jönköpings', 'gislaved': 'Jönköpings', 'vaggeryd': 'Jönköpings',
  'sävsjö': 'Jönköpings', 'aneby': 'Jönköpings', 'habo': 'Jönköpings',
  'mullsjö': 'Jönköpings', 'gränna': 'Jönköpings', 'kinnared': 'Jönköpings',
  'skillingaryd': 'Jönköpings', 'bodafors': 'Jönköpings', 'landsbro': 'Jönköpings',
  'rydaholm': 'Jönköpings', 'forserum': 'Jönköpings', 'bankeryd': 'Jönköpings',
  'norrahammar': 'Jönköpings', 'taberg': 'Jönköpings', 'anderstorp': 'Jönköpings',
  'smålandsstenar': 'Jönköpings', 'reftele': 'Jönköpings',

  // Kalmar
  'kalmar': 'Kalmar', 'västervik': 'Kalmar', 'oskarshamn': 'Kalmar',
  'vimmerby': 'Kalmar', 'nybro': 'Kalmar', 'mörbylånga': 'Kalmar',
  'borgholm': 'Kalmar', 'emmaboda': 'Kalmar', 'hultsfred': 'Kalmar',
  'mönsterås': 'Kalmar', 'torsås': 'Kalmar', 'högsby': 'Kalmar',
  'färjestaden': 'Kalmar', 'virserum': 'Kalmar', 'gamleby': 'Kalmar',
  'blomstermåla': 'Kalmar', 'ankarsrum': 'Kalmar', 'överum': 'Kalmar',
  'rockneby': 'Kalmar', 'rinkabyholm': 'Kalmar', 'lindsdal': 'Kalmar',
  'döderhult': 'Kalmar', 'påryd': 'Kalmar',

  // Kronobergs
  'växjö': 'Kronobergs', 'ljungby': 'Kronobergs', 'älmhult': 'Kronobergs',
  'alvesta': 'Kronobergs', 'markaryd': 'Kronobergs', 'tingsryd': 'Kronobergs',
  'lessebo': 'Kronobergs', 'uppvidinge': 'Kronobergs', 'lenhovda': 'Kronobergs',
  'åseda': 'Kronobergs', 'braås': 'Kronobergs', 'lammhult': 'Kronobergs',
  'moheda': 'Kronobergs', 'ingelstad': 'Kronobergs', 'ryd': 'Kronobergs',
  'gemla': 'Kronobergs', 'hovmantorp': 'Kronobergs', 'vislanda': 'Kronobergs',
  'strömsnäsbruk': 'Kronobergs',

  // Norrbottens
  'luleå': 'Norrbottens', 'piteå': 'Norrbottens', 'kiruna': 'Norrbottens',
  'gällivare': 'Norrbottens', 'boden': 'Norrbottens', 'kalix': 'Norrbottens',
  'haparanda': 'Norrbottens', 'älvsbyn': 'Norrbottens', 'jokkmokk': 'Norrbottens',
  'pajala': 'Norrbottens', 'arjeplog': 'Norrbottens', 'arvidsjaur': 'Norrbottens',
  'överkalix': 'Norrbottens', 'övertorneå': 'Norrbottens', 'porjus': 'Norrbottens',
  'malmberget': 'Norrbottens', 'koskullskulle': 'Norrbottens',
  'gammelstad': 'Norrbottens', 'råneå': 'Norrbottens', 'sävast': 'Norrbottens',
  'roknäs': 'Norrbottens', 'norrfjärden': 'Norrbottens', 'töre': 'Norrbottens',
  'byske': 'Norrbottens', 'vuollerim': 'Norrbottens',

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
  'hörby': 'Skåne', 'örkelljunga': 'Skåne', 'degeberga': 'Skåne',
  'falsterbo': 'Skåne', 'veberöd': 'Skåne', 'västra torup': 'Skåne',
  'skanör': 'Skåne', 'dalby': 'Skåne', 'furulund': 'Skåne',
  'billesholm': 'Skåne', 'röstånga': 'Skåne', 'tollarp': 'Skåne',
  'vittsjö': 'Skåne', 'vinslöv': 'Skåne', 'tyringe': 'Skåne',
  'sösdala': 'Skåne', 'knislinge': 'Skåne', 'broby': 'Skåne',
  'fjälkinge': 'Skåne', 'hästveda': 'Skåne', 'söderåsen': 'Skåne',
  'svalövs': 'Skåne', 'genarp': 'Skåne', 'oxie': 'Skåne',
  'limhamn': 'Skåne', 'husie': 'Skåne', 'bara': 'Skåne',
  'anderslöv': 'Skåne', 'svedala': 'Skåne', 'smygehamn': 'Skåne',
  'hammenhög': 'Skåne', 'kivik': 'Skåne', 'brösarp': 'Skåne',

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
  'salem': 'Stockholms', 'nykvarn': 'Stockholms', 'norsborg': 'Stockholms',
  'ågesta': 'Stockholms', 'ösmo': 'Stockholms', 'österhaninge': 'Stockholms',
  'bro': 'Stockholms', 'skå': 'Stockholms', 'lindholmen': 'Stockholms',
  'väddö': 'Stockholms', 'hässelby': 'Stockholms', 'bromma': 'Stockholms',
  'skärholmen': 'Stockholms', 'farsta': 'Stockholms', 'enskede': 'Stockholms',
  'älvsjö': 'Stockholms', 'hägersten': 'Stockholms', 'vällingby': 'Stockholms',
  'spånga': 'Stockholms', 'kista': 'Stockholms', 'tensta': 'Stockholms',
  'rinkeby': 'Stockholms', 'bredäng': 'Stockholms', 'skarpnäck': 'Stockholms',
  'älta': 'Stockholms', 'saltsjöbaden': 'Stockholms', 'saltsjö-boo': 'Stockholms',
  'fisksätra': 'Stockholms', 'tullinge': 'Stockholms', 'bergshamra': 'Stockholms',
  'rosersberg': 'Stockholms', 'arlanda': 'Stockholms', 'rimbo': 'Stockholms',
  'hallstavik': 'Stockholms', 'grisslehamn': 'Stockholms',

  // Södermanlands
  'eskilstuna': 'Södermanlands', 'nyköping': 'Södermanlands', 'katrineholm': 'Södermanlands',
  'strängnäs': 'Södermanlands', 'flen': 'Södermanlands', 'oxelösund': 'Södermanlands',
  'trosa': 'Södermanlands', 'gnesta': 'Södermanlands', 'vingåker': 'Södermanlands',
  'mariefred': 'Södermanlands', 'malmköping': 'Södermanlands', 'torshälla': 'Södermanlands',
  'stallarholmen': 'Södermanlands', 'hälleforsnäs': 'Södermanlands',
  'vagnhärad': 'Södermanlands', 'åkers styckebruk': 'Södermanlands',

  // Uppsala
  'uppsala': 'Uppsala', 'enköping': 'Uppsala', 'bålsta': 'Uppsala',
  'håbo': 'Uppsala', 'knivsta': 'Uppsala', 'tierp': 'Uppsala',
  'östhammar': 'Uppsala', 'älvkarleby': 'Uppsala', 'heby': 'Uppsala',
  'storvreta': 'Uppsala', 'björklinge': 'Uppsala', 'vattholma': 'Uppsala',
  'öregrund': 'Uppsala', 'gimo': 'Uppsala', 'alunda': 'Uppsala',
  'skutskär': 'Uppsala', 'söderfors': 'Uppsala', 'österbybruk': 'Uppsala',
  'skokloster': 'Uppsala', 'grillby': 'Uppsala', 'örsundsbro': 'Uppsala',

  // Värmlands
  'karlstad': 'Värmlands', 'arvika': 'Värmlands', 'kristinehamn': 'Värmlands',
  'hagfors': 'Värmlands', 'filipstad': 'Värmlands', 'sunne': 'Värmlands',
  'säffle': 'Värmlands', 'åmål': 'Värmlands', 'eda': 'Värmlands',
  'forshaga': 'Värmlands', 'grums': 'Värmlands', 'hammarö': 'Värmlands',
  'kil': 'Värmlands', 'munkfors': 'Värmlands', 'storfors': 'Värmlands',
  'torsby': 'Värmlands', 'årjäng': 'Värmlands', 'charlottenberg': 'Värmlands',
  'skoghall': 'Värmlands', 'deje': 'Värmlands', 'molkom': 'Värmlands',
  'skattkärr': 'Värmlands', 'vålberg': 'Värmlands', 'ekshärad': 'Värmlands',
  'ransäter': 'Värmlands', 'rottneros': 'Värmlands', 'lysvik': 'Värmlands',
  'uddeholm': 'Värmlands', 'lesjöfors': 'Värmlands',

  // Västerbottens
  'umeå': 'Västerbottens', 'skellefteå': 'Västerbottens',
  'lycksele': 'Västerbottens', 'vilhelmina': 'Västerbottens',
  'storuman': 'Västerbottens', 'nordmaling': 'Västerbottens',
  'vindeln': 'Västerbottens', 'vännäs': 'Västerbottens',
  'robertsfors': 'Västerbottens', 'norsjö': 'Västerbottens',
  'dorotea': 'Västerbottens', 'åsele': 'Västerbottens',
  'sorsele': 'Västerbottens', 'malå': 'Västerbottens',
  'bjurholm': 'Västerbottens', 'boliden': 'Västerbottens',
  'bureå': 'Västerbottens', 'jörn': 'Västerbottens',
  'lövånger': 'Västerbottens', 'burträsk': 'Västerbottens',
  'hällnäs': 'Västerbottens', 'holmsund': 'Västerbottens',
  'obbola': 'Västerbottens', 'sävar': 'Västerbottens',
  'hörnefors': 'Västerbottens', 'täfteå': 'Västerbottens',

  // Västernorrlands
  'sundsvall': 'Västernorrlands', 'härnösand': 'Västernorrlands',
  'örnsköldsvik': 'Västernorrlands', 'sollefteå': 'Västernorrlands',
  'kramfors': 'Västernorrlands', 'timrå': 'Västernorrlands',
  'ånge': 'Västernorrlands', 'nordansjö': 'Västernorrlands',
  'matfors': 'Västernorrlands', 'njurunda': 'Västernorrlands',
  'stöde': 'Västernorrlands', 'alnö': 'Västernorrlands',
  'bredbyn': 'Västernorrlands', 'bjästa': 'Västernorrlands',
  'domsjö': 'Västernorrlands', 'köpmanholmen': 'Västernorrlands',
  'nyland': 'Västernorrlands', 'junsele': 'Västernorrlands',
  'ramsele': 'Västernorrlands', 'långsele': 'Västernorrlands',
  'docksta': 'Västernorrlands', 'ullånger': 'Västernorrlands',

  // Västmanlands
  'västerås': 'Västmanlands', 'sala': 'Västmanlands', 'köping': 'Västmanlands',
  'arboga': 'Västmanlands', 'fagersta': 'Västmanlands', 'hallstahammar': 'Västmanlands',
  'surahammar': 'Västmanlands', 'norberg': 'Västmanlands',
  'skinnskatteberg': 'Västmanlands', 'kungsör': 'Västmanlands',
  'kolbäck': 'Västmanlands', 'ängelsberg': 'Västmanlands',
  'virsbo': 'Västmanlands', 'ransta': 'Västmanlands',
  'hökåsen': 'Västmanlands', 'dingtuna': 'Västmanlands',
  'tillberga': 'Västmanlands', 'barkarö': 'Västmanlands',

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
  'bengtsfors': 'Västra Götalands',
  'dals-ed': 'Västra Götalands', 'färgelanda': 'Västra Götalands',
  'mellerud': 'Västra Götalands', 'lilla edet': 'Västra Götalands',
  'ale': 'Västra Götalands', 'härryda': 'Västra Götalands',
  'tjörn': 'Västra Götalands', 'svenljunga': 'Västra Götalands',
  'dannike': 'Västra Götalands', 'fristad': 'Västra Götalands',
  'rångedala': 'Västra Götalands', 'risa': 'Västra Götalands',
  'surte': 'Västra Götalands', 'nödinge': 'Västra Götalands',
  'floda': 'Västra Götalands', 'gråbo': 'Västra Götalands',
  'landvetter': 'Västra Götalands', 'mölnlycke': 'Västra Götalands',
  'bollebygd': 'Västra Götalands', 'tranemo': 'Västra Götalands',
  'limmared': 'Västra Götalands', 'dalsjöfors': 'Västra Götalands',
  'sandared': 'Västra Götalands', 'sjömarken': 'Västra Götalands',
  'axvall': 'Västra Götalands', 'varnhem': 'Västra Götalands',
  'stenstorp': 'Västra Götalands', 'floby': 'Västra Götalands',
  'nossebro': 'Västra Götalands', 'grästorp': 'Västra Götalands',
  'åmål': 'Västra Götalands', 'brastad': 'Västra Götalands',
  'ljungskile': 'Västra Götalands', 'henån': 'Västra Götalands',
  'ellös': 'Västra Götalands', 'smögen': 'Västra Götalands',
  'bovallstrand': 'Västra Götalands', 'grebbestad': 'Västra Götalands',
  'fjällbacka': 'Västra Götalands', 'hamburgsund': 'Västra Götalands',
  'tanumshede': 'Västra Götalands', 'hunnebostrand': 'Västra Götalands',
  'kungshamn': 'Västra Götalands', 'skärhamn': 'Västra Götalands',
  'åby': 'Västra Götalands', 'värsås': 'Västra Götalands',
  'gullspång': 'Västra Götalands', 'hova': 'Västra Götalands',

  // Örebro
  'kumla': 'Örebro', 'örebro': 'Örebro', 'hallsberg': 'Örebro',
  'lindesberg': 'Örebro', 'nora': 'Örebro', 'askersund': 'Örebro',
  'degerfors': 'Örebro', 'hällefors': 'Örebro', 'karlskoga': 'Örebro',
  'laxå': 'Örebro', 'ljusnarsberg': 'Örebro', 'lekeberg': 'Örebro',
  'fjugesta': 'Örebro', 'kopparberg': 'Örebro', 'pålsboda': 'Örebro',
  'frövi': 'Örebro', 'fellingsbro': 'Örebro', 'vintrosa': 'Örebro',
  'garphyttan': 'Örebro', 'kilsmo': 'Örebro', 'odensbacken': 'Örebro',
  'stora mellösa': 'Örebro', 'hampetorp': 'Örebro',

  // Östergötlands
  'linköping': 'Östergötlands', 'norrköping': 'Östergötlands',
  'motala': 'Östergötlands', 'mjölby': 'Östergötlands',
  'finspång': 'Östergötlands', 'vadstena': 'Östergötlands',
  'söderköping': 'Östergötlands', 'åtvidaberg': 'Östergötlands',
  'kinda': 'Östergötlands', 'boxholm': 'Östergötlands',
  'ödeshög': 'Östergötlands', 'ydre': 'Östergötlands',
  'valdemarsvik': 'Östergötlands', 'mantorp': 'Östergötlands',
  'skänninge': 'Östergötlands', 'borensberg': 'Östergötlands',
  'linghem': 'Östergötlands', 'ljungsbro': 'Östergötlands',
  'vikingstad': 'Östergötlands', 'malmslätt': 'Östergötlands',
  'sturefors': 'Östergötlands', 'rimforsa': 'Östergötlands',
  'kisa': 'Östergötlands', 'kolmården': 'Östergötlands',
  'kimstad': 'Östergötlands', 'skärblacka': 'Östergötlands',
  'gusum': 'Östergötlands', 'gryt': 'Östergötlands',
};

/**
 * Given a location string (e.g. "Olofström", "Borås/Dannike", "Norsborg (Stockholm)"),
 * returns the county it belongs to, or null if unknown.
 */
export function getCountyForLocation(location: string | null): string | null {
  if (!location) return null;
  const loc = location.toLowerCase().trim();

  // First check if the location string directly contains a county name
  const counties = [
    'blekinge', 'dalarnas', 'gotlands', 'gävleborgs', 'hallands',
    'jämtlands', 'jönköpings', 'kalmar', 'kronobergs', 'norrbottens',
    'skåne', 'stockholms', 'södermanlands', 'uppsala', 'värmlands',
    'västerbottens', 'västernorrlands', 'västmanlands', 'västra götalands',
    'örebro', 'östergötlands',
  ];
  for (const county of counties) {
    if (loc.includes(county)) {
      return county.charAt(0).toUpperCase() + county.slice(1);
    }
  }

  // Try direct lookup first (handles multi-word names like "dala floda")
  if (CITY_TO_COUNTY[loc]) {
    return CITY_TO_COUNTY[loc];
  }

  // Strip parenthesized hints like "Norsborg (Stockholm)" → try "norsborg"
  const withoutParens = loc.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (withoutParens && CITY_TO_COUNTY[withoutParens]) {
    return CITY_TO_COUNTY[withoutParens];
  }

  // Also try the content inside parentheses: "Norsborg (Stockholm)" → "stockholm"
  const parenMatch = loc.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    if (CITY_TO_COUNTY[inside]) {
      return CITY_TO_COUNTY[inside];
    }
  }

  // Split on comma, slash, dash (common separators like "Borås/Dannike", "Kinnared, Ulricehamn")
  const parts = loc.split(/[,\/]+/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (CITY_TO_COUNTY[part]) {
      return CITY_TO_COUNTY[part];
    }
    // Also try splitting on spaces for compound names  
    const words = part.split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && CITY_TO_COUNTY[word]) {
        return CITY_TO_COUNTY[word];
      }
    }
  }

  return null;
}
