import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';
import { Helmet } from 'react-helmet-async';
import { PageTransition } from '@/components/motion/PageTransition';

/**
 * Ansvarsfriskrivning / Disclaimer.
 * Heltäckande juridisk text utformad för att frånsäga AgilityManager / Aurora Media AB
 * ansvar i största möjliga omfattning enligt svensk rätt och GDPR.
 */
export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ansvarsfriskrivning | AgilityManager</title>
        <meta
          name="description"
          content="Ansvarsfriskrivning för AgilityManager – villkor för användning av träningsdata, AI-coachning, hälsoinformation, tävlingsresultat och rasprofiler."
        />
        <link rel="canonical" href="https://agilitymanager.se/ansvarsfriskrivning" />
      </Helmet>
      <LandingNavbar />
      <PageTransition>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">
            Ansvarsfriskrivning
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Senast uppdaterad: 20 april 2026</p>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">1. Allmänt</h2>
              <p className="text-muted-foreground">
                AgilityManager (”Tjänsten”) tillhandahålls av Aurora Media AB
                (”Leverantören”, ”vi”, ”oss”) i befintligt skick (”as is”) och i mån av
                tillgänglighet (”as available”). Genom att använda Tjänsten accepterar
                du villkoren i denna ansvarsfriskrivning. Om du inte accepterar dessa
                villkor ska du omedelbart avstå från att använda Tjänsten.
              </p>
              <p className="text-muted-foreground mt-2">
                Inget i denna ansvarsfriskrivning är avsett att begränsa rättigheter som
                inte kan begränsas enligt tvingande svensk konsumentlagstiftning,
                produktansvarslagen (1992:18) eller GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                2. Inget professionellt råd
              </h2>
              <p className="text-muted-foreground">
                Allt innehåll i Tjänsten – inklusive men inte begränsat till artiklar,
                blogginlägg, rasprofiler, träningstips, AI-genererade analyser,
                coach-feedback, hälsologgar, viktdiagram, tävlingsstatistik och
                planeringsverktyg – är endast avsett för{' '}
                <strong className="text-foreground">
                  informations- och underhållningssyfte
                </strong>{' '}
                och utgör inte:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                <li>veterinärmedicinsk rådgivning, diagnos eller behandling,</li>
                <li>professionell tränings- eller beteenderådgivning,</li>
                <li>juridisk, försäkringsmässig eller ekonomisk rådgivning,</li>
                <li>officiell tolkning av tävlingsregler från SKK, SAgiK, SHoK eller FCI.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Konsultera alltid legitimerad veterinär, certifierad instruktör eller
                annan kvalificerad fackman innan du fattar beslut som rör din hunds
                hälsa, träning eller deltagande i tävling. Tjänsten ersätter aldrig
                personlig professionell bedömning.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                3. Hälsa, träning och skaderisk
              </h2>
              <p className="text-muted-foreground">
                Agility, hoopers och annan hundsport innebär en{' '}
                <strong className="text-foreground">inneboende risk för skada</strong>{' '}
                för både hund och förare. Du genomför all träning och tävling helt på
                <strong className="text-foreground"> egen risk</strong>. Leverantören
                ansvarar inte för:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                <li>person- eller sakskada som uppstår vid träning eller tävling,</li>
                <li>skador på hund, inklusive akut skada, överbelastning eller dödsfall,</li>
                <li>
                  beslut som du fattar baserat på hälsodata, viktloggar, AI-insikter
                  eller träningsrekommendationer i Tjänsten,
                </li>
                <li>
                  felaktiga påminnelser om vaccinationer, avmaskning eller veterinärbesök
                  – du ansvarar själv för att följa veterinärens schema.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                4. AI-genererat innehåll och coach-feedback
              </h2>
              <p className="text-muted-foreground">
                Tjänsten använder artificiell intelligens (bl.a. via Lovable AI Gateway)
                för att generera träningsinsikter och statistiska analyser. AI-modeller kan{' '}
                <strong className="text-foreground">
                  generera felaktig, vilseledande eller ofullständig information
                </strong>{' '}
                (s.k. ”hallucinationer”). Allt AI-genererat innehåll ska behandlas som
                förslag, inte som fakta eller råd. Du ansvarar själv för att kritiskt
                utvärdera och verifiera AI-utdata innan du agerar på den.
              </p>
              <p className="text-muted-foreground">
                Video-feedback inom funktionen <strong className="text-foreground">Coach</strong>{' '}
                granskas och besvaras manuellt av certifierad coach{' '}
                <strong className="text-foreground">Malin Öster</strong> – inte av AI.
                Feedbacken är personlig rådgivning baserad på det inskickade materialet
                och utgör inte en garanti för resultat. Du ansvarar själv för att tillämpa
                råden på ett sätt som är säkert för dig och din hund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                5. Tävlingsdata och tredjepartsinformation
              </h2>
              <p className="text-muted-foreground">
                Tävlingskalendrar, klassindelningar, anmälningsstatus, resultat,
                domarinformation och liknande data hämtas via öppna källor från bland
                annat{' '}
                <a
                  href="https://agilitydata.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Agilitydata.se
                </a>
                ,{' '}
                <a
                  href="https://www.svenskahoopersklubben.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  SHoK
                </a>{' '}
                och arrangerande klubbar. Vi:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                <li>
                  garanterar inte att informationen är korrekt, fullständig eller
                  uppdaterad i realtid,
                </li>
                <li>
                  ansvarar inte för uteblivna anmälningar, missade deadlines, felaktiga
                  starttider eller felaktiga resultat,
                </li>
                <li>
                  rekommenderar att du alltid verifierar tävlingsinformation direkt mot
                  arrangörens officiella kanaler innan du anmäler dig eller reser.
                </li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Vi gör ingen anspråk på äganderätt till tredjepartsdata och respekterar
                upphovsrätten hos respektive källa. Vid frågor om datakällor, kontakta{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">
                  info@auroramedia.se
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                6. Rasprofiler och uppfödarinformation
              </h2>
              <p className="text-muted-foreground">
                Rasbeskrivningar, lämplighetspoäng och temperamentstaggar är
                generaliserade riktlinjer baserade på publika källor och rasstandard.
                Individuella hundar varierar kraftigt. Tjänsten ska aldrig användas som
                enda underlag vid val eller köp av hund. Vi rekommenderar alltid kontakt
                med seriös uppfödare ansluten till SKK samt rasklubb innan beslut fattas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                7. Försäkringsjämförelser och länkar till tredje part
              </h2>
              <p className="text-muted-foreground">
                Försäkringsinformation och prisjämförelser är vägledande och utgör inte
                ett individuellt försäkringsråd enligt lagen (2018:1219) om
                försäkringsdistribution. Villkor, premier och täckning kan ändras utan
                förvarning – verifiera alltid hos respektive försäkringsbolag. Tjänsten
                kan innehålla affiliate-länkar; detta påverkar inte våra rekommendationer
                men kan ge oss ersättning vid tecknande.
              </p>
              <p className="text-muted-foreground mt-2">
                Externa länkar tillhandahålls för bekvämlighet. Vi har ingen kontroll
                över innehåll, säkerhet eller integritetshantering hos externa
                webbplatser och ansvarar inte för dem.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                8. Användargenererat innehåll
              </h2>
              <p className="text-muted-foreground">
                Tjänsten möjliggör att användare laddar upp innehåll (bilder, videor,
                inlägg, kommentarer, klubbposts, banskisser m.m.). Du ansvarar fullt ut
                för det innehåll du publicerar och garanterar att du har nödvändiga
                rättigheter samt att innehållet inte strider mot lag, kränker tredje
                parts rättigheter eller utgör hets, hot eller kränkning. Vi förbehåller
                oss rätten att utan föregående meddelande ta bort innehåll och stänga av
                konton vid överträdelser.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                9. Tillgänglighet och driftsäkerhet
              </h2>
              <p className="text-muted-foreground">
                Vi strävar efter hög tillgänglighet men kan inte garantera oavbruten,
                felfri eller säker drift. Tjänsten kan vara otillgänglig vid underhåll,
                uppdateringar, tekniska fel hos underleverantörer (t.ex. Lovable Cloud,
                Stripe, Resend) eller force majeure. Vi ansvarar inte för dataförlust,
                avbrott eller skada som orsakats av sådan otillgänglighet.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                10. Ansvarsbegränsning
              </h2>
              <p className="text-muted-foreground">
                I den utsträckning det är tillåtet enligt tvingande lag friskriver sig
                Leverantören från allt ansvar för{' '}
                <strong className="text-foreground">
                  direkta, indirekta, oförutsedda eller följdskador
                </strong>{' '}
                inklusive men inte begränsat till utebliven vinst, förlorade möjligheter,
                förlorad data, skada på rykte, veterinärkostnader, anmälningsavgifter
                eller resekostnader, oavsett om dessa uppkommer i avtal, utomobligatoriskt
                ansvar (inklusive vårdslöshet) eller på annan grund.
              </p>
              <p className="text-muted-foreground mt-2">
                Leverantörens totala sammanlagda ansvar gentemot dig under alla
                omständigheter är begränsat till det belopp du faktiskt betalat för
                Tjänsten under de senaste tolv (12) månaderna före den händelse som gav
                upphov till anspråket, eller 500 SEK – vilket som är lägst.
              </p>
              <p className="text-muted-foreground mt-2">
                Begränsningarna gäller inte vid uppsåt eller grov vårdslöshet från
                Leverantörens sida, eller där annat följer av tvingande
                konsumentlagstiftning.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                11. Skadeslöshet (Indemnification)
              </h2>
              <p className="text-muted-foreground">
                Du åtar dig att hålla Leverantören, dess ägare, anställda och samarbets-
                partners skadeslösa för krav, förluster, skador och kostnader (inklusive
                rimliga ombudsarvoden) som uppstår till följd av (i) din användning av
                Tjänsten, (ii) ditt användargenererade innehåll, eller (iii) din
                överträdelse av dessa villkor eller tillämplig lag.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                12. Immateriella rättigheter
              </h2>
              <p className="text-muted-foreground">
                Allt innehåll som skapats av Leverantören – varumärke, logotyp,
                design, källkod, texter, illustrationer och databasstruktur – tillhör
                Aurora Media AB och skyddas av upphovsrättslagen (1960:729) och
                varumärkeslagen (2010:1877). All otillåten kopiering, scraping, reverse
                engineering eller kommersiell vidareanvändning är förbjuden.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                13. Personuppgifter och GDPR
              </h2>
              <p className="text-muted-foreground">
                Vår behandling av personuppgifter beskrivs i vår{' '}
                <a href="/integritetspolicy" className="text-primary underline">
                  integritetspolicy
                </a>{' '}
                och vår användning av cookies i vår{' '}
                <a href="/cookiepolicy" className="text-primary underline">
                  cookiepolicy
                </a>
                . Du har rätt till registerutdrag, rättelse, radering, begränsning,
                dataportabilitet och invändning enligt artikel 15–22 GDPR. Klagomål kan
                lämnas till{' '}
                <a
                  href="https://www.imy.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Integritetsskyddsmyndigheten (IMY)
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                14. Ändringar
              </h2>
              <p className="text-muted-foreground">
                Vi kan när som helst uppdatera denna ansvarsfriskrivning. Den senaste
                versionen finns alltid på denna sida med angivet datum. Fortsatt
                användning av Tjänsten efter en ändring innebär att du accepterar den
                nya versionen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                15. Tillämplig lag och tvistelösning
              </h2>
              <p className="text-muted-foreground">
                Svensk rätt ska tillämpas på denna ansvarsfriskrivning. Tvist ska i
                första hand lösas genom dialog. Om ingen lösning nås ska tvisten avgöras
                av allmän domstol med Stockholms tingsrätt som första instans.
                Konsumenter har rätt att vända sig till Allmänna reklamationsnämnden
                (ARN) eller EU:s plattform för tvistlösning online.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">
                16. Kontakt
              </h2>
              <p className="text-muted-foreground">
                Aurora Media AB
                <br />
                E-post:{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">
                  info@auroramedia.se
                </a>
              </p>
            </section>
          </div>
        </div>
      </PageTransition>
      <LandingFooter />
    </div>
  );
}
