# AgilityManager – förberedelse för App Store och Google Play

Underlag: 30 september 2026. Detta beskriver förberedelsen i repositoryt och återstående lanseringsarbete. Faktiska bygg-, publicerings- och testresultat ska föras i [mobile-release-status.md](mobile-release-status.md). Kod som finns lokalt innebär inte att appen är signerad, publicerad eller godkänd av en butik.

## Första versionens omfattning

| Inställning | Lokalt utkast |
| --- | --- |
| Namn | AgilityManager |
| App-ID / bundle identifier | `se.agilitymanager.app` – förslag i koden; inte registrerat eller reserverat |
| Mobilversion / byggnummer | `1.0.0` / `1`, från `mobile.version.json` |
| Teknik | Capacitor 8.5.2 med lokalt paketerat webbgränssnitt i `dist-native` |
| iOS | Minimum iOS 15; bygg med Xcode 26 eller senare och iOS 26 SDK |
| Android | Minimum API 24; compileSdk och targetSdk 36 |
| Monetisering | Inga köp, prenumerationer eller native betalningsintegrationer i den förberedda första versionen |
| Notiser och statistik | Ingen native pushintegration. Mobilens entry point och statistikadapter startar inte GA4 eller samlar användningshändelser. Webbplatsens statistik är ett separat flöde. |
| Position | ”Hitta nära mig” använder `navigator.geolocation` efter användarens handling. iOS har beskrivning för position när appen används; Android har coarse/fine location. Ingen bakgrundsposition. |

