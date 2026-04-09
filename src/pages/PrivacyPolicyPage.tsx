import { PageContainer } from '@/components/PageContainer';
import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <div className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Integritetspolicy</h1>
        <p className="text-sm text-muted-foreground mb-6">Senast uppdaterad: 9 april 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Personuppgiftsansvarig</h2>
            <p className="text-muted-foreground">
              Aurora Media ("vi", "oss") är personuppgiftsansvarig för behandlingen av dina personuppgifter i AgilityManager.
              Kontakt: <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. Vilka uppgifter vi samlar in</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Kontouppgifter:</strong> E-postadress, namn (valfritt) och lösenord (krypterat).</li>
              <li><strong>Appdata:</strong> Information om dina hundar, träningsloggar, tävlingsresultat, hälsodata och banplaneringar.</li>
              <li><strong>Betalningsuppgifter:</strong> Hanteras av Stripe. Vi lagrar aldrig kortuppgifter.</li>
              <li><strong>Supportärenden:</strong> Ämne och meddelande du skickar via appen.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Varför vi behandlar dina uppgifter</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Tillhandahålla och förbättra tjänsten.</li>
              <li>Hantera ditt konto och prenumeration.</li>
              <li>Besvara supportärenden.</li>
              <li>Skicka viktiga meddelanden om tjänsten (t.ex. driftinformation).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Laglig grund</h2>
            <p className="text-muted-foreground">
              Vi behandlar dina uppgifter baserat på fullgörande av avtal (för att leverera tjänsten), 
              berättigat intresse (för att förbättra tjänsten) samt samtycke (för marknadsföring, om tillämpligt).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Delning av uppgifter</h2>
            <p className="text-muted-foreground">
              Vi delar aldrig dina personuppgifter med tredje part i marknadsföringssyfte. 
              Vi använder följande tjänsteleverantörer som behandlar data å våra vägnar:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Supabase:</strong> Databas och autentisering (EU-baserad hosting).</li>
              <li><strong>Stripe:</strong> Betalningshantering.</li>
              <li><strong>Resend:</strong> E-postutskick.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Lagringstid</h2>
            <p className="text-muted-foreground">
              Dina uppgifter lagras så länge ditt konto är aktivt. Om du raderar ditt konto tas all 
              personlig data bort inom 30 dagar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">7. Dina rättigheter</h2>
            <p className="text-muted-foreground">
              Enligt GDPR har du rätt att begära tillgång till, rättelse av, radering av och 
              begränsning av behandling av dina personuppgifter. Du har också rätt att invända mot 
              behandling och rätt till dataportabilitet. Kontakta oss på{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">8. Säkerhet</h2>
            <p className="text-muted-foreground">
              Vi använder branschstandard-kryptering (TLS/SSL) för all datatrafik. 
              Lösenord lagras med säker hashning och lagras aldrig i klartext.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">9. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du frågor om vår integritetspolicy? Kontakta oss på{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">info@auroramedia.se</a>.
            </p>
          </section>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
