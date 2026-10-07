import { Link } from 'react-router';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { Seo } from '@/components/Seo';

const pages = {
  about: { title: 'Om AgilityManager', path: '/om-oss', intro: 'AgilityManager är ett planeringsverktyg för agility och hoopers, med banplanerare, tävlingskalender, träning och resultat.', sections: [
    ['För förare, tränare och domare', 'Rita en bana i meterskala, kontrollera avstånd och skapa underlag till träningen eller banbygget. Du kan börja rita och exportera utan konto.'],
    ['Kontakt', 'Aurora Media AB ansvarar för tjänsten och supporten. Har du frågor eller förslag når du oss via e-post nedan.'],
  ] },
  terms: { title: 'Villkor för AgilityManager', path: '/villkor', intro: 'Här beskriver vi hur webbversionen av AgilityManager används. Information om den fristående mobilappen finns på dess supportsida.', sections: [
    ['Planering och kontroll', 'Banplaneraren är ett stöd för planering. Beräknade längder och tider är uppskattningar. Domare och arrangörer behöver kontrollera banan på plats och tillämpa det regelverk som gäller för tävlingen.'],
    ['Spara ditt arbete', 'Utkast sparas i webbläsaren. När du är inloggad kan du välja Spara bana för att spara på kontot. Kontrollera alltid sparstatusen. Du kan även exportera JSON som en egen säkerhetskopia.'],
    ['Delning och innehåll', 'Du väljer själv när du delar en länk eller publicerar en bana. Alla med en delningslänk kan läsa dess innehåll. Dela bara material som du har rätt att använda och undvik personuppgifter om andra.'],
    ['Konto och hjälp', 'Skydda dina inloggningsuppgifter och använd ditt eget konto. Kontakta oss om du upptäcker ett fel, vill rapportera innehåll eller behöver hjälp med dina uppgifter.'],
  ] },
  privacy: { title: 'Integritet', path: '/integritet', intro: 'Den här sidan beskriver uppgifter i AgilityManagers webbversion. Aurora Media AB ansvarar för tjänsten. Frågor om dina uppgifter kan skickas till info@auroramedia.se.', sections: [
    ['Konto och sparat innehåll', 'När du skapar konto behandlas din e-postadress och uppgifter för inloggning. Banor, versioner, profiler, träning och resultat behandlas när du använder dessa funktioner. Uppgifterna används för att tillhandahålla funktionerna du väljer. Konto och molnlagring hanteras med Supabase.'],
    ['Utkast och delning', 'Utkast och inställningar sparas lokalt i webbläsaren. Molnsparade banor är privata som standard. Om du väljer att publicera kan andra läsa den publicerade banan. En delningslänk innehåller en kopia av banan som mottagaren kan spara vidare.'],
    ['Lagring och dina frågor', 'Lokala uppgifter finns kvar tills du tar bort dem eller rensar webbplatsens lagring. Sparat kontoinnehåll finns kvar tills det tas bort. På kontosidan kan du exportera tillgängliga kontouppgifter. Kontakta oss för hjälp med tillgång, rättelse eller radering och frågor om lagring.'],
    ['Valfri statistik', 'Du kan använda tjänsten med enbart nödvändig lagring. Google Analytics laddas när du godkänner statistik. Läs mer om lagring och ändra ditt val på sidan om cookies.'],
  ] },
};

export default function InformationPage({ kind }: { kind: keyof typeof pages }) {
  const page = pages[kind];
  return <><Seo title={`${page.title} – AgilityManager`} description={page.intro} canonicalPath={page.path} /><SiteNav /><main className="mx-auto max-w-3xl space-y-6 px-4 py-16 leading-relaxed"><h1 className="font-display text-4xl">{page.title}</h1><p>{page.intro}</p>{page.sections.map(([heading, body]) => <section key={heading}><h2 className="mb-2 font-display text-2xl">{heading}</h2><p>{body}</p></section>)}<p><a className="font-semibold underline" href="mailto:info@auroramedia.se">info@auroramedia.se</a></p><nav aria-label="Information" className="flex flex-wrap gap-4 text-sm underline"><Link to="/cookies">Cookies och inställningar</Link><Link to="/integritet">Integritet</Link><Link to="/villkor">Villkor</Link><Link to="/om-oss">Om oss</Link><Link to="/mitt-agilitymanager">Mitt konto</Link></nav></main><SiteFooter /></>;
}
