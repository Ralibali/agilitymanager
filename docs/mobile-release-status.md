# Mobilrelease – verifieringsstatus

Uppdaterad 1 oktober 2026. Aktuell produkt är **AgilityManager 1.0.0 (3)**: en fristående lokal banplanerare för agility och hoopers. Utgivare **Aurora Media AB**, support **info@auroramedia.se**, enligt användarens uppgifter. Önskat svenskt engångspris är **39 SEK vid nedladdning**; inget butikspris är ännu verifierat.

Version 3 innehåller lokal banredigering, medföljande banbibliotek, egna banor samt JSON-import/-export och PNG/PDF-export via Spara/Dela. Appkonton, banprofiler, moln, serverlagrad konsumentdata, community/kommentarer, analytics, reklam, native push och position är exkluderade. Konto-/UGC-/backendarbetet från tidigare mobilutkast blockerar därför inte denna produkt. Slutpaketets faktiska beteende och trafik måste ändå verifieras.

**Inte färdig för butikspublicering:** nya CI-/smoketester, verkliga enheter, signering, offentlig integritetssida, betalda avtal/exaktpris och butiksformulär återstår.

## Aktuell version och evidens

- Version/bygg: `1.0.0 (3)`, angivet i `mobile.version.json`.
- App-ID: `se.agilitymanager.app`, preliminärt. Registrering/ägarskap i butikskontona är inte verifierat.
- Arbetsgren: `codex/agilitymanager-mobile`; exakt bygg-3-commit och CI-resultat ska föras in efter körningen.
- Underlag: [mobile-release.md](mobile-release.md), [mobile.store.json](../mobile.store.json), [store-listings-sv.txt](store-listings-sv.txt), [mobile-privacy-sv.txt](mobile-privacy-sv.txt).
- Lokal loggevidens finns i arbetsytans `work/` bredvid repositoryt; dessa loggar följer inte automatiskt med en klon.

| Kontroll för bygg 3 | Faktastatus | Evidens / praktisk gräns |
| --- | --- | --- |
| Full ESLint-kontroll | Passerade lokalt | `work/standalone-full-lint.log` och rapporterad lyckad körning. |
| Native web bundle | Passerade lokalt | `work/standalone-native-build-final.log`; bygg klart och paketkontroll: lokal HTML/typsnitt, ingen analytics/backend/community-loader. Det är ingen runtime-/enhetskontroll. |
| Mobilflöden i lokal webbläsare | Kunde inte starta | `work/standalone-mobile-tests.log`: previewservern fick `listen EPERM 127.0.0.1:3001`. Tester kördes inte; inget passerat browserresultat för bygg 3. |
| Full CI: TypeScript/lint/enhetstester/webb-/mobilflöden | Väntar | Nya resultat för bygg-3-commit behövs. Tidigare godkända körningar är historik. |
| iOS/Android-plattformsbyggen för bygg 3 | Väntar | Nya CI-paket och versionskontroll behövs. Historiska paket är inte bygg 3. |
| Native appstart/smoke för bygg 3 | Väntar | iOS-smoke och Android-smoke ska ge aktuella loggar/skärmbilder. Processstart bevisar inte komplett UI-flöde. |
| Fysisk iPhone/Android | Ej verifierat | Första start, banredigering/sparning, import/export, offline, layout och mottagarappar återstår. |
| Ingen datainsamling/servertrafik | Slutverifiering återstår | Avgränsat paket och automatisk bundlekontroll finns. Verifiera verklig trafik och samtliga SDK på båda plattformarna före App Privacy/Data safety. |
| Privacy manifest / 16 KB / paketinspektion | Slutverifiering återstår | Kontrollera slutpaketets API-deklarationer, SDK och eventuella nativebibliotek. |

## Konton, signering och butik

| Område | Verifierat eller rapporterat | Återstår |
| --- | --- | --- |
| Utgivare/support | Användaren har angett Aurora Media AB och info@auroramedia.se | Behörig utgivare godkänner slutmaterial; fungerande support-/kontakt-URL verifieras. |
| Apple Developer/Play Console | Befintliga konton bekräftade av användaren | Kontospecifika roller, medlemskap/avtal och rätt app-ID kontrolleras. |
| Google Play Console | Faktisk inloggning, organisation `aurora media AB` och Create app-formulär observerade | Paketnamnet se.agilitymanager.app är tillgängligt och Paid är valt i formuläret. De två juridiska intygandena inväntar användarens bekräftelse; appregistrering, betalprofil, pris och signering återstår. |
| App Store Connect | Inloggning i Codex-fliken verifierad; nytt appformulär förberett | Apples Business visar ett personnamn som juridisk säljare och Paid Apps Agreement som New. Rätt team för Aurora Media AB behöver fastställas innan appregistrering; betalt avtal återstår. |
| Lokal iOS-signering | Kontrollen hittade 0 giltiga lokala code-signingidentiteter | Development Team, certifikat/provisionering, signerad Archive och validering/export återstår. Kontot kan ha resurser som inte finns lokalt. |
| Android release-signering | Ej verifierad | Upload key, signerad AAB och Play App Signing återstår; debugnyckel är inte release-signering. |
| Betald nedladdning | Önskat 39 SEK/SE finns i prisutkastet | Apple exakt prispunkt/Paid Apps Agreement och Google Paid/payments profile/banking-tax verifieras; sparat svenskt kundpris dokumenteras. |
| Offentlig integritetssida | Apptext och `public/mobil-integritet.html` finns lokalt | Inte publicerad här. Verifiera offentlig URL, innehåll och åtkomst utan app/inloggning innan URL anges i app/butik. |
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

Historiska verktyg: Node.js 24.19.0, npm 10.9.4, Xcode 26.6/SDK 26.5, JDK 21, Gradle 8.14.3, AGP 8.13.0, Capacitor 8.5.2, iOS minimum 15 och Android minimum 24/target 36. Ange faktiskt använda versioner på nästa releasekörning.

## Bevis som ska fyllas efter nästa körning

| Fält | Status |
| --- | --- |
| Bygg-3-commit och CI-körning | Väntar |
| iOS/Android-artefakt, version/bygg, signering | Väntar |
| Native smoke, loggar och visuellt verifierad skärmbild | Väntar |
| Fysisk enhet/OS och resultat för lokala banor/import/export | Ej verifierat |
| Slutpaketets nätverk/SDK/manifest | Ej verifierat |
| Offentlig integritets-URL och verifieringsdatum | Ej verifierat |
| Registrerade app-ID, aktiva avtal och svenskt pris per butik | Ej verifierat |
| Slutliga datadeklarationer, material och submission | Ej verifierat |
| Ansvarig utgivares releasegodkännande | Ej inhämtat |

Releasebeslut: **kan ännu inte publiceras**. Lägg endast till passerade resultat när bevis finns; ett tomt eller väntande fält betyder att kontrollen återstår.
