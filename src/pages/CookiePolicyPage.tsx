import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';
import { Helmet } from 'react-helmet-async';
import { PageTransition } from '@/components/motion/PageTransition';
import { openCookieSettings } from '@/components/CookieBanner';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cookiepolicy | AgilityManager</title>
        <meta name="description" content="Cookiepolicy för AgilityManager – information om nödvändiga cookies, analys, marknadsföring och hur du ändrar dina samtyckesval." />
        <link rel="canonical" href="https://agilitymanager.se/cookiepolicy" />
      </Helmet>
      <LandingNavbar />
      <PageTransition>
        <main id="main-content" className="max-w-3xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">Cookiepolicy</h1>
          <p className="text-sm text-muted-foreground mb-8">Senast uppdaterad: 3 maj 2026</p>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">1. Vad är cookies och lokal lagring?</h2>
              <p className="text-muted-foreground">
                Cookies är små textfiler som lagras i din webbläsare. Liknande tekniker, som
                localStorage, används för att komma ihåg inställningar och tillfälliga uppgifter.
                Denna policy beskriver hur AgilityManager använder cookies och liknande tekniker
                enligt lagen (2003:389) om elektronisk kommunikation (LEK) och GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">2. Samtycke och val</h2>
              <p className="text-muted-foreground">
                Nödvändiga cookies och lagring används eftersom de krävs för att tjänsten ska fungera.
                Analys och marknadsföring används bara om du aktivt godkänner det i cookie-bannern.
                Du kan när som helst ändra eller återkalla dina val.
              </p>
              <button
                type="button"
                onClick={openCookieSettings}
                className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Ändra cookieinställningar
              </button>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">3. Vilka kategorier använder vi?</h2>

              <h3 className="text-lg font-semibold text-foreground mt-4">3.1 Nödvändiga cookies och lagring</h3>
              <p className="text-muted-foreground mb-2">
                Dessa krävs för inloggning, säkerhet, cookieval och grundläggande funktioner. De kan
                inte stängas av via vår cookie-banner.
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
                      <td className="py-2 pr-4">am_cookie_consent</td>
                      <td className="py-2 pr-4">Sparar dina cookieval</td>
                      <td className="py-2">Upp till 12 månader</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">sb-*-auth-token / Supabase auth-lagring</td>
                      <td className="py-2 pr-4">Autentisering och säker inloggning</td>
                      <td className="py-2">Session / tills du loggar ut</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">theme / theme-rebrand-v5</td>
                      <td className="py-2 pr-4">Sparar tema och säkerställer konsekvent visning</td>
                      <td className="py-2">Persistent</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">course-planner-* och apprelaterad localStorage</td>
                      <td className="py-2 pr-4">Sparar lokalt tillstånd i verktyg, exempelvis banplaneraren</td>
                      <td className="py-2">Varierar, ofta session eller tills du rensar data</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-foreground mt-4">3.2 Analys</h3>
              <p className="text-muted-foreground">
                Om du godkänner analys kan vi använda integritetsvänlig statistik, exempelvis
                Plausible eller motsvarande, för att förstå hur tjänsten används och förbättra
                funktioner, prestanda och innehåll. Analysverktyg laddas inte före samtycke.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-4">3.3 Marknadsföring och kampanjmätning</h3>
              <p className="text-muted-foreground">
                Om du godkänner marknadsföring kan vi spara kampanjinformation, exempelvis UTM-parametrar,
                hänvisande sida och landningssida, samt ladda eventuella annonspixlar som Meta Pixel eller
                Google Ads. Dessa används för att mäta kampanjer och förbättra relevansen i vår marknadsföring.
                Marknadsföringsteknik laddas inte före samtycke.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">4. Tredjepartstjänster</h2>
              <p className="text-muted-foreground">
                Vid betalning kan <strong>Stripe</strong> sätta cookies eller använda liknande tekniker för
                att hantera betalningar, kundportal, prenumerationer och bedrägeriskydd. Dessa sätts av
                Stripe och omfattas av Stripes egna villkor och integritetspolicy.
              </p>
              <p className="text-muted-foreground mt-2">
                Om analys eller marknadsföring aktiveras efter samtycke kan respektive leverantör behandla
                teknisk information enligt sina villkor. Vi försöker bara aktivera sådana tjänster när det
                finns ett relevant samtycke.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">5. Hantera och radera cookies</h2>
              <p className="text-muted-foreground">
                Du kan ändra dina cookieval via knappen ovan eller via länkar till cookieinställningar i
                tjänsten. Du kan också radera cookies och localStorage i webbläsaren. Om du blockerar
                nödvändig lagring kan inloggning och viktiga funktioner sluta fungera.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground">6. Kontakt</h2>
              <p className="text-muted-foreground">
                Har du frågor om cookies eller samtycke? Kontakta oss på{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>.
              </p>
            </section>
          </div>
        </main>
      </PageTransition>
      <LandingFooter />
    </div>
  );
}
