import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';

export default function AboutAgilityPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Vad är Agility? – Guide till sporten | AgilityManager</title>
        <meta name="description" content="Lär dig allt om agility i Sverige. Klasser, pinnar, hindertyper, SAgiK-regler och hur du kommer igång. Komplett guide för nybörjare." />
        <link rel="canonical" href="https://agilitymanager.se/om-agility" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Vad är agility? – Komplett guide till hundsporten",
          "description": "Lär dig allt om agility i Sverige – klasser, pinnar, hindertyper och hur du kommer igång.",
          "author": { "@type": "Organization", "name": "AgilityManager", "email": "info@auroramedia.se" },
          "publisher": { "@type": "Organization", "name": "AgilityManager", "url": "https://agilitymanager.se" },
          "datePublished": "2026-01-01",
          "inLanguage": "sv"
        })}</script>
      </Helmet>

      <LandingNavbar />

      <article className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 text-primary mb-4">
            <BookOpen size={20} />
            <span className="text-sm font-medium">Guide</span>
          </div>

          <h1 className="font-display font-bold text-foreground text-3xl sm:text-4xl leading-tight mb-8">
            Vad är agility? – Komplett guide till hundsporten
          </h1>

          <div className="prose prose-lg max-w-none text-foreground/90 space-y-8">
            <section>
              <h2 className="font-display font-bold text-foreground text-xl mt-0">Vad är agility?</h2>
              <p>
                Agility är en hundsport där hund och förare tillsammans tar sig runt en hinderbana på tid. Sporten bygger på samarbete, kommunikation och tillit mellan hund och människa – föraren dirigerar hunden genom banan med kroppsspråk och röstkommandon, medan hunden utför hindren i rätt ordning och så snabbt som möjligt.
              </p>
              <p>
                Sporten visades för första gången vid Crufts hundshow i England 1978 som underhållning i pausen, men blev snabbt populär som tävlingssport. I Sverige fick agility officiell status 1987, och idag genomförs över 100 000 tävlingsstarter per år i Sverige under Svenska Agilityklubben, SAgiK, som är en del av Svenska Kennelklubben (SKK).
              </p>
              <p>
                Agility passar alla hundraser och blandningar – från Border Collies och Shelties till terrier, pudlar och blandade raser. Det enda kravet är att hunden är frisk, rörlig och har fyllt 18 månader vid tävling. Sporten är fantastisk för att stärka bandet mellan hund och förare och ger dessutom bra motion för båda.
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Hur fungerar klassystemet i Sverige?</h2>
              <p>
                I Sverige tävlar man i tre klasser – klass 1, klass 2 och klass 3. Man börjar i klass 1 och behöver samla tre godkända uppflyttningsresultat, så kallade "pinnar", för att gå upp till nästa klass. Ett godkänt resultat innebär att hunden klarar banan utan diskvalificering och inom maxtiden.
              </p>
              <p>
                I klass 3 tävlar man om certifikat. Tre certifikat ger den prestigefyllda agilitychampionattiteln SE AgCh – en titel som visar att hund och förare presterar på elitnivå. Certifikat delas ut vid officiella tävlingar och kräver ett felfritt lopp med bra tid.
              </p>
              <p>
                Det finns separata grenar för agility och hopp (jumping). I agility ingår kontakthinder (A-hinder, balansbom och gungbräda) utöver de vanliga hindren. I hopp tävlar man enbart med hopphinder, tunnel och slalom. Dessutom finns fem storleksklasser baserade på hundens mankhöjd, så att små hundar inte behöver hoppa lika högt som stora.
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Vilka hinder finns i agility?</h2>
              <p>
                En agilitybana består av 15–20 hinder som domaren har placerat ut i en specifik ordning. Varje bana är unik – det finns aldrig två identiska banor, vilket gör sporten dynamisk och kräver att föraren snabbt kan läsa av banan och planera sin hantering.
              </p>
              <p>
                I agilityklass ingår balanshinder, även kallade kontakthinder: A-hindret (en A-formad ramp), balansbommen (en upphöjd planka) och gungbrädan. Dessa hinder har målade "kontaktzoner" i ändarna som hunden måste beröra med minst en tass – annars blir det fel.
              </p>
              <p>
                Gemensamma hinder för både agility och hopp är: hopphinder (en ribba på ställbar höjd), mur (en vägg med lösliggande plankor), däck (en ring som hunden hoppar igenom), långhopp (utlagda plankor som hunden hoppar över på längden), slalom (12 pinnar som hunden väver igenom) och tunnel (en böjbar tunnel som hunden springer genom). Hunden måste ta hindren i rätt ordning, från rätt håll och på rätt sätt – annars diskvalificeras ekipaget.
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Hur kommer man igång med agility?</h2>
              <p>
                För att tävla i agility måste du vara medlem i en SKK-ansluten klubb. Din hund måste ha fyllt 18 månader för att få delta i officiella tävlingar, men du kan börja träna långt innan dess – många börjar med valpar från 8–10 veckors ålder med lekfull grundträning.
              </p>
              <p>
                Hundar som inte är registrerade i SKK kan ansöka om en tävlingslicens genom att kontakta en lokal klubb. Alla tävlingar anmäls och administreras via Agilitydata.se, som är SAgiK:s officiella tävlingssystem. Där hittar du tävlingskalender, resultat och din egen statistik.
              </p>
              <p>
                Innan du tävlar rekommenderas träning hos en lokal agilityklubb. De flesta klubbar erbjuder nybörjarkurser där du lär dig grunderna – hinderteknik, hantering, och hur du bygger upp en säker och glad agilityhund. Det enda du behöver ha med dig är bekväma kläder, en motiverad hund och massor av godis eller en leksak som belöning.
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Hur kan AgilityManager hjälpa dig?</h2>
              <p>
                AgilityManager är byggt för att komplettera Agilitydata.se – inte ersätta det. Hos oss loggar du träningspass med datum, hund, fokusområde och notat så att du kan se din utveckling över tid. Du kan planera agilitybanor i banplaneraren med alla SAgiK-godkända hinderelement, spara dem och använda dem som underlag inför nästa träning.
              </p>
              <p>
                Du håller också koll på din tävlingshistorik och ser hur många pinnar du har per klass och hund. Statistikvyn visualiserar din progression med diagram, och du kan identifiera var ni behöver lägga extra fokus. AgilityManager fungerar lika bra för nybörjaren som precis börjat i klass 1 som för den erfarna tävlaren som jagar certifikat i klass 3.
              </p>
              <p>
                Grundversionen är helt gratis – allt på ett ställe, utan krångel.
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-semibold gap-2 text-base px-8 h-12"
              onClick={() => navigate('/auth')}
            >
              Kom igång gratis <ArrowRight size={18} />
            </Button>
          </div>
        </motion.div>
      </article>

      <LandingFooter />
    </div>
  );
}