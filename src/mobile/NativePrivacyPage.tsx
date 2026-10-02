import { Link } from "react-router";

export default function NativePrivacyPage() {
  return <main className="mx-auto max-w-3xl space-y-7 px-4 py-8 leading-relaxed">
    <div><p className="mobile-kicker">Aurora Media AB</p><h1 className="font-display text-4xl">Integritet i mobilappen</h1><p className="mt-2 text-sm text-ink/60">Uppdaterad 1 oktober 2026. Gäller AgilityManagers fristående banplanerare.</p></div>
    <section><h2 className="text-2xl font-bold">Dina banor stannar på enheten</h2>
      <p className="mt-3">Appen har inget användarkonto och skickar inte banor eller användningsstatistik till Aurora Media AB. Banutkast, sparade banor och inställningar lagras lokalt. Banbiblioteket följer med appen och fungerar utan internet.</p>
      <p className="mt-3">Import sker när du själv väljer en banfil. Exporter skapas på enheten. En tillfällig kopia lagras i appens cache för att filen ska kunna sparas eller delas med telefonens verktyg. Du väljer själv mottagare och app när du delar.</p>
    </section>
    <section><h2 className="text-2xl font-bold">Säkerhetskopior och radering</h2>
      <p className="mt-3">Exportera en JSON-kopia för att behålla en bana eller flytta den till en annan enhet. Du kan radera en sparad bana under Mina banor. En kopia i planeraren kan ersättas genom att skapa en ny bana. Appens lokala uppgifter kan även rensas genom telefonens inställningar eller när appen tas bort.</p>
      <p className="mt-3">Exporterade filer och eventuella säkerhetskopior som telefonens system eller en mottagarapp har skapat hanteras separat. Aurora Media AB har ingen kopia av dina banor att återställa.</p>
      <Link to="/mina-banor" className="mobile-primary-action mt-4">Öppna Mina banor</Link>
    </section>
    <section><h2 className="text-2xl font-bold">Köpet i appbutiken</h2><p className="mt-3">Apple App Store eller Google Play hanterar köpet och butikskontot. Banplaneraren har ingen egen kassa och tar inte emot dina kortuppgifter. Butikens egen integritetspolicy gäller för köpet.</p></section>
    <section><h2 className="text-2xl font-bold">Support och kontakt</h2><p className="mt-3">Aurora Media AB sköter supporten. Om du kontaktar oss via e-post använder vi de uppgifter du lämnar för att besvara din fråga. Skicka bara uppgifter som behövs för ärendet. Supportmejl går via din e-posttjänst och vår e-posthantering.</p><p className="mt-3">Kontakt: <a href="mailto:info@auroramedia.se" className="font-bold underline">info@auroramedia.se</a>.</p></section>
  </main>;
}
