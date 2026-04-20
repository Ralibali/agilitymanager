import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';
import { Helmet } from 'react-helmet-async';
import { PageTransition } from '@/components/motion/PageTransition';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cookiepolicy | AgilityManager</title>
        <meta name="description" content="Cookiepolicy för AgilityManager – information om vilka cookies vi använder och dina valmöjligheter." />
        <link rel="canonical" href="https://agilitymanager.se/cookiepolicy" />
      </Helmet>
      <LandingNavbar />
      <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">Cookiepolicy</h1>
        <p className="text-sm text-muted-foreground mb-8">Senast uppdaterad: 11 april 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Vad är cookies?</h2>
            <p className="text-muted-foreground">
              Cookies är små textfiler som lagras på din enhet (dator, telefon eller surfplatta) 
              när du besöker en webbplats. De används för att webbplatsen ska fungera korrekt, 
              komma ihåg dina inställningar och förbättra din upplevelse. Denna policy följer 
              lagen (2003:389) om elektronisk kommunikation (LEK) samt GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. Vilka cookies och liknande tekniker använder vi?</h2>

            <h3 className="text-lg font-semibold text-foreground mt-4">2.1 Strikt nödvändiga cookies</h3>
            <p className="text-muted-foreground mb-2">
              Dessa cookies krävs för att Tjänsten ska fungera och kan inte stängas av. De sätts 
              som svar på dina handlingar, t.ex. inloggning. Enligt LEK kräver dessa cookies 
              inget samtycke.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Cookie / lagring</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Ändamål</th>
                    <th className="text-left py-2 font-semibold text-foreground">Livslängd</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">sb-*-auth-token (localStorage)</td>
                    <td className="py-2 pr-4">Autentisering — håller dig inloggad</td>
                    <td className="py-2">Session / refresh</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">sb-*-auth-token-code-verifier</td>
                    <td className="py-2 pr-4">PKCE-verifiering vid inloggning</td>
                    <td className="py-2">Temporär</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">vite-ui-theme (localStorage)</td>
                    <td className="py-2 pr-4">Sparar ditt valda tema (ljust/mörkt)</td>
                    <td className="py-2">Persistent</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">course-planner-* (localStorage)</td>
                    <td className="py-2 pr-4">Sparar lokalt tillstånd i banplaneraren (t.ex. ångra-historik)</td>
                    <td className="py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-foreground mt-4">2.2 Tredjepartscookies</h3>
            <p className="text-muted-foreground">
              Vid betalning kan <strong>Stripe</strong> sätta cookies för att hantera 
              betalningsprocessen säkert och förhindra bedrägerier. Dessa cookies sätts 
              direkt av Stripe och omfattas av{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Stripes integritetspolicy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Vad vi INTE använder</h2>
            <p className="text-muted-foreground">Vi värnar om din integritet. Därför använder vi:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
              <li>❌ Inga annonscookies eller remarketing-pixlar.</li>
              <li>❌ Inga analysverktyg som Google Analytics, Facebook Pixel eller liknande.</li>
              <li>❌ Inga cookies som delar din data med annonsörer eller databrokers.</li>
              <li>❌ Inga fingerprinting-tekniker.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Hantera och radera cookies</h2>
            <p className="text-muted-foreground">
              Du kan hantera och radera cookies via din webbläsares inställningar. Observera 
              att om du blockerar de strikt nödvändiga cookies som behövs för autentisering 
              kan du inte logga in och använda Tjänsten.
            </p>
            <p className="text-muted-foreground mt-2">
              Vanliga webbläsare:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/sv/kb/cookies-information-webbplatser-sparar-pa-din-dator" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/sv-se/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/sv-se/microsoft-edge/ta-bort-cookies-i-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Rättslig grund</h2>
            <p className="text-muted-foreground">
              De strikt nödvändiga cookies vi använder undantas från samtyckeskravet enligt 
              6 kap. 18 § LEK, eftersom de är nödvändiga för att leverera den tjänst du 
              uttryckligen har begärt (dvs. inloggning och användning av appen).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Ändringar</h2>
            <p className="text-muted-foreground">
              Vi kan uppdatera denna cookiepolicy vid behov. Den senaste versionen finns 
              alltid på denna sida med angivet datum.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">7. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du frågor om vår användning av cookies? Kontakta oss på{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>.
            </p>
          </section>

        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
