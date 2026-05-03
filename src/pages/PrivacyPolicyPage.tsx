import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';
import { Helmet } from 'react-helmet-async';
import { PageTransition } from '@/components/motion/PageTransition';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Integritetspolicy | AgilityManager</title>
        <meta name="description" content="Integritetspolicy för AgilityManager – hur vi behandlar personuppgifter, cookies, samtycke och dina rättigheter enligt GDPR." />
        <link rel="canonical" href="https://agilitymanager.se/integritetspolicy" />
      </Helmet>
      <LandingNavbar />
      <PageTransition>
        <main id="main-content" className="max-w-3xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">Integritetspolicy</h1>
          <p className="text-sm text-muted-foreground mb-8">Senast uppdaterad: 3 maj 2026</p>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">1. Inledning</h2>
              <p className="text-muted-foreground">
                Denna integritetspolicy beskriver hur Aurora Media behandlar personuppgifter när du
                använder AgilityManager. Policyn är framtagen för att ge tydlig information enligt GDPR,
                svensk kompletterande dataskyddslagstiftning och lagen om elektronisk kommunikation.
              </p>
              <p className="text-muted-foreground mt-2">
                Denna sida är inte juridisk rådgivning. För full säkerhet bör policyn och era faktiska
                personuppgiftsbiträdesavtal granskas juridiskt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">2. Personuppgiftsansvarig</h2>
              <ul className="list-none pl-0 text-muted-foreground space-y-1">
                <li><strong>Personuppgiftsansvarig:</strong> Aurora Media</li>
                <li><strong>Tjänst:</strong> AgilityManager, agilitymanager.se</li>
                <li><strong>Land:</strong> Sverige</li>
                <li><strong>E-post:</strong>{' '}<a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">3. Vilka uppgifter vi behandlar</h2>
              <p className="text-muted-foreground mb-2">Beroende på hur du använder tjänsten kan vi behandla:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong>Kontouppgifter:</strong> e-postadress, användar-ID, visningsnamn och autentiseringsuppgifter.</li>
                <li><strong>Profil- och hunduppgifter:</strong> namn, profilbild, hundnamn, ras, födelsedata, storlek, klass och liknande information.</li>
                <li><strong>Träning, tävling och mål:</strong> träningsloggar, resultat, mål, anteckningar, tidtagning, banor och statistik.</li>
                <li><strong>Hälso- och omsorgsdata för hund:</strong> vikt, vaccinationer, veterinärbesök och egna anteckningar.</li>
                <li><strong>Sociala funktioner:</strong> vänskapsförfrågningar, klubbmedlemskap, delade banor, inlägg, evenemang och chattmeddelanden.</li>
                <li><strong>Support och kommunikation:</strong> uppgifter du skickar via support, mejl, coachflöden eller formulär.</li>
                <li><strong>Betalnings- och prenumerationsdata:</strong> Stripe-kund-ID, prenumerationsstatus, produkt, betalningsstatus och kvittorelaterad information. Kortuppgifter hanteras av Stripe.</li>
                <li><strong>Teknisk information:</strong> session, cookieval, säkerhetsloggar, felinformation och enhets-/webbläsarinformation som behövs för drift och säkerhet.</li>
                <li><strong>Analys och kampanjdata efter samtycke:</strong> statistik, UTM-parametrar, hänvisande sida, landningssida och eventuella pixelhändelser om du godkänt motsvarande kategori.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">4. Varför vi behandlar uppgifter och laglig grund</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-muted-foreground border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Ändamål</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Laglig grund</th>
                      <th className="text-left py-2 font-semibold text-foreground">Exempel på uppgifter</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Skapa konto och leverera appens funktioner</td>
                      <td className="py-2 pr-4">Avtal, art. 6.1 b</td>
                      <td className="py-2">konto, hundar, träning, tävling, banor</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Säkerhet, felsökning och missbruksförebyggande</td>
                      <td className="py-2 pr-4">Berättigat intresse, art. 6.1 f</td>
                      <td className="py-2">tekniska loggar, sessioner, feldata</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Betalningar, fakturor och bokföring</td>
                      <td className="py-2 pr-4">Avtal och rättslig förpliktelse, art. 6.1 b/c</td>
                      <td className="py-2">Stripe-data, kvitto- och bokföringsunderlag</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Support, coachning och kommunikation</td>
                      <td className="py-2 pr-4">Avtal eller berättigat intresse</td>
                      <td className="py-2">supportmeddelanden, uppladdat material, kontaktuppgifter</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Analys och produktförbättring</td>
                      <td className="py-2 pr-4">Samtycke, art. 6.1 a</td>
                      <td className="py-2">aggregerad användningsstatistik</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Kampanjmätning och marknadsföring</td>
                      <td className="py-2 pr-4">Samtycke, art. 6.1 a</td>
                      <td className="py-2">UTM, referrer, pixelhändelser</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">5. Cookies, analys och marknadsföring</h2>
              <p className="text-muted-foreground">
                Nödvändiga cookies och lagring används för att tjänsten ska fungera. Analys och
                marknadsföring laddas eller sparas bara efter samtycke. Du kan ändra dina val när som helst
                via cookieinställningarna. Läs mer i vår{' '}
                <Link to="/cookiepolicy" className="text-primary underline">cookiepolicy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">6. Mottagare och personuppgiftsbiträden</h2>
              <p className="text-muted-foreground mb-2">
                Vi delar inte personuppgifter med annonsörer för egen försäljning av data. Uppgifter kan
                behandlas av leverantörer som hjälper oss driva tjänsten, exempelvis:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong>Supabase:</strong> databas, autentisering, lagring och edge functions.</li>
                <li><strong>Vercel:</strong> hosting, deploy och tekniska driftloggar.</li>
                <li><strong>Stripe:</strong> betalningar, prenumerationer och kundportal.</li>
                <li><strong>E-postleverantörer:</strong> transaktionsmejl, support och notiser.</li>
                <li><strong>Analys-/marknadsföringsleverantörer:</strong> bara om du lämnat relevant samtycke.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Om uppgifter överförs utanför EU/EES ska det ske med lämpliga skyddsåtgärder, exempelvis
                EU-kommissionens standardavtalsklausuler eller annan giltig överföringsmekanism.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">7. Lagringstid</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Konto- och appdata sparas så länge kontot finns eller tills du raderar uppgifterna.</li>
                <li>Supportärenden sparas så länge det behövs för att hantera ärendet och följa upp kvalitet.</li>
                <li>Cookieval sparas normalt upp till 12 månader.</li>
                <li>Bokföringsunderlag sparas enligt bokföringslagen, normalt 7 år.</li>
                <li>Data som behandlas på samtycke raderas eller anonymiseras när samtycket återkallas, där det är tekniskt möjligt och inte annan laglig grund finns.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">8. Dina rättigheter</h2>
              <p className="text-muted-foreground mb-2">Du har rätt att:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>begära tillgång till dina personuppgifter,</li>
                <li>begära rättelse av felaktiga uppgifter,</li>
                <li>begära radering i vissa fall,</li>
                <li>begära begränsning av behandling,</li>
                <li>invända mot behandling som grundas på berättigat intresse,</li>
                <li>få ut uppgifter i maskinläsbart format när reglerna om dataportabilitet gäller,</li>
                <li>återkalla samtycke när behandlingen grundas på samtycke.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Kontakta oss på{' '}<a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>{' '}
                för att utöva dina rättigheter. Vi svarar normalt inom en månad.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">9. Radering, export och självbetjäning</h2>
              <p className="text-muted-foreground">
                I appen kan du hantera flera uppgifter själv, exempelvis profil, hundar, banor, träning och
                export. Om du vill radera konto, få komplett dataexport eller behöver hjälp med något som
                inte finns i appen kan du mejla oss. Vid kontoradering tar vi bort personlig data inom rimlig
                tid, med undantag för uppgifter som måste sparas enligt lag.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">10. Klagomål</h2>
              <p className="text-muted-foreground">
                Om du anser att vi behandlar dina personuppgifter felaktigt har du rätt att lämna klagomål
                till Integritetsskyddsmyndigheten (IMY). Vi uppskattar om du kontaktar oss först så att vi
                kan försöka lösa frågan.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">11. Ändringar</h2>
              <p className="text-muted-foreground">
                Vi kan uppdatera denna policy när tjänsten, leverantörer eller lagkrav förändras. Senaste
                versionen finns alltid på denna sida.
              </p>
            </section>
          </div>
        </main>
      </PageTransition>
      <LandingFooter />
    </div>
  );
}
