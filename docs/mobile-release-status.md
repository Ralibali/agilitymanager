# Mobilrelease – verifieringsstatus

Uppdaterad 1 oktober 2026. **AgilityManager 1.0.0 (3)** är en fristående lokal banplanerare för agility och hoopers. Support/varumärke är Aurora Media AB, info@auroramedia.se. Användaren har valt det befintliga personliga Apple-teamet; Google använder befintliga organisationen aurora media AB. **39,00 SEK är sparat och verifierat i båda butikerna, med Sverige som enda försäljningsland. Appar är inte publicerade.** Valet av personligt Apple-konto innebär inget beslut om skatteklassificering.

Version 3 innehåller banredigering, medföljande banbibliotek, egna lokalt sparade banor, lokal 3D-visning, JSON-import/-export och PNG/PDF-export via Spara/Dela. Appkonton, molnsynk, community, serverlagrad konsumentdata, analytics, reklam, push och position är exkluderade. Slutpaketets beteende och SDK måste verifieras före slutliga integritetsdeklarationer.

**Senast verifierade källkod är `9b9932f2707d7f2b54479dbd6f00e4df84b02ac7`.** Verifieringsjobb, Androidbygge, Android första start och webbregression passerade. iOS-simulatorappen kompilerades och ett osignerat device Release-arkiv byggdes. Exakt iOS 26.2/iPhone 17 bootade korrekt: bootstatus återkom efter 94 sekunder med status 0. Installation träffade därefter 30-sekundersgränsen (ETIMEDOUT efter 35,95 sekunder); ingen appstart nåddes. Resultatet är därför inte helt godkänt.

Den nya budgetändringen höjer endast installationen från 30 till **90 sekunder** och hela smoke-steget från 8 till **10 minuter**. Bootgränsen 300 sekunder, launchgränsen 20 sekunder, överlevnadskontrollen 12 sekunder, isolering och kraschkrav behålls; inga omförsök eller godkännanden på timeout införs. Installationsprocessernas loggar läses inom samma privata simulator med egen 20-sekundersgräns vid installationsfel. En senare misslyckad felbild ersätter inte den första felande kommandoposten. Den kommande commitens nya budget är ännu inte verifierad.

CI använder macOS 15-arm64, installerad Xcode 26.3 och exakt iOS 26.2/iPhone 17. Det separata **osignerade Release-arkivet för fysiska iOS-enheter** är inte en signerad eller validerad IPA. Appprojektet anger personligt team 9G8SUZKS7Y. iOS-ikonen är ogenomskinlig RGB och en separat 512-pixels Play-ikon finns.

**Publicering återstår:** godkänd aktuell iOS-startkontroll, verkliga enhetstester, signerade butikspaket, betalavtal/bank/skatt och slutliga butiksformulär/material.

## Referens och evidens

