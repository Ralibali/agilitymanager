# Mobilrelease – verifieringsstatus

Uppdaterad 1 oktober 2026. Det aktuella utkastet är **1.0.0 (2): banplanerare med planerad betald nedladdning för 39 SEK i Sverige**. Priset är inte inställt i någon butik. Menyer och routes är begränsade till banplaneraren, banbibliotek/delade banor samt konto och integritet. Webbens sida med 0 kr, tävlingskalender, separata träningsplaner och övriga webbområden ingår inte i mobilens routes.

Fem routingtester, riktad lint för ändrade filer samt TypeScript och native web bundle har passerat för utkast 2. Mobilens omarbetade flödestester och de nya plattformspaketen verifieras i pull requestens byggflöde, som producerar osignerade/testpaket. Ingen fysisk enhet, signerad butiksversion, backenddeployment, butikskonfigurerat pris eller butikspublicering är verifierad.

**Kontrollerna nedan avser föregående breda utkast 1.0.0 (1), källkodscommit `0c3af90ce9309141e102b116e32de827394ec13b`. APK/AAB från det utkastet är historiska testpaket och motsvarar inte utkast 2.** På detta commit passerade GitHub även 333 enhetstester och 21 webbflöden. Tomt fält eller ”ej verifierat” betyder att kontrollen återstår.

## Identifiera den historiskt verifierade versionen

- Verifiering: lokala automatiska bygg- och testkörningar i arbetsgrenen; ansvarig utgivare och godkännande återstår.
- Datum och tidszon: 30 september–1 oktober 2026, Europe/Stockholm; detaljerade körningstider finns i loggarna.
- Git-commit / snapshot: branch `codex/agilitymanager-mobile`; exakt commit i PR.
- Mobilversion och byggnummer: `1.0.0 (1)`, kontrollerat i `mobile.version.json` samt Android- och iOS-konfiguration.
- App-ID: `se.agilitymanager.app`, preliminärt; inte registrerat/reserverat av dessa kontroller.
- Backendmiljö/projekt: produktionsschema och deployment ej verifierade. Mobilflödestesterna blockerade externa anrop och berörde inte produktionsdata. Se `mobile-account-data.md` för konto-/schemabegränsningar.
- Verktygsversioner: Node.js `24.19.0`; Xcode `26.6` (`17F113`); simulator-SDK `26.5`; Gradle wrapper `8.14.3`; Android Gradle Plugin `8.13.0`; Android compile/target API `36`, minimum API `24`; iOS minimum `15.0`; Capacitor `8.5.2`. npm `10.9.4`; Temurin JDK `21.0.12.1+1`; Android SDK build tools `36.0.0`.

Loggarna nedan finns i arbetsytans `work/` bredvid repositoryt och är lokal evidens, inte filer som följer med en klon av repositoryt.

## Bygg och automatiska kontroller

| Kontroll | Faktiskt kommando / verktyg | Resultat | Artefakt / logg / begränsning |
| --- | --- | --- | --- |
| TypeScript | `tsc -b` med diagnostik | Passerade | `work/typecheck-final.log`; app- och verktygskonfiguration kontrollerade. |
| Enhets-/integrationstester | `npm run test` / Vitest 4.1.11 | 37 testfiler, 330 tester passerade | `work/tests.log`; även export och raderingsskydd med lokala fixturer. Detta bevisar inte produktionsradering. |
| Mobilflöden i webbläsare | `npm run test:mobile` / `playwright.mobile.config.ts` | 6 tester passerade, 26,4 s | `work/mobile-tests-final.log`; Chromium med Android/Pixel 5- och iPhone 13-skärmprofiler. Navigation, integritets-/raderingsvyer, safe areas, lokal sparning/träning utan internet och JSON-export. Ingen fysisk enhet eller iOS WebKit/native plugin. |
| Lint | Projektets ESLint-kontroll | Passerade | `work/lint-final.log` och `work/lint-mobile-final.log`; lyckad körning utan felutskrift. |
| Ordinarie webbbygge | `npm run build` | Passerade | `work/web-build.log`; ordinarie webbbygge kontrollerat separat från mobilpaketet. |
| Native web bundle | `npm run build:native`, också via `native:prepare` | Passerade | `work/native-bundle-final.log`, `work/native-prepare-final.log`; `dist-native` byggt och paketkontroll passerad: lokal HTML/typsnitt, safe areas, ingen webb-GA4-laddare. |
| Capacitor sync / resurser | `native:prepare` / plattformssynk och konfigurations-/resursskript | Passerade för iOS och Android | `work/native-sync-final.log`; fem plugins: App 8.1.1, Browser 8.0.4, Filesystem 8.1.3, Network 8.0.1, Share 8.0.2. Version 1.0.0 (1), API 36/iOS 15 och ikoner applicerade. |
| iOS kompilering utan signering | `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ../ios-build -skipPackageUpdates -disableAutomaticPackageResolution -jobs 2 CODE_SIGNING_ALLOWED=NO` | `BUILD SUCCEEDED` | `work/ios-build-final.log`; app i `work/ios-build/Build/Products/Debug-iphonesimulator/App.app`. Kompilering för simulator, inte fysisk installation, Archive eller IPA. |
| iOS appstart i simulator | iPhone 17 Pro / iOS 26.5 | Ej funktionsverifierat | Installation och processstart lyckades 30 september, men UI visades inte under hög hostbelastning. Ett nytt startförsök avbröts 1 oktober. Simulatorn stoppad; första start behöver verifieras. |
| iOS Archive och export | Ej körd signerad Archive/export | Ej verifierat | Development Team, certifikat, provisionering och signerad IPA återstår. |
| Android debug-APK | Gradle `assembleDebug` tillsammans med `bundleRelease` | `BUILD SUCCESSFUL`, 18 s vid ombyggnad med slutliga startresurser | `work/android-build-assets.log`; `outputs/AgilityManager-1.0.0-test.apk` i arbetsytan. Testpaket, ingen bekräftad installation på fysisk telefon. |
| Android release-AAB utan release-signering | Gradle `bundleRelease` tillsammans med `assembleDebug` | `BUILD SUCCESSFUL` | `work/android-build-final.log`; `outputs/AgilityManager-1.0.0-unsigned.aab` i arbetsytan. Inte färdig för butikens signerade releaseflöde. |
| Android signerad release-AAB | Ingen release-signering verifierad | Ej verifierat | Upload key, Play App Signing och signerad AAB återstår. |
| Privacy manifest / 16 KB / paketinspektion | Paket- och pluginförberedelse i kod | Slutlig releasekontroll återstår | Kontrollera slutligt signerat paket, manifestdeklarationer, nativebibliotek och relevanta enhetstester innan inskickning. |

