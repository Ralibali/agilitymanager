/**
 * Blogg-/kunskapsinnehåll för AgilityManager.
 *
 * Redaktionella principer:
 * - Allt innehåll är skrivet för sajten (ingen generisk fylltext).
 * - Regelpåståenden hålls på översiktsnivå och märks tydligt som
 *   produktanalys/egen tolkning, med hänvisning till officiella källor
 *   (SKK, Svenska Hooperssällskapet m.fl.) för detaljer.
 * - Inline-länkar skrivs som [text](/sökväg) i textblock.
 * - Varje artikel har en kontextuell CTA in till /banplanerare.
 *
 * Formatet är avsiktligt enkelt och parsbart — scripts/generate-sitemap.mjs
 * läser slug + updatedAt härifrån. Håll fältordningen slug/publishedAt/updatedAt.
 */

export type ArticleBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; text: string };

export interface BlogCta {
  heading: string;
  text: string;
  to: string;
  label: string;
}

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  category: "Banbyggande" | "Hoopers" | "Regler" | "Träning" | "Verktyg";
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  blocks: ArticleBlock[];
  related: string[];
  cta: BlogCta;
}

export const ARTICLES: BlogArticle[] = [
  {
    slug: "bygga-saker-traningsbana-agility",
    title: "Så bygger du en säker träningsbana i agility",
    description:
      "Praktisk guide till säkra träningsbanor i agility: planmått, hinderavstånd, underlag och hur du testar flödet innan hunden springer.",
    category: "Banbyggande",
    publishedAt: "2025-11-04",
    updatedAt: "2026-01-20",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "En bra träningsbana gör två saker samtidigt: den tränar det du vill träna, och den låter hunden springa säkert. Det andra är lätt att glömma när man fokuserar på handlingmoment. Här går vi igenom grunderna — oavsett om du bygger på klubbens plan eller ritar i [banplaneraren](/banplanerare) inför nästa träningstillfälle.",
      },
      { type: "h2", text: "Börja med planen, inte hindren" },
      {
        type: "p",
        text: "Mät upp den yta du faktiskt har tillgänglig innan du bestämmer banan. En träningsbana behöver inte fylla en tävlingsplan — det viktiga är att avstånden mellan hindren blir rimliga för det du vill träna. Rita hellre färre hinder med genomtänkta avstånd än att tränga in fler hinder på för liten yta.",
      },
      {
        type: "ul",
        items: [
          "Mät planens längd och bredd, och markera pelare, väggar och annat som stjäl yta.",
          "Reservera alltid säkerhetsmarginal runt planens kanter — särskilt bakom hopphinder i hundens riktning.",
          "Kontrollera underlaget: halt eller ojämnt underlag ändrar vad som är ett säkert avstånd.",
        ],
      },
      { type: "h2", text: "Avstånd som hunden hinner läsa" },
      {
        type: "p",
        text: "Mellan två hinder ska hunden hinna landa, samla sig och läsa nästa hinder. Exakta avstånd beror på hinderkombination, hundens storlek och fart — därför anger vi inga fasta tumregelssiffror här. Testa i stället flödet på ritningen först: i banplaneraren ritas hundens linje automatiskt genom hindren, och du ser direkt om ett skarpt upplägg blir onödigt tvärt.",
      },
      {
        type: "callout",
        text: "Produktanalys: Vår erfarenhet är att de flesta säkerhetsproblem i träningsbanor uppstår vid hopphinder i snäva vinklar direkt efter kontaktfält eller tunnel. Bygg hellre in ett extra hopphinder på rak linje för att ge hunden fart och riktning innan svåra moment.",
      },
      { type: "h2", text: "Tänk på var föraren ska vara" },
      {
        type: "p",
        text: "En bana som ser fin ut på pappret kan vara omöjlig att hantera i verkligheten. Fråga dig för varje sekvens: var står jag när hunden tar hindret, och hinner jag dit utan att springa i hundens linje? I träning är det ofta smartare att planera stationära positioner än att försöka hinna med allt.",
      },
      { type: "h2", text: "Bygg upp svårigheten i steg" },
      {
        type: "p",
        text: "Rita gärna tre varianter av samma upplägg: en rak grundbana, en variant med ett handlingmoment och en tredje där momentet kombineras med distansarbete. Då kan träningsgruppen träna samma tema på olika nivåer utan att bygga om. I [banbiblioteket](/banor) finns färdiga banor sorterade på nivå att utgå ifrån.",
      },
      {
        type: "p",
        text: "Vill du fördjupa dig i själva ritandet rekommenderar vi [fem vanliga misstag när du ritar banan](/blogg/fem-vanliga-misstag-banritning) och vår genomgång av [avstånd och vinklar i bandesign](/blogg/avstand-och-vinklar-bandesign).",
      },
    ],
    related: ["fem-vanliga-misstag-banritning", "avstand-och-vinklar-bandesign", "fran-banide-till-traningspass"],
    cta: {
      heading: "Rita din säkra träningsbana",
      text: "Öppna banplaneraren, mät upp din plan i meterskala och testa hundens linje innan du bär ut ett enda hinder.",
      to: "/banplanerare",
      label: "Öppna banplaneraren",
    },
  },
  {
    slug: "hoopers-for-nyborjare",
    title: "Hoopers för nybörjare: hinder, plan och din första bana",
    description:
      "Introduktion till hoopers: sportens grundhinder, hur en hoopersbana skiljer sig från agility och hur du ritar din första bana — steg för steg.",
    category: "Hoopers",
    publishedAt: "2025-11-18",
    updatedAt: "2026-01-20",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Hoopers är en hundsport där hunden springer genom markburna bågar (hoops) i stället för att hoppa över hinder. Sporten har vuxit snabbt i Sverige, inte minst för att den är skonsam och passar hundar och förare i alla åldrar. Här kommer du igång — och när du vill rita din första bana finns ett eget hoopersläge i [banplaneraren](/banplanerare?sport=hoopers).",
      },
      { type: "h2", text: "Sportens grundhinder" },
      {
        type: "ul",
        items: [
          "Hoops — bågar som hunden passerar under. Själva signaturhindret och stommen i varje bana.",
          "Tunnlar — som i agility, men utan hopphinder runt omkring.",
          "Tunnlar, barrels och andra passagehinder förekommer beroende på regelverk och klass.",
        ],
      },
      {
        type: "p",
        text: "Eftersom hunden aldrig hoppar blir bandesignen i hoopers mer fråga om riktning, linjer och förarens positionering än om hopsprång och landningar. Det gör sporten utmärkt för unga hundar, seniorer och ekipage som vill träna distansarbete.",
      },
      { type: "h2", text: "Så skiljer sig en hoopersbana från agility" },
      {
        type: "p",
        text: "En agilitybana bygger mycket kring hoppteknik: ansats, landning och utgångsvinkel. I hoopers handlar allt om flyt. Hindren är låga, så utmaningen ligger i att hunden ska hålla linjen mellan hoops som kan stå långt ifrån varandra, ofta med föraren på distans. När du ritar ska du därför tänka extra på synliga linjer — hunden ska kunna se nästa hoop tidigt.",
      },
      {
        type: "callout",
        text: "Reglerna för hoopers i Sverige sätts av Svenska Hooperssällskapet och kan skilja sig från internationella varianter. Den här artikeln är en översiktlig introduktion, inte en regelsammanfattning — läs alltid det aktuella regelverket hos arrangören innan tävling.",
      },
      { type: "h2", text: "Rita din första hoopersbana" },
      {
        type: "p",
        text: "Börja enkelt: fem till åtta hoops på en plan, i ett mjukt flyt utan tvära kast. Placera ut dem i banplaneraren, titta på banlinjen som ritas upp och fråga dig var du som förare ska stå. När grundflytet sitter kan du lägga till en tunnel eller ett moment där hunden ska jobba på distans. Vår artikel om [avstånd och vinklar](/blogg/avstand-och-vinklar-bandesign) gäller i hoopers också — logiken är densamma även om hindren är annorlunda.",
      },
      {
        type: "p",
        text: "Vill du ha en färdig startpunkt finns hoopersbanor i [banbiblioteket](/banor), och bland [delade banor](/delade-banor) hittar du upplägg som andra förare tränat på.",
      },
    ],
    related: ["avstand-och-vinklar-bandesign", "regelverk-agility-hoopers-sverige", "dela-banan-med-traningsgruppen"],
    cta: {
      heading: "Rita din första hoopersbana",
      text: "Banplaneraren har ett eget hoopersläge med rätt hinderpalett och planstorlekar. Byt sport med ett klick — gratis och utan konto.",
      to: "/banplanerare?sport=hoopers",
      label: "Öppna i hoopersläge",
    },
  },
  {
    slug: "avstand-och-vinklar-bandesign",
    title: "Avstånd och vinklar: grunderna i bra bandesign",
    description:
      "Varför hinderavstånd och ingångsvinklar avgör om en bana flyter — och hur du tränar ögat att se det på ritningen innan hunden springer.",
    category: "Banbyggande",
    publishedAt: "2025-12-02",
    updatedAt: "2026-01-20",
    readingMinutes: 7,
    blocks: [
      {
        type: "p",
        text: "Skillnaden mellan en bana som flyter och en bana som känns hackig är sällan hindren i sig — det är avstånden och vinklarna mellan dem. Det här är den viktigaste färdigheten att träna om du vill bli bra på bandesign, oavsett sport.",
      },
      { type: "h2", text: "Avstånd handlar om tid, inte bara meter" },
      {
        type: "p",
        text: "För hunden är ett hinderavstånd egentligen en tidsfråga: hinner den landa, läsa och förbereda nästa moment? Samma avstånd i meter kan kännas generöst på ett rakt spår och pressande i en vinkel. Därför ska du alltid bedöma avstånd i sitt sammanhang — vad hände före, och vad väntar efter?",
      },
      {
        type: "ul",
        items: [
          "Raka spår tål kortare avstånd — hunden är redan i rörelsens riktning.",
          "Efter kontaktfält och tunnlar behöver hunden ofta mer utrymme för att hitta nästa hinder.",
          "Ju större fart, desto längre broms- och läsavstånd behövs inför ett skarpt moment.",
        ],
      },
      { type: "h2", text: "Ingångsvinkeln styr allt efter" },
      {
        type: "p",
        text: "Hur hunden kommer in i ett hinder avgör var den landar och vilken linje som är naturlig ut. En tvär ingång till ett hopphinder ger en tvär landning — och plötsligt blir det avstånd som såg bra ut på pappret för kort i verkligheten. Rita därför alltid banlinjen, inte bara hinderpositionerna.",
      },
      {
        type: "p",
        text: "I [banplaneraren](/banplanerare) ritas hundens linje automatiskt genom hindren i nummerordning. Det är det snabbaste sättet att träna ögat: flytta ett hinder en halvmeter, se linjen ändras, och fråga dig om den nya linjen är något du skulle vilja springa som hund.",
      },
      {
        type: "callout",
        text: "Produktanalys: När vi granskat banor i vårt kvalitetsarbete är den vanligaste orsaken till konstiga linjer inte dåliga hinderidéer utan att två var för sig rimliga avstånd kombinerats till en sekvens som saknar andrum. Lämna alltid minst ett avsnitt där hunden får öppna upp steget.",
      },
      { type: "h2", text: "Ett enkelt träningspass för ögat" },
      {
        type: "p",
        text: "Ta en bana du gillar — till exempel från [banbiblioteket](/banor) — och rita om den med medvetet förändrade avstånd. Vad händer med linjen om du drar isär hinder 3 och 4? Vad händer om du vrider ingången till tunneln? Tio minuter av den här leken lär dig mer om bandesign än timmar av passivt tittande.",
      },
      {
        type: "p",
        text: "Läs gärna vidare om [säkra träningsbanor](/blogg/bygga-saker-traningsbana-agility) och om [vanliga ritmisstag](/blogg/fem-vanliga-misstag-banritning) för fler konkreta exempel.",
      },
    ],
    related: ["bygga-saker-traningsbana-agility", "fem-vanliga-misstag-banritning", "hoopers-for-nyborjare"],
    cta: {
      heading: "Se banlinjen medan du ritar",
      text: "Banplaneraren ritar hundens linje live och räknar ut banlängden direkt. Testa ett färdigt upplägg i klass 2-nivå och lek med avstånden.",
      to: "/banplanerare?template=sv_agility_2_handling_01",
      label: "Öppna exempelbanan",
    },
  },
  {
    slug: "regelverk-agility-hoopers-sverige",
    title: "Regelverken i korthet: agility och hoopers i Sverige",
    description:
      "Översikt över vilka organisationer som sätter reglerna för agility och hoopers i Sverige, hur klassystemen är uppbyggda — och var du hittar de officiella regelverken.",
    category: "Regler",
    publishedAt: "2025-12-16",
    updatedAt: "2026-01-20",
    readingMinutes: 6,
    blocks: [
      {
        type: "callout",
        text: "Viktigt: Den här artikeln är en översikt på produktnivå, skriven för att hjälpa dig hitta rätt. Det är inte en regelsammanfattning och inte en auktoritativ källa. Regler ändras — kontrollera alltid mot de officiella regelverken innan du tävlar eller dömer.",
      },
      { type: "h2", text: "Vem sätter reglerna?" },
      {
        type: "p",
        text: "I Sverige administreras agility inom Svenska Kennelklubbens (SKK) paraply, med Svenska Agilityklubben (SAgiK) som specialklubb. Tävlings- och bruksreglerna publiceras av SKK och finns på skk.se. För hoopers är Svenska Hooperssällskapet den svenska specialorganisationen, med egna tävlingsregler som publiceras på deras webbplats.",
      },
      {
        type: "p",
        text: "Utöver det nationella finns internationella regelverk — till exempel FCI:s agilityregler som gäller på internationella tävlingar. Vilket regelverk som gäller avgörs av arrangören och tävlingsformen, så läs alltid inbjudan.",
      },
      { type: "h2", text: "Så är klassystemen uppbyggda — i stora drag" },
      {
        type: "p",
        text: "Båda sporterna använder progressionssystem där ekipage kvalificerar sig uppåt. I svensk agility tävlar man i klasser från nybörjarnivå upp till högsta klassen, med uppflyttning baserat på meriter. Hoopers har ett eget, liknande upplägg med klasser och meritesystem enligt sitt regelverk. Detaljerna — antal meriter, domarkrav, dispensregler — skiljer sig åt och uppdateras över tid.",
      },
      {
        type: "p",
        text: "För träningsbanor spelar klassystemet roll på ett sätt: nivåerna styr vilken typ av moment och vilken svårighetsgrad som är rimlig att träna. Därför är banorna i vårt [banbibliotek](/banor) märkta efter nivå, så att du kan träna på upplägg som matchar var du befinner dig.",
      },
      { type: "h2", text: "Vad betyder det här när du ritar banor?" },
      {
        type: "p",
        text: "Banplaneraren är ett ritverktyg, inte ett regelverk. Mallar och planstorlekar är inspirerade av de svenska regelverken och granskade på översiktsnivå, men det är alltid du som banbyggare som ansvarar för att ett upplägg följer de regler som gäller för ditt syfte — träning, officiell träningstävling eller tävling.",
      },
      {
        type: "ul",
        items: [
          "Träningsbanor: anpassa fritt efter hund, nivå och yta — se vår guide om [säkra träningsbanor](/blogg/bygga-saker-traningsbana-agility).",
          "Tävlingsliknande upplägg: dubbelkolla mått, hinderkrav och säkerhetsavstånd mot aktuellt regelverk hos SKK respektive Svenska Hooperssällskapet.",
          "Osäker? Fråga en domare i klubben. Det är billigare än att bygga om en plan.",
        ],
      },
    ],
    related: ["bygga-saker-traningsbana-agility", "hoopers-for-nyborjare", "fran-banide-till-traningspass"],
    cta: {
      heading: "Rita med regelinspirerade mallar",
      text: "Banbibliotekets banor är byggda efter svenska klassnivåer och granskade på översiktsnivå — en trygg startpunkt att bygga vidare på.",
      to: "/banor",
      label: "Utforska banbiblioteket",
    },
  },
  {
    slug: "fem-vanliga-misstag-banritning",
    title: "Fem vanliga misstag när du ritar banan — och hur du undviker dem",
    description:
      "De fem vanligaste felen i hemritade agilitybanor: för täta hinder, glömda förarlinjer, saknad säkerhetsmarginal, fel nivå och otestade flöden.",
    category: "Banbyggande",
    publishedAt: "2026-01-06",
    updatedAt: "2026-01-20",
    readingMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "De flesta träningsbanor som inte fungerar i praktiken faller på samma fem saker. Den goda nyheten: alla fem syns på ritningen, långt innan du burit ut ett enda hinder.",
      },
      { type: "h2", text: "1. För många hinder på för liten yta" },
      {
        type: "p",
        text: "Det vanligaste felet med marginal. En fullsatt tävlingsbana kan vara inspirerande, men på en mindre träningsyta blir samma antal hinder bara trångt. Färre hinder med bättre avstånd tränar samma färdigheter — och ger hunden plats att springa. Läs mer i vår genomgång av [avstånd och vinklar](/blogg/avstand-och-vinklar-bandesign).",
      },
      { type: "h2", text: "2. Ingen tanke på förarens linje" },
      {
        type: "p",
        text: "Ritar du bara hundens väg har du ritat halva banan. För varje sekvens: var ska du stå, och korsar du hundens linje för att komma dit? I träning är det ofta smartare att designa för en stationär förare än att kräva sprint mellan varje moment.",
      },
      { type: "h2", text: "3. Säkerhetsmarginalen ritas aldrig" },
      {
        type: "p",
        text: "Hopp mot en vägg, kontaktfält nära planens kant eller tunnelutgångar som pekar mot hinderställningar är klassiker som upptäcks först på plats. Markera alltid planens begränsningar på ritningen och lämna marginal bakom hopphinder i hundens riktning. Vår guide till [säkra träningsbanor](/blogg/bygga-saker-traningsbana-agility) tar det från början.",
      },
      { type: "h2", text: "4. Rätt bana, fel nivå" },
      {
        type: "p",
        text: "Ett snyggt handlingmoment för ett erfaret ekipage kan vara omöjligt — eller farligt — för en unghund. Rita alltid med mottagaren i åtanke, och gör gärna två svårighetsgrader av samma tema. Banbibliotekets banor är nivåmärkta för att göra det enkelt.",
      },
      { type: "h2", text: "5. Flödet testas aldrig före bygget" },
      {
        type: "p",
        text: "En ritning kan se logisk ut men springas hackigt. Lösningen är att testa linjen innan bygget: i [banplaneraren](/banplanerare) ritas hundens linje automatiskt, så du ser direkt om sekvensen flyter eller om något hinder behöver flyttas en halvmeter. Det är mycket billigare att flytta ett hinder på skärmen än på planen.",
      },
      {
        type: "p",
        text: "Vill du öva ögat på färdigt material? Bland [delade banor](/delade-banor) finns upplägg från andra förare att analysera och bygga vidare på.",
      },
    ],
    related: ["avstand-och-vinklar-bandesign", "bygga-saker-traningsbana-agility", "dela-banan-med-traningsgruppen"],
    cta: {
      heading: "Testa flödet innan du bygger",
      text: "Öppna en färdig nybörjarbana i planeraren, studera banlinjen och flytta ett hinder — se direkt vad som händer med flödet.",
      to: "/banplanerare?template=sv_hopp_1_flow_01",
      label: "Prova med en mallbana",
    },
  },
  {
    slug: "fran-banide-till-traningspass",
    title: "Från banidé till träningspass: planera träningen smartare",
    description:
      "Så vänder du en banidé till ett genomtänkt träningspass: välj tema, rita i nivåer, förbered bygget och spara upplägget till nästa gång.",
    category: "Träning",
    publishedAt: "2026-01-13",
    updatedAt: "2026-01-20",
    readingMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "Den bästa träningen börjar sällan på planen — den börjar med en tydlig idé om vad ni ska träna, och en bana som är ritad för just det. Här är ett upplägg som fungerar lika bra för den egna träningsgruppen som för klubbens instruktörer.",
      },
      { type: "h2", text: "Steg 1: Välj ett tema, inte en bana" },
      {
        type: "p",
        text: "Börja med färdigheten: ska ni träna inkläder, distansarbete, tunnelingångar eller ren fart? Ett tydligt tema gör resten av besluten enkla. En bana utan tema blir ofta en samling moment som inte förstärker varandra.",
      },
      { type: "h2", text: "Steg 2: Rita i nivåer" },
      {
        type: "p",
        text: "Rita först den rakaste versionen av temat. Lägg sedan till svårighet i lager: först en vinkel, sedan ett handlingmoment, sist eventuell distans. Tre nivåer av samma idé räcker för en hel träningsgrupp — och du slipper bygga om mellan ekipage. Om du är osäker på nivåerna, utgå från en nivåmärkt bana i [banbiblioteket](/banor) och justera.",
      },
      { type: "h2", text: "Steg 3: Förbered bygget" },
      {
        type: "p",
        text: "En tydlig ritning med mått halverar byggtiden. Exportera bankartan som bild till träningsgruppens chatt så att alla vet hur planen ska se ut innan ni samlas — då byggs banan på tio minuter i stället för fyrtio. I banplaneraren ser du dessutom banlängden live, vilket hjälper dig hålla passets intensitet på rätt nivå.",
      },
      { type: "h2", text: "Steg 4: Spara och återanvänd" },
      {
        type: "p",
        text: "Bra upplägg är värda att spara. Banan autosparas i din webbläsare medan du ritar, och när du vill dela den med gruppen räcker en länk — mottagaren öppnar banan direkt i sin egen planerare. Läs mer om [hur du delar banan med träningsgruppen](/blogg/dela-banan-med-traningsgruppen).",
      },
      {
        type: "p",
        text: "Och innan du låser upplägget: gå igenom checklistan i [fem vanliga misstag när du ritar banan](/blogg/fem-vanliga-misstag-banritning) — det tar två minuter och räddar många pass.",
      },
    ],
    related: ["bygga-saker-traningsbana-agility", "fem-vanliga-misstag-banritning", "dela-banan-med-traningsgruppen"],
    cta: {
      heading: "Rita veckans träningsbana",
      text: "Öppna en tom plan, välj ditt tema och rita i nivåer. Banan autosparas i webbläsaren och delas med en länk när du är klar.",
      to: "/banplanerare",
      label: "Börja rita nu",
    },
  },
  {
    slug: "dela-banan-med-traningsgruppen",
    title: "Så delar du banan med träningsgruppen — från ritning till plan",
    description:
      "Guide till att dela agility- och hoopersbanor: delningslänkar, publika banor i communityn, bildexport till chatten och hur mottagaren bygger vidare.",
    category: "Verktyg",
    publishedAt: "2026-01-20",
    updatedAt: "2026-01-20",
    readingMinutes: 4,
    blocks: [
      {
        type: "p",
        text: "En bana som bara finns på din egen skärm gör halva jobbet. När hela träningsgruppen kan se ritningen i förväg byggs banan snabbare, alla vet vilket tema ni tränar och färre hinder ställs fel. Så här fungerar delningen i AgilityManager.",
      },
      { type: "h2", text: "Tre sätt att dela" },
      {
        type: "ul",
        items: [
          "Delningslänk — mottagaren öppnar banan direkt i sin egen banplanerare och kan bygga vidare på den.",
          "Bildexport — ladda ner bankartan som PNG och släpp den i gruppens chatt som byggunderlag.",
          "Publik delning — lägg banan i [delade banor](/delade-banor) så att andra förare kan hitta, betygsätta och kommentera den.",
        ],
      },
      { type: "h2", text: "Vad behöver mottagaren?" },
      {
        type: "p",
        text: "Inget konto. Länken öppnar banan i webbläsaren, och den som vill ändra något sparar sin egen kopia. Det gör delningen lika enkel i en Facebook-grupp som i klubbens mejlutskick.",
      },
      { type: "h2", text: "Bra vanor vid delning" },
      {
        type: "p",
        text: "Döp banan tydligt — tema och nivå i namnet sparar frågor i efterhand (”Inkläder klass 2, 30×20” slår ”Bana v3”). Kontrollera flödet en sista gång med banlinjen innan du skickar, och berätta gärna i gruppen vad upplägget är tänkt att träna. Vår artikel om att [planera träningspasset](/blogg/fran-banide-till-traningspass) har en komplett checklista.",
      },
      {
        type: "p",
        text: "Letar du inspiration i stället? I [banbiblioteket](/banor) finns nivåmärkta banor för agility och hoopers, och under [delade banor](/delade-banor) ser du vad andra förare tränar på just nu.",
      },
    ],
    related: ["fran-banide-till-traningspass", "hoopers-for-nyborjare", "fem-vanliga-misstag-banritning"],
    cta: {
      heading: "Rita, dela, spring",
      text: "Rita banan i banplaneraren, exportera bilden till chatten eller dela länken — gruppen öppnar den utan konto.",
      to: "/banplanerare",
      label: "Öppna banplaneraren",
    },
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
