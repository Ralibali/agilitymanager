export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  date: string;
  author: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'borja-med-agility',
    title: 'Börja med agility – komplett guide för nybörjare',
    excerpt: 'Allt du behöver veta för att komma igång med agility. Från val av klubb till första träningen.',
    category: 'Nybörjare',
    readTime: 8,
    date: '2025-03-01',
    author: 'AgilityManager',
    content: `
## Vad är agility?

Agility är en hundsport där hund och förare tillsammans tar sig igenom en bana med olika hinder. Det handlar om samarbete, kommunikation och framför allt – att ha kul tillsammans!

## Passar agility min hund?

De flesta hundar kan träna agility. Det viktigaste är att hunden är frisk, rörlig och motiverad. Några saker att tänka på:

- **Ålder**: Hunden bör vara minst 12 månader innan den hoppar fulla höjder
- **Hälsa**: En veterinärundersökning rekommenderas innan start
- **Temperament**: Hunden ska tycka det är roligt – tvinga aldrig!

## Hur kommer jag igång?

1. **Hitta en klubb** – Kontakta din lokala brukshundsklubb eller agilityklubb
2. **Nybörjarkurs** – De flesta klubbar erbjuder nybörjarkurser
3. **Utrustning** – Du behöver bekväma kläder och godis/leksak som belöning
4. **Tålamod** – Det tar tid att bygga upp grunderna

## Grundläggande hinder

- **Språnghinder** – Hunden hoppar över en ribba
- **Tunnel** – Hunden springer genom en tunnel
- **Kontakthinder** – A-bom, vipp och gångbro med kontaktzoner
- **Slalom** – Hunden väver mellan pinnar

## Tips för första träningen

- Håll det kort och roligt (10-15 minuter)
- Belöna ofta och generöst
- Avsluta alltid på en positiv not
- Fokusera på relation, inte prestation
    `,
  },
  {
    slug: 'kontaktzoner-traning',
    title: 'Träna kontaktzoner – 5 metoder som fungerar',
    excerpt: 'Lär dig de vanligaste metoderna för kontaktzonskträning: 2on2off, running contact och fler.',
    category: 'Teknik',
    readTime: 6,
    date: '2025-02-20',
    author: 'AgilityManager',
    content: `
## Varför är kontaktzoner viktiga?

Kontaktzonerna är målade områden på A-bom, vipp och gångbro. Hunden måste röra zonerna – annars blir det fel i tävling. Bra kontakter kan vara skillnaden mellan godkänt och icke godkänt.

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
    `,
  },
  {
    slug: 'mentala-foreberedelser-tavling',
    title: 'Mentala förberedelser inför agilitytävling',
    excerpt: 'Så hanterar du nerver, fokuserar rätt och presterar ditt bästa på tävlingsdagen.',
    category: 'Tävling',
    readTime: 5,
    date: '2025-02-15',
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
3. Värm upp hunden ordentligt
4. Ha en rutin som skapar fokus

### Under loppet
- Andas! Djupa andetag innan start
- Fokusera på din plan, inte resultatet
- Kommunicera tydligt med hunden
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
    `,
  },
  {
    slug: 'undvik-skador-agility',
    title: 'Undvik skador i agility – förebygg och skydda din hund',
    excerpt: 'Vanliga skador i agility och hur du förebygger dem med rätt uppvärmning och träning.',
    category: 'Hälsa',
    readTime: 7,
    date: '2025-02-10',
    author: 'AgilityManager',
    content: `
## Vanliga skador i agility

Agility är en intensiv sport och skador kan tyvärr förekomma. De vanligaste är:

- **Muskelskador** – sträckningar och bristningar
- **Ledskador** – framför allt i bogparti och knän
- **Tasskador** – trampdynor och klor
- **Ryggproblem** – särskilt vid hopp och vipp

## Uppvärmning är A och O

En ordentlig uppvärmning minskar skaderisken dramatiskt:

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
- Kontrollera att hinder är säkra och stabila
- Anpassa träningen efter väder (halt vid regn, hårt vid frost)

## När ska du vila?

- Hunden haltar eller rör sig annorlunda
- Hunden undviker vissa hinder
- Svullnad eller ömhet
- Vid tveksamhet – kontakta veterinär!

## Viktregistrering

Att hålla koll på hundens vikt hjälper dig upptäcka förändringar tidigt. Använd AgilityManagers hälsologg för att följa vikten över tid.
    `,
  },
  {
    slug: 'sagik-klasser-forklarat',
    title: 'SAgiK-klasser förklarade: Nollklass till K3',
    excerpt: 'Förstå det svenska tävlingssystemet med Nollklass, K1, K2 och K3. Krav och regler.',
    category: 'Tävling',
    readTime: 6,
    date: '2025-02-05',
    author: 'AgilityManager',
    content: `
## Det svenska tävlingssystemet

I Sverige organiseras agilitytävlingar av Svenska Agilityklubben (SAgiK) under Svenska Kennelklubben. Systemet har fyra klasser som ekipaget avancerar genom.

## Nollklass

**Ingångsklassen** för alla nya ekipage.

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
- Alla kontakthinder ingår

### Krav för att avancera:
3 godkända resultat i K1 → uppflyttning till K2

## K2 (Klass 2)

**Avancerad nivå** med mer utmanande banor.

- Komplexa sekvenser och vändningar
- Höga hastighetskrav
- Kräver god distanshantering

### Krav för att avancera:
3 godkända resultat i K2 → uppflyttning till K3

## K3 (Klass 3)

**Högsta klassen** – här tävlar eliten.

- De svåraste banorna
- Högsta hastighetskraven
- SM-kvalificering sker härifrån

## Storleksklasser

Hundar delas in i storleksklasser baserat på mankhöjd:

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
    `,
  },
  {
    slug: 'effektiv-traningsplanering',
    title: 'Planera din agilityträning effektivt',
    excerpt: 'Strukturera din träning med periodisering, målsättning och smart variation.',
    category: 'Träning',
    readTime: 7,
    date: '2025-01-28',
    author: 'AgilityManager',
    content: `
## Varför planera?

Strukturerad träning ger snabbare framsteg än slumpmässig träning. Med en plan vet du vad du jobbar mot och kan mäta utveckling.

## Sätt tydliga mål

### Långsiktiga mål (6-12 månader)
- Avancera till nästa klass
- Förbättra godkännandegrad till 70%
- Minska genomsnittlig feltid

### Kortsiktiga mål (1-4 veckor)
- Träna kontakter 3 gånger per vecka
- Förbättra slalomingångar från båda håll
- Jobba med distanshantering

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
- Fokus på banläsning

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

- Träna på olika platser
- Variera hinderkombinationer
- Byt belöningsmetoder
- Träna med olika människor
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