- Version/bygg: `1.0.0 (3)`, `mobile.version.json`.
- App-ID: `se.agilitymanager.app`. Apple bundle är registrerat; Googlepaketets bindning till uppladdad signerad AAB återstår.
- Arbetsgren: `codex/agilitymanager-mobile`, [utkast PR 43](https://github.com/Ralibali/agilitymanager/pull/43).
- Referenscommit: [9b9932f2707d7f2b54479dbd6f00e4df84b02ac7](https://github.com/Ralibali/agilitymanager/commit/9b9932f2707d7f2b54479dbd6f00e4df84b02ac7).
- Referensträd: `33e6c2e108c22d8d515b647a0c4dcc99e02be2aa`.
- [Mobile preparation 36865656284](https://github.com/Ralibali/agilitymanager/actions/runs/36865656284), [Planner CI 36865656079](https://github.com/Ralibali/agilitymanager/actions/runs/36865656079).
- Underlag: [mobile-release.md](mobile-release.md), [mobile.store.json](../mobile.store.json), [store-listings-sv.txt](store-listings-sv.txt), [mobile-privacy-sv.txt](mobile-privacy-sv.txt).

| Kontroll för referenscommit 9b9932f | Resultat | Praktisk gräns |
| --- | --- | --- |
| Mobilverifiering | Passerade | Typkontroll, lint, 318 enhetstester, native webbundle och 14 mobilflöden i webbläsare. Skärmprofiler är inte fysiska telefoner. |
| Android release/debug | Passerade | Osignerad release-AAB och debug-APK; distributionssignering ej verifierad. |
| Android första start | Passerade i API 36-emulator | Emulator bootade på 52,2 sekunder; app-processen överlevde startkontrollen. Ingen visuell granskning eller fysisk enhetskontroll. |
| iOS Debug-kompilering | Passerade | Generic iOS Simulator med CODE_SIGNING_ALLOWED=NO. Simulatorapp ZIP skapad. |
| iOS simulatorboot | Passerade | Exakt iOS 26.2/iPhone 17 på macOS 15-arm64/Xcode 26.3. Bootstatus återkom med status 0 efter 94,003 sekunder. |
| iOS installation/första start | Misslyckades före appstart | simctl install hade ingen stdout/stderr och träffade 30 sekunder, dödades efter 35,950 sekunder med SIGKILL/ETIMEDOUT. Inget explicit paket-, signatur- eller arkitekturfel i jobbloggen. Ingen launch nåddes; ingen appkrasch verifierades. Felbilden träffade också sin 20-sekundersgräns. Appfiltrerade loggar var tomma utom uid-varning. Privata simulatorn stängdes och raderades. |
| iOS device Release-arkiv | Passerade | xcodebuild archive för generic iOS/iphoneos/Release, båda signing-flaggor avstängda; ARCHIVE SUCCEEDED och ditto-ZIP skapad. Osignerat .xcarchive, ingen signerad IPA eller uppladdningsvalidering. |
| Webbregression | Passerade | 318 enhetstester och 21 webbläsartester, 5 förväntade överhoppningar. Överhoppade tester är inte verifierade. |
| Visuell nativegranskning | Ej verifierad | Artefaktbytes/testbilder har inte hämtats eller granskats här. |
| Fysisk iPhone/Android | Ej verifierat | Redigering/sparning, offline, import/export, delningsmottagare och layout återstår. |
| Slutpaket/SDK/manifest/16 KB | Ej verifierat | Kontrollera faktiska signerade paket, nätverk, behörigheter och API-/privacy-deklarationer. |

Referensartefakter (metadata/länkar, inga lokala aktuella binärpaket):

- [Android AAB/debug APK](https://github.com/Ralibali/agilitymanager/actions/runs/36865656284/artifacts/11164051344).
- [Android-startkontroll](https://github.com/Ralibali/agilitymanager/actions/runs/36865656284/artifacts/11164356785).
- [iOS simulatorapp och installationsloggar](https://github.com/Ralibali/agilitymanager/actions/runs/36865656284/artifacts/11163901746); ingen godkänd startbild eftersom installationen misslyckades och felbilden fick timeout.
- [iOS osignerat device Release-arkiv](https://github.com/Ralibali/agilitymanager/actions/runs/36865656284/artifacts/11163811841).
- [Mobilwebbläsartester](https://github.com/Ralibali/agilitymanager/actions/runs/36865656284/artifacts/11164015877).
- [Webbregression](https://github.com/Ralibali/agilitymanager/actions/runs/36865656079/artifacts/11163462050).

Historiska lokala APK/AAB är bygg 1 och motsvarar inte aktuell version. Den lokala förhandsservern blockerades av `listen EPERM 127.0.0.1:3001`; lokala sockets/CoreSimulator/signering är inte alternativ verifiering.

## Registrering och butik

| Område | Verifierat | Återstår |
| --- | --- | --- |
| Apple säljare | Personligt team 9G8SUZKS7Y, valt av användaren. Apples juridiska säljarnamn är separat från Aurora-varumärket. | Legal-entity-adressuppdatering före Paid Apps Agreement, EU-handlarstatus och korrekta avtals-/skatteuppgifter behöver användarens egna beslut. |
| Apple registrering | Bundle se.agilitymanager.app och App Store-app 6818139174. Svenska, iOS, version 1.0.0 i Prepare for Submission. | Signerat paket och fullständig granskning. |
| Apple pris/land | 39,00 kr för Sweden (SEK) lästes i Current Price efter sparning/omladdning. Availability visar Sverige som enda land. Mac, Vision Pro och volymrabatt avstängda. | Aktivt Paid Apps Agreement; bank/skatt. |
| Apple metadata | Beskrivning, sökord, undertitel ”Banplanerare för agility”, support-/integritets-URL, Sports-kategori, inget inloggningskrav och manuell release sparade. Åldersklassning sparad som 4+ med regionala undantag; Made for Kids är avstängt. | Bilder, slutlig App Privacy, review-kontakt och rättighetsuppgifter. Sparad åldersklassning ersätter inte slutpaketets verifiering. |
| Apple signering | Konto visar Development- och Managed Distribution-certifikat; 0 giltiga lokala signeringsidentiteter. | Privata nycklar/provisionering, signerad archive, validering/export och uppladdning. Ett konto-certifikat bevisar inte lokalt signerbar build. |
| Google registrering | AgilityManager, Paid från början, svenska sv-SE, Console-app 4975139875139560691. Skapad efter uttryckligt policy-/exportgodkännande. | Bindning till uppladdat signerat Androidpaket. |
| Google pris/land | 39,00 SEK inklusive moms sparat/verifierat efter omladdning. Endast Sverige ingår i produktion. Övriga prisfält autokonverterades från 31,20 SEK före moms eftersom formuläret krävde alla fält. | Payments profile/bank/skatt ej slutverifierade. Säljarkontots setup visas som slutförd. |
| Google grunduppgifter | Integritets-URL, full åtkomst utan inloggning, supportmejl/-URL, Sports-kategori och annonsdeklaration sparade. Butikstext, ikon och presentationsbild (1024×500) sparade som utkast med bekräftad save-toast. | Slutlig Data safety, åldersklassning/målgrupp, övriga bilder och formulär. Utkast är inte publicering. |
| Android signering | Osignerad AAB och debug-APK byggda i referens-CI. | Upload key, signerad AAB, Play App Signing och testspår. |
| Offentliga sidor | https://agilitymanager.se/mobil-integritet.html och https://agilitymanager.se/mobil-support.html lästes utan inloggning 1 oktober 2026; PR 45/main 5b14ddd9 publicerade sidorna. | Sidorna publicerar ingen mobilapp. |
| Submission/publicering | Ingen inskickning eller publicering verifierad. | Alla releasevillkor ovan behöver uppfyllas. |

## Varför en annan iOS-miljö provas

[GitHubs macOS 15-image](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md) innehåller Xcode 26.3 och iOS 26.2. [Apple](https://developer.apple.com/xcode/system-requirements) anger macOS 15.6 eller senare för Xcode 26.3; [Capacitor 8](https://capacitorjs.com/docs/updating/8-0) kräver Xcode 26. [Runner-maintainers](https://github.com/actions/runner-images/issues/13096#issuecomment-3605952870) har bekräftat CoreSimulator-problem i virtuella runners. Detta motiverar en begränsad jämförelse; det bevisar inte att nästa startkontroll passerar. Inga skydd avaktiveras eller inofficiella daemon-/systemändringar används.

Tidigare de959275 träffade dåvarande bootgräns 180 sekunder; 40c1928 nådde inte bootklart inom 300 sekunder. Miljöjämförelsen 9b9932f på iOS 26.2 löste bootstoppet men träffade installationens 30-sekundersgräns. Den enda nya ökningen gäller denna observerade installationspunkt; bootbudgeten höjs inte. Orsaken till den långsamma installationen är ännu inte fastställd.

Releasebeslut: **kan ännu inte publiceras**. Den kommande kodändringen kräver egna CI-resultat och signerade paket.

Kontrollbegränsningar: hämtning av native-testbilder avböjdes av användaren. En separat omkörning av det gamla jobbet kräver godkännande som verktyget inte tillåter. Ny substantiell kod valideras genom grenens vanliga CI; den kringgår inte dessa avslag.
