# Mobilrelease – verifieringsstatus

Uppdaterad 1 oktober 2026. Produkten är **AgilityManager 1.0.0 (3)**: en fristående lokal banplanerare för agility och hoopers. Önskad utgivare är **Aurora Media AB**, support **info@auroramedia.se**, enligt användarens uppgifter. Önskat svenskt engångspris är **39 SEK vid nedladdning**; inget butikspris är ännu verifierat.

Version 3 innehåller lokal banredigering, medföljande banbibliotek, egna banor, lokal 3D-visning samt JSON-import/-export och PNG/PDF-export via Spara/Dela. Appkonton, banprofiler, moln, serverlagrad konsumentdata, community/kommentarer, analytics, reklam, native push och position är exkluderade. Konto-/UGC-/backendarbetet från tidigare mobilutkast blockerar därför inte denna produkt. Slutpaketets faktiska beteende och trafik måste ändå verifieras.

**Senast verifierade källkod är `035f123e8456473b08c6b0b3fab7e7315728f553`.** Verifiering, Androidbygge och Android-startkontroll passerade. iOS-simulatorappen kompilerades och arkiverades som ZIP, men iOS-startkontrollen avbröts med `ETIMEDOUT`. Mobilkörningen är därför inte helt godkänd. Kommande ändringar av iOS-diagnostiken och supportsidan behöver en ny CI-körning för sin egen commit; referensresultaten nedan verifierar inte dessa ändringar.

**Inte färdig för butikspublicering:** godkänd aktuell iOS-startkontroll, verkliga enheter, signering, offentlig integritets-/supportsida, betalda avtal/exaktpris och butiksformulär återstår.

## Verifierad referens och evidens

