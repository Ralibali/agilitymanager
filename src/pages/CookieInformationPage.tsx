import { Link } from 'react-router';
import { SiteFooter } from '@/components/SiteFooter';
export default function CookieInformationPage() {
  return <><main className="mx-auto max-w-3xl space-y-5 px-6 py-16">
    <Link to="/" className="underline">Till startsidan</Link>
    <h1 className="font-display text-3xl">Cookies och lokal lagring</h1>
    <p>AgilityManager · uppdaterad 1 oktober 2026.</p>
    <p>Vi använder nödvändig lokal lagring för inloggning och för att komma ihåg de val och det innehåll du sparar i tjänsten. Inloggningslagring från Supabase (sb-*-auth-token) finns kvar tills du loggar ut eller rensar den. Sparade banutkast och inställningar finns kvar tills du tar bort dem eller rensar webbplatsens lagring.</p>
    <p>Ditt cookieval sparas under agilitymanager_ga4_consent_v2 i högst 365 dagar. Nödvändig lagring behövs för funktioner du har begärt.</p>
    <h2 className="text-xl font-semibold">Valfri statistik</h2>
    <p>Google Analytics 4 laddas när du godkänner statistik. Google får bland annat IP-adress och webbläsarinformation och mäter sidvisningar med pseudonyma besöksidentifierare. Google kan då skapa _ga och _ga_* som normalt varar upp till två år efter senaste användning. Statistik skickas inte från kontosidan, elevvyn eller dina personliga tränings- och resultatsidor. Vi tar bort frågeparametrar och fragment från de adresser som skickas i våra händelser.</p>
    <p>Google kan behandla uppgifter utanför EU/EES. Mer information finns i <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Googles integritetsinformation</a>.</p>
    <p>Du kan välja Endast nödvändiga och använda tjänsten. Öppna knappen Cookieinställningar längst ned för att ändra ditt val. När statistik återkallas stoppas nya händelser och tillgängliga statistikcookies rensas. Teckensnitt hämtas från vår egen webbplats.</p>
    <h2 className="text-xl font-semibold">Kontakt</h2>
    <p>Frågor om tjänsten och personuppgifter: <a href="mailto:info@auroramedia.se" className="underline">info@auroramedia.se</a>.</p>
    <h2 className="text-xl font-semibold">Dina sparade kontouppgifter</h2>
    <p>På kontosidan finns en export för uppgifter som kontot får läsa. Den hämtar bland annat profiler, hundar, banor och träning. Exportfilen anger om vissa uppgifter behöver begäras separat.</p>
    <Link to="/mitt-agilitymanager" className="underline">Öppna kontosidan</Link>
  </main><SiteFooter /></>;
}
