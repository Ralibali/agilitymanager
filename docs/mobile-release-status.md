# Mobilrelease – verifieringsstatus

Uppdaterad 1 oktober 2026. Produkten är **AgilityManager 1.0.0 (3)**: en fristående lokal banplanerare för agility och hoopers. Önskad utgivare är **Aurora Media AB**, support **info@auroramedia.se**, enligt användarens uppgifter. Önskat svenskt engångspris är **39 SEK vid nedladdning**; Google Play har sparat och verifierat 39,00 SEK inklusive moms i Sverige; Apples pris är ännu inte konfigurerat.

Version 3 innehåller lokal banredigering, medföljande banbibliotek, egna banor, lokal 3D-visning samt JSON-import/-export och PNG/PDF-export via Spara/Dela. Appkonton, banprofiler, moln, serverlagrad konsumentdata, community/kommentarer, analytics, reklam, native push och position är exkluderade. Konto-/UGC-/backendarbetet från tidigare mobilutkast blockerar därför inte denna produkt. Slutpaketets faktiska beteende och trafik måste ändå verifieras.

**Senast verifierade källkod är `de959275f865355f8079f9e0828e5c85cf8a39d1`.** Verifiering, Androidbygge och Android-startkontroll passerade. iOS-simulatorappen kompilerades och arkiverades som ZIP. Exakt tillgänglig iOS 26.4.1 och iPhone 17 valdes; simulatorns bootstatus rapporterade Finished med status 0, men kommandot återkom efter 193 sekunder och fick ETIMEDOUT från gränsen 180 sekunder. Appen installerades eller startades därför aldrig. Mobilkörningen är inte helt godkänd. Den nya teständringen höjer den begränsade uppstartsbudgeten till 300 sekunder, avstängningen till 30 sekunder och CI-steget till 8 minuter. Installation, faktisk appstart och samtliga startvillkor behålls. Resultatet för tidsgränsändringen väntar på en ny CI-körning.

**Inte färdig för butikspublicering:** godkänd aktuell iOS-startkontroll, verkliga enheter, signering, Apples säljarteam/betalt avtal/exaktpris och slutliga butiksformulär återstår.

## Verifierad referens och evidens

