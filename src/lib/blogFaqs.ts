/**
 * FAQ-data per artikel-slug. Frågor och svar måste matcha exakt mellan
 * visuell rendering och JSON-LD schema (Google straffar mismatch som spam).
 */
export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface BlogFaqSection {
  /** Sektionsrubrik, t.ex. "Vanliga frågor om kontaktfält" */
  heading: string;
  items: BlogFaqItem[];
}

export const BLOG_FAQS: Record<string, BlogFaqSection> = {
  'kontaktfalt-komplett-guide': {
    heading: 'Vanliga frågor om kontaktfält',
    items: [
      {
        question: 'Hur hög är en balansbom i agility?',
        answer:
          'I svensk agility är balansbommen 1,2 meter hög för storleksklass Large och 1,1 meter för Medium och Small. Bommen är 3-4 meter lång och 10-12 cm bred. Enligt SAgiK:s regelverk ska den ha räfflade ytor för att hunden inte ska halka.',
      },
      {
        question: 'Vad är en kontaktzon?',
        answer:
          'Kontaktzonen är den färgade delen (vanligtvis gul eller röd) längst ner på A-hinder, balansbom och gungbräda. Hunden måste röra zonen med minst en tass för att det ska räknas – annars blir det fel i tävling. Zonen är cirka 90 cm lång på kontakthindrens nedgång.',
      },
      {
        question: 'När kan valpen börja träna kontaktfält?',
        answer:
          'Tidigast vid 12 månaders ålder för låga höjder, och 15-18 månader för full tävlingshöjd. Valpens leder och skelett behöver vara färdigutvecklade. Börja med plankträning på marken, gradvis övergå till låg balansbom innan full höjd.',
      },
      {
        question: 'Vad är skillnaden mellan running contacts och stoppad kontakt?',
        answer:
          'Running contacts betyder att hunden springer rakt genom kontaktzonen i full fart utan att stanna. Stoppad kontakt innebär att hunden sätter sig eller lägger sig med tassarna i zonen. Running är snabbare men svårare att träna konsekvent. Stoppad är säkrare och vanligast bland nybörjare.',
      },
      {
        question: 'Kan man träna kontaktfält hemma?',
        answer:
          'Med rätt utrustning ja. Enkla hemmalösningar finns för balansbom (låg variant för inlärning) och markerade kontaktzoner på marken. Gungbräda och A-hinder är svårare att bygga säkert hemma – dessa kräver stabila hinder enligt SAgiK:s specifikationer för skadeförebyggande.',
      },
      {
        question: 'Vilket kontakthinder är svårast att träna?',
        answer:
          'Gungbrädan är den tekniskt svåraste, eftersom rörelsen naturligt skrämmer hundar. Många hundar är först trygga på A-hinder och balansbom, men blir osäkra på gungbrädan. Lösningen är gradvis vänjning: först statisk bräda, sedan mycket liten rörelse, till full gungning.',
      },
      {
        question: 'Hur ofta ska man träna kontaktfält?',
        answer:
          'Max 2-3 pass per vecka, med vila emellan för muskelåterhämtning. Varje pass ska inte överstiga 10-15 minuter effektiv träning. Överdriven träning sliter på leder, särskilt på A-hinder där hunden landar med full vikt på framtassar.',
      },
      {
        question: 'Vad gör jag om hunden hoppar över kontaktzonen?',
        answer:
          'Det är det vanligaste kontaktfältsproblemet. Lösningen är att gå tillbaka till grundträning: sätt hunden i zonen med handen, belöna för position, träna lågt och långsamt. Tävlingsmässigt: minska tempot vid kontakthinder tills hunden lärt sig att alltid sätta tass i zonen.',
      },
    ],
  },

  'hoopers-hund': {
    heading: 'Vanliga frågor om hoopers',
    items: [
      {
        question: 'Vad är hoopers för hund?',
        answer:
          'Hoopers är en hundsport där hunden springer genom bågar (hoops), tunnlar, runt tunnor och förbi staket – utan hopp och utan skarpa vändningar. Föraren dirigerar på distans med röst och kroppsspråk. Sporten kommer från USA och blev officiell i Sverige under SKK den 1 november 2025.',
      },
      {
        question: 'Är hoopers samma som agility?',
        answer:
          'Nej. Agility har hopphinder och kräver att föraren springer med hunden. Hoopers har inga hopp, inga skarpa vändningar, och föraren står stilla eller rör sig lite medan hunden springer banan på distans. Hoopers är skonsammare fysiskt för både hund och förare.',
      },
      {
        question: 'Vilka hundar passar för hoopers?',
        answer:
          'Alla hundar kan prova hoopers – oavsett ras, storlek och ålder. Sporten passar särskilt bra för hundar med leddsproblem, äldre hundar, unghundar som väntar på att bli gamla nog för agility, och förare som inte vill eller kan springa.',
      },
      {
        question: 'När kan man börja träna hoopers?',
        answer:
          'Grundövningar kan påbörjas från 4-6 månader. Officiell tävlingsträning kan börja från 12 månaders ålder, och hunden måste vara minst 18 månader för att tävla officiellt enligt SHoK:s regelverk.',
      },
      {
        question: 'Vilka klasser finns i hoopers?',
        answer:
          'Svenska Hoopersklubben (SHoK) har fyra klasser: Startklass, Klass 1, Klass 2 och Klass 3. Storleksklasserna är Small (under 40 cm i mankhöjd) och Large (40 cm och över).',
      },
      {
        question: 'Vilka hinder används i hoopers?',
        answer:
          'Fyra typer: hoops (bågar som hunden springer igenom), tunnor (barrels som hunden springer runt), tunnlar (som hunden springer igenom) och staket (gates som hunden passerar förbi). Inga hopphinder, inga kontakthinder, ingen slalom.',
      },
      {
        question: 'Hur hittar jag en hooperskurs i Sverige?',
        answer:
          'Hoopers erbjuds av allt fler brukshundklubbar och privata instruktörer. Se Svenska Hoopersklubbens (SHoK) hemsida för certifierade instruktörer och klubbar.',
      },
      {
        question: 'Är hoopers en officiell SKK-sport?',
        answer:
          'Ja, sedan 1 november 2025 är hoopers officiellt erkänd av Svenska Kennelklubben. Svenska Hoopersklubben (SHoK) är den officiella organisationen som ansvarar för regelverk, domarutbildning och tävlingar i Sverige.',
      },
    ],
  },

  'agility-nyborjare-komplett': {
    heading: 'Vanliga frågor för agilitynybörjare',
    items: [
      {
        question: 'När kan man börja träna agility med sin hund?',
        answer:
          'Hunden kan börja med grundmoment som lydnad, belöningsträning och kroppskontakt redan från valpåldern. Låg hinderträning kan påbörjas från 6-8 månader. Full agility bör vänta till hunden är minst 12-15 månader, beroende på ras.',
      },
      {
        question: 'Hur hittar jag en agilitykurs?',
        answer:
          'Brukshundklubbar anordnar agilitykurser över hela Sverige. Privata instruktörer finns också, ofta på Studiefrämjandet eller Studieförbundet Vuxenskolan.',
      },
      {
        question: 'Hur mycket kostar det att börja med agility?',
        answer:
          'En nybörjarkurs kostar vanligen 1500-3000 kr för en termin. Klubbmedlemskap tillkommer (300-800 kr/år). Tillsammans med utrustning landar första året på ungefär 3000-6000 kr.',
      },
      {
        question: 'Vilka raser passar för agility?',
        answer:
          'Alla friska hundar kan köra agility, men vissa raser excellerar. Border Collie, Shetland Sheepdog, Australian Shepherd, Papillon och Jack Russell Terrier är vanligast på tävlingsnivå. Viktigast är en frisk hund med bra drivkraft.',
      },
      {
        question: 'Behöver hunden vara trimmad för att börja agility?',
        answer:
          'Nej, men hunden ska ha grundläggande lydnad: kunna komma på inkallning, stanna på signal, och jobba för belöning utan att distraheras.',
      },
      {
        question: 'Hur länge tar det att bli tävlingsklar?',
        answer:
          'Med regelbunden träning (1-2 pass/vecka) är många ekipage redo för sin första tävling inom 12-18 månader. För att tävla klass 1 behövs oftast 2-3 år.',
      },
      {
        question: 'Kan jag träna agility hemma?',
        answer:
          'Ja, grundmoment som belöningsträning, slalomingång, tunnelvana och enkel hinderträning kan tränas hemma. Kontakthinder och full slalomsekvens kräver klubbens utrustning.',
      },
      {
        question: 'Vad är skillnaden mellan SAgiK:s klasser?',
        answer:
          'Nollklass är för nybörjare. Klass 1 introducerar tekniska hinder. Klass 2 har fler kontakthinder. Klass 3 är den högsta klassen. Uppflyttning sker genom att samla pinnar (godkända rundor).',
      },
    ],
  },

  'basta-hundraser-agility': {
    heading: 'Vanliga frågor om hundraser och agility',
    items: [
      {
        question: 'Vilken hundras är bäst på agility?',
        answer:
          'Border Collie dominerar på högsta nivå. På medel- och klass 1-nivå är Shetland Sheepdog, Australian Shepherd, Papillon och Jack Russell Terrier lika framgångsrika. Bäst beror på hundens individ, inte bara ras.',
      },
      {
        question: 'Kan man köra agility med blandras?',
        answer:
          'Absolut. Blandrashundar är välkomna i svensk agility och kan tävla på samma villkor som raskatter. De tävlar i samma klasser baserat på mankhöjd.',
      },
      {
        question: 'Passar stora raser för agility?',
        answer:
          'Stora raser som Golden Retriever, Labrador och Schäfer kan absolut köra agility, men med anpassningar. Börja mjukt, kör inte maxtempo varje pass, och ha koll på leder.',
      },
      {
        question: 'Vilken storleksklass hamnar min hund i?',
        answer:
          'I SAgiK:s agility finns fem storleksklasser: XS (under 28 cm), S (28-35 cm), M (35-43 cm), L (43-50 cm) och XL (över 50 cm). Hoopers använder bara Small (under 40 cm) och Large.',
      },
      {
        question: 'Är Border Collie alltid det bästa valet?',
        answer:
          'Bara om du vill tävla i toppen. Border Collies behöver mentalstimulans och daglig hög aktivitet. För de flesta hobby-agilityförare är en Shetland Sheepdog, Papillon eller Australian Shepherd mer hanterbar.',
      },
      {
        question: 'Vilken är den snabbaste hundrasen i agility?',
        answer:
          'Border Collie och Whippet är de snabbaste. Border Collies kombinerar fart med fokus och samarbete – därav deras dominans.',
      },
      {
        question: 'Kan en rasren jaktlabrador köra agility?',
        answer:
          'Ja, med rätt motivation. Jaktlabrador är ofta drivs av matbelöning. Utmaningen är att få ner tempot på hopphinder och att bygga exakt teknik.',
      },
    ],
  },

  'slalom-komplett-guide': {
    heading: 'Vanliga frågor om slalomträning',
    items: [
      {
        question: 'Hur många pinnar har en slalomkurs?',
        answer:
          'I svensk agility har en officiell slalomkurs alltid 12 pinnar. Pinnavståndet är 60 cm. På nybörjarnivå används ofta 6, 8 eller 10 pinnar för inlärning.',
      },
      {
        question: 'När kan valpen börja träna slalom?',
        answer:
          'Slaloms rörelsemönster belastar lederna, så börja inte före 9-10 månader. Öppna raka kanaler kan tränas tidigare. Full slalom med böjning: vänta till 12 månader minimum.',
      },
      {
        question: 'Vilken är bästa metoden för att lära hunden slalom?',
        answer:
          'Kanalmetoden är mest populär: två raka rader av pinnar som successivt trycks ihop. Alternativ: Susan Garretts 2x2-metod eller luring med godis. Välj en metod och håll dig till den.',
      },
      {
        question: 'Hur snabbt ska hunden köra slalom?',
        answer:
          'Hos toppekipage: 0,5-0,6 sekunder per pinne. En full 12-pinnars slalom på 6-7 sekunder. På nybörjarnivå är 10-12 sekunder normalt.',
      },
      {
        question: 'Hur tränar jag slalom hemma?',
        answer:
          'Köp eller bygg 6-12 slalompinnar. Börja med kanalmetoden. Träna korta pass, 5-10 minuter, högst 2 gånger per vecka.',
      },
      {
        question: 'Varför hoppar min hund ur slalomen?',
        answer:
          'Tre vanligaste orsakerna: hunden har inte förstått mönstret, hunden går för snabbt för sin teknik, eller föraren styr fel med kroppen.',
      },
      {
        question: 'Vilken ingång ska hunden ha på slalom?',
        answer:
          'Hunden ska alltid gå in på vänster sida om första pinnen, oavsett från vilken riktning banan kommer. Felaktig ingång = fel i tävling.',
      },
      {
        question: 'Hur ofta ska slalom tränas?',
        answer:
          'Max 2-3 pass i veckan, aldrig flera dagar i följd. Slalom belastar ryggraden och framtassar. Många toppförare tränar slalom endast 1 gång per vecka med hög intensitet.',
      },
    ],
  },
};

/**
 * Bygg JSON-LD FAQPage-schema. Schema-text MÅSTE matcha visuell text exakt.
 */
export function buildFaqJsonLd(section: BlogFaqSection) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: section.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
