import { Link } from "react-router";
import { Seo } from "@/components/Seo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";

export default function MobilePrivacyPage() {
  return <div className="min-h-screen bg-paper text-ink">
    <Seo title="Integritet — AgilityManager" description="Information om konton, banprofiler, lokal lagring, delning och statistik i AgilityManager." canonicalPath="/integritet" />
    <SiteNav />
    <PageHero kicker="Dina uppgifter" title="Integritet i AgilityManager.">
      Så används uppgifter i de funktioner som finns i AgilityManager.
    </PageHero>
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-10 leading-relaxed sm:px-6">
      <p className="text-sm text-ink/60">Uppdaterad 30 september 2026.</p>
      <section aria-labelledby="privacy-local"><h2 id="privacy-local" className="font-display text-3xl">Utan konto och på din enhet</h2>
        <p className="mt-3">Du kan läsa innehåll, se tävlingar och rita banor utan konto. Banutkast, lokalt sparade banor, träningspass, tävlingsfavoriter, filter och resultat kan lagras lokalt på den enhet där du använder appen. De följer inte automatiskt med till en annan enhet. Rensar du appens eller webbplatsens lagrade uppgifter kan osynkade uppgifter försvinna.</p>
      </section>
      <section aria-labelledby="privacy-auth"><h2 id="privacy-auth" className="font-display text-3xl">Konto och molnsynk</h2>
        <p className="mt-3">Kontot för inloggning använder e-post och lösenord via Supabase Auth. En inloggningssession sparas på enheten. När du använder molnfunktionerna skickas till exempel sparade banor, kommentarer och hundprofiler till Supabase. Accepterade vänner kan se och redigera delade hundprofiler i funktioner som har det stödet.</p>
      </section>
      <section aria-labelledby="privacy-profile"><h2 id="privacy-profile" className="font-display text-3xl">Separat banprofil och delning</h2>
        <p className="mt-3">Banprofilen sparar namn och e-post i Supabase. Den använder ingen lösenordsinloggning, utan en separat profilnyckel som lagras på din enhet. E-post ensam ger inte åtkomst till en befintlig profil. Profilnyckeln ska hållas privat.</p>
        <p className="mt-3">Namn visas som författarnamn när du delar en bana eller kommenterar. Publikt delade banor, deras innehåll, kommentarer och betyg kan visas för andra. Banprofilens e-post och profilnyckel ingår inte i de publika banvyerna.</p>
      </section>
      <section aria-labelledby="privacy-coaching"><h2 id="privacy-coaching" className="font-display text-3xl">Instruktör och feedback</h2>
        <p className="mt-3">Instruktörsfunktionen lagrar grupper, elevnamn, hundnamn, uppgifter, träningsrapporter och återkoppling i Supabase. Elevlänken ger åtkomst till elevens uppgifter och egna rapporter; dela den bara med avsedd elev. Videolänkar lagras som länkar. Videon finns hos tjänsten som länken går till.</p>
        <p className="mt-3">När du skickar feedback kan meddelande, kategori, namn, e-post, sidans adress, webbläsarinformation och en ögonblicksbild av banan skickas till Supabase. Fyll bara i de uppgifter du vill lämna i formuläret.</p>
      </section>
      <section aria-labelledby="privacy-external"><h2 id="privacy-external" className="font-display text-3xl">Kartor, notiser och externa länkar</h2>
        <p className="mt-3">Webbversionen har stöd för tävlingsnotiser efter att du har gett tillstånd. Då lagras pushprenumerationens adress, tekniska nycklar och valda tävlingsfilter. Om du använder ”Hitta nära mig” ber tävlingsvyn om tillstånd att läsa din position för att beräkna avstånd och välja närmaste län. Kartfunktionen kan hämta kartbilder från OpenStreetMap. När du öppnar externa länkar, inklusive videor och partnerlänkar, gäller den mottagande tjänstens egna villkor och hantering av uppgifter.</p>
      </section>
      <section aria-labelledby="privacy-statistics"><h2 id="privacy-statistics" className="font-display text-3xl">Valfri statistik</h2>
        <p className="mt-3">Den här mobilversionen samlar inte in användningsstatistik. Webbplatsen använder Google Analytics 4 efter att du accepterat statistik. Ditt val sparas på enheten och kan ändras via Cookieinställningar. Statistikhanteringen tar bort frågeparametrar och fragment från sidadresser och utesluter konto- och elevsidor. Den nuvarande statistikkonfigurationen är begränsad till agilitymanager.se och www.agilitymanager.se.</p>
      </section>
      <section aria-labelledby="privacy-delete"><h2 id="privacy-delete" className="font-display text-3xl">Radering och frågor</h2>
        <p className="mt-3">Kontot för inloggning och den separata banprofilen är två olika profiler. På raderingssidan finns information om båda och om lokala uppgifter. Logga ut eller ”Glöm profilen här” tar inte bort sparade uppgifter från molnet.</p>
        <Link to="/radera-konto" className="mt-4 inline-flex min-h-12 items-center rounded-full border-2 border-ink bg-tang px-5 py-3 font-bold">Radera konto eller uppgifter</Link>
        <p className="mt-4">Vid frågor om uppgifter eller en begäran om radering, kontakta <a href="mailto:info@auroramedia.se" className="underline underline-offset-4">info@auroramedia.se</a>. Skicka inte lösenord eller privata profilnycklar.</p>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