- Version/bygg: `1.0.0 (3)`, angivet i `mobile.version.json`.
- App-ID: `se.agilitymanager.app`, angivet vid skapandet av Google Play-apposten. Bindning till ett uppladdat paket och Apple-registrering återstår.
- Arbetsgren: `codex/agilitymanager-mobile`.
- Referenscommit: [de959275f865355f8079f9e0828e5c85cf8a39d1](https://github.com/Ralibali/agilitymanager/commit/de959275f865355f8079f9e0828e5c85cf8a39d1).
- Referensträd: `f6f9afec4efa286903a4f8ef3ec2042b9a097b95`.
- Mobilkörning: [Mobile preparation 36857263104](https://github.com/Ralibali/agilitymanager/actions/runs/36857263104).
- Webbens regressionskörning: [Planner CI 36857263237](https://github.com/Ralibali/agilitymanager/actions/runs/36857263237).
- Underlag: [mobile-release.md](mobile-release.md), [mobile.store.json](../mobile.store.json), [store-listings-sv.txt](store-listings-sv.txt), [mobile-privacy-sv.txt](mobile-privacy-sv.txt).
- Lokal loggevidens finns i arbetsytans `work/` bredvid repositoryt; dessa loggar följer inte automatiskt med en klon.

| Kontroll för referenscommit de959275 | Faktastatus | Evidens / praktisk gräns |
| --- | --- | --- |
| Mobilens verifieringsjobb | Passerade i CI | Mobilkörning 36857263104: TypeScript, lint, 318 enhetstester, native webbundle och 14 mobilflöden i webbläsare passerade. Skärmprofiler är inte fysiska telefoner. |
| Android release-/debugbygge | Passerade i CI | Samma mobilkörning: `bundleRelease` och `assembleDebug`. Artefakt `android-unsigned-release-and-debug` innehåller osignerad release-AAB och debug-APK. Ingen distributionssignering verifierad. |
| Android första start | Passerade i CI-emulator | Samma mobilkörning, jobbet `android-smoke`, startade debug-APK från samma körning. Artefakt `android-first-launch`. Startkontrollen ersätter inte fullständiga export-/offlineflöden eller fysiska enhetstester. |
| iOS-kompilering | Passerade i CI | Samma mobilkörning: Debug för generic iOS Simulator med `CODE_SIGNING_ALLOWED=NO`. Ingen signerad IPA eller distributionsbuild verifierad. |
| iOS-simulatorappens ZIP-arkiv | Skapades i CI | `AgilityManager-ios-simulator.zip` skapades med `ditto` för att bevara simulatorappens rättigheter och länkar. Detta är ett arkiv av simulatorappen, inte en signerad Xcode-distributionsarchive. |
| iOS första start | Misslyckades / ej verifierad | Samma mobilkörning: iOS 26.4.1/iPhone 17 blev bootklar men bootstatus-kommandot återkom först efter 193 sekunder och träffade 180-sekundersgränsen före installation. Ingen appstart verifierades. Den nya begränsade tidsgränsen 300 sekunder väntar på verifiering. |
| Webbens regressioner | Passerade i separat CI | Planner CI 36857263237: 21 tester passerade, 5 hoppades över. Hoppade tester är inte verifierade. |
| Lokal verifiering före CI | Passerade | 318 enhetstester, typkontroll, full lint och native webbundle rapporterades godkända lokalt. CI-resultaten ovan är den tydligare referensen. |
| Lokal mobilwebbläsare | Historisk lokal begränsning | `work/standalone-mobile-tests.log`: previewservern fick `listen EPERM 127.0.0.1:3001`, så den lokala körningen startade inte. Referensens 14 mobilflöden passerade senare i CI. |
| Fysisk iPhone/Android | Ej verifierat | Första start, banredigering/sparning, import/export, offline, layout och mottagarappar återstår. |
| Visuell granskning av native artefakter | Ej verifierad | Automatiska resultat och artefaktlänkar finns i körningen. Nedladdning och granskning av artefaktbytes utfördes inte här. |
| Ingen datainsamling/servertrafik | Slutverifiering återstår | Avgränsat paket och automatisk bundlekontroll finns. Verifiera verklig trafik och samtliga SDK på båda plattformarna före App Privacy/Data safety. |
| Privacy manifest / 16 KB / paketinspektion | Slutverifiering återstår | Kontrollera slutpaketets API-deklarationer, SDK och eventuella nativebibliotek. |

Artefakterna nås från [mobilkörningens sida](https://github.com/Ralibali/agilitymanager/actions/runs/36857263104). De har inte hämtats till leveransmappen eller granskats visuellt här. Historiska lokala APK/AAB motsvarar inte referensens bygg 3.

## Konton, signering och butik

| Område | Verifierat eller rapporterat | Återstår |
| --- | --- | --- |
| Utgivare/support | Användaren har angett Aurora Media AB och info@auroramedia.se | Rätt juridisk säljare/team behöver fastställas för Apple. Behörig utgivare godkänner slutmaterial. |
| Apple Developer/Play Console | Befintliga konton rapporterade av användaren; faktisk tillgång till App Store Connect och Play Console bekräftad | Kontospecifika roller, medlemskap, avtal och slutförd appregistrering verifieras. |
| Google Play Console | Faktisk inloggning, organisation `aurora media AB` och Create app-formulär observerade | Appposten AgilityManager skapades med se.agilitymanager.app, svenska och Betald efter användarens uttryckliga godkännande av de två juridiska intygandena. Dashboard och betalappstatus verifierades. Console-app-ID 4975139875139560691. 39,00 SEK inklusive moms sparades och verifierades efter omladdning 1 oktober 2026. Sverige är enda inriktade försäljningsland. Signering återstår; dashboard visar säljarkontots konfigurering som slutförd, vilket inte verifierar bank-/skatteuppgifter. |
| App Store Connect | Faktisk inloggning och nytt appformulär förberett | Apples Business visar ett personnamn som juridisk säljare och Paid Apps Agreement som New. Rätt team för Aurora Media AB behöver fastställas innan appregistrering; aktivt betalt avtal återstår. |
| Lokal iOS-signering | Kontrollen hittade 0 giltiga lokala code-signingidentiteter | Development Team, certifikat/provisionering, signerad distributionsarchive och validering/export återstår. Kontot kan ha resurser som inte finns lokalt. |
| Android release-signering | Ej verifierad | Upload key, signerad AAB och Play App Signing återstår; debugnyckel är inte release-signering. |
| Betald nedladdning | Önskat 39 SEK/SE finns i prisutkastet | Google Play är Betald och 39,00 SEK i Sverige är sparat och verifierat. Apple exakt prispunkt/Paid Apps Agreement och Google payments profile/banking-tax återstår. |
| Offentlig integritet-/supportsida | Apptext, `public/mobil-integritet.html` och `public/mobil-support.html` finns lokalt | Båda sidorna öppnades offentligt utan inloggning 1 oktober 2026: https://agilitymanager.se/mobil-integritet.html och https://agilitymanager.se/mobil-support.html. Webbpublicering via PR 45/main 5b14ddd9; detta publicerar ingen mobilapp. |
| App Privacy / Data safety | Preliminärt underlag för lokal app finns | Ingen inskickad/verifierad deklaration. Slutpaket/SDK, användarvald delning och eventuell supportmejlshantering behöver stämma med text/formulär. |
| Butiksmaterial | Svenska textutkast finns | Riktiga skärmbilder, åldersklassning/målgrupp, kategori, rättigheter, support-URL och övriga formulär återstår. |
| TestFlight / Play-testspår | Ej verifierat | Ladda upp signerade aktuella paket och kontrollera konto-/testarkrav. |
| Submission / granskning / publicering | Ej verifierat | Ingen verifierad inskickning eller butikspublicering. |

Vald lokal produkt behöver inget konto-/banprofilraderingsflöde eller communitymoderering eftersom dessa funktioner är exkluderade. Webbplatsens motsvarande arbete är separat och markeras inte som genomfört.

## Kort historik – andra byggnummer

| Version / källkod | Verifierat | Begränsning |
| --- | --- | --- |
| 1.0.0 (2), `98ee34d8b08484d3859b84886f1fd2be40e63eac` | Remote CI passerade 335 enhetstester, 6 mobilflöden, iOS-kompilering och Androidpaket | Utkastet behöll konto/delade banor. CI-webbläsare och osignerade/testpaket; ingen fysisk enhet eller signerad butiksversion. Resultaten gäller inte bygg 3. |
| 1.0.0 (1), `0c3af90ce9309141e102b116e32de827394ec13b` | Tidigare lokala nativebyggen och automatiska tester; remote 333 enhetstester och 21 webbflöden | Brett tidigare apputkast. Lokalt simulatorförsök gav inget verifierat UI-flöde. Historiska APK/AAB motsvarar inte version 3. |

Historiska lokala verktyg: Node.js 24.19.0, npm 10.9.4, Xcode 26.6/SDK 26.5, JDK 21, Gradle 8.14.3, AGP 8.13.0, Capacitor 8.5.2, iOS minimum 15 och Android minimum 24/target 36. CI använder separata runners; dessa lokala versionsuppgifter är inte ett påstående om referenskörningens exakta runnerverktyg.

## Efter ändring av simulatorns tidsgränser

| Fält | Status |
| --- | --- |
| Ny commit och dess CI-körningar | Väntar; inget framtida slut-SHA är angivet här |
| Aktuell verifiering, iOS/Android-byggen och smoke | Ny körning krävs för kommande commit; iOS-start behöver ett godkänt resultat |
| Aktuella paket, version/bygg och signering | Referensens osignerade/testpaket är bygg 3; signerade aktuella releasepaket återstår |
| Fysisk enhet/OS och resultat för lokala banor/import/export | Ej verifierat |
| Slutpaketets nätverk/SDK/manifest | Ej verifierat |
| Offentliga integritets-/support-URL:er och verifieringsdatum | Verifierade utan inloggning 1 oktober 2026; se mobile.store.json |
| Registrerade app-ID, aktiva avtal och svenskt pris per butik | Google Play-app skapad och 39,00 SEK verifierat; Apple och signering återstår |
| Slutliga datadeklarationer, material och submission | Ej verifierat |
| Ansvarig utgivares releasegodkännande | Ej inhämtat |

Releasebeslut: **kan ännu inte publiceras**. Referensresultaten gäller endast angiven commit och ersätter inte verifieringen av kommande ändringar.

Kontrollbegränsning: hämtningen av testbilder avböjdes av webbläsarens säkerhetskontroll. En separat omkörning av det gamla testjobbet kunde inte startas eftersom verktyget kräver godkännande och godkännanden är avstängda. De nya ändringarna väljer installerad runtime/modell och anpassar begränsade tidsgränser till den observerade uppstartstiden och valideras genom grenens vanliga CI; den är ingen omkörning av det gamla jobbet.