Capacitor 8 kräver Node.js 22+ och Android Studio 2025.2.1+. App Store kräver Xcode 26+/iOS 26 SDK, och Google Play kräver API 36 för nya appar och uppdateringar sedan 31 augusti 2026. [Capacitors miljökrav](https://capacitorjs.com/docs/getting-started/environment-setup), [uppgradering till Capacitor 8](https://capacitorjs.com/docs/updating/8-0), [Apple SDK-krav](https://developer.apple.com/news/upcoming-requirements/), [Google target API](https://developer.android.com/google/play/requirements/target-sdk).

## Förberedelse som finns i koden

- `capacitor.config.ts`, `vite.native.config.ts` och mobilens entry point paketerar gränssnittet lokalt. Appen använder inte en fjärrwebbplats som `server.url`.
- `scripts/native-prepare.mjs` skapar plattformarna om de saknas, synkar plugins och kör konfiguration samt ikon-/startresurser. `scripts/native-configure.mjs` applicerar mobilversionen och grundinställningarna. Registrering, certifikat och release-signering görs separat.
- Mobilskal, safe areas, nätverksstatus, Androids bakåtknapp, extern länkhantering och routing för tillåtna `agilitymanager://`-länkar är förberedda. HTTPS Universal Links / verifierade Android App Links behöver separat domän- och signeringskonfiguration om de ska användas.
- Export av PDF, PNG, JSON, träningsfiler och iCalendar går genom `src/lib/exportFile.ts`: mobilen skriver en tillfällig fil i appens cache och öppnar systemets Spara/Dela. Webbversionen laddar ned filen. Native banlänkar och QR-koder använder den offentliga banplaneraren på `https://agilitymanager.se/banplanerare`.
- Integritets- och raderingssidor finns i koden på `/integritet` och `/radera-konto`, med ingång från kontosidan. **De nya webbsidorna är inte publicerade eller verifierade på domänen.**
- Klient och serverkod för kontoradering finns. **Backendfunktionen och dess SQL-kontroller är inte driftsatta eller verifierade mot den verkliga databasen.**

Androids Share-plugin kan som standard dela filer från cachekatalogen. Filesystem skriver binära data som base64 utan textkodning. Privacy manifest för Filesystem behöver beskriva filtimestamp-API enligt pluginens anvisningar. [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Share](https://capacitorjs.com/docs/apis/share), [Apples tredjeparts-SDK-krav](https://developer.apple.com/support/third-party-SDK-requirements/).

## Bygg och verifiera lokalt

Använd Node.js 22+ med npm tillgängligt och rätt backendmiljö för klienten. Klientens publika konfiguration får följa med paketet; service role, signeringsnycklar och andra serverhemligheter får aldrig läggas i webbbygget eller git.

```sh
npm ci
npm run typecheck
npm run test
npm run lint
npm run build:native
npm run native:prepare
```

`build:native` bygger till `dist-native` och kontrollerar bland annat att mobilens HTML har safe-area-stöd och att webbplatsens GA4-laddare inte finns i paketet. `native:prepare` bygger dessutom på nytt innan plattformarna synkas. Dessa steg producerar inte i sig en signerad App Store- eller Play-release.

Öppna respektive projekt och bygg med installerad native verktygskedja:

```sh
npm run native:ios
npm run native:android
```

Öka `mobile.version.json` byggnummer för varje ny uppladdning och kör förberedelsen igen. Ange faktiskt kommando, verktygsversion, commit, resultat och artefakt i statusfilen. För iOS skiljs kompilering utan signering från Xcode Archive/export. För Android skiljs debug-APK från signerad release-AAB. Kontrollera också nativebiblioteks stöd för 16 KB minnessidor om sådana finns i paketet. [Android 16 KB](https://developer.android.com/guide/practices/page-sizes).

## Radering och integritet blockerar inskickning

Det finns två separata identiteter: Supabase-kontot för e-post/lösenord och banprofilen med namn/e-post samt profilnyckel. Att glömma banprofilen lokalt raderar inte serverdata. Kontoraderingen får inte anta att samma e-postadress betyder samma identitet. Se [mobile-account-data.md](mobile-account-data.md) för inventerade tabeller, raderingsskydd och steg för staging.

Före inskickning måste ansvarig för tjänsten:

1. Inventera hela faktiska databasen, Storage, loggar och andra användarreferenser. Besluta hur delat innehåll och uppgifter som måste sparas ska behandlas. Stagingtester ska visa att rätt kontodata försvinner och att andra användares uppgifter bevaras.
2. Driftsätta och verifiera serverfunktionen samt dess beroendekontroller innan radering aktiveras. Den lokala preflight-kontrollen kan stoppa radering på det befintliga schemat; kringgå inte skyddet för att få en lyckad skärm.
3. Ordna ett verifierat permanent raderingsflöde även för banprofil/instruktörsdata och övriga raderingsbegäranden. Den nuvarande kontaktvägen är inte bevis för en färdig process. Apple kräver möjlighet att initiera radering i appen för konton som kan skapas där; Google kräver också en extern webbresurs. [Apple kontoradering](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [Google kontoradering](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
4. Fastställa och godkänna personuppgiftsansvarig, kontakt-/organisationsuppgifter, rättsliga grunder, lagringsfrister, backup-/loggrutiner, leverantörer och eventuella dataöverföringar. Dessa verksamhetsuppgifter är ännu inte fastställda ur koden och ska inte ersättas av antaganden.
5. Komplettera integritetstexten och publicera samt kontrollera `https://agilitymanager.se/integritet` och `https://agilitymanager.se/radera-konto`. De ska vara åtkomliga från appen och utan installerad app. Googles integritetspolicy ska ha offentlig webbadress, inte PDF. [Google User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
6. Fylla i Apple App Privacy och Google Data safety utifrån verklig drift: konton, namn/e-post, banor/kommentarer, hundprofiler, instruktörsdata, feedback, platsfunktionen, kartleverantören och externa tjänster. Avsaknad av analytics innebär inte att inga personuppgifter hanteras. Granska även faktisk nätverkstrafik och leverantörers loggning. [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).

## Användarinnehåll och butikskrav

Kommentarer, publika delade banor, författarnamn och instruktörs-/elevinteraktioner behöver inventeras för UGC. Användarvillkor/policy, rapportering, blockering och effektiv moderering är **inte implementerade och verifierade som ett komplett butiksgodkänt flöde**. Bestäm vilka ytor som ska ingå i första versionen och bygg/testa skydden för dem. Google kräver bland annat accepterade villkor före UGC och relevanta rapporterings-/blockeringsfunktioner. Apple kräver filtrering, rapportering, blockering av missbrukande användare och kontaktväg. [Google UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

Beskriv för granskaren den verkliga nyttan: banredigering, banbibliotek, träningsplanering, tävlingssökning samt systemets fil-export/delning. Apple bedömer att funktioner och gränssnitt ger mer än en ompaketerad webbplats. Google kräver fungerande, användbart innehåll. Ingen förberedelse garanterar butiksgodkännande. [Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), [Google funktionalitet](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en).

Första versionen förbereds utan köp av digital appåtkomst. Inventera den faktiska mobila navigeringen, inklusive externa köp-/uppgraderingslänkar, innan detta anges i butikernas formulär. Om digitala köp tillkommer krävs en ny granskning av butikernas betalningsregler och regionala program. [Apple betalningar](https://developer.apple.com/app-store/review/guidelines/#payments), [Google betalningar](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

## Konto, signering och butiksmaterial

- Bekräfta rätt juridisk utgivare och tillgång till Apple Developer Program/App Store Connect respektive Google Play Console. Registrera app-ID först när namnet och ägarskapet är bekräftade. Hantera även Apples trader-status för EU där tillämpligt. [Apples aktuella krav](https://developer.apple.com/news/upcoming-requirements/).
- iOS: välj rätt Development Team, provisionering och certifikat; skapa Archive, validera och ladda upp till TestFlight/App Store Connect. Android: skapa/skydda upload key, konfigurera release-signering, Play App Signing och bygg signerad AAB. Spara nycklar utanför repositoryt.
- Använd [store-listings-sv.txt](store-listings-sv.txt) som textutkast. Bekräfta supportadress/-URL, integritets- och raderings-URL, kategori, målgrupp, åldersklassning, innehållsdeklarationer, upphovsrätt och tillgänglighet. Ta skärmbilder från den verkliga appen i relevanta format; använd inte webbskärmbilder som föreställer en otestad mobilfunktion.
- Ge granskare fungerande åtkomst till alla levererade kontofunktioner: separata testidentiteter för konto respektive banprofil, tydliga instruktioner och live backend. Undvik riktiga användaruppgifter i testkonton. [Apple inför granskning](https://developer.apple.com/app-store/review/guidelines/#before-you-submit).
- Planera TestFlight och Play internal/closed testing. För personliga Play-konton skapade efter 13 november 2023 krävs minst 12 testare anslutna kontinuerligt under 14 dagar före ansökan om produktionsåtkomst. Tillämpligheten beror på det verkliga kontot. [Google testkrav](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Testa hela användarflödet på riktiga enheter

Testa minst en fysisk iPhone och en fysisk Android med release-lik konfiguration. Dokumentera enhet, OS, byggnummer, backendmiljö och resultat:

- Nyinstallation, första start, större text, liten skärm, rotation, safe areas och tangentbord.
- Rita/flytta/rotera/numrera hinder, banlinje, zoom och lokal sparning; stäng och starta appen igen.
- Export/import av JSON, PNG, samtliga PDF-varianter, träningsfil/text och ICS. Öppna filen i mottagarappen och verifiera innehållet. Avbryt delningsdialogen och upprepa exporten.
- Öppna delningslänk och QR på en annan enhet: offentlig domän och rätt bana. Testa tillåtna custom-scheme-länkar och avvisa främmande adresser.
- Tävlingsfilter, favoriter, hundprofilsmatchning, kartor och ”Hitta nära mig”: tillåt, neka, återkalla och använd ungefärlig position. Appen ska fungera med manuell sökning utan platsbehörighet. Kontrollera att ingen bakgrundsposition begärs.
- Androids bakåtknapp med dialog, meny och historik; extern länk samt återgång till appen.
- Saknat nätverk, långsamt nätverk och återanslutning. Lokalt paketerat UI ger inte automatiskt offlineåtkomst till backend/tävlingsdata.
- Registrering, inloggning/utloggning, molnfunktioner och båda raderingsvägarna. Verifiera serverresultat och lokal session; en lyckad UI-text räcker inte som raderingsbevis.
- UGC-skydd på varje inkluderad användarinnehållsyta. Kontrollera modereringens faktiska mottagare och åtgärdsflöde.

Inskickning kan göras först när verkliga releasebyggen är verifierade, blockerarna är lösta, butiksformulären motsvarar appen och ansvarig utgivare har godkänt underlagen. För in bevisen i statusfilen.
