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

  'agility-regler-sverige': {
    heading: 'Vanliga frågor om agilityregler i Sverige',
    items: [
      {
        question: 'Vem ansvarar för agilityreglerna i Sverige?',
        answer:
          'Svenska Agilityklubben (SAgiK) är specialklubb under Svenska Kennelklubben (SKK) och ansvarar för det svenska regelverket. Reglerna uppdateras vanligen vart femte år och bygger på FCI:s internationella regelverk med svenska tillägg.',
      },
      {
        question: 'Vilka storleksklasser finns i svensk agility?',
        answer:
          'Det finns fem storleksklasser baserat på mankhöjd: XS (under 28 cm), S (28-35 cm), M (35-43 cm), L (43-50 cm) och XL (över 50 cm). Hunden mäts av auktoriserad mätare innan första officiella tävling.',
      },
      {
        question: 'Hur höga är hopphindren per storleksklass?',
        answer:
          'Hopphöjder enligt SAgiK: XS hoppar 20 cm, S hoppar 30 cm, M hoppar 40 cm, L hoppar 55 cm och XL hoppar 60 cm. Vid sjuk eller äldre hund kan dispens för lägre höjd sökas.',
      },
      {
        question: 'Vad räknas som fel och diskvalifikation?',
        answer:
          'Fel ger 5 felpoäng: rivning, missad kontaktzon eller vägran. Tre vägringar i samma rond eller passage av hinder i fel ordning innebär diskvalifikation. Tidsöverskridande ger 1 felpoäng per sekund över maxtid.',
      },
      {
        question: 'Vad är skillnaden mellan Agility och Hoppklass?',
        answer:
          'Agilityklass innehåller alla hinder inklusive kontakthinder (A-hinder, balansbom, gungbräda) och slalom. Hoppklass har bara hopp, tunnlar och slalom – inga kontakthinder. Båda räknas som separata grenar med egna pinnar.',
      },
      {
        question: 'Hur går uppflyttning mellan klasser till?',
        answer:
          'För att flyttas upp från klass 1 till klass 2 krävs tre godkända rundor (pinnar) under tre olika domare. Samma princip gäller mellan klass 2 och klass 3. Pinnar samlas separat i Agility och Hoppklass.',
      },
      {
        question: 'Vilka raser får tävla i officiell agility?',
        answer:
          'Alla SKK-registrerade raser får tävla. Blandrashundar med Tävlingslicens för Oregistrerade Hundar (TIK/RAS) får också tävla på officiella tävlingar enligt samma regler som rasrenade hundar.',
      },
      {
        question: 'Måste hunden vara försäkrad för att tävla?',
        answer:
          'Ja, hunden måste vara veterinärbesiktigad och ha giltig olycksfallsförsäkring. Föraren måste vara medlem i en SKK-ansluten klubb och hunden registrerad i SKK eller ha tävlingslicens.',
      },
    ],
  },

  'sagik-klasser-forklarat': {
    heading: 'Vanliga frågor om SAgiK:s klasser',
    items: [
      {
        question: 'Vad är nollklass i agility?',
        answer:
          'Nollklass är en inofficiell tävlingsform för helt nya ekipage som vill prova på tävlingsmiljö utan press. Banorna är enklare, det finns inga pinnar att samla och resultaten räknas inte officiellt. Perfekt första steg innan klass 1.',
      },
      {
        question: 'Vad krävs för att tävla i klass 1?',
        answer:
          'Hunden måste vara minst 18 månader, mätt av auktoriserad mätare och registrerad i SKK eller ha tävlingslicens. Föraren ska vara medlem i SKK-ansluten klubb. Ingen tidigare merit krävs – klass 1 är startnivån för officiell tävling.',
      },
      {
        question: 'Hur många pinnar behövs för att flyttas upp?',
        answer:
          'Tre godkända rundor (pinnar) under tre olika domare krävs för uppflyttning från klass 1 till klass 2, och samma från klass 2 till klass 3. Pinnar samlas separat i Agility och Hoppklass.',
      },
      {
        question: 'Vad räknas som en godkänd runda?',
        answer:
          'En godkänd runda är "noll fel inom maxtid" – ingen rivning, ingen missad kontakt, inga vägringar och tiden under domarens uträknade maxtid. Vid placering 1-3 i klass 2 eller 3 ges pinnen automatiskt även med några felpoäng inom vissa gränser.',
      },
      {
        question: 'Vad är skillnaden mellan klass 2 och klass 3?',
        answer:
          'Klass 3 har mer tekniska banor med fler vändningar, distansmoment och svårare kombinationer. Tider är kortare och kraven på precision högre. Klass 3-banor är på SM- och VM-nivå svårighetsgrad.',
      },
      {
        question: 'Kan man gå ner i klass igen?',
        answer:
          'Nej, uppflyttning är permanent. När hunden flyttats upp till klass 2 kan den inte tävla i klass 1 igen, oavsett resultat. Detta gäller även om hunden tar långt uppehåll och börjar igen efter flera år.',
      },
      {
        question: 'Vad är "Open"-klass?',
        answer:
          'Open är en inofficiell klass där alla nivåer kan tävla på samma bana. Används ofta på utbildningstävlingar och prova-på-arrangemang. Inga pinnar delas ut men det är ett bra sätt att testa svårare banor utan tryck.',
      },
      {
        question: 'Hur länge gäller pinnar?',
        answer:
          'Pinnar gäller livet ut för hunden. Det finns ingen tidsgräns för att samla ihop de tre pinnar som krävs för uppflyttning. Många ekipage tar flera år på sig att flyttas upp – det är helt okej.',
      },
    ],
  },

  'hoopers-vs-agility': {
    heading: 'Vanliga frågor om hoopers vs agility',
    items: [
      {
        question: 'Vad är största skillnaden mellan hoopers och agility?',
        answer:
          'Hoopers har inga hopphinder och inga skarpa vändningar – hunden springer mjuka linjer genom bågar, runt tunnor och genom tunnlar. I agility hoppar hunden över hinder och tar tighta vändningar. Hoopers är skonsammare för leder och passar fler hundar.',
      },
      {
        question: 'Vilken sport är bäst för min hund?',
        answer:
          'För unga friska hundar med jakt på fart och teknik är agility ofta mer stimulerande. För äldre hundar, hundar med ledproblem, blandraser eller om föraren har svårt att springa är hoopers ett bättre val. Många hundar gör båda.',
      },
      {
        question: 'Behöver föraren springa i hoopers?',
        answer:
          'Nej. I hoopers står föraren i en utmärkt zon (handler box) eller rör sig minimalt, medan hunden springer banan på distans. Detta gör sporten tillgänglig för förare med rörelseinskränkningar eller som inte vill springa.',
      },
      {
        question: 'Är hoopers lättare än agility?',
        answer:
          'Nej, men på ett annat sätt. Hoopers kräver mer distansträning och självständighet hos hunden, eftersom föraren inte kan stötta i banan. Agility kräver mer fysik och snabba förarbeslut. Båda har sin svårighet.',
      },
      {
        question: 'Kan man tävla i båda sporterna?',
        answer:
          'Absolut. Många ekipage tränar både agility och hoopers parallellt. Sporterna kompletterar varandra – hoopers bygger distansvana som hjälper i agility, och agility bygger fart och precision.',
      },
      {
        question: 'Vilken sport startar valpen tidigast i?',
        answer:
          'Hoopers grundträning kan börjas tidigare (4-6 månader på låg nivå) eftersom inga hopp eller kontakthinder belastar lederna. Agility med full hopphöjd ska vänta till 12-15 månader. Båda sporterna har officiell tävlingsålder från 18 månader.',
      },
      {
        question: 'Vilka klasser finns i respektive sport?',
        answer:
          'Agility har Nollklass och klass 1-3, separat för Agility och Hoppklass. Hoopers har Startklass, Klass 1, Klass 2 och Klass 3. Båda sporterna har tydliga uppflyttningsregler baserat på godkända rundor.',
      },
      {
        question: 'Är båda sporterna officiella SKK-sporter?',
        answer:
          'Ja. Agility har varit officiellt erkänd länge under SAgiK. Hoopers blev officiell SKK-sport 1 november 2025 under Svenska Hoopersklubben (SHoK). Båda har officiella regelverk och tävlingsstrukturer.',
      },
    ],
  },

  'undvik-skador-agility': {
    heading: 'Vanliga frågor om skadeförebyggande i agility',
    items: [
      {
        question: 'Vilka är de vanligaste skadorna i agility?',
        answer:
          'Vanligaste skadorna är muskelbristningar i bakben och rygg, korsbandsskador, axelproblem och tassskador. Många kommer från upprepad belastning utan tillräcklig vila eller uppvärmning, snarare än enskilda olyckor.',
      },
      {
        question: 'Hur länge ska uppvärmning ta?',
        answer:
          'Minst 10-15 minuter aktiv uppvärmning innan träning eller tävling: lugn promenad, trav, lätta sträckningar och några korta sprintar. Hunden ska vara mätbart varm – ökad andning, vetlig rörelse – innan första hindret.',
      },
      {
        question: 'Kan jag förebygga korsbandsskador?',
        answer:
          'Delvis. Stärk bakbensmuskler genom backträning, simning och balansövningar. Undvik tvära vändningar på halt underlag. Håll hunden i rätt vikt – övervikt är största riskfaktorn för korsbandsruptur.',
      },
      {
        question: 'Hur ofta ska hunden vila?',
        answer:
          'Minst en helt vilodag per vecka, gärna två. Efter intensiv tävling behövs 2-3 dagar lätt aktivitet. Unghundar (under 2 år) och seniorer (över 8) behöver mer vila än hundar i sin bästa ålder.',
      },
      {
        question: 'Vad gör jag om hunden haltar efter träning?',
        answer:
          'Avbryt träning omedelbart. Vila i 48-72 timmar med endast lugna promenader. Om haltan kvarstår efter 3 dagar – uppsök veterinär. Aldrig "träna igenom" en halta, det förvärrar skador och kan orsaka kroniska problem.',
      },
      {
        question: 'Är agility skadligt för leder?',
        answer:
          'Inte med rätt träning. Studier visar att agilityhundar har samma eller bättre ledhälsa än stillasittande hundar – om träningen är välbalanserad. Risken kommer från överträning, fel underlag eller bristande uppvärmning.',
      },
      {
        question: 'Vilket underlag är säkrast?',
        answer:
          'Konstgräs och specialgummiunderlag är skonsammast. Naturgräs är okej när det är torrt men halkigt och farligt vid regn. Sand kräver extra uppvärmning. Undvik betong och hård mark helt – det belastar leder oerhört mycket.',
      },
      {
        question: 'Behöver hunden massage eller fysioterapi?',
        answer:
          'För hobby-ekipage räcker bra uppvärmning och vila. För tävlande hundar rekommenderas regelbunden massage eller hundfysioterapi var 4-8:e vecka. Ger snabbare återhämtning, hittar problem tidigt och förlänger karriären.',
      },
    ],
  },

  'uppvarmning-hund-agility': {
    heading: 'Vanliga frågor om uppvärmning för agilityhund',
    items: [
      {
        question: 'Hur lång tid ska uppvärmningen ta?',
        answer:
          'Minst 10-15 minuter aktiv uppvärmning före träning, och 15-20 minuter före tävling. Hunden ska vara märkbart varm – ökad andning, lös rörelse i kroppen – innan första hindret. Kortare uppvärmning ökar skaderisken markant.',
      },
      {
        question: 'Vilka övningar ingår i bra uppvärmning?',
        answer:
          'Börja med 5 minuter lugn promenad, övergå till trav i 3-5 minuter, gör några sträckningar (cookie stretches – hunden följer godis i olika riktningar), och avsluta med 3-5 korta accelerationer på 10-20 meter.',
      },
      {
        question: 'Behövs nedvarvning efter träning?',
        answer:
          'Ja, lika viktigt som uppvärmning. 5-10 minuters lugn promenad efter sista hindret hjälper kroppen att återhämta sig, minskar mjölksyra och förebygger stelhet. Hoppa aldrig direkt från full träning till bilen.',
      },
      {
        question: 'Vad är cookie stretches?',
        answer:
          'Cookie stretches är aktiva sträckningar där hunden följer en godisbit i olika riktningar – böjer huvudet mot heupen (rygg), under bröstet (axlar) och uppåt (mage). 3-5 sekunder per position, 2-3 repetitioner per sida.',
      },
      {
        question: 'Är uppvärmning lika viktigt på hösten och vintern?',
        answer:
          'Ännu viktigare. I kallt väder är muskler stelare och senor mindre elastiska. Förläng uppvärmningen med 5 minuter under vintern och håll hunden täckt mellan starter på utomhustävlingar. Sval och blöt mark kräver extra försiktighet.',
      },
      {
        question: 'Kan jag värma upp hunden själv eller behöver jag följa schema?',
        answer:
          'För hobby-ekipage räcker en personlig rutin: promenad, trav, sträckningar, accelerationer. På tävlingsnivå rekommenderas ett strukturerat protokoll, gärna utvecklat med hundfysioterapeut. Konsekvens är viktigare än perfektion.',
      },
      {
        question: 'Hur värmer jag upp utan plats för sprintar?',
        answer:
          'Gör fram-och-tillbaka-sprintar på 10 meter, slalomgång på koppel, eller motoriska övningar (gå baklänges, sidledes, mellan benen). Trångt utrymme behöver inte stoppa bra uppvärmning – kreativitet räcker långt.',
      },
      {
        question: 'Behöver gamla hundar längre uppvärmning?',
        answer:
          'Ja. Seniorer (över 8 år) behöver 5-10 minuter extra uppvärmning, lugnare övergångar mellan tempi och fler upprepningar av sträckningar. Stelhet och lägre elasticitet i vävnader gör äldre hundar mer skadekänsliga utan ordentlig förberedelse.',
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