- Version/bygg: `1.0.0 (3)`, angivet i `mobile.version.json`.
- App-ID: `se.agilitymanager.app`, preliminärt. Slutförd registrering/ägarskap i butikskontona är inte verifierat.
- Arbetsgren: `codex/agilitymanager-mobile`.
- Referenscommit: [035f123e8456473b08c6b0b3fab7e7315728f553](https://github.com/Ralibali/agilitymanager/commit/035f123e8456473b08c6b0b3fab7e7315728f553).
- Referensträd: `96c095f2851d6503219144811e94d9c420f2f896`.
- Mobilkörning: [Mobile preparation 36852435811](https://github.com/Ralibali/agilitymanager/actions/runs/36852435811).
- Webbens regressionskörning: [Planner CI 36852435761](https://github.com/Ralibali/agilitymanager/actions/runs/36852435761).
- Underlag: [mobile-release.md](mobile-release.md), [mobile.store.json](../mobile.store.json), [store-listings-sv.txt](store-listings-sv.txt), [mobile-privacy-sv.txt](mobile-privacy-sv.txt).
- Lokal loggevidens finns i arbetsytans `work/` bredvid repositoryt; dessa loggar följer inte automatiskt med en klon.

| Kontroll för referenscommit 035f123e | Faktastatus | Evidens / praktisk gräns |
| --- | --- | --- |
| Mobilens verifieringsjobb | Passerade i CI | Mobilkörning 36852435811: TypeScript, lint, 318 enhetstester, native webbundle och 14 mobilflöden i webbläsare passerade. Skärmprofiler är inte fysiska telefoner. |
| Android release-/debugbygge | Passerade i CI | Samma mobilkörning: `bundleRelease` och `assembleDebug`. Artefakt `android-unsigned-release-and-debug` innehåller osignerad release-AAB och debug-APK. Ingen distributionssignering verifierad. |
| Android första start | Passerade i CI-emulator | Samma mobilkörning, jobbet `android-smoke`, startade debug-APK från samma körning. Artefakt `android-first-launch`. Startkontrollen ersätter inte fullständiga export-/offlineflöden eller fysiska enhetstester. |
| iOS-kompilering | Passerade i CI | Samma mobilkörning: Debug för generic iOS Simulator med `CODE_SIGNING_ALLOWED=NO`. Ingen signerad IPA eller distributionsbuild verifierad. |
| iOS-simulatorappens ZIP-arkiv | Skapades i CI | `AgilityManager-ios-simulator.zip` skapades med `ditto` för att bevara simulatorappens rättigheter och länkar. Detta är ett arkiv av simulatorappen, inte en signerad Xcode-distributionsarchive. |
| iOS första start | Misslyckades / ej verifierad | Samma mobilkörning: startsmoke avbröts med `ETIMEDOUT`. Kompilering och ZIP-arkiv bevisar inte fungerande första start. Diagnostik och ny aktuell körning återstår. |
| Webbens regressioner | Passerade i separat CI | Planner CI 36852435761: 21 tester passerade, 5 hoppades över. Hoppade tester är inte verifierade. |
| Lokal verifiering före CI | Passerade | 318 enhetstester, typkontroll, full lint och native webbundle rapporterades godkända lokalt. CI-resultaten ovan är den tydligare referensen. |
| Lokal mobilwebbläsare | Historisk lokal begränsning | `work/standalone-mobile-tests.log`: previewservern fick `listen EPERM 127.0.0.1:3001`, så den lokala körningen startade inte. Referensens 14 mobilflöden passerade senare i CI. |
| Fysisk iPhone/Android | Ej verifierat | Första start, banredigering/sparning, import/export, offline, layout och mottagarappar återstår. |
| Visuell granskning av native artefakter | Ej verifierad | Automatiska resultat och artefaktlänkar finns i körningen. Nedladdning och granskning av artefaktbytes utfördes inte här. |
| Ingen datainsamling/servertrafik | Slutverifiering återstår | Avgränsat paket och automatisk bundlekontroll finns. Verifiera verklig trafik och samtliga SDK på båda plattformarna före App Privacy/Data safety. |
| Privacy manifest / 16 KB / paketinspektion | Slutverifiering återstår | Kontrollera slutpaketets API-deklarationer, SDK och eventuella nativebibliotek. |

Artefakterna nås från [mobilkörningens sida](https://github.com/Ralibali/agilitymanager/actions/runs/36852435811). De har inte hämtats till leveransmappen eller granskats visuellt här. Historiska lokala APK/AAB motsvarar inte referensens bygg 3.

## Konton, signering och butik

| Område | Verifierat eller rapporterat | Återstår |
| --- | --- | --- |
| Utgivare/support | Användaren har angett Aurora Media AB och info@auroramedia.se | Rätt juridisk säljare/team behöver fastställas för Apple. Behörig utgivare godkänner slutmaterial. |
| Apple Developer/Play Console | Befintliga konton rapporterade av användaren; faktisk tillgång till App Store Connect och Play Console bekräftad | Kontospecifika roller, medlemskap, avtal och slutförd appregistrering verifieras. |
| Google Play Console | Faktisk inloggning, organisation `aurora media AB` och Create app-formulär observerade | Paketnamnet se.agilitymanager.app är observerat som tillgängligt och Paid är valt i formuläret. De två juridiska intygandena inväntar användarens bekräftelse; appregistrering, betalprofil, pris och signering återstår. |
| App Store Connect | Faktisk inloggning och nytt appformulär förberett | Apples Business visar ett personnamn som juridisk säljare och Paid Apps Agreement som New. Rätt team för Aurora Media AB behöver fastställas innan appregistrering; aktivt betalt avtal återstår. |
| Lokal iOS-signering | Kontrollen hittade 0 giltiga lokala code-signingidentiteter | Development Team, certifikat/provisionering, signerad distributionsarchive och validering/export återstår. Kontot kan ha resurser som inte finns lokalt. |
| Android release-signering | Ej verifierad | Upload key, signerad AAB och Play App Signing återstår; debugnyckel är inte release-signering. |
| Betald nedladdning | Önskat 39 SEK/SE finns i prisutkastet | Apple exakt prispunkt/Paid Apps Agreement och Google Paid/payments profile/banking-tax verifieras; sparat svenskt kundpris dokumenteras. |
| Offentlig integritet-/supportsida | Apptext, `public/mobil-integritet.html` och `public/mobil-support.html` finns lokalt | Ingen verifierad webbpublicering. Supportsidan är en senare ändring än referenscommit ovan. Verifiera offentlig URL, innehåll och åtkomst utan app/inloggning innan URL anges i app/butik. |
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

## Efter kommande diagnostik-/supportändring

| Fält | Status |
| --- | --- |
| Ny commit och dess CI-körningar | Väntar; inget framtida slut-SHA är angivet här |
| Aktuell verifiering, iOS/Android-byggen och smoke | Ny körning krävs för kommande commit; iOS-start behöver ett godkänt resultat |
| Aktuella paket, version/bygg och signering | Referensens osignerade/testpaket är bygg 3; signerade aktuella releasepaket återstår |
| Fysisk enhet/OS och resultat för lokala banor/import/export | Ej verifierat |
| Slutpaketets nätverk/SDK/manifest | Ej verifierat |
| Offentliga integritets-/support-URL:er och verifieringsdatum | Ej verifierat |
| Registrerade app-ID, aktiva avtal och svenskt pris per butik | Ej verifierat |
| Slutliga datadeklarationer, material och submission | Ej verifierat |
| Ansvarig utgivares releasegodkännande | Ej inhämtat |

Releasebeslut: **kan ännu inte publiceras**. Referensresultaten gäller endast angiven commit och ersätter inte verifieringen av kommande ändringar.
