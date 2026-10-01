# AgilityManager – förberedelse för App Store och Google Play

Underlag uppdaterat 1 oktober 2026. Mobilprodukten är AgilityManagers banplanerare, med önskat engångspris 39 kr vid nedladdning från den svenska App Store- eller Google Play-butiken. Detta beskriver förberedelsen i repositoryt och återstående lanseringsarbete. Faktiska bygg-, publicerings- och testresultat ska föras i [mobile-release-status.md](mobile-release-status.md). Kod och prisutkast lokalt innebär inte att appen är signerad, priset konfigurerat eller appen publicerad/godkänd.

## Första versionens omfattning

| Inställning | Lokalt utkast |
| --- | --- |
| Namn | AgilityManager |
| Produkt | Banplanerare, banbibliotek och egna banor för agility och hoopers |
| App-ID / bundle identifier | `se.agilitymanager.app` – förslag i koden; inte registrerat eller reserverat |
| Mobilversion / byggnummer | `1.0.0` / `2`, från `mobile.version.json` |
| Teknik | Capacitor 8.5.2 med lokalt paketerat webbgränssnitt i `dist-native` |
| iOS | Minimum iOS 15; bygg med Xcode 26 eller senare och iOS 26 SDK |
| Android | Minimum API 24; compileSdk och targetSdk 36 |
| Monetisering | `paid-download`: önskat kundpris 39 SEK i Sverige (`SE`), betalas en gång i respektive butik före nedladdning. Priset är inte konfigurerat eller verifierat. |
| Betalning i appen | Inget abonnemang, Stripe-flöde, In-App Purchase eller runtime-paywall planeras för denna produkt. |
| Notiser och statistik | Ingen native pushintegration. Mobilens entry point och statistikadapter startar inte GA4 eller samlar användningshändelser. Webbplatsens statistik är ett separat flöde. |
| Behörigheter | Banplaneraren behöver ingen position. Inventera slutpaketet och ta bort behörigheter som saknar funktion i mobilprodukten. Ingen bakgrundsposition ska ingå. |

Mobilens menyer, routes, startsida och texter ska följa denna omfattning. Tävlingskalender, separata träningsplaner, instruktör/elev, resultat, försäkringsjämförelse och webbguider ska inte beskrivas som medföljande appfunktioner. Banplanerarens PDF-underlag för träning är en banexport. Verifiera även att återanvända komponenter inte visar webbplatsens ”gratis”-erbjudande som appens pris.

[`mobile.store.json`](../mobile.store.json) är ett läsbart butiksutkast med önskat pris och `storePriceConfigured: false`. Det är inte en betaltjänst eller åtkomstkontroll i appen och ändrar inget hos Apple eller Google.

