import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';
import { Helmet } from 'react-helmet-async';
import { PageTransition } from '@/components/motion/PageTransition';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Integritetspolicy | AgilityManager</title>
        <meta name="description" content="Integritetspolicy för AgilityManager – hur vi behandlar dina personuppgifter i enlighet med GDPR och svensk lagstiftning." />
        <link rel="canonical" href="https://agilitymanager.se/integritetspolicy" />
      </Helmet>
      <LandingNavbar />
      <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">Integritetspolicy</h1>
        <p className="text-sm text-muted-foreground mb-8">Senast uppdaterad: 11 april 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Inledning</h2>
            <p className="text-muted-foreground">
              Denna integritetspolicy beskriver hur Aurora Media ("vi", "oss", "vår")
              behandlar dina personuppgifter när du använder tjänsten AgilityManager ("Tjänsten").
              Policyn är upprättad i enlighet med Europaparlamentets och rådets förordning (EU) 2016/679
              (dataskyddsförordningen, "GDPR") samt den svenska lagen (2018:218) med kompletterande
              bestämmelser till EU:s dataskyddsförordning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. Personuppgiftsansvarig</h2>
            <p className="text-muted-foreground">
              Aurora Media är personuppgiftsansvarig för den behandling av personuppgifter som sker
              inom ramen för Tjänsten.
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1">
              <li><strong>Företag:</strong> Aurora Media</li>
              <li><strong>E-post:</strong>{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Vilka personuppgifter vi samlar in</h2>
            <p className="text-muted-foreground mb-2">Vi samlar in och behandlar följande kategorier av personuppgifter:</p>

            <h3 className="text-lg font-semibold text-foreground mt-3">3.1 Uppgifter du lämnar till oss</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Kontouppgifter:</strong> E-postadress och valfritt visningsnamn vid registrering.</li>
              <li><strong>Profiluppgifter:</strong> Profilbild, visningsnamn, förarnamn och integritetsinställningar.</li>
              <li><strong>Hunddata:</strong> Information om dina hundar (namn, ras, födelsedatum, vikt, storleksklass, mankhöjd, foto m.m.).</li>
              <li><strong>Tränings- och tävlingsdata:</strong> Träningsloggar, träningsmål, delmål, tävlingsresultat, tidtagningar, stoppursmätningar och noteringar.</li>
              <li><strong>Hälsodata:</strong> Hälsologgar för dina hundar (veterinärbesök, vaccinationer, viktkurva).</li>
              <li><strong>Banplaneringsdata:</strong> Sparade banritningar och kurser, inklusive exporterade filer (PNG, PDF, JSON).</li>
              <li><strong>Social data:</strong> Vänskapsförfrågningar, delade banor, chattmeddelanden och QR-kodsbaserade inbjudningar.</li>
              <li><strong>Klubbdata:</strong> Klubbmedlemskap, klubbinlägg, grupper, evenemang och anmälningar.</li>
              <li><strong>Supportärenden:</strong> Ämne och meddelande du skickar via supportformuläret.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-3">3.2 Uppgifter som samlas in automatiskt</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Registreringskälla:</strong> UTM-parametrar, hänvisande sida och landningssida (för att förstå hur du hittade oss).</li>
              <li><strong>Sessionsinformation:</strong> Autentiseringstoken för att hålla dig inloggad.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-3">3.3 Uppgifter vi INTE samlar in</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Vi använder inga spårningscookies, annonscookies eller analysverktyg som Google Analytics.</li>
              <li>Vi samlar inte in IP-adresser för spårningsändamål.</li>
              <li>Vi lagrar aldrig betalkortsuppgifter — dessa hanteras uteslutande av Stripe.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Ändamål och laglig grund för behandlingen</h2>
            <p className="text-muted-foreground mb-2">
              Vi behandlar dina personuppgifter för följande ändamål och med följande laglig grund
              enligt artikel 6 i GDPR:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Ändamål</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Laglig grund</th>
                    <th className="text-left py-2 font-semibold text-foreground">Uppgifter</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Skapa och hantera ditt konto</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">E-post, lösenord, visningsnamn</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Tillhandahålla Tjänstens funktioner</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">Hunddata, träning, tävling, hälsa, banor, klubbar</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Hantera betalningar och prenumerationer</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">E-post, prenumerationsuppgifter</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Sociala funktioner (kompisar, chatt, delning)</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">Visningsnamn, profilbild, meddelanden</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Klubbar och gruppfunktioner</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">Medlemskap, inlägg, evenemang, grupptillhörighet</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">AI-baserade träningsinsikter</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">Träningsdata, tävlingsresultat (anonymiseras vid bearbetning)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Importera tävlingsresultat från externa källor</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">Förarnamn, hundnamn, registreringsnummer</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Besvara supportärenden</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">E-post, ärendeinnehåll</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Skicka driftmeddelanden och tjänsterelaterad info</td>
                    <td className="py-2 pr-4">Berättigat intresse (art. 6.1 f)</td>
                    <td className="py-2">E-post</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Förstå hur användare hittar Tjänsten</td>
                    <td className="py-2 pr-4">Berättigat intresse (art. 6.1 f)</td>
                    <td className="py-2">UTM-parametrar, hänvisande sida</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Referral-program och belöningar</td>
                    <td className="py-2 pr-4">Fullgörande av avtal (art. 6.1 b)</td>
                    <td className="py-2">Referral-kod, inbjudningskälla</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Mottagare och underbiträden</h2>
            <p className="text-muted-foreground mb-2">
              Vi delar aldrig dina personuppgifter med tredje part i marknadsföringssyfte.
              Följande tjänsteleverantörer behandlar personuppgifter å våra vägnar
              (personuppgiftsbiträden) i enlighet med personuppgiftsbiträdesavtal:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                <strong>Supabase Inc:</strong> Databas, autentisering och serverless-funktioner.
                Data lagras inom EU/EES.{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Supabase integritetspolicy
                </a>
              </li>
              <li>
                <strong>Stripe Inc:</strong> Betalningshantering. Stripe är certifierat under
                EU-U.S. Data Privacy Framework.{' '}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Stripes integritetspolicy
                </a>
              </li>
              <li>
                <strong>Resend Inc:</strong> E-postutskick (transaktionella e-postmeddelanden
                som kontobekräftelse och lösenordsåterställning).{' '}
                <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Resends integritetspolicy
                </a>
              </li>
              <li>
                <strong>Google LLC (Gemini API) / OpenAI Inc:</strong> AI-modeller som används för
                att generera träningsinsikter. Data som skickas till AI-modeller är begränsad till
                aggregerad tränings- och tävlingsstatistik och innehåller inga direkt identifierbara
                personuppgifter. Behandling sker med stöd av EU-U.S. Data Privacy Framework.{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Googles integritetspolicy
                </a>{' '}|{' '}
                <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  OpenAIs integritetspolicy
                </a>
              </li>
              <li>
                <strong>Firecrawl (Mendable Inc):</strong> Webskrapning av publika tävlingsresultat
                från agilitydata.se vid användarens uttryckliga begäran.{' '}
                <a href="https://www.firecrawl.dev/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Firecrawls integritetspolicy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Överföring till tredje land</h2>
            <p className="text-muted-foreground">
              Vår primära datalagring sker inom EU/EES. I de fall personuppgifter överförs till
              USA (via Stripe, Resend, Google eller OpenAI) sker detta med stöd av EU-U.S. Data Privacy Framework
              (adequacy decision) eller standardavtalsklausuler (SCC) enligt artikel 46.2 c GDPR,
              för att säkerställa en adekvat skyddsnivå.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">7. Lagringstider</h2>
            <p className="text-muted-foreground mb-2">
              Vi lagrar dina personuppgifter så länge det är nödvändigt för de ändamål de
              samlades in för:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Kontouppgifter och appdata:</strong> Så länge ditt konto är aktivt.</li>
              <li><strong>Chattmeddelanden:</strong> Så länge båda parter har ett aktivt konto.</li>
              <li><strong>Klubbdata:</strong> Så länge klubben och ditt konto är aktivt.</li>
              <li><strong>Supportärenden:</strong> I upp till 12 månader efter att ärendet stängts.</li>
              <li><strong>Registreringskälla (UTM):</strong> Så länge kontot är aktivt.</li>
              <li><strong>Referral-data:</strong> Så länge kontot är aktivt.</li>
              <li><strong>Cachade tävlingsresultat:</strong> Uppdateras vid varje ny hämtning och raderas vid kontoborttagning.</li>
              <li><strong>Bokföringsunderlag:</strong> I 7 år enligt bokföringslagen (1999:1078).</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Vid radering av konto tas all personlig data bort inom 30 dagar, med undantag
              för uppgifter vi är skyldiga att bevara enligt lag.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">8. Dina rättigheter enligt GDPR</h2>
            <p className="text-muted-foreground mb-2">
              Du har följande rättigheter avseende dina personuppgifter:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li><strong>Rätt till tillgång (art. 15):</strong> Du har rätt att få bekräftelse
                på om vi behandlar dina personuppgifter och i så fall få tillgång till dem
                samt information om behandlingen.</li>
              <li><strong>Rätt till rättelse (art. 16):</strong> Du har rätt att få felaktiga
                uppgifter rättade och ofullständiga uppgifter kompletterade.</li>
              <li><strong>Rätt till radering (art. 17):</strong> Du har rätt att begära att
                dina personuppgifter raderas ("rätten att bli bortglömd") under vissa
                förutsättningar.</li>
              <li><strong>Rätt till begränsning (art. 18):</strong> Du har rätt att begära
                att behandlingen av dina uppgifter begränsas i vissa situationer.</li>
              <li><strong>Rätt till dataportabilitet (art. 20):</strong> Du har rätt att få
                ut dina uppgifter i ett strukturerat, allmänt använt och maskinläsbart
                format. I Tjänsten kan du exportera dina data via JSON- och CSV-export.</li>
              <li><strong>Rätt att göra invändningar (art. 21):</strong> Du har rätt att
                invända mot behandling som grundar sig på berättigat intresse.</li>
              <li><strong>Rätt att återkalla samtycke (art. 7.3):</strong> Om behandling
                sker med stöd av samtycke kan du när som helst återkalla det.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Du kan utöva dina rättigheter genom att kontakta oss på{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>.
              Vi besvarar din begäran utan onödigt dröjsmål och senast inom en månad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">9. Rätt att klaga till tillsynsmyndighet</h2>
            <p className="text-muted-foreground">
              Om du anser att vår behandling av dina personuppgifter strider mot GDPR har du
              rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY):
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1 mt-2">
              <li><strong>Integritetsskyddsmyndigheten (IMY)</strong></li>
              <li>Box 8114, 104 20 Stockholm</li>
              <li>
                <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  www.imy.se
                </a>
              </li>
              <li>
                E-post:{' '}
                <a href="mailto:imy@imy.se" className="text-primary underline">imy@imy.se</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">10. Säkerhetsåtgärder</h2>
            <p className="text-muted-foreground">
              Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina
              personuppgifter mot obehörig åtkomst, förlust eller förstörelse, i enlighet
              med artikel 32 GDPR:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
              <li>All datatrafik krypteras med TLS/SSL.</li>
              <li>Lösenord lagras med säker hashning (bcrypt) och lagras aldrig i klartext.</li>
              <li>Row Level Security (RLS) säkerställer att varje användare bara kan se sin egen data.</li>
              <li>Autentiseringstoken har begränsad livstid och förnyas automatiskt.</li>
              <li>Betalkortsuppgifter hanteras uteslutande av Stripe (PCI DSS-certifierat).</li>
              <li>Klubbdata skyddas med rollbaserade åtkomstkontroller (admin/medlem).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">11. Cookies</h2>
            <p className="text-muted-foreground">
              Information om vilka cookies vi använder finns i vår separata{' '}
              <a href="/cookiepolicy" className="text-primary underline">cookiepolicy</a>.
              Vi använder enbart nödvändiga cookies för autentisering och funktionalitet — inga
              spårnings- eller annonscookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">12. Barn</h2>
            <p className="text-muted-foreground">
              Tjänsten riktar sig inte till barn under 13 år. Vi samlar inte medvetet in
              personuppgifter från barn under 13 år. Om du är under 13 år ska du inte
              registrera dig utan en vårdnadshavares godkännande. Kontakta oss om du misstänker
              att ett barn under 13 år har registrerat sig.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">13. Ändringar av denna policy</h2>
            <p className="text-muted-foreground">
              Vi kan komma att uppdatera denna integritetspolicy. Vid väsentliga ändringar
              meddelar vi dig via e-post eller en notis i Tjänsten. Den senaste versionen
              finns alltid tillgänglig på denna sida med angivet datum för senaste uppdatering.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">14. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du frågor om vår behandling av personuppgifter eller vill utöva dina
              rättigheter? Kontakta oss:
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1 mt-2">
              <li><strong>Aurora Media</strong></li>
              <li>
                E-post:{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>
              </li>
            </ul>
          </section>

        </div>
      </div>
      </PageTransition>
      <LandingFooter />
    </div>
  );
}