## Externa blockerare och publicering

| Kontroll | Status | Ansvarig / evidens / nästa steg |
| --- | --- | --- |
| Utgivare, utvecklarkonton och registrerat app-ID | Ej verifierat | Bekräfta rätt utgivare, kontotyp och app-ID; signeringsbehörigheter återstår. |
| Faktiskt schema, RLS, Storage och raderingsberoenden | Ej verifierat | Inventera rätt backendprojekt och hela datagrafen. |
| Raderingsbackend driftsatt och testad i rätt miljö | Ej driftsatt/verifierat | Lokal kod och tester finns; staging-, schema-/Storage- och verkliga raderingstester återstår. |
| Banprofilradering och övriga begäranden | Ej färdig/verifierad | Permanent verifierat raderingsflöde krävs för de konto-/banprofilytor utkast 2 behåller. Instruktörsdata är inte en mobilfunktion i utkast 2. |
| Personuppgiftsansvarig, rättslig grund och retention | Beslut återstår | Utgivaren behöver fastställa controller, kontaktuppgifter, retention samt logg-/backup-/leverantörsrutiner. |
| Integritetstext godkänd för verklig drift | Ej godkänd | Tekniskt underlag finns; verksamhetsbeslut och godkännande återstår. |
| /integritet offentlig på agilitymanager.se | Ny route ej publicerad/verifierad | Lokal vy passerade browsertest; offentlig publicering och åtkomstkontroll återstår. |
| /radera-konto offentlig och fungerande utan app | Ny route ej publicerad/verifierad | Lokal vy passerade browsertest; publicering och faktiskt backend-/raderingsflöde återstår. |
| UGC-inventering, villkor, moderering, rapport/block | Ej färdig/verifierad | Inventera delade banor och kommentarer som ingår i mobilappen; implementera och testa relevanta skydd. |
| App Privacy / Data safety / målgrupp / åldersklassning | Ej inskickat/verifierat | Fyll i mot verklig databehandling och slutligt appinnehåll. |
| Supportuppgifter, butikstexter och riktiga skärmbilder | Svenska textutkast finns; slutmaterial återstår | `store-listings-sv.txt`; godkänn supportuppgifter och ta/verifiera native skärmbilder för butikerna. |
| TestFlight / Play-testspår och testarkrav | Ej verifierat | Bekräfta kontotyp, testarkrav och verkliga testare innan produktionsåtkomst. |
| Submission / butiksgranskning | Ej inskickat | Ingen uppladdning, publicering eller granskning utförd. |

## Verkliga enhetstester

Alla fysiska enhetstester nedan återstår. Mobilens webbläsartester och lyckad simulator-kompilering ersätter inte dem. iOS appstart i simulator kunde inte verifieras vid de lokala försöken; se ovan.

| Enhet / OS / version-build / backend | Flöde | Faktiskt resultat | Bevis / kvarvarande fel |
| --- | --- | --- | --- |
| [fyll i] | Första start, layout, tangentbord, safe areas | Ej testat | [fyll i] |
| [fyll i] | Banredigering och sparning efter omstart | Ej testat | [fyll i] |
| [fyll i] | PDF/PNG/JSON export och öppning | Ej testat | [fyll i] |
| [fyll i] | Delningslänk, QR, routing och Android back | Ej testat | [fyll i] |
| [fyll i] | Offline/återanslutning och backendfel | Ej testat | [fyll i] |
| [fyll i] | Konto, banprofil, radering och serverkontroll | Ej testat | [fyll i] |
| [fyll i] | UGC-rapportering, blockering och moderering | Ej testat | [fyll i] |

## Releasebeslut

- Kan skickas in: **Nej, ännu inte.** Lokala bygg- och kodtester har passerat, men releasen är inte signerad och externa blockerare är öppna.
- Kvarvarande blockerare för utkast 2: utvecklarkonton/utgivare/signering, betalda butiksavtal och konfigurerat svenskt pris, fysiska tester, faktiskt schema/Storage samt permanent konto-/banprofilradering, integritetsbeslut och offentliga webbsidor, UGC-moderering/rapport/block för delade banor/kommentarer, butikernas datadeklarationer och testspår.
- Godkänd av ansvarig utgivare: ej inhämtat; fyll i namn, datum och godkänd version först efter faktiskt beslut.
