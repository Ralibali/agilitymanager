# Mobilrelease – verifieringsstatus

Uppdaterad 1 oktober 2026. **AgilityManager 1.0.0 (3)** är en fristående lokal banplanerare för agility och hoopers. Support/varumärke är Aurora Media AB, info@auroramedia.se. Användaren har valt det befintliga personliga Apple-teamet; Google använder befintliga organisationen aurora media AB. **39,00 SEK är sparat och verifierat i båda butikerna, med Sverige som enda försäljningsland. Appar är inte publicerade.** Valet av personligt Apple-konto innebär inget beslut om skatteklassificering.

Version 3 innehåller banredigering, medföljande banbibliotek, egna lokalt sparade banor, lokal 3D-visning, JSON-import/-export och PNG/PDF-export via Spara/Dela. Appkonton, molnsynk, community, serverlagrad konsumentdata, analytics, reklam, push och position är exkluderade. Slutpaketets beteende och SDK måste verifieras före slutliga integritetsdeklarationer.

**Senast verifierade källkod är `40c1928cb50ed6596c5d18e7f54bab5a4fb73035`.** Verifieringsjobb, Androidbygge, Android första start och webbregression passerade. iOS-simulatorappen kompilerades; simulatorn nådde inte bootklart läge inom 300 sekunder. Ingen iOS-app installerades eller startades i den körningen. Resultatet är därför inte helt godkänt.

Den nya ändringen gör en begränsad miljöjämförelse med macOS 15, installerad Xcode 26.3 och exakt iOS 26.2/iPhone 17. Samma 300-sekundersgräns, isolering, installation, appstart och kraschkontroller behålls. Ett separat **osignerat Release-arkiv för fysiska iOS-enheter** byggs efter en lyckad simulator-kompilering även om startkontrollen misslyckas; ett sådant arkiv är inte en signerad eller validerad IPA. Appprojektet anger det registrerade personliga teamet 9G8SUZKS7Y. iOS-ikonen är ogenomskinlig RGB och en separat 512-pixels Play-ikon finns. Den kommande commitens CI är ännu inte verifierad här.

**Publicering återstår:** godkänd aktuell iOS-startkontroll, verkliga enhetstester, signerade butikspaket, betalavtal/bank/skatt och slutliga butiksformulär/material.

## Referens och evidens

