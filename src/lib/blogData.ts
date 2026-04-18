export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  date: string;
  author: string;
  /** SEO-optimerad <title>-tagg (50–60 tecken). Faller tillbaka till `title` om null. */
  seoTitle?: string | null;
  /** SEO-optimerad meta description (140–160 tecken). Faller tillbaka till `excerpt` om null. */
  seoDescription?: string | null;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'borja-med-agility',
    title: 'Börja med agility – komplett guide för nybörjare',
    excerpt: 'Allt du behöver veta för att komma igång med agility. Från val av klubb till första träningen.',
    category: 'Nybörjare',
    readTime: 8,
    date: '2026-03-01',
    author: 'AgilityManager',
    content: `
## Vad är agility?

Agility är en hundsport där hund och förare tillsammans tar sig igenom en bana med olika hinder. Det handlar om samarbete, kommunikation och framför allt – att ha kul tillsammans! Vill du veta mer om sportens historia och regler? Läs vår [kompletta guide om agility](/om-agility).

## Passar agility min hund?

De flesta hundar kan träna agility. Det viktigaste är att hunden är frisk, rörlig och motiverad. Läs mer om [vilka raser som passar bäst för agility](/blogg/basta-hundraser-agility). Några saker att tänka på:

- **Ålder**: Hunden bör vara minst 12 månader innan den hoppar fulla höjder
- **Hälsa**: En veterinärundersökning rekommenderas innan start
- **Temperament**: Hunden ska tycka det är roligt – tvinga aldrig!

## Hur kommer jag igång?

1. **Hitta en klubb** – Kontakta din lokala brukshundsklubb eller agilityklubb
2. **Nybörjarkurs** – De flesta klubbar erbjuder nybörjarkurser
3. **Utrustning** – Du behöver bekväma kläder och godis/leksak som belöning. Du kan också [bygga egna hinder hemma](/blogg/agility-hinder-hemma)
4. **Tålamod** – Det tar tid att bygga upp grunderna

## Grundläggande hinder

- **Språnghinder** – Hunden hoppar över en ribba
- **Tunnel** – Hunden springer genom en tunnel
- **Kontakthinder** – A-bom, vipp och gångbro med [kontaktzoner som kräver speciell träning](/blogg/kontaktzoner-traning)
- **Slalom** – Hunden väver mellan pinnar. Läs vår [guide till slalomträning](/blogg/slalom-traning-agility)

## Tips för första träningen

- Håll det kort och roligt (10-15 minuter)
- Belöna ofta och generöst
- Avsluta alltid på en positiv not
- Fokusera på relation, inte prestation

## Läs vidare

- [SAgiK-klasser förklarade – Nollklass till K3](/blogg/sagik-klasser-forklarat)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Uppvärmning för agilityhundar](/blogg/uppvarmning-hund-agility)
    `,
  },
  {
    slug: 'kontaktzoner-traning',
    title: 'Träna kontaktzoner – 5 metoder som fungerar',
    excerpt: 'Lär dig de vanligaste metoderna för kontaktzonskträning: 2on2off, running contact och fler.',
    category: 'Teknik',
    readTime: 6,
    date: '2026-02-20',
    author: 'AgilityManager',
    content: `
## Varför är kontaktzoner viktiga?

Kontaktzonerna är målade områden på A-bom, vipp och gångbro. Hunden måste röra zonerna – annars blir det fel i tävling. Bra kontakter kan vara skillnaden mellan godkänt och icke godkänt. Läs mer om [SAgiK:s klasser och regler](/blogg/sagik-klasser-forklarat).

## Metod 1: 2on2off

Den mest populära metoden. Hunden stannar med två tassar på hindret och två på marken.

**Fördelar**: Tydligt kriterium, lätt att bedöma
**Nackdelar**: Tar tid, kan vara långsammare i tävling

### Så tränar du:
1. Börja med en platta på marken
2. Lär hunden att ställa sig med framtassarna på plattan
3. Flytta gradvis till ett lågt kontakthinder
4. Bygg upp höjden stegvis

## Metod 2: Running contact

Hunden springer genom kontaktzonen utan att stanna.

**Fördelar**: Snabbt, naturlig rörelse
**Nackdelar**: Svårare att träna, kräver precision

## Metod 3: Stoppkontakt

Hunden lägger sig ner i kontaktzonen.

## Metod 4: Fartfälla

En kombination där hunden saktar ner i zonen men inte stannar helt.

## Metod 5: Targetträning

Använd en target (platta/duk) i kontaktzonen som hunden springer till.

## Generella tips

- Var konsekvent – välj EN metod och håll dig till den
- Träna kontakter separat från hela banor
- Belöna rätt position, inte bara att hunden är klar
- Filma din träning för att analysera
- [Värm alltid upp hunden ordentligt](/blogg/uppvarmning-hund-agility) innan kontaktträning

## Läs vidare

- [Undvik skador i agility – förebygg och skydda din hund](/blogg/undvik-skador-agility)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Bygg agilityhinder hemma](/blogg/agility-hinder-hemma)
    `,
  },
  {
    slug: 'mentala-foreberedelser-tavling',
    title: 'Mentala förberedelser inför agilitytävling',
    excerpt: 'Så hanterar du nerver, fokuserar rätt och presterar ditt bästa på tävlingsdagen.',
    category: 'Tävling',
    readTime: 5,
    date: '2026-02-15',
    author: 'AgilityManager',
    content: `
## Nervositet är normalt

Alla blir nervösa – även rutinerade tävlande. Nyckeln är att lära sig hantera nerverna, inte eliminera dem.

## Förberedelser kvällen innan

- **Packa i god tid** – gör en checklista
- **Planera resan** – vet du var tävlingen är?
- **Sov ordentligt** – vila är underskattad
- **Visualisera** – tänk igenom hur du vill att det ska gå

## På tävlingsdagen

### Innan start
1. Kom i god tid
2. Gå banan noggrant – minst 2 varv
3. [Värm upp hunden ordentligt](/blogg/uppvarmning-hund-agility) – det förbättrar prestationen och minskar skaderisken
4. Ha en rutin som skapar fokus

### Under loppet
- Andas! Djupa andetag innan start
- Fokusera på din plan, inte resultatet
- Kommunicera tydligt med hunden – [distanshantering](/blogg/distanshantering-agility) är en viktig del
- Hav kul – hunden märker din sinnesstämning

### Efter loppet
- Belöna hunden oavsett resultat
- Reflektera konstruktivt – vad gick bra?
- Skriv ner anteckningar (använd AgilityManager!)
- Var stolt över att ni ställde upp

## Vanliga misstag

- Ändra planen mitt i loppet
- Bli arg på hunden efter ett misstag
- Jämföra sig med andra ekipage
- Glömma att det ska vara roligt

## Läs vidare

- [SAgiK-klasser förklarade – Nollklass till K3](/blogg/sagik-klasser-forklarat)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Undvik skador i agility](/blogg/undvik-skador-agility)
    `,
  },
  {
    slug: 'undvik-skador-agility',
    title: 'Undvik skador i agility – förebygg och skydda din hund',
    excerpt: 'Vanliga skador i agility och hur du förebygger dem med rätt uppvärmning och träning.',
    category: 'Hälsa',
    readTime: 7,
    date: '2026-02-10',
    author: 'AgilityManager',
    content: `
## Vanliga skador i agility

Agility är en intensiv sport och skador kan tyvärr förekomma. De vanligaste är:

- **Muskelskador** – sträckningar och bristningar
- **Ledskador** – framför allt i bogparti och knän
- **Tasskador** – trampdynor och klor
- **Ryggproblem** – särskilt vid hopp och vipp

## Uppvärmning är A och O

En ordentlig [uppvärmning minskar skaderisken](/blogg/uppvarmning-hund-agility) dramatiskt:

1. **5 min lugn promenad**
2. **Stretching** – försiktiga rörelser genom hela rörelseomfånget
3. **Gradvis ökning** – börja med låga hinder
4. **Mentalt fokus** – korta övningar som skapar koncentration

## Nedvarvning efter träning

Lika viktigt som uppvärmning:

- Lugn promenad i 5-10 minuter
- Låt hunden dricka vatten
- Massera stora muskelgrupper
- Kontrollera tassar efter varje pass

## Underlag och miljö

- Undvik halt eller hårt underlag
- Kontrollera att hinder är säkra och stabila – läs om [säkra hinder för hemmabruk](/blogg/agility-hinder-hemma)
- Anpassa träningen efter väder (halt vid regn, hårt vid frost)

## När ska du vila?

- Hunden haltar eller rör sig annorlunda
- Hunden undviker vissa hinder
- Svullnad eller ömhet
- Vid tveksamhet – kontakta veterinär! Har du rätt [försäkringsskydd för din agilityhund](/hundforsakring)?

## Viktregistrering

Att hålla koll på hundens vikt hjälper dig upptäcka förändringar tidigt. Använd AgilityManagers hälsologg för att följa vikten över tid.

## Läs vidare

- [Uppvärmning för agilityhundar – så gör du rätt](/blogg/uppvarmning-hund-agility)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Börja med agility – komplett guide](/blogg/borja-med-agility)
    `,
  },
  {
    slug: 'sagik-klasser-forklarat',
    title: 'SAgiK-klasser förklarade: Nollklass till K3',
    excerpt: 'Förstå det svenska tävlingssystemet med Nollklass, K1, K2 och K3. Krav och regler.',
    category: 'Tävling',
    readTime: 6,
    date: '2026-02-05',
    author: 'AgilityManager',
    content: `
## Det svenska tävlingssystemet

I Sverige organiseras agilitytävlingar av Svenska Agilityklubben (SAgiK) under Svenska Kennelklubben. Systemet har fyra klasser som ekipaget avancerar genom. Läs mer i vår [kompletta guide om agility](/om-agility).

## Nollklass

**Ingångsklassen** för alla nya ekipage. Perfekt om du precis [börjat med agility](/blogg/borja-med-agility).

- Inga godkännanden krävs för start
- Lägre krav på hastighet
- Färre och enklare hinder
- Perfekt för att lära sig tävlingsformatet

### Krav för att avancera:
3 godkända resultat i Nollklass → uppflyttning till K1

## K1 (Klass 1)

**Mellannivån** där de flesta ekipage tillbringar mest tid.

- Fler hinder och svårare sekvenser
- Högre hastighetskrav
- Alla kontakthinder ingår – [träna kontaktzoner](/blogg/kontaktzoner-traning) noggrant

### Krav för att avancera:
3 godkända resultat i K1 → uppflyttning till K2

## K2 (Klass 2)

**Avancerad nivå** med mer utmanande banor.

- Komplexa sekvenser och vändningar
- Höga hastighetskrav
- Kräver god [distanshantering](/blogg/distanshantering-agility)

### Krav för att avancera:
3 godkända resultat i K2 → uppflyttning till K3

## K3 (Klass 3)

**Högsta klassen** – här tävlar eliten.

- De svåraste banorna
- Högsta hastighetskraven
- SM-kvalificering sker härifrån

## Storleksklasser

Hundar delas in i storleksklasser baserat på mankhöjd. Läs mer om [vilka raser som passar bäst](/blogg/basta-hundraser-agility) i respektive klass.

| Klass | Mankhöjd |
|-------|----------|
| XS | Under 28 cm |
| S | 28–35 cm |
| M | 35–43 cm |
| L | Över 43 cm |

## Tips för uppflyttning

- Fokusera på nollfel snarare än hastighet
- Öva banläsning och planering
- Använd AgilityManagers meritspårning för att följa dina godkännanden
- Förbered dig mentalt – läs om [mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling)

## Läs vidare

- [Mentala förberedelser inför agilitytävling](/blogg/mentala-foreberedelser-tavling)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Slalomträning i agility](/blogg/slalom-traning-agility)
    `,
  },
  {
    slug: 'effektiv-traningsplanering',
    title: 'Planera din agilityträning effektivt',
    excerpt: 'Strukturera din träning med periodisering, målsättning och smart variation.',
    category: 'Träning',
    readTime: 7,
    date: '2026-01-28',
    author: 'AgilityManager',
    content: `
## Varför planera?

Strukturerad träning ger snabbare framsteg än slumpmässig träning. Med en plan vet du vad du jobbar mot och kan mäta utveckling.

## Sätt tydliga mål

### Långsiktiga mål (6-12 månader)
- Avancera till [nästa klass](/blogg/sagik-klasser-forklarat)
- Förbättra godkännandegrad till 70%
- Minska genomsnittlig feltid

### Kortsiktiga mål (1-4 veckor)
- Träna [kontaktzoner](/blogg/kontaktzoner-traning) 3 gånger per vecka
- Förbättra [slalomingångar](/blogg/slalom-traning-agility) från båda håll
- Jobba med [distanshantering](/blogg/distanshantering-agility)

## Periodisering

Dela upp din träningssäsong i perioder:

### Grundperiod (vinter)
- Fokus på teknik och precision
- Bygg styrka och kondition
- Jobba med individuella hinder

### Uppbyggnadsperiod (vår)
- Sätt ihop sekvenser
- Öka komplexitet gradvis
- Börja tävlingssimulering

### Tävlingsperiod (sommar)
- Bibehåll form
- Korta, intensiva pass
- Fokus på banläsning – [mentala förberedelser](/blogg/mentala-foreberedelser-tavling) är lika viktiga

### Vila och återhämtning (höst)
- Minska intensiteten
- Kul och varierad träning
- Utvärdera säsongen

## Logga och analysera

Att logga din träning hjälper dig se mönster:

- Vilka övningar ger bäst resultat?
- Hur påverkar hundens energinivå prestationen?
- När presterar ni bäst – morgon eller kväll?

Använd AgilityManagers träningsdagbok för att spåra all denna data automatiskt.

## Variation är nyckeln

- Träna på olika platser – [bygg hinder hemma](/blogg/agility-hinder-hemma) för mer flexibilitet
- Variera hinderkombinationer
- Byt belöningsmetoder
- Träna med olika människor

## Läs vidare

- [Uppvärmning för agilityhundar](/blogg/uppvarmning-hund-agility)
- [Undvik skador i agility](/blogg/undvik-skador-agility)
- [Börja med agility – komplett guide](/blogg/borja-med-agility)
    `,
  },
  {
    slug: 'slalom-traning-agility',
    title: 'Slalomträning i agility – från nybörjare till tävling',
    excerpt: 'Lär din hund slalom steg för steg. Tekniker, vanliga misstag och träningstips för 12-pinnarsslalom.',
    category: 'Teknik',
    readTime: 7,
    date: '2026-03-15',
    author: 'AgilityManager',
    content: `
## Varför är slalom så svårt?

Slalom (weave poles) är det hinder som tar längst tid att lära ut i agility. Hunden ska väva genom 12 pinnar i rätt ordning, alltid med den första pinnen till vänster. Hastighet, rytm och självständighet krävs – och det tar ofta flera månader att träna upp. Läs mer om [alla hindertyper i agility](/om-agility).

## Tre populära metoder för att lära ut slalom

### Kanalmetoden

Pinnarna ställs i två raka rader med en kanal emellan. Hunden springer rakt igenom och kanalen stängs gradvis tills pinnarna står i linje.

**Fördelar**: Skapar naturlig fart och rytm
**Nackdelar**: Kräver justerbar slalomutrustning

### 2x2-metoden

Hunden lär sig vinkeln genom att arbeta med grupper om två pinnar i taget. Man bygger upp till 12 pinnar stegvis.

**Fördelar**: Hunden förstår uppgiften djupt, bra ingångar
**Nackdelar**: Tar längre tid, kräver precision av tränaren

### Ledmetoden

Föraren leder hunden genom pinnarna med godis eller leksak. Enklast att komma igång med men ger ofta sämre självständighet.

## Vanliga misstag i slalomträning

- **Öka svårigheten för snabbt** – hunden tappar förståelse
- **Dåliga ingångar** – träna ingångar från alla vinklar tidigt
- **Glömma att träna fart** – precision utan hastighet räcker inte i [tävling](/blogg/sagik-klasser-forklarat)
- **Straffa missade pinnar** – bygg motivation istället

## Hur snabbt ska hunden kunna slalom?

I klass 3 förväntas slalom ta cirka 3–4 sekunder. I klass 1 är 5–6 sekunder vanligt. Filma din hund för att mäta utvecklingen.

## Utrustning för hemmabruk

Du kan köpa slalompinnar för hemmaträning – antingen fasta eller vikbara. Minst 6 pinnar rekommenderas för meningsfull träning. Pinnarna ska ha 60 cm avstånd (SAgiK-standard). Läs vår guide om att [bygga agilityhinder hemma](/blogg/agility-hinder-hemma).

## Träna slalom regelbundet

Slalom kräver muskelminne. 3–5 minuters slalomträning varje dag ger bättre resultat än ett långt pass per vecka. [Värm upp hunden](/blogg/uppvarmning-hund-agility) ordentligt innan intensiv slalomträning. Logga dina pass i AgilityManager för att följa utvecklingen.

## Läs vidare

- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Kontaktzonskträning – 5 metoder](/blogg/kontaktzoner-traning)
- [Distanshantering i agility](/blogg/distanshantering-agility)
    `,
  },
  {
    slug: 'agility-hinder-hemma',
    title: 'Bygg agilityhinder hemma – guide och tips',
    excerpt: 'Så bygger du språnghinder, tunnel och slalom hemma. Billigt, säkert och SAgiK-anpassat.',
    category: 'Utrustning',
    readTime: 6,
    date: '2026-03-10',
    author: 'AgilityManager',
    content: `
## Varför träna agility hemma?

Att ha egna hinder hemma gör att du kan träna oftare och mer flexibelt. Korta pass på 5–10 minuter i trädgården kan vara mer effektiva än ett enstaka klubbpass i veckan. Läs mer om [effektiv träningsplanering](/blogg/effektiv-traningsplanering).

## Vilka hinder kan du bygga själv?

### Språnghinder

Det enklaste hindret att bygga. Du behöver:

- Två stolpar (PVC-rör, trädgårdspinnar eller liknande)
- En ribba (PVC-rör, bambupinne eller broomstick)
- Höjden ska vara justerbar

**Viktigt**: Ribban måste kunna falla av vid kontakt – annars riskerar hunden att [skada sig](/blogg/undvik-skador-agility).

### Slalompinnar

Köp 6–12 trädgårdspinnar och ett mätband. Avståndet mellan pinnarna ska vara 60 cm (SAgiK-standard). Pinnarna ska vara minst 100 cm höga. Se vår [guide till slalomträning](/blogg/slalom-traning-agility) för att lära ut slalom effektivt.

### Tunnel

Tunnlar är svårare att bygga själv. En lektunnel för barn (3–4 meter) fungerar bra för träning. Se till att den inte kollapsar under användning.

### Kavalletti

Enkla att bygga med låga stänger och koner. Perfekta för [uppvärmning](/blogg/uppvarmning-hund-agility), kroppskontroll och konditionsträning.

## Säkerhet vid hemmaträning

- **Underlag**: Gräsmatta är bäst. Undvik betong och asfalt.
- **Fästning**: Förankra hinder så de inte välter åt fel håll
- **Mått**: Följ [SAgiK:s mått](/blogg/sagik-klasser-forklarat) om du vill att träningen ska överföras till tävling
- **Ribba-avhopp**: Språngribban MÅSTE kunna trilla av

## Kostnad

Ett enklare hemmaset med 2 språnghinder + 6 slalompinnar kan byggas för under 500 kr. Färdiga set att köpa kostar 1 500–5 000 kr beroende på kvalitet.

## Träningstips för hemmabruk

- Variera uppställningen varje pass
- Träna korta sekvenser, inte hela banor
- Fokusera på ett moment i taget
- Filma och analysera – använd AgilityManagers träningsdagbok för att logga framsteg

## Läs vidare

- [Börja med agility – komplett guide för nybörjare](/blogg/borja-med-agility)
- [Kontaktzonskträning – 5 metoder](/blogg/kontaktzoner-traning)
- [Distanshantering i agility](/blogg/distanshantering-agility)
    `,
  },
  {
    slug: 'basta-hundraser-agility',
    title: 'Bästa hundraserna för agility – vilka passar bäst?',
    excerpt: 'Vilka hundraser passar bäst för agility? Vi går igenom populära raser, egenskaper och vad som krävs.',
    category: 'Nybörjare',
    readTime: 8,
    date: '2026-03-05',
    author: 'AgilityManager',
    content: `
## Kan alla hundar träna agility?

Ja, i princip alla hundar kan träna agility på hobbynivå. Men vissa raser har egenskaper som gör dem extra lämpade för tävling. Läs vår [guide om att börja med agility](/blogg/borja-med-agility) om du är nybörjare. Det handlar framför allt om:

- **Drivkraft** – viljan att arbeta och springa
- **Samarbetsvilja** – vilja att jobba med sin förare
- **Fysik** – rörlighet, snabbhet och uthållighet
- **Fokus** – förmågan att koncentrera sig i en stimulerande miljö

## Populära raser i agility i Sverige

### Border collie

Den absolut vanligaste rasen i agility, särskilt i [klass 3](/blogg/sagik-klasser-forklarat) och på SM-nivå. Extremt drivna, snabba och samarbetsvilliga.

**Passar för**: Den som vill satsa på tävling
**Tänk på**: Kräver mycket mental och fysisk stimulans

### Shetland sheepdog (sheltie)

Mycket populär i de mindre storleksklasserna. Snabb, lydig och ivrig att jobba.

**Passar för**: Både nybörjare och tävlande
**Tänk på**: Kan vara ljudkänslig

### Pudel

Finns i alla storlekar (toy, dvärg, mellan, stor). Smarta, atletiska och fäller inte.

**Passar för**: Allergiker och alla storleksklasser
**Tänk på**: Päls kräver regelbunden skötsel

### Australisk shepherd

Energisk, intelligent och atletisk. En allsidig ras som passar bra i agility.

### Cocker spaniel

Vanlig i mellanklasserna. Entusiastisk, snabb och arbetsvillig.

### Blandras

Många framgångsrika agilityekipage har blandrashundar! Det viktigaste är hundens drivkraft och hälsa, inte stamtavlan.

## Hundar som kan ha svårare med agility

Mycket tunga raser (t.ex. Sankt Bernhard) eller extremt korta raser kan ha svårare med de fysiska momenten. Trubbnosiga raser (brakycefala) bör vara försiktiga med intensiv träning. Läs mer om att [förebygga skador](/blogg/undvik-skador-agility).

## Storleksklass och ras

I Sverige tävlar hundar i fyra storleksklasser (XS, S, M, L) baserat på mankhöjd. Det finns framgångsrika hundar i alla klasser – välj ras efter livsstil och personlighet, inte bara tävlingsambition.

## Det viktigaste

Den bästa agilityhunden är en frisk, motiverad hund med en förare som tycker det är roligt. Oavsett ras kan du nå långt med rätt träning och engagemang. Se till att ha rätt [försäkring för din agilityhund](/hundforsakring). Logga din resa i AgilityManager!

## Läs vidare

- [Börja med agility – komplett guide](/blogg/borja-med-agility)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Hundförsäkring för agilityhundar](/hundforsakring)
    `,
  },
  {
    slug: 'distanshantering-agility',
    title: 'Distanshantering i agility – så tränar du avståndskontroll',
    excerpt: 'Lär dig träna distanshantering för agility. Skicka hunden på avstånd, styra linjer och spara tid på banan.',
    category: 'Teknik',
    readTime: 7,
    date: '2026-02-25',
    author: 'AgilityManager',
    content: `
## Vad är distanshantering?

Distanshantering innebär att du styr hunden på avstånd – utan att springa bredvid varje hinder. Det är en av de viktigaste färdigheterna i agility, särskilt i [högre klasser](/blogg/sagik-klasser-forklarat).

## Varför behövs distans?

- **Snabbare banor**: Du kan ta genvägar medan hunden tar den längre vägen
- **Svårare sekvenser**: I klass 2 och 3 krävs ofta att hunden jobbar ifrån föraren
- **Föraren hinner inte**: Särskilt med snabba hundar behöver du kunna styra på distans

## Grundövningar för distans

### 1. Skicka till hinder

Börja med ETT hinder. Stå nära och skicka hunden framåt. Öka avståndet gradvis. Har du inga hinder? [Bygg egna hemma](/blogg/agility-hinder-hemma).

- Använd tydlig armgest framåt
- Belöna vid hindret, inte hos dig
- Bygg upp till 5–10 meters distans

### 2. Lateralt avstånd

Hunden tar hinder medan du springer på en parallell linje längre bort.

- Börja med 1 meter avstånd
- Öka gradvis till 3–5 meter
- Träna åt båda håll

### 3. Hinder i rad på distans

Ställ upp 3–4 hinder i en rad. Skicka hunden genom hela raden medan du stannar kvar.

## Avancerade distansövningar

### Vinkelskick

Skicka hunden till hinder som inte ligger rakt framför – utan i en vinkel.

### Bakskick

Du springer i motsatt riktning medan hunden fortsätter framåt.

### Blindskick

Hunden skickas runt ett hinder som du inte kan se – kräver stort förtroende.

## Vanliga misstag

- **Öka distansen för snabbt** – hunden tappar säkerhet
- **Otydlig kroppsspråk** – hunden läser din kropp, inte dina ord
- **Glömma att belöna** – distansarbete är svårt för hunden
- **Bara träna rakt fram** – glöm inte vinklar och lateralt avstånd

## Tips för att lyckas

- Träna distans som ett eget moment – [planera det i din träning](/blogg/effektiv-traningsplanering)
- Filma dina pass för att se hundens linjer
- Jobba med motivation – distans ska vara lika kul som att jobba nära
- [Värm upp ordentligt](/blogg/uppvarmning-hund-agility) innan intensiva distanspass
- Logga dina distansträningar i AgilityManager för att följa framstegen

## Läs vidare

- [Slalomträning i agility](/blogg/slalom-traning-agility)
- [Kontaktzonskträning – 5 metoder](/blogg/kontaktzoner-traning)
- [Mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling)
    `,
  },
  {
    slug: 'uppvarmning-hund-agility',
    title: 'Uppvärmning för agilityhundar – så gör du rätt',
    excerpt: 'Komplett guide till uppvärmning innan agilityträning och tävling. Minska skaderisken och förbättra prestationen.',
    category: 'Hälsa',
    readTime: 6,
    date: '2026-02-18',
    author: 'AgilityManager',
    content: `
## Varför värma upp?

Uppvärmning ökar blodflödet till musklerna, förbereder lederna och minskar risken för [skador](/blogg/undvik-skador-agility) markant. Studier visar att uppvärmda hundar presterar bättre och återhämtar sig snabbare.

## Steg-för-steg uppvärmning (10–15 minuter)

### Steg 1: Lugn promenad (3–5 min)

Börja med en lugn promenad i koppel. Låt hunden skutta naturligt utan krav. Syftet är att få igång blodcirkulationen.

### Steg 2: Aktiva rörelser (3–5 min)

- **Sits-stå-repetitioner** – aktiverar bakmuskulaturen
- **Spin/snurra** – ökar rörligheten i ryggraden
- **Handtouch framåt** – sträcker ut kroppen
- **Bakåt-gång** – aktiverar bakpartiet och förbättrar kroppskännedom

### Steg 3: Lätt löpning (2–3 min)

Låt hunden springa fritt eller jaga en leksak i lugnt tempo. Inga skarpa vändningar ännu.

### Steg 4: Hinderspecifik uppvärmning (2–3 min)

- Ett par hopp på låg höjd
- En tunnelgenomgång
- Kort [slalomsekvens](/blogg/slalom-traning-agility) i lugnt tempo

## Uppvärmning inför tävling

Inför tävling bör uppvärmningen vara mer strukturerad. Läs även om [mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling).

1. **30 min innan start**: Lugn promenad och toalettbesök
2. **15 min innan start**: Aktiva rörelser och stretching
3. **5 min innan start**: Kort lek och fokusövningar
4. **Direkt innan**: Några handtouchar och ögonkontaktövningar

## Nedvarvning – lika viktig!

Efter träning eller tävling:

- 5–10 min lugn promenad
- Erbjud vatten (ej iskallt)
- Lätt massage av stora muskelgrupper
- Kontrollera tassar och klor
- Notera eventuell hälta eller stelhet

## Uppvärmning i olika väder

- **Kallt väder**: Längre uppvärmning, eventuellt täcke mellan varv
- **Varmt väder**: Kortare uppvärmning, skugga och vatten
- **Regn**: Var extra uppmärksam på halt underlag

## Logga hundens hälsa

Notera hur hunden rör sig efter uppvärmning och efter träning. AgilityManagers hälsologg hjälper dig upptäcka mönster och förändringar i hundens rörlighet över tid.

## Läs vidare

- [Undvik skador i agility – förebygg och skydda din hund](/blogg/undvik-skador-agility)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Börja med agility – komplett guide](/blogg/borja-med-agility)
    `,
  },
  {
    slug: 'agility-regler-sverige',
    title: 'Agilityregler i Sverige – komplett guide till SAgiK:s regelverk',
    excerpt: 'Allt om regler, bedömning, fel och diskvalificering i svensk agility. Uppdaterat för 2026.',
    category: 'Tävling',
    readTime: 8,
    date: '2026-03-20',
    author: 'AgilityManager',
    content: `
## Grundläggande regler i agility

Agility i Sverige regleras av Svenska Agilityklubben (SAgiK) under Svenska Kennelklubben (SKK). Här går vi igenom de viktigaste reglerna du behöver känna till. Läs även vår [guide till SAgiK-klasser](/blogg/sagik-klasser-forklarat) för att förstå tävlingssystemet.

## Banans uppbyggnad

En tävlingsbana består av 15–22 hinder beroende på klass. Domaren designar banan och sätter en standardtid baserad på banans längd och svårighetsgrad.

- **Banlängd**: Vanligtvis 150–220 meter
- **Antal hinder**: 15–22 stycken
- **Standardtid**: Baseras på banlängd delat med hastighet (m/s)

## Typer av fel

### Rivning (5 fel)

När hunden river en ribba på ett språnghinder. Varje rivet hinder ger 5 fel.

### Vägran (5 fel)

När hunden stannar framför, viker av eller springer förbi ett hinder. Hunden ska ta hindret vid nästa försök.

### Felordning (diskvalificering)

Att ta hinder i fel ordning leder till diskvalificering.

### Kontaktfel (5 fel)

Om hunden missar [kontaktzonen](/blogg/kontaktzoner-traning) på A-bom, vipp eller gångbro.

### Tidsfel

Varje sekund över standardtiden ger felprickar. I vissa klasser är det 1 fel per sekund.

## Godkänt resultat

För att få ett godkänt resultat krävs:

- 0 fel (inga rivningar, vägringar eller kontaktfel)
- Tid under standardtiden
- Inga diskvalificeringsorsaker

## Diskvalificering

Du blir diskvalificerad om:

- Hunden tar hinder i fel ordning
- Föraren rör vid hunden eller hinder
- Hunden lämnar banan
- Föraren bär mat/leksak synligt på banan
- Tre vägringar (i vissa klasser)

## Discipliner

### Agility

Den traditionella grenen med alla hindertyper – språng, kontakthinder, tunnel och slalom.

### Jumping

Enbart språnghinder, tunnlar och slalom. Inga kontakthinder. Snabbare och mer flödesinriktad.

### Nollklass

Förenklad bana för [nybörjare](/blogg/borja-med-agility). Färre hinder och lägre krav.

## Tips för att undvika fel

- Gå banan noggrant – planera din [hantering](/blogg/distanshantering-agility)
- Öva på svaga punkter inför tävling
- [Mentala förberedelser](/blogg/mentala-foreberedelser-tavling) minskar nervösa misstag
- Filma dina lopp och analysera efteråt med AgilityManager

## Läs vidare

- [SAgiK-klasser förklarade](/blogg/sagik-klasser-forklarat)
- [Mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling)
- [Börja med agility – komplett guide](/blogg/borja-med-agility)
    `,
  },
  {
    slug: 'agility-kurs-nyborjare',
    title: 'Agilitykurs för nybörjare – vad du kan förvänta dig',
    excerpt: 'Så fungerar en agilitykurs för nybörjare. Innehåll, kostnad, förberedelser och vad din hund lär sig.',
    category: 'Nybörjare',
    readTime: 7,
    date: '2026-03-22',
    author: 'AgilityManager',
    content: `
## Vad ingår i en nybörjarkurs?

En agilitykurs för nybörjare varar vanligtvis 8–12 veckor med ett pass per vecka. Kursen ger dig och din hund en stabil grund att bygga vidare på. Läs vår [kompletta nybörjarguide](/blogg/borja-med-agility) för att förbereda dig.

## Typiskt kursinnehåll

### Vecka 1–3: Grunderna

- Introduktion till hindertyper
- Tunnelträning – de flesta hundar älskar tunnlar!
- Låga språnghinder
- Fokus på motivation och belöning

### Vecka 4–6: Byggstenar

- Kontakthinder i låg höjd – [lär dig kontaktzonskträning](/blogg/kontaktzoner-traning)
- Introduktion till [slalom](/blogg/slalom-traning-agility) (kanalmetoden)
- Enkel hantering – höger och vänster sväng

### Vecka 7–10: Sekvenser

- Hinder i sekvens (2–4 hinder)
- Grundläggande banläsning
- Start- och stopp-signaler

### Vecka 11–12: Avslutning

- Minibana med 8–10 hinder
- Utvärdering och tips framåt
- Information om fortsättningskurser och [tävlingsklasser](/blogg/sagik-klasser-forklarat)

## Vad kostar en agilitykurs?

Priset varierar beroende på ort och arrangör:

| Typ | Pris (ungefärligt) |
|-----|-------------------|
| Brukshundsklubb | 800–1 500 kr |
| Privat instruktör | 2 000–4 000 kr |
| Intensivkurs (helg) | 1 500–3 000 kr |

## Förberedelser inför kursen

- **Grundlydnad**: Hunden bör kunna sitt namn, enkel inkallning
- **Hälsa**: Se till att hunden är frisk – läs om att [förebygga skador](/blogg/undvik-skador-agility)
- **Utrustning**: Bekväma skor, godis/leksak, vattenflaska
- **Ålder**: Hunden bör vara minst 10–12 månader

## Vad lär sig hunden?

- Förtroende för nya föremål
- Att samarbeta med dig i rörelse
- Grundläggande hinderförståelse
- Att det är kul att "jobba"

## Vad lär sig föraren?

- Kroppsspråkets betydelse
- Timing av belöning
- Grundläggande banplanering
- Att läsa hundens signaler

## Efter kursen

Många fortsätter med tävlingsförberedande kurs. Du kan också [bygga hinder hemma](/blogg/agility-hinder-hemma) och träna på egen hand. Använd AgilityManager för att logga dina träningspass och följa utvecklingen.

## Läs vidare

- [Börja med agility – komplett guide](/blogg/borja-med-agility)
- [Bästa hundraserna för agility](/blogg/basta-hundraser-agility)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
    `,
  },
  {
    slug: 'agility-tavling-forsta-gangen',
    title: 'Din första agilitytävling – steg-för-steg-guide',
    excerpt: 'Allt du behöver veta inför din första agilitytävling. Anmälan, packlista, schema och tips på plats.',
    category: 'Tävling',
    readTime: 8,
    date: '2026-03-25',
    author: 'AgilityManager',
    content: `
## Är du redo för din första tävling?

Du och din hund har tränat hårt och det är dags att ta steget ut på tävlingsbanan. Din [första tävling är i Nollklass](/blogg/sagik-klasser-forklarat) – det är den enklaste nivån och perfekt för att lära sig tävlingsformatet.

## Anmälan

1. **Hitta tävlingar**: Sök på SAgiK:s hemsida eller lokala klubbar
2. **Anmäl dig i tid**: Populära tävlingar fylls snabbt
3. **Kontrollera krav**: Hunden måste vara registrerad och minst 18 månader
4. **Betala**: Startavgift är vanligtvis 150–300 kr per start

## Packlista för tävlingsdagen

### Hunden
- Koppel och halsband/sele
- Vatten och skål
- Godis och leksak (belöning UTANFÖR banan)
- Hundtäcke eller bur
- Bajspåsar

### Föraren
- Bekväma, sportiga kläder
- Bra skor med grepp
- Startkort / ID
- Solskydd / regnkläder

## Tävlingsdagens schema

### 1. Incheckning
Kom minst 1 timme innan din start. Checka in, hämta startnummer och kolla schemat.

### 2. Banvandring
Du får gå banan UTAN hund innan start. Detta är din chans att planera din [hantering](/blogg/distanshantering-agility).

- Gå minst 2 varv
- Notera svåra sekvenser
- Bestäm var du byter sida
- Hitta potentiella fällor

### 3. Uppvärmning
[Värm upp hunden ordentligt](/blogg/uppvarmning-hund-agility) 15–20 minuter innan start.

### 4. Starttid
- Stå redo vid ingången i god tid
- Hunden ska vara kopplad tills det är er tur
- Andas – det är normalt att vara nervös!

### 5. Loppet
- Fokusera på din plan
- Kommunicera tydligt med hunden
- Ha kul – hunden känner din sinnesstämning
- Belöna hunden DIREKT efter målgång (utanför banan)

## Vanliga nybörjarmisstag

- **Springa för fort**: Anpassa dig till hundens nivå
- **Glömma planen**: Håll dig till det du övat
- **Stressa hunden**: Ge hunden tid att landa
- **Bli besviken**: Det viktigaste är att ni har kul och samlar erfarenhet

## Efter tävlingen

- Fira med hunden – ni har tävlat!
- Skriv ner vad som gick bra och vad ni kan förbättra
- Logga resultatet i AgilityManager för att spåra din utveckling
- Planera nästa tävling

## Läs vidare

- [Mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling)
- [SAgiK-klasser förklarade](/blogg/sagik-klasser-forklarat)
- [Agilityregler i Sverige](/blogg/agility-regler-sverige)
    `,
  },
  {
    slug: 'hundkondition-agility',
    title: 'Konditionsträning för agilityhundar – bygg styrka och uthållighet',
    excerpt: 'Så tränar du din hunds kondition för agility. Övningar för styrka, balans och uthållighet.',
    category: 'Hälsa',
    readTime: 7,
    date: '2026-03-28',
    author: 'AgilityManager',
    content: `
## Varför behöver agilityhundar konditionsträning?

Agility ställer höga krav på hundens kropp – explosiva starter, skarpa vändningar och hopp efter hopp. Utan god grundkondition ökar risken för [skador](/blogg/undvik-skador-agility) och prestationen blir lidande.

## Grundläggande kondition

### Promenader och löpning

Dagliga promenader bygger baskonditionen. Variera mellan:

- **Lugna promenader** (30–60 min) – grundläggande uthållighet
- **Intervallöpning** – springa/gå i intervaller, 10–15 min
- **Kuperad terräng** – bygger styrka i bakpartiet

### Simning

Fantastisk konditionsträning som är skonsam för lederna. Perfekt för hundar med ledproblem eller under rehabilitering.

## Styrkeövningar

### Bakpartsövningar

Bakpartiet är motorn i agility. Starka bakben ger kraftigare avstamp och bättre kontroll.

- **Sits-stå-plats**: Repetitioner bygger muskler i bak- och frampart
- **Bakåt-gång**: Aktiverar bakpartiet intensivt – 5–10 steg, 3–5 repetitioner
- **Uppförsbacke**: Gå/springa i backe stärker hela bakkedjan

### Coreträning

En stark core ger bättre balans och kroppskontroll.

- **Balansdyna/kudde**: Hunden står med framtassar på en instabil yta
- **Cavaletti**: Stång-övningar som kräver kontrollerad rörelse
- **Pivotövning**: Hunden svänger runt med bakdelen stillastående

### Frampartsövningar

- **Höga handtouchar**: Sträcker och stärker frampartiet
- **Kontrollerade nedhopp**: Från låg höjd, bygger stötdämpning

## Balansträning

Balans är avgörande för kontakthinder och vändningar.

- **Balansbräda**: Hunden står och balanserar
- **Gångbro i långsam fart**: Kontrollerat, inte snabbt
- **Enmetersgång**: Smal yta som kräver precision

## Veckoschema – exempel

| Dag | Aktivitet |
|-----|----------|
| Måndag | Intervallöpning + core |
| Tisdag | Agilityträning |
| Onsdag | Lugn promenad + balans |
| Torsdag | Styrka (bakpart + frampart) |
| Fredag | Agilityträning |
| Lördag | Simning eller terränglöp |
| Söndag | Vila eller lugn promenad |

## Viktiga principer

- **Gradvis ökning**: Öka inte mer än 10% per vecka
- **Vila**: Minst 1 vilodag per vecka
- **Åldersanpassning**: Unghundar och seniorer behöver anpassat program
- **[Uppvärmning](/blogg/uppvarmning-hund-agility) alltid**: Innan alla pass
- **Logga träningen**: Använd AgilityManagers träningsdagbok

## Läs vidare

- [Uppvärmning för agilityhundar](/blogg/uppvarmning-hund-agility)
- [Undvik skador i agility](/blogg/undvik-skador-agility)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
    `,
  },
  {
    slug: 'agility-vandringar-handling',
    title: 'Vändningar och handling i agility – kompletta tekniker',
    excerpt: 'Lär dig front cross, rear cross, blind cross och threadle. Tekniker som gör dig snabbare på banan.',
    category: 'Teknik',
    readTime: 8,
    date: '2026-04-01',
    author: 'AgilityManager',
    content: `
## Varför är handling så viktig?

Handling – hur du rör dig och kommunicerar med hunden på banan – är det som skiljer bra ekipage från riktigt bra ekipage. Rätt vändningsteknik sparar tid och minskar fel. I [högre klasser](/blogg/sagik-klasser-forklarat) krävs att du behärskar flera tekniker.

## Grundläggande principer

- **Hunden läser din kropp** – inte dina ord
- **Acceleration = fortsätt framåt** – hunden drivs framåt
- **Deceleration = stanna/sväng** – signalerar att något ändras
- **Armgest = riktning** – den arm som är närmast hunden visar vägen

## Front cross

Den vanligaste vändningen. Du byter sida FRAMFÖR hunden.

### Så gör du:
1. Spring mot den punkt där du vill vända
2. Vänd dig mot hunden (180 grader)
3. Byt ledande arm
4. Fortsätt i ny riktning

**Fördelar**: Hunden ser dig hela tiden, tydlig signal
**Nackdelar**: Du måste hinna före hunden till vändpunkten

### Vanliga misstag:
- Vända för sent – hunden har redan passerat
- Otydlig armbyte – hunden blir förvirrad
- Stå still och vända – du måste vara i rörelse

## Rear cross

Du byter sida BAKOM hunden medan den tar ett hinder.

### Så gör du:
1. Hunden tar hindret
2. Du korsar bakom hunden till andra sidan
3. Den nya ledande armen tar över

**Fördelar**: Kräver inte att du hinner före hunden
**Nackdelar**: Hunden ser dig inte under bytet – kräver träning

## Blind cross

Du vänder ryggen mot hunden under bytet. Snabbt men riskabelt.

### Så gör du:
1. Signalera riktning med armen
2. Sväng bort från hunden (rygg mot hund)
3. Byt arm och fortsätt i ny riktning

**Fördelar**: Mycket snabbt, du tappar inte fart
**Nackdelar**: Du tappar ögonkontakt – kräver erfaren hund

## Threadle

Hunden tar hindret från "fel" sida – utifrån och in.

### Vanliga situationer:
- Hunden ska runda en stolpe och ta hindret bakifrån
- Används för att undvika att hunden tar fel hinder

## Ketschup

En kombinationsteknik där du använder en push (tryck bort) följt av en pull (dra till dig) för att guida hunden genom en sväng.

## Vilken teknik ska du välja?

| Situation | Rekommenderad teknik |
|-----------|---------------------|
| Du hinner före hunden | Front cross |
| Hunden är snabbare | Rear cross |
| Du behöver maximal fart | Blind cross |
| Hunden ska runda ett hinder | Threadle |

## Träna vändningar effektivt

- Börja UTAN hinder – träna fotarbete och timing
- Lägg till ett hinder i taget
- [Planera vändningsträning](/blogg/effektiv-traningsplanering) som separata pass
- Filma och analysera – AgilityManagers träningsdagbok hjälper dig följa utvecklingen
- [Distanshantering](/blogg/distanshantering-agility) kompletterar vändningsteknik

## Läs vidare

- [Distanshantering i agility](/blogg/distanshantering-agility)
- [Kontaktzonskträning – 5 metoder](/blogg/kontaktzoner-traning)
- [Slalomträning i agility](/blogg/slalom-traning-agility)
    `,
  },
  // ═══════ HOOPERS BLOG POSTS ═══════
  {
    slug: 'hoopers-hund',
    title: 'Hoopers för hund – allt du behöver veta om sporten',
    excerpt: 'Vad är hoopers och hur fungerar det för din hund? Lär dig om regler, hinder, klasser och varför hoopers passar alla hundar.',
    category: 'Hoopers',
    readTime: 7,
    date: '2026-04-10',
    author: 'AgilityManager',
    content: `
## Hoopers för hund – allt du behöver veta

Hoopers är en hundsport där hunden tar sig igenom en hinderbana i rätt ordning. Banan består av bågar (hoops), tunnlar, tunnor och staket. Det som skiljer hoopers från agility: inga hopp, och föraren dirigerar på distans.

### Hindren i hoopers

- **Hoop (båge)** – plastbåge som hunden springer igenom
- **Tunnel** – böjbar tunnel
- **Tunna** – hunden springer runt ett fat
- **Staket** – hunden passerar bakom en grind

### Klasser och nivåer

SHoK:s regelverk: Startklass, Klass 1, Klass 2 och Klass 3. Storlekskategorier: Small (under 40 cm) och Large (40 cm+).

### Passar hoopers din hund?

Hoopers passar de flesta hundar – särskilt äldre hundar eller hundar med ledproblem. Föraren behöver inte vara atletisk.

Sedan november 2025 är hoopers officiell SKK-sport, organiserat av Svenska Hoopersklubben (SHoK).

- [Hoopers eller agility?](/blogg/hoopers-vs-agility)
- [Börja med hoopers](/blogg/borja-med-hoopers)
- [Distanshandling i hoopers](/blogg/distanshandling-hoopers)
    `,
  },
  {
    slug: 'hoopers-vs-agility',
    title: 'Hoopers eller agility – vad passar din hund?',
    excerpt: 'Vad är skillnaden mellan hoopers och agility? Vi jämför hinder, regler och förarens roll.',
    category: 'Hoopers',
    readTime: 6,
    date: '2026-04-08',
    author: 'AgilityManager',
    content: `
## Hoopers eller agility?

### Hindren

I agility: hoppstavar, kontakthinder, tunnel, slalom. I hoopers: bågar, tunnlar, tunnor, staket – inga hopp.

### Förarens roll

Agility: du springer med hunden. Hoopers: du dirigerar från ett fastlagt område med kroppsspråk och röst.

### Vad passar vilken hund?

- Äldre hund/ledproblem → hoopers
- Älskar att hoppa → agility
- Bra på distans-kroppsspråk → hoopers
- Behöver tät kontakt → agility

Kan man köra båda? Ja – de kompletterar varandra. I AgilityManager väljer du sport per hund.

- [Allt om hoopers](/blogg/hoopers-hund)
- [Börja med hoopers](/blogg/borja-med-hoopers)
    `,
  },
  {
    slug: 'borja-med-hoopers',
    title: 'Börja med hoopers – guide för nybörjare',
    excerpt: 'Vill du börja med hoopers? Utrustning, instruktör, träning och vägen till tävling.',
    category: 'Hoopers',
    readTime: 6,
    date: '2026-04-06',
    author: 'AgilityManager',
    content: `
## Börja med hoopers

### Hitta en instruktör

Gå en kurs med en SHoK-utbildad instruktör. Baskursen täcker hinderinlärning, distanshandling och regelverk.

### Utrustning

Hund, halsband och godbitar. Hindren tillhandahåller klubben. Till tävling: inmätning och registrering i SHoK.

### Träningen

Börja med ett hinder i taget. Bygg avstånd gradvis. Det som tar tid är distanshandlingen.

### Tävling

En hund som tränar regelbundet kan vara redo för Startklass inom ett halvår.

- [Distanshandling i hoopers](/blogg/distanshandling-hoopers)
- [Tävla i hoopers](/blogg/tavla-i-hoopers)
    `,
  },
  {
    slug: 'distanshandling-hoopers',
    title: 'Distanshandling i hoopers – steg för steg',
    excerpt: 'Distanshandling är kärnan i hoopers. Träna kroppsspråk, timing och kommunikation på avstånd.',
    category: 'Hoopers',
    readTime: 7,
    date: '2026-04-04',
    author: 'AgilityManager',
    content: `
## Distanshandling i hoopers

### Steg 1 – Hindren utan avstånd

Börja nära. Belöna för att hunden tar hindren.

### Steg 2 – Bygg avstånd

Ta ett steg bakåt. Öka bara om hunden klarar nuvarande avstånd.

### Steg 3 – Ditt kroppsspråk

Filma dig själv. Se axlar, blick, kroppsrotation. Hunden läser av dig.

### Steg 4 – Kombinera

Sätt ihop hinder. Mjuka linjer. Flyt före hastighet.

I AgilityManager betygsätter du dirigering och banflyt (1–5) per pass.

- [Börja med hoopers](/blogg/borja-med-hoopers)
- [Hoopers hund](/blogg/hoopers-hund)
    `,
  },
  {
    slug: 'tavla-i-hoopers',
    title: 'Tävla i hoopers – klasser, regler och anmälan',
    excerpt: 'Allt om tävling i hoopers: Startklass till Klass 3, storlekskategorier och SHoK:s regelverk.',
    category: 'Hoopers',
    readTime: 6,
    date: '2026-04-02',
    author: 'AgilityManager',
    content: `
## Tävla i hoopers

### Klasserna

- **Startklass** – nybörjarnivå
- **Klass 1** – fler hinder, längre avstånd
- **Klass 2** – komplex bana, fler riktningsbyten
- **Klass 3** – elitnivå, avancerad distanshandling

### Storlekskategorier

- **Small** – under 40 cm mankhöjd
- **Large** – 40 cm och uppåt

### Bedömning

Tid och fel. Fel vid missade hinder, fel ordning eller om föraren lämnar dirigeringsområdet.

Logga varje pass i AgilityManager – följ dirigeringskvalitet och banflyt över tid.

- [Hoopers hund](/blogg/hoopers-hund)
- [Börja med hoopers](/blogg/borja-med-hoopers)
    `,
  },
  {
    slug: 'slalom-komplett-guide',
    title: 'Så tränar du slalom i agility – den kompletta guiden',
    excerpt: 'Allt om slalomträning: metoder, ingångar, självständighet och tävlingsförberedelse. En djupguide för alla nivåer.',
    category: 'Teknik',
    readTime: 15,
    date: '2026-04-10',
    author: 'AgilityManager',
    content: `
## Vad är det egentligen som gör slalom svårt?

Slalom är ett av de tekniskt svåraste hindren i agility. Det kräver mer träning, mer tålamod och mer systematik än nästan allt annat på banan. Men det är också ett av de hinder där skillnaden mellan ett mediokert och ett riktigt bra ekipage syns allra tydligast.

De flesta hinder i agility kräver att hunden hoppar, springer eller balanserar. Slalom kräver att hunden rör sig i ett mönster som är fullständigt onaturligt för en hund. Rörelsemönstret måste läras in på muskelminnes-nivå – hunden ska inte *tänka* sig fram, den ska bara göra det.

Hunden måste lära sig tre separata saker:

1. **Ingången** – alltid från höger sida av pinne ett
2. **Rörelsekedjan** – rytmiskt sicksackmönster hela vägen igenom
3. **Självständigheten** – att hålla mönstret utan att förlita sig på förarens exakta position

## De vanligaste misstagen tidiga i träningen

**Misstag 1: Öppna pinnar för länge** – Hunden lär sig att springa i en kanal, inte att väva. Stäng ner gradvis och tidigare än du tror att du behöver.

**Misstag 2: Träna alltid på samma sida** – Om du alltid springer till vänster om hunden, lär den sig att du ska vara där. Variera din position från dag ett.

**Misstag 3: Belöna efter hindret istället för under** – Träna istället att belöna rytmen – använd gärna en belöning som uppmuntrar rörelse framåt.

**Misstag 4: Hoppa över problem** – Om hunden konsekvent missar pinne sex, sju eller åtta – ta reda på varför. Problem i mitten av slalomen är nästan alltid förarrelaterade.

## Metoder för att lära in slalom

### 1. Channel weaves (öppna pinnar)

Du börjar med pinnarna separerade i två rader och låter hunden springa rakt igenom kanalen. Gradvis minskar du bredden tills pinnarna är i linje och hunden väver.

**Passar:** Hundar som är snabba och drivna framåt. Hundar som är nervösa för pinnar.

### 2. 2×2-metoden

Populär metod som Susan Garrett populariserade. Du tränar med bara två pinnar i taget och bygger upp förståelse för ingångar och rytm.

**Passar:** Hundar som tenderar att chansa sig fram. Förare som gillar att systematisera.

### 3. Pinnar i rät linje från start

Hunden tränar på alla 12 pinnar direkt, men med tydlig hjälp av förare, mat eller tug.

**Passar:** Hundar med hög driv och naturlig kroppskännedom.

## Ingången – det som avgör allt

Ingången är ingångsvinkel + fart + fokus. Om en av de tre sakerna är fel, är chansen stor att slalomen går snett.

**Träna ingångar separat.** Ställ upp bara de tre första pinnarna och träna att hunden hittar in korrekt från olika vinklar – 45 grader till vänster, 45 grader till höger, rakt framifrån. Belöna varje korrekt ingång generöst.

## Rytm och självständighet

Det finns ett enkelt test: kör slalomen och börja sakta ner halvvägs igenom. Om hunden saktar ner med dig har den inte självständigheten. Om den fortsätter i sin egen rytm – bra, ni är på rätt väg.

### Tre övningar för bättre självständighet

**Övning 1: Förarens haltande tempo** – Spring in med full fart, men sakta ner dramatiskt vid pinne fyra eller fem.

**Övning 2: Föraren stannar helt** – Spring de tre första pinnarna och stanna sedan. Kan hunden avsluta ensam?

**Övning 3: Variera din sida** – Kör slalomen med dig till vänster, till höger, far bakom. Variera tills det inte spelar roll var du är.

## Slalom under tävlingstryck

Tävlingsmiljön skapar mer driv och spänning – och en hund med extra driv tenderar att köra lite slarvigare. Träna slalom när hunden är pigg och med lite mer stimuli i närheten. Träna tävlingsrelevanta ingångar med skarpa vinklar och hoppkombinationer precis innan slalomen.

## En enkel progressionsplan

- **Vecka 1–3:** Välj metod. Lägg grunden, ingen fart ännu.
- **Vecka 4–6:** Stäng ner pinnarna. Börja lägga till fart gradvis.
- **Vecka 7–10:** Ingångar från alla vinklar separat och i kombination.
- **Vecka 11–14:** Självständighet. Variera din position och hastighet.
- **Vecka 15+:** Tävlingsrelevant träning. Hinder före och efter, skarpa vinklar, hög driv.

## Filma din slalom

Titta på: din position relativt hunden, din blick, din hastighet och hundens rytm. Filma minst var fjärde träning – de fem minuterna ger dig mer information än timmar av träning utan reflektion.

## Slalom i olika väder och underlag

Träna slalom på fler underlag – betong, gräs, konstgräs, grus. Ju fler underlag hunden tränat slalom på, desto robustare är beteendet. Samma princip gäller för väder.

## Hur länge tar det att lära in slalom?

Med konsekvent träning tre till fyra gånger i veckan kan en hund ha en fungerande slalom på 10–12 veckor. Men den tävlingsstabila slalomen tar oftast en full säsong att bygga.

## Läs vidare

- [Slalomträning – grunderna](/blogg/slalom-traning-agility)
- [Kontaktzonskträning – 5 metoder](/blogg/kontaktzoner-traning)
- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
    `,
  },
  {
    slug: 'beloning-agility-guide',
    title: 'Belöning i agility – hur du väljer rätt och gör hunden till en tävlingsmaskin',
    excerpt: 'Mat eller leksak? Timing, variabel belöning och hur du bygger en hund som brinner för att arbeta med dig.',
    category: 'Träning',
    readTime: 12,
    date: '2026-04-08',
    author: 'AgilityManager',
    content: `
## Belöning är kommunikation

Belöning är inte bara en positiv upplevelse för hunden. Det är information – det säger till hunden: *det du precis gjorde var rätt, gör det igen*. Kvaliteten på belöningen och timingen avgör hur tydlig den informationen är.

## Mat eller leksak – och varför svaret inte är antingen/eller

De bästa tränarna använder båda – men i olika situationer och för olika syften.

### Mat – styrkor och svagheter

Mat är oerhört exakt. Du kan belöna precis det du vill belöna och variera värdet enkelt. Matens svaghet i agility är att den tenderar att bromsa hunden.

**Bäst lämpad för:** Inlärning av nya beteenden, precisionsövningar (kontaktfält, [slalomingångar](/blogg/slalom-komplett-guide)), lugnare träningsmoment.

### Leksak och tug – styrkor och svagheter

Rätt använt är tuggen ett av de mäktigaste verktygen i agilitytränares arsenal. Den skapar rörelse, driv och en nästan adrenalinfylld energi hos rätt hund.

**Bäst lämpad för:** Driv- och energibyggande, kontaktfältsarbete med rörelse, avslutsbelöning, återhämta motivation efter misslyckande.

## Fem sätt att göra tuggen hetare

1. **Tuggen är bara synlig under träning** – Den ska inte vara ett vanligt leksak, utan ett specialverktyg.
2. **Träna tug-leken separat** – Dedikera tid till att bara leka med tuggen, spring med hunden, låt hunden vinna ofta.
3. **Använd tuggen för att invittera** – Håll tuggen framför hunden och spring iväg. Låt hunden jaga den.
4. **Håll sessionerna korta** – Tio intensiva minuter bygger mer driv än fyrtio halvhjärtade minuter.
5. **Testa vad din hund föredrar** – Mjuka tuggar, hård gummi, squeeky toys, snöre med påse – experimentera.

## Olika belöningar för olika moment

- **Kontaktfält (stanna):** Mat – statiskt beteende belönas bäst utan rörelseuppmuntran.
- **Kontaktfält (running contact):** Tug i rörelse, kastad framåt.
- **[Slalomingångar](/blogg/slalom-komplett-guide):** Mat för precision.
- **Hopp i sekvens:** Tug eller boll kastad framåt.
- **Tunneln:** Tug eller boll vid utloppet.

## Timing – det viktigaste du inte tänker på

Hundens hjärna kopplar ihop handling med konsekvens under en väldigt kort tidsperiod – under en sekund. Använd en markör (klicker eller markörord som "ja!") för att märka exakt rätt beteende och följ sedan med belöning.

## Belöning på tävling

Belöningen under träningen bygger hundens motivation och förståelse. På tävling kör hunden på den inbyggda motivationen. En hund som är genuint motiverad att arbeta med dig behöver inte mat i ringen.

**Praktisk övning:** Ibland under träning – inte alltid – kör du en hel sekvens utan belöning under körningen. Avsluta med en storbuss efteråt.

## Jackpot och variabel belöning

Variabel belöning skapar starkare och mer uthålliga beteenden. Bygg in tillfällen där hunden får en ovanligt stor belöning för ett specifikt bra beteende. Var strategisk – ge den när hunden gör något verkligen bra.

## Att hantera en hund som tappar motivationen

- **Fysiskt trött:** Vila är träning.
- **Mentalt mätt:** Korta ner och variera.
- **Belöningsvärdet har sjunkit:** Byt upp, introducera något nytt.
- **Stress eller obehag:** Ge hunden benefit of the doubt.

## Läs vidare

- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling)
- [Undvik skador i agility](/blogg/undvik-skador-agility)
    `,
  },
  {
    slug: 'agility-nyborjare-komplett',
    title: 'Agility för nybörjare – allt du behöver veta innan du börjar',
    excerpt: 'En djupgående guide för dig som aldrig tränat agility. Hindren, utrustning, första träningen och vanliga misstag.',
    category: 'Nybörjare',
    readTime: 14,
    date: '2026-04-06',
    author: 'AgilityManager',
    content: `
## Vad är agility egentligen?

Agility är en hindersport för hund och förare. Hunden springer fritt runt en bana med 15–22 hinder och föraren styr hunden enbart med kropp och röst. Målet är att klara banan felfritt och på kortast möjliga tid.

Banan ritas av en officiell domare och är aldrig densamma från tävling till tävling – du och hunden måste läsa varje ny bana.

## Hindren – en snabb genomgång

- **Hopphinder** – Hunden hoppar över en bom. Finns i varianter som mur, däck och långhopp.
- **Tunneln** – De flesta hundars favorit. Böjbar tunnel som hunden springer igenom.
- **[Slalomen](/blogg/slalom-komplett-guide)** – Tolv pinnar i rad som hunden väver igenom. Tekniskt krävande.
- **Balansbommen** – Smal bräda på stativ, cirka 120 cm upp. Med kontaktzoner i varje ände.
- **A-hindret** – A-format klätterredskap. Hunden klättrar upp och ner. Med kontaktzoner.
- **Gungbrädan** – Tippar när hunden passerar mittpunkten. Kräver nervstyrka.

[Kontaktzonerna](/blogg/kontaktzoner-traning) är målade områden som hunden måste trampa i – ett säkerhetssystem.

## Passar min hund?

I princip alla hundar över 18 månader kan träna agility oavsett ras. Läs mer om [vilka raser som passar bäst](/blogg/basta-hundraser-agility).

- **Ålder:** Valpar under 18 månader ska inte träna på höjder.
- **Hälsa:** Prata med din veterinär om du är osäker.
- **Temperament:** Hunden ska tycka det är roligt – tvinga aldrig!
- **Storlek:** Det finns [klasser för alla storlekar](/blogg/sagik-klasser-forklarat).

## Vad behöver du som förare?

- **Inga förkunskaper** – allt lärs ut från grunden.
- **Rimlig rörelsefrihet** – du behöver inte vara löpare.
- **Tålamod** – det viktigaste.
- **Bra skor** – griplande sulor, stöd och bekvämlighet. Gör enorm skillnad.

## Hitta en kurs eller klubb

Sök efter agilityklubb eller brukshundklubb i din stad. Fråga om nybörjarkurser. Gå gärna på ett träningstillfälle som åskådare först.

### Fråga klubben:
- Vilken metod använder ni för slalom och kontaktfält?
- Hur stora är kursgrupperna?
- Är det positiv förstärkning som gäller?
- Vad kostar det och ingår fortsatt träning?

## Din första träning

**Introduktion till hindren** – ni presenteras för hindren en i taget, i låg höjd.

**Fokus och kontakt** – bygga förarens förmåga att ha hundens uppmärksamhet.

**Positivt och roligt** – allt ska vara roligt för hunden. Om hunden inte tycker det är kul – ta ett steg tillbaka.

## De vanligaste nybörjarmisstagen

- **Träna för länge per pass** – 10–15 minuter aktiv träning räcker.
- **Kräva för mycket för tidigt** – det ger sköra beteenden som spricker under press.
- **Glömma att träna sig själv** – din position och ditt kroppsspråk påverkar enormt. [Filma dig själv](/blogg/slalom-komplett-guide).
- **Jämföra dig med erfarna förare** – de har tränat i år, du i veckor.
- **Glömma att ha kul** – hunden känner av din energi.

## Utrustning du behöver

- Bra skor med grepp
- Bekväma kläder
- Godbitar eller tug
- Koppel och halsband

**Du behöver inte:** Dyra specialkläder, egna hinder eller en speciell ras.

## Tävla – när är man redo?

Du är redo att tävla när hunden och du klarar en komplett bana relativt stabilt i träning. [Tävling i Nollklass](/blogg/sagik-klasser-forklarat) är väldigt tillgängligt.

## Läs vidare

- [Börja med agility – grundguide](/blogg/borja-med-agility)
- [Belöning i agility](/blogg/beloning-agility-guide)
- [SAgiK-klasser förklarade](/blogg/sagik-klasser-forklarat)
    `,
  },
  {
    slug: 'kontaktfalt-komplett-guide',
    title: 'Kontaktfält i agility – den kompletta guiden till A-hinder, balansbom och gungbräda',
    excerpt: 'Allt om kontaktfältsträning: stoppad vs rinnande kontakt, de tre hindren, proofing och underhåll.',
    category: 'Teknik',
    readTime: 16,
    date: '2026-04-04',
    author: 'AgilityManager',
    content: `
## Vad är ett kontaktfält?

Kontaktfält är de nedsatta, färgade zonerna i botten av A-hindret, balansbommen och gungbrädan. Hunden måste placera minst en tass i kontaktzonen på väg ned. Missar hunden kontaktzonen blir det fel.

Kontaktzonerna finns av säkerhetsskäl – utan dem skulle hundar riskera att hoppa av från höjd med skador som följd.

## De tre hindren

### A-hindret

A-format klätterredskap, cirka 170 cm högt. Kräver mod, kontroll och träff i kontaktzonen. Snabba hundar tenderar att hoppa av före kontaktzonen – träningen handlar om att göra kontaktzonen till en vana.

### Balansbommen

Smal bräda (cirka 12 cm bred) på stativ med ramper. Kräver balans och kroppskontroll. Mest känslig för hundens tempo – för tveksam = tappa balansen, för fort = halka.

### Gungbrädan

Brädan tippar när hunden passerar mittpunkten. Kräver nervstyrka. Många hundar är nervösa i början – pressa aldrig en hund igenom sin rädsla.

**Bygg förtroende gradvis:** Börja med brädan på marken utan rörelse. Stabilisera under träning, tillåt lite rörelse i taget. Kontrollera tippningspunkten manuellt.

## Stoppad vs rinnande kontakt

### Stoppad kontakt

Hunden stannar i kontaktzonen i en specifik position (liggande, sittande eller "2on2off").

**Fördelar:** Tydlig, konsekvent, lättare att träna till tillförlitlighet.
**Nackdelar:** Tar tid, hunden stannar, väntar, startar om.

### Rinnande kontakt (running contact)

Hunden springer hela vägen igenom utan att stanna – kontaktzonen fångas i farten.

**Fördelar:** Snabbare, mer naturligt flyt.
**Nackdelar:** Extremt svårt att träna korrekt, sköra vid stress.

## Hur du tränar kontaktfält

### Steg 1: Lär in positionen

Separera inlärningen av positionen från själva hindret. Använd en platta på marken, träna hunden att erbjuda rätt position. Hög belöning.

### Steg 2: Flytta till hindret

Börja med hindret i lägsta möjliga höjd. Låt hunden hitta positionen på hindret.

### Steg 3: Bygg fart gradvis

Först: promenadtempo. Sedan: lätt trav. Sedan: jogg. Sedan: full fart. Skynda inte – varje steg ska vara stabilt innan du ökar.

### Steg 4: Proofing

Testa beteendet med distraktioner, hinder precis efter, i ny miljö. Varje gång beteendet håller är det mer robust.

## Vanliga problem och lösningar

- **Hunden hoppar av utan kontaktzon:** Gå tillbaka till långsammare körningar, mer tydlig vägledning.
- **Hunden stannar mitt på hindret:** Konfidenproblem. Sänk höjden, bygg förtroende.
- **Kontakten håller hemma men inte på tävling:** Behöver mer proofing – fler miljöer, mer distraktion.
- **Hunden springer igenom utan att bry sig:** Kontaktzonen inte tillräckligt förstärkt. Gå tillbaka till grunderna med hög belöning.

## Underhåll – kontaktfält är färskvara

Inkludera kontaktfältet i varje träningspass, även om det bara är 1–3 körningar. En till två gånger per säsong: gå tillbaka till grundläggande kontaktfältsträning med låg fart och hög belöning.

## Kontaktfälten och hundens ålder

- **Ung hund:** Ingen fart, ingen press, bara tydlig inlärning i låg höjd.
- **Hund i träning (1–3 år):** Bygg fart och robusthet. Proofing är prioritet.
- **Erfaren tävlingshund:** Underhåll och fånga tidiga tecken på att kontakten börjar slira.
- **Äldre hund:** Var lyhörd för hundens kropp, anpassa vid behov.

## Läs vidare

- [Kontaktzonskträning – 5 metoder](/blogg/kontaktzoner-traning)
- [Undvik skador i agility](/blogg/undvik-skador-agility)
- [Uppvärmning för agilityhundar](/blogg/uppvarmning-hund-agility)
    `,
  },
  {
    slug: 'traningslogg-guide',
    title: 'Varför varje agilityförare behöver en träningslogg',
    excerpt: 'Så använder du en träningslogg för att bli en bättre tränare, se mönster och nå dina mål snabbare.',
    category: 'Träning',
    readTime: 14,
    date: '2026-04-02',
    author: 'AgilityManager',
    content: `
## Det mänskliga minnesproblemet

Vårt minne är katastrofalt dåligt på att komma ihåg träning korrekt. Hjärnan sorterar minnen baserat på känslomässig laddning, inte exakthet. Den där perfekta [slalomkörningen](/blogg/slalom-komplett-guide) minns du – torsdagssessionen med sex missade ingångar suddar ut sig.

En träningslogg är ett sätt att komma runt det. Faktum är vad faktum är.

## Vad du faktiskt kan lära dig av en logg

### Mönster i kontaktfält under stress

Du loggar varje tävling och träningspass. Efter tre månader ser du tydligt: hunden missar [kontaktzonen](/blogg/kontaktfalt-komplett-guide) i A-hindret specifikt när det finns ett hopp precis efter. På neutral bana: 100%. Med hopp efter: 60%.

### Samband mellan träningsvolym och resultat

Du hittar din hunds optimala träningsvolym – kanske tre till fyra pass per vecka, inte mer, inte mindre.

### Slalomens dåliga perioder

Slalomen var bra i mars, börjar krackelera i april. Loggen visar: elva dagars uppehåll + direkt in i tävlingssäsongen utan grundrepetition. Nu vet du vad hunden behöver.

### Framsteg som är osynliga ögonblick för ögonblick

Din hund kör slalom på 4,2 sekunder nu – loggen visar att det var 6,8 sekunder för sex månader sedan.

## Vad du bör logga

### Alltid:
- **Datum och längd** – grunddata för att se mönster
- **Hund** – om du har flera
- **Fokus för sessionen** – "slalom ingångar", "kontaktfält under fart", en mening räcker
- **Hur det gick – ärligt** – siffror om du kan, beskrivning om inte
- **Noteringar** – allt som sticker ut

### Bra men inte nödvändigt:
- Video-länk om du filmade
- Väder och underlag
- Egenbedömning av ditt körande

## Tävlingsloggen – separat kapitel

### Logga per tävling:
- Datum, tävlingens namn, klass
- Hund och bana (agility/hopp)
- Resultat: tid, antal fel, feltyp
- Kort kommentar: vad gick bra/sämre

### Vad tävlingsloggen visar:
- Din nollrundsandel
- Vilka feltyper som är vanligast
- Hur tiderna utvecklas klass för klass
- Eventuella mönster

## Hur du faktiskt hinner med det

**Logga direkt efter sessionen** – väntar du till kvällen glömmer du hälften.

**Håll det enkelt** – en app med snabb inmatning är bättre än ett Excel-ark du aldrig öppnar.

**Gör det till en vana** – koppla loggningen till något du alltid gör efter träning.

**Analysera en gång i månaden** – femton minuter. Vad ser du? Vad förvånar dig?

## Loggning som mental träning

En logg ger perspektiv. En vecka som känns som "vi kom ingen vart" – öppna loggen. Ni körde [kontaktfält](/blogg/kontaktfalt-komplett-guide) och det höll 85%. Det är framsteg.

Förare som slutar med agility gör det ofta för att det "inte känns roligt längre" – ofta för att de bara ser misslyckandena utan att se progressionen. En logg motverkar det.

## Tre saker att logga från din nästa träning

1. Datum och vad ni tränade (ett ord räcker)
2. En sak som gick bra
3. En sak att jobba vidare med

Gör det tjugo träningar och du har plötsligt ett mönster du aldrig hade sett annars. AgilityManager gör det enkelt med automatisk statistik och [trendgrafer](/competition).

## Läs vidare

- [Planera din agilityträning effektivt](/blogg/effektiv-traningsplanering)
- [Belöning i agility](/blogg/beloning-agility-guide)
- [Mentala förberedelser inför tävling](/blogg/mentala-foreberedelser-tavling)
    `,
  },
];


export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

// --- Database-backed blog functions ---
import { supabase } from '@/integrations/supabase/client';

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  // Single source of truth: databasen. Ingen fallback till hårdkodat innehåll
  // – risken är annars att stale content visas vid tillfälliga DB-fel.
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, content, category, read_time, date, author, seo_title, seo_description')
    .eq('published', true)
    .order('date', { ascending: false });

  if (error) {
    console.error('[blogData] fetchBlogPosts error:', error);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt,
    content: d.content,
    category: d.category,
    readTime: d.read_time,
    date: d.date,
    author: d.author,
    seoTitle: d.seo_title ?? null,
    seoDescription: d.seo_description ?? null,
  }));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  // Single source of truth: databasen. Returnerar undefined om posten saknas
  // istället för att falla tillbaka på (potentiellt felaktigt) hårdkodat innehåll.
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, content, category, read_time, date, author, seo_title, seo_description')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    console.error('[blogData] fetchPostBySlug error:', error);
    return undefined;
  }
  if (!data) return undefined;

  return {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    category: data.category,
    readTime: (data as any).read_time,
    date: data.date,
    author: data.author,
    seoTitle: (data as any).seo_title ?? null,
    seoDescription: (data as any).seo_description ?? null,
  };
}