Capacitor 8 kräver Node.js 22+ och Android Studio 2025.2.1+. App Store kräver Xcode 26+/iOS 26 SDK, och Google Play kräver API 36 för nya appar och uppdateringar sedan 31 augusti 2026. [Capacitors miljökrav](https://capacitorjs.com/docs/getting-started/environment-setup), [uppgradering till Capacitor 8](https://capacitorjs.com/docs/updating/8-0), [Apple SDK-krav](https://developer.apple.com/news/upcoming-requirements/), [Google target API](https://developer.android.com/google/play/requirements/target-sdk).

## Förberedelse som finns i koden

- `capacitor.config.ts`, `vite.native.config.ts` och mobilens entry point paketerar gränssnittet lokalt. Appen använder inte en fjärrwebbplats som `server.url`.
- `scripts/native-prepare.mjs` skapar plattformarna om de saknas, synkar plugins och kör konfiguration samt ikon-/startresurser. `scripts/native-configure.mjs` applicerar mobilversionen och grundinställningarna. Registrering, certifikat och release-signering görs separat.
- Mobilskal, safe areas, nätverksstatus, Androids bakåtknapp, extern länkhantering och routing för tillåtna `agilitymanager://`-länkar är förberedda. HTTPS Universal Links / verifierade Android App Links behöver separat domän- och signeringskonfiguration om de ska användas.
- Banexport av PDF, PNG och JSON går genom `src/lib/exportFile.ts`: mobilen skriver en tillfällig fil i appens cache och öppnar systemets Spara/Dela. Webbversionen laddar ned filen. Banlänkar och QR-koder använder den offentliga banplaneraren på `https://agilitymanager.se/banplanerare`.
- Integritets- och raderingssidor finns i koden på `/integritet` och `/radera-konto`. **De nya webbsidorna är inte publicerade eller verifierade på domänen.**
- Klient och serverkod för kontoradering finns i det gemensamma projektet. **Backendfunktionen och dess SQL-kontroller är inte driftsatta eller verifierade mot den verkliga databasen.** Det är inte bevis för en levererad mobilfunktion; kontrollera om slutpaketet erbjuder konto eller banprofil.

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

## Ställ in engångspriset i butikskontona

Prismålet är **39 SEK som kundens visade pris i den svenska butiken**. Butikernas avgifter och skattehantering påverkar utgivarens intäkt; 39 kr är inte ett löfte om nettoutbetalning. Inga avtal, bankuppgifter, prisändringar eller publiceringar har utförts i denna förberedelse.

### Apple App Store

1. Utgivarens Account Holder behöver godkänna aktuellt **Paid Apps Agreement** och kontrollera att avtalet är aktivt. Detta krävs för att sälja appen. [Apple avtal](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/).
2. Lämna de skatteuppgifter App Store Connect begär och ordna bankuppgifter för utbetalning. Kontrollera verksamhetens verkliga uppgifter och avtalets status; lägg inga sådana uppgifter i repositoryt. [Apple skatteuppgifter](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/), [Apple utbetalningskrav](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments/).
3. I **Monetization → Pricing and Availability → Add Pricing**, välj Sverige som basland och kontrollera vilka SEK-prispunkter kontot erbjuder, även **See Additional Prices**. Välj exakt 39 SEK om den prispunkten finns. Den offentliga anvisningen bekräftar inte att just 39 SEK är valbart; detta måste verifieras i App Store Connect. Välj inte automatiskt ett närliggande belopp om det saknas, utan lämna priset obekräftat tills utgivaren valt ett tillgängligt pris. [Apple appprissättning](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/).
4. Kontrollera att Sverige ingår i tillgängliga marknader, det kommande svenska kundpriset och startdatumet. Granska eventuella automatiskt genererade utlandspriser separat innan andra marknader aktiveras. Spara bevis för den slutliga prispunkten i statusfilen; gör detta före inskickning.

### Google Play

1. Utgivaren behöver en **Google payments profile** kopplad till Play Console för att sälja en betald app. Bekräfta juridisk utgivare och rätt betalningsprofil innan kopplingen görs. Ordna skatteinställningar och bankkonto för utbetalning samt den verifiering kontot begär. [Google betalningsprofil](https://support.google.com/googleplay/android-developer/answer/3092739?hl=en), [Google bankuppgifter](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en).
2. Välj **Paid** på **Products → App pricing** innan appen erbjuds gratis. Google tillåter betald → gratis, men en app som har erbjudits gratis kan inte ändras till betald; då krävs en ny app med nytt paketnamn. Publicera därför inte detta paket som en gratis produkt för att lägga på nedladdningspriset senare. [Google appprissättning](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en).
3. Ange och granska det lokala kundpriset för Sverige: 39 SEK. Kontrollera prisgränserna och butikens slutliga visning efter skatte-/prisberäkning, samt att Sverige är ett valt distributionsland. Pris i ett land aktiverar inte i sig distribution där. Dokumentera sparat pris och datum i statusfilen.

Appköpet hanteras av respektive butik. Prisutkastet ska inte skapa något Stripe-konto, några IAP-produkter eller någon extra betalningsskärm. Granska köp-/uppgraderingslänkar i den verkliga mobilappen innan butikernas formulär fylls i. [Apple betalningsregler](https://developer.apple.com/app-store/review/guidelines/#payments), [Google betalningsregler](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

## Integritet och eventuella konto-/banprofilflöden

Inventera vilka nätverksanrop och användaruppgifter det slutliga banplanerarpaketet faktiskt använder. En avgränsad navigation betyder inte automatiskt att konto-, moln- eller kommentarsfunktioner i återanvända komponenter är borttagna. Integritetstext och butiksdeklarationer behöver stämma med slutpaketet även när betalningen sker i butiken.

Det gemensamma projektet har två separata identiteter: Supabase-kontot för e-post/lösenord och banprofilen med namn/e-post samt profilnyckel. Att glömma banprofilen lokalt raderar inte serverdata. Kontoraderingen får inte anta att samma e-postadress betyder samma identitet. Se [mobile-account-data.md](mobile-account-data.md) för inventerade tabeller, raderingsskydd och steg för staging. Steg 1–3 nedan blockerar mobilens inskickning om den inkluderar dessa konto-/profilflöden. Exkluderas de måste frånvaron verifieras i slutpaketet; webbplatsens kvarvarande raderingsarbete är ett separat ansvar.

Före inskickning måste ansvarig för tjänsten:

1. Inventera hela faktiska databasen, Storage, loggar och andra användarreferenser. Besluta hur delat innehåll och uppgifter som måste sparas ska behandlas. Stagingtester ska visa att rätt kontodata försvinner och att andra användares uppgifter bevaras.
2. Driftsätta och verifiera serverfunktionen samt dess beroendekontroller innan radering aktiveras. Den lokala preflight-kontrollen kan stoppa radering på det befintliga schemat; kringgå inte skyddet för att få en lyckad skärm.
3. Ordna ett verifierat permanent raderingsflöde även för banprofil/instruktörsdata och övriga raderingsbegäranden. Den nuvarande kontaktvägen är inte bevis för en färdig process. Apple kräver möjlighet att initiera radering i appen för konton som kan skapas där; Google kräver också en extern webbresurs. [Apple kontoradering](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [Google kontoradering](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
4. Fastställa och godkänna personuppgiftsansvarig, kontakt-/organisationsuppgifter, rättsliga grunder, lagringsfrister, backup-/loggrutiner, leverantörer och eventuella dataöverföringar. Dessa verksamhetsuppgifter är ännu inte fastställda ur koden och ska inte ersättas av antaganden.
5. Komplettera integritetstexten och publicera samt kontrollera `https://agilitymanager.se/integritet`. Publicera och verifiera även `https://agilitymanager.se/radera-konto` om konto-/profilflöden ingår. De relevanta sidorna ska vara åtkomliga från appen och utan installerad app. Googles integritetspolicy ska ha offentlig webbadress, inte PDF. [Google User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
6. Fylla i Apple App Privacy och Google Data safety utifrån slutpaketets verkliga drift: lokal bansparning, exporter, nätverksanrop och eventuella banprofiler, delade banor/kommentarer, feedback samt externa tjänster. Webbplatsens tävlingar, hundprofiler, instruktörsdata och platsfunktion ska inte deklareras som mobilfunktioner enbart för att deras kod finns i samma projekt. Avsaknad av analytics innebär inte att inga personuppgifter hanteras. Granska faktisk nätverkstrafik och leverantörers loggning. [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).

## Användarinnehåll och butikskrav

Kommentarer, publika delade banor och författarnamn behöver inventeras för UGC om de är åtkomliga i mobilens slutpaket. Användarvillkor/policy, rapportering, blockering och effektiv moderering är **inte implementerade och verifierade som ett komplett butiksgodkänt flöde**. Bestäm vilka ytor som ska ingå i första versionen och bygg/testa skydden för dem, eller verifiera att de inte erbjuds i appen. Google kräver bland annat accepterade villkor före UGC och relevanta rapporterings-/blockeringsfunktioner. Apple kräver filtrering, rapportering, blockering av missbrukande användare och kontaktväg. [Google UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

Beskriv för granskaren den verkliga nyttan: banredigering, banbibliotek, egna sparade banor samt systemets fil-export/delning. Apple bedömer att funktioner och gränssnitt ger mer än en ompaketerad webbplats. Google kräver fungerande, användbart innehåll. Ingen förberedelse garanterar butiksgodkännande. [Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), [Google funktionalitet](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en).

## Konto, signering och butiksmaterial

- Bekräfta rätt juridisk utgivare och tillgång till Apple Developer Program/App Store Connect respektive Google Play Console. Registrera app-ID först när namnet och ägarskapet är bekräftade. Hantera även Apples trader-status för EU där tillämpligt. [Apples aktuella krav](https://developer.apple.com/news/upcoming-requirements/).
- iOS: välj rätt Development Team, provisionering och certifikat; skapa Archive, validera och ladda upp till TestFlight/App Store Connect. Android: skapa/skydda upload key, konfigurera release-signering, Play App Signing och bygg signerad AAB. Spara nycklar utanför repositoryt.
- Använd [store-listings-sv.txt](store-listings-sv.txt) som textutkast. Bekräfta supportadress/-URL, integritets-URL, eventuell raderings-URL, kategori, målgrupp, åldersklassning, innehållsdeklarationer, upphovsrätt och tillgänglighet. Ta skärmbilder från den verkliga appen i relevanta format; använd inte webbskärmbilder som föreställer en otestad mobilfunktion.
- Ge granskare tydliga instruktioner för banplaneraren, lokal sparning och exporter. Om konto-/banprofilflöden behålls behöver granskaren fungerande separata testidentiteter och live backend. Undvik riktiga användaruppgifter i testkonton. [Apple inför granskning](https://developer.apple.com/app-store/review/guidelines/#before-you-submit).
- Planera TestFlight och Play internal/closed testing. För personliga Play-konton skapade efter 13 november 2023 krävs minst 12 testare anslutna kontinuerligt under 14 dagar före ansökan om produktionsåtkomst. Tillämpligheten beror på det verkliga kontot. [Google testkrav](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Testa hela användarflödet på riktiga enheter

Testa minst en fysisk iPhone och en fysisk Android med release-lik konfiguration. Dokumentera enhet, OS, byggnummer, backendmiljö och resultat:

- Nyinstallation, första start, större text, liten skärm, rotation, safe areas och tangentbord.
- Rita/flytta/rotera/numrera hinder, banlinje, zoom och lokal sparning; stäng och starta appen igen.
- Banbibliotek, egna banor och återöppning av sparad bana; kontrollera att inga webbfunktionsmenyer eller gratispåståenden finns kvar i mobilprodukten.
- Import/export av JSON samt export av PNG och samtliga inkluderade PDF-varianter. Öppna filen i mottagarappen och verifiera innehållet. Avbryt delningsdialogen och upprepa exporten.
- Öppna delningslänk och QR på en annan enhet: offentlig domän och rätt bana. Testa tillåtna custom-scheme-länkar och avvisa främmande adresser.
- Androids bakåtknapp med dialog, meny och historik; extern länk samt återgång till appen.
- Saknat nätverk, långsamt nätverk och återanslutning. Verifiera lokal banredigering, sparning och tillgängliga biblioteksmallar. Lokalt paketerat UI ger inte automatiskt offlineåtkomst till moln-/delningsdata.
- Eventuella inkluderade profil-/molnflöden och radering: verifiera serverresultat och lokal session. En lyckad UI-text räcker inte som raderingsbevis.
- UGC-skydd på varje inkluderad användarinnehållsyta. Kontrollera modereringens faktiska mottagare och åtgärdsflöde, eller dokumentera att dessa ytor är exkluderade.
- Den slutliga svenska butikssidan visar betald nedladdning och överenskommet kundpris. Dokumentera vilket testflöde respektive butik använder för installation av testversionen; en testinstallation bevisar inte att produktionens pris är korrekt.

Inskickning kan göras först när verkliga releasebyggen är verifierade, kvarvarande blockerare är lösta, betalda avtal/pris är klara, butiksformulären motsvarar banplanerarappen och ansvarig utgivare har godkänt underlagen. För in bevisen i statusfilen.