- Version/bygg: `1.0.0 (3)`, `mobile.version.json`.
- App-ID: `se.agilitymanager.app`. Apple bundle är registrerat; Googlepaketets bindning till uppladdad signerad AAB återstår.
- Arbetsgren: `codex/agilitymanager-mobile`, [utkast PR 43](https://github.com/Ralibali/agilitymanager/pull/43).
- Referenscommit: [40c1928cb50ed6596c5d18e7f54bab5a4fb73035](https://github.com/Ralibali/agilitymanager/commit/40c1928cb50ed6596c5d18e7f54bab5a4fb73035).
- Referensträd: `df148fd60a05144156587b3109f3b87171172557`.
- [Mobile preparation 36859565258](https://github.com/Ralibali/agilitymanager/actions/runs/36859565258), [Planner CI 36859565249](https://github.com/Ralibali/agilitymanager/actions/runs/36859565249).
- Underlag: [mobile-release.md](mobile-release.md), [mobile.store.json](../mobile.store.json), [store-listings-sv.txt](store-listings-sv.txt), [mobile-privacy-sv.txt](mobile-privacy-sv.txt).

| Kontroll för referenscommit 40c1928 | Resultat | Praktisk gräns |
| --- | --- | --- |
| Mobilverifiering | Passerade | Typkontroll, lint, 318 enhetstester, native webbundle och 14 mobilflöden i webbläsare. Skärmprofiler är inte fysiska telefoner. |
| Android release/debug | Passerade | Osignerad release-AAB och debug-APK; distributionssignering ej verifierad. |
| Android första start | Passerade i API 36-emulator | Emulator bootade på 51,6 sekunder; app-processen överlevde startkontrollen. Ingen visuell granskning eller fysisk enhetskontroll. |
| iOS Debug-kompilering | Passerade | Generic iOS Simulator med CODE_SIGNING_ALLOWED=NO. Simulatorapp ZIP skapad. |
| iOS första start | Misslyckades före installation | Exakt iOS 26.4.1/iPhone 17; bootstatus fastnade i datamigrering/CoreLocationMigrator och träffade 300 sekunder (ETIMEDOUT). Det är inte bevis för en appkrasch. Privata simulatorn stängdes och raderades. |
| Webbregression | Passerade | 318 enhetstester och 21 webbläsartester, 5 förväntade överhoppningar. Överhoppade tester är inte verifierade. |
| Visuell nativegranskning | Ej verifierad | Artefaktbytes/testbilder har inte hämtats eller granskats här. |
| Fysisk iPhone/Android | Ej verifierat | Redigering/sparning, offline, import/export, delningsmottagare och layout återstår. |
| Slutpaket/SDK/manifest/16 KB | Ej verifierat | Kontrollera faktiska signerade paket, nätverk, behörigheter och API-/privacy-deklarationer. |

Referensartefakter (metadata/länkar, inga lokala aktuella binärpaket):

- [Android AAB/debug APK](https://github.com/Ralibali/agilitymanager/actions/runs/36859565258/artifacts/11160942608).
- [Android-startkontroll](https://github.com/Ralibali/agilitymanager/actions/runs/36859565258/artifacts/11160773063).
- [iOS simulatorapp och bootloggar](https://github.com/Ralibali/agilitymanager/actions/runs/36859565258/artifacts/11161622512); ingen iOS-startbild eftersom installation aldrig nåddes.
- [Mobilwebbläsartester](https://github.com/Ralibali/agilitymanager/actions/runs/36859565258/artifacts/11161566070).
- [Webbregression](https://github.com/Ralibali/agilitymanager/actions/runs/36859565249/artifacts/11161821103).

Historiska lokala APK/AAB är bygg 1 och motsvarar inte aktuell version. Den lokala förhandsservern blockerades av `listen EPERM 127.0.0.1:3001`; lokala sockets/CoreSimulator/signering är inte alternativ verifiering.

## Registrering och butik

| Område | Verifierat | Återstår |
| --- | --- | --- |
| Apple säljare | Personligt team 9G8SUZKS7Y, valt av användaren. Apples juridiska säljarnamn är separat från Aurora-varumärket. | EU-handlarstatus och korrekta avtals-/skatteuppgifter behöver användarens egna beslut. |
| Apple registrering | Bundle se.agilitymanager.app och App Store-app 6818139174. Svenska, iOS, version 1.0.0 i Prepare for Submission. | Signerat paket och fullständig granskning. |
| Apple pris/land | 39,00 kr för Sweden (SEK) lästes i Current Price efter sparning/omladdning. Availability visar Sverige som enda land. Mac, Vision Pro och volymrabatt avstängda. | Aktivt Paid Apps Agreement; bank/skatt. |
| Apple text | Beskrivning, sökord, support-URL, inget inloggningskrav och manuell release sparade. | Bilder, kategori/ålder, slutlig App Privacy, review-kontakt och rättighetsuppgifter. |
| Apple signering | Konto visar Development- och Managed Distribution-certifikat; 0 giltiga lokala signeringsidentiteter. | Privata nycklar/provisionering, signerad archive, validering/export och uppladdning. Ett konto-certifikat bevisar inte lokalt signerbar build. |
| Google registrering | AgilityManager, Paid från början, svenska sv-SE, Console-app 4975139875139560691. Skapad efter uttryckligt policy-/exportgodkännande. | Bindning till uppladdat signerat Androidpaket. |
| Google pris/land | 39,00 SEK inklusive moms sparat/verifierat efter omladdning. Endast Sverige ingår i produktion. Övriga prisfält autokonverterades från 31,20 SEK före moms eftersom formuläret krävde alla fält. | Payments profile/bank/skatt ej slutverifierade. Säljarkontots setup visas som slutförd. |
| Google grunduppgifter | Integritets-URL, full åtkomst utan inloggning samt info@auroramedia.se och support-URL sparade. | Slutlig Data safety, åldersklassning/målgrupp, bilder och övriga formulär. |
| Android signering | Osignerad AAB och debug-APK byggda i referens-CI. | Upload key, signerad AAB, Play App Signing och testspår. |
| Offentliga sidor | https://agilitymanager.se/mobil-integritet.html och https://agilitymanager.se/mobil-support.html lästes utan inloggning 1 oktober 2026; PR 45/main 5b14ddd9 publicerade sidorna. | Sidorna publicerar ingen mobilapp. |
| Submission/publicering | Ingen inskickning eller publicering verifierad. | Alla releasevillkor ovan behöver uppfyllas. |

## Varför en annan iOS-miljö provas

[GitHubs macOS 15-image](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md) innehåller Xcode 26.3 och iOS 26.2. [Apple](https://developer.apple.com/xcode/system-requirements) anger macOS 15.6 eller senare för Xcode 26.3; [Capacitor 8](https://capacitorjs.com/docs/updating/8-0) kräver Xcode 26. [Runner-maintainers](https://github.com/actions/runner-images/issues/13096#issuecomment-3605952870) har bekräftat CoreSimulator-problem i virtuella runners. Detta motiverar en begränsad jämförelse; det bevisar inte att nästa startkontroll passerar. Inga skydd avaktiveras eller inofficiella daemon-/systemändringar används.

Tidigare de959275 kompilerade samma simulatorapp men bootstatus återkom efter 193 sekunder och träffade dåvarande 180-sekundersgräns. Den senare 40c1928-körningen nådde inte bootklar status inom 300 sekunder. Fler tidsökningar saknar stöd i resultatet.

Releasebeslut: **kan ännu inte publiceras**. Den kommande kodändringen kräver egna CI-resultat och signerade paket.

Kontrollbegränsningar: hämtning av native-testbilder avböjdes av användaren. En separat omkörning av det gamla jobbet kräver godkännande som verktyget inte tillåter. Ny substantiell kod valideras genom grenens vanliga CI; den kringgår inte dessa avslag.
