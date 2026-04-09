import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <div className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Cookiepolicy</h1>
        <p className="text-sm text-muted-foreground mb-6">Senast uppdaterad: 9 april 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Vad är cookies?</h2>
            <p className="text-muted-foreground">
              Cookies är små textfiler som lagras på din enhet när du besöker en webbplats. 
              De används för att webbplatsen ska fungera korrekt och för att förbättra din upplevelse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. Vilka cookies använder vi?</h2>

            <h3 className="text-lg font-semibold text-foreground mt-4">Nödvändiga cookies</h3>
            <p className="text-muted-foreground">
              Dessa cookies krävs för att tjänsten ska fungera. De hanterar inloggning, 
              sessionshantering och säkerhet. Utan dessa cookies kan du inte använda AgilityManager.
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Autentisering:</strong> Håller dig inloggad under din session.</li>
              <li><strong>Säkerhet:</strong> Skyddar mot obehöriga förfrågningar (CSRF).</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-4">Funktionella cookies</h3>
            <p className="text-muted-foreground">
              Används för att komma ihåg dina inställningar, som valt tema (ljust/mörkt läge) 
              och sidofältets status.
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-4">Tredjepartscookies</h3>
            <p className="text-muted-foreground">
              Vi använder Stripe för betalning. Stripe kan sätta cookies för att hantera 
              betalningsprocessen säkert. Läs mer i{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Stripes integritetspolicy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Vi använder INTE</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Annonscookies eller spårningscookies.</li>
              <li>Google Analytics eller liknande analysverktyg.</li>
              <li>Cookies som delar din data med annonsörer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Hantera cookies</h2>
            <p className="text-muted-foreground">
              Du kan hantera och radera cookies via din webbläsares inställningar. 
              Observera att om du blockerar nödvändiga cookies kan tjänsten sluta fungera korrekt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du frågor om vår cookiepolicy? Kontakta oss på{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>.
            </p>
          </section>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
