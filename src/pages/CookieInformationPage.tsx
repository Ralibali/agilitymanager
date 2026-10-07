import { useEffect } from "react";
import { Link } from 'react-router';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { Seo } from '@/components/Seo';
import { PAGE_SEO, seoProps } from '@/lib/pageSeo';
import { openCookieSettings } from '@/lib/privacyConsent';

export default function CookieInformationPage({ openSettings = false }: { openSettings?: boolean }) {
  useEffect(() => { if (openSettings) openCookieSettings(); }, [openSettings]);
  return (
    <>
      <Seo {...seoProps(PAGE_SEO.cookies)} />
      <SiteNav />
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-14 leading-relaxed text-ink/80 sm:px-6 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-forest">Integritet</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-ink sm:text-5xl">Cookies och lokal lagring</h1>
        <p className="text-sm text-ink/50">AgilityManager · uppdaterad 5 oktober 2026.</p>
        <p>Vi använder nödvändig lokal lagring för inloggning och för att komma ihåg de val och det innehåll du sparar i tjänsten. Inloggningslagring från Supabase (sb-*-auth-token) finns kvar tills du loggar ut eller rensar den. Sparade banutkast och inställningar finns kvar tills du tar bort dem eller rensar webbplatsens lagring.</p>
        <p>Ditt cookieval sparas under agilitymanager_ga4_consent_v2 i högst 365 dagar. Nödvändig lagring behövs för funktioner du har begärt.</p>
        <h2 className="pt-4 font-display text-2xl uppercase tracking-wide text-ink">Valfri statistik</h2>
        <p>Google Analytics 4 laddas när du godkänner statistik. Google får bland annat IP-adress och webbläsarinformation och mäter sidvisningar med pseudonyma besöksidentifierare. Google kan då skapa _ga och _ga_* som normalt varar upp till två år efter senaste användning. Statistik skickas inte från kontosidan, elevvyn eller dina personliga tränings- och resultatsidor. Vi tar bort frågeparametrar och fragment från de adresser som skickas i våra händelser.</p>
        <p>Google kan behandla uppgifter utanför EU/EES. Mer information finns i <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Googles integritetsinformation</a>.</p>
        <p>Du kan välja Endast nödvändiga och använda tjänsten. När statistik återkallas stoppas nya händelser och tillgängliga statistikcookies rensas. Teckensnitt hämtas från vår egen webbplats.</p>
        <button
          type="button"
          onClick={openCookieSettings}
          className="pressable shadow-hard-sm inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-tang px-5 text-sm font-bold text-ink"
        >
          Ändra cookieinställningar
        </button>
        <h2 className="pt-4 font-display text-2xl uppercase tracking-wide text-ink">Kontakt</h2>
        <p>Frågor om tjänsten och personuppgifter: <a href="mailto:info@auroramedia.se" className="font-semibold underline underline-offset-2">info@auroramedia.se</a>.</p>
        <h2 className="pt-4 font-display text-2xl uppercase tracking-wide text-ink">Dina sparade kontouppgifter</h2>
        <p>På kontosidan finns en export för uppgifter som kontot får läsa. Den hämtar bland annat profiler, hundar, banor och träning. Exportfilen anger om vissa uppgifter behöver begäras separat.</p>
        <Link to="/mitt-agilitymanager" className="font-semibold underline underline-offset-2">Öppna kontosidan</Link>
      </main>
      <SiteFooter />
    </>
  );
}
