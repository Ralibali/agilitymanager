# AgilityManager – fristående banplanerare för App Store och Google Play

Underlag 1 oktober 2026 för **1.0.0 (3)**. Användaren har valt en lokal banplanerare som första app, med önskat engångspris **39 SEK vid nedladdning i Sverige**. Varumärke/support: **Aurora Media AB**, **info@auroramedia.se**. Användaren har valt sitt personliga Apple-team 9G8SUZKS7Y; Google använder befintliga organisationen aurora media AB. Båda appposterna är skapade och exakt 39 SEK/Sverige är sparat och verifierat. Avtal, bank/skatt och signering återstår.

[mobile-release-status.md](mobile-release-status.md) innehåller faktiska kontroller. Tidigare byggnummer är inte testbevis för bygg 3. [mobile.store.json](../mobile.store.json) är ett pris-/butiksutkast och aktiverar ingen försäljning.

## Vald produkt

| Fält | Underlag för bygg 3 |
| --- | --- |
| Namn | AgilityManager |
| Funktioner | Rita agility-/hoopersbanor, medföljande banbibliotek och egna banor på enheten |
| Filer | Lokal JSON-import/-export, PNG/PDF-export via telefonens Spara/Dela |
| Konto/tjänster | Inga appkonton, banprofiler, molnsparning, publika banor, kommentarer, betyg eller feedback-backend |
| Data/behörigheter | Ingen appinsamling av konsumentdata till server, analytics, reklam, native push eller position |
| App-ID | `se.agilitymanager.app`, registrerat Apple bundle-ID; bindning till uppladdat signerat Googlepaket återstår |
| Version/bygg | `1.0.0` / `3`; slutpaket och versionsfil ska överensstämma |
| Pris | `paid-download`, svenskt kundpris 39 SEK sparat och verifierat i båda butikerna; Sverige enda försäljningsland |
| Teknik | Capacitor 8; iOS minimum 15, Xcode 26+/iOS 26 SDK; Android minimum API 24, compile/target API 36 |
| Integritet | [Apptextutkast](mobile-privacy-sv.txt); [offentlig policy-URL](https://agilitymanager.se/mobil-integritet.html) verifierad utan inloggning 1 oktober 2026 |

Webbens tävlingar, träningsplanering, instruktör/elev, resultat, guider, konton och community ingår inte. Banplanerarens PDF för träning är ett banunderlag.

Apple kräver kontoradering när appen stöder kontoskapande och rekommenderar användning utan inloggning när kontofunktioner saknas. Google knyter raderingskravet till kontoskapande i appen. Den lokala appen erbjuder inget konto; verifiera att inga sådana flöden finns kvar. Webbplatsens raderingsarbete är separat. [Apple 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy), [Google kontoradering](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Lokala användardokument och användarvald filimport/-export ger ingen publik community i vald produkt. Detta är en avgränsning, inte ett generellt policyundantag. Ingen UGC-plattform ska vara åtkomlig som appfunktion. Google räknar även klienter som leder till UGC-plattformar; Apple kräver skydd för inkluderade UGC-tjänster. [Google UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

## Färdigställ och verifiera paketet

- Ta bort Auth/Supabase samt konto-, banprofil-, moln-, community- och feedbackflöden från mobilens entry point och alla nåbara komponenter/deeplinks. En begränsad meny räcker inte.
- Paketera UI, typsnitt och mallar lokalt. Testa nyinstallation utan nätverk, banredigering, egna banor efter omstart, import och samtliga exporter.
- Kontrollera verklig nätverkstrafik, SDK, manifest och behörigheter. Inga appserveranrop för användardata eller analytics ska förekomma. Ta bort överblivna datainsamlingsdeklarationer och onödiga behörigheter.
- Testa lagringsfel, importvalidering, säkra filnamn, cachefiler, avbruten delning och öppning i mottagarappen. Filesystem kräver privacy manifest för filtimestamp-API; Share använder cachefiler på Android. [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Share](https://capacitorjs.com/docs/apis/share), [Apple SDK-krav](https://developer.apple.com/support/third-party-SDK-requirements/).
- Verifiera OS-backup: Android-konfigurationen har `allowBackup=false`; kontrollera slutpaketet. Lova inte samma beteende på iOS utan kontroll.
- Kör TypeScript, projekttester, lint, web/native build och sync för bygg 3. Testa på fysisk iPhone och Android: första start, layout, större text, tangentbord, safe areas, rotation, Android back, lokal lagring och export. Simulator-kompilering och äldre APK/AAB räcker inte.

Capacitor 8 kräver Node.js 22+ och Android Studio 2025.2.1+. App Store kräver Xcode 26+/iOS 26 SDK; Google kräver API 36 för nya appar/uppdateringar sedan 31 augusti 2026. Kontrollera eventuella nativebiblioteks 16 KB-stöd. [Capacitor miljö](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor 8](https://capacitorjs.com/docs/updating/8-0), [Apple SDK-krav](https://developer.apple.com/news/upcoming-requirements/), [Google target API](https://developer.android.com/google/play/requirements/target-sdk), [Android 16 KB](https://developer.android.com/guide/practices/page-sizes).

```sh
npm ci
npm run typecheck
npm run test
npm run lint
npm run build:native
npm run native:prepare
npm run native:ios
npm run native:android
```

Öka byggnumret vid nästa uppladdning. Signeringsnycklar, servicekontonycklar och serverhemligheter ska ligga utanför klientpaket och Git. Releaseflödet äger signeringsinstruktioner och kvitton; detta underlag bekräftar ingen signering.

## Integritet och App Privacy/Data safety

Godkänn [mobile-privacy-sv.txt](mobile-privacy-sv.txt), publicera apptexten på en offentlig fungerande URL och länka den i appen/butikerna. Policy behövs även utan insamling. [Apple integritet](https://developer.apple.com/app-store/review/guidelines/#privacy), [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

| Område | Underlag | Återstående kontroll |
| --- | --- | --- |
| Varumärke/support | Aurora Media AB/info@auroramedia.se, angivet av användaren | Behörig utgivare godkänner text och support fungerar |
| Banor/import | Lokal bansparning och användarvald JSON-fil | Ingen uppladdning; verifierad lagring efter omstart |
| Export | Lokalt skapad fil; användaren väljer mottagare | Ingen automatisk uppladdning; cache/delning verifierad |
| Konto/UGC | Saknas i vald produkt | Saknas även i dialoger, deeplinks och nätverk |
| Analytics/reklam/push/plats | Ingår inte | SDK, paket, behörigheter och trafik kontrollerade |
| Supportmejl | Separat hantering av Aurora Media AB | Fastställ ansvar, rättslig grund, lagring/radering och relevant information |
| Privacy manifest | Filesystem required-reason API kan kvarstå utan insamling | Slutligt manifest och medföljande SDK kontrollerade |
| Offentlig policy-URL | https://agilitymanager.se/mobil-integritet.html, verifierad utan inloggning 1 oktober 2026 | Slutlig text och länkar i signerat paket |

**Apple:** ”Data Not Collected” är ett preliminärt underlag, inte en inskickad deklaration. Data som enbart behandlas på enheten räknas inte som insamlad; data som lämnar enheten och SDK-hantering måste bedömas separat. [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/).

**Google:** preliminärt ingen insamling, ingen delning enligt formulärets definition, inga appkonton och ingen reklam. Lokal behandling räknas inte som insamling när data aldrig lämnar enheten. Systemets Spara/Dela måste uppfylla undantaget för specifik, förväntad användarinitierad delning. Formulär/policy krävs ändå. Kontrollera verkligt slutpaket före deklaration; återanvänd inte webbproduktens kategorier eller säkerhetslöften. [Google definitioner/undantag](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

## Registrering, pris och signering i befintliga konton

**Apple:** använd det personliga teamet 9G8SUZKS7Y enligt användarens uttryckliga val. Bundle-ID se.agilitymanager.app och apppost 6818139174 är registrerade med svenska och SKU agilitymanager-ios-001. Certifikat/provisionering, signerad Archive, validering och TestFlight-uppladdning återstår. [Apple app-post](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/), [Apple distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).

Account Holder behöver aktivt **Paid Apps Agreement**, begärda skatteuppgifter och bankuppgifter för utbetalning. I **Monetization → Pricing and Availability → Add Pricing**, välj Sverige och granska även **See Additional Prices**. Exakt 39,00 SEK valdes och lästes i Current Price efter sparning och omladdning 1 oktober 2026. Sverige är enda tillgängliga försäljningsland. Prissättning är inte butikspublicering. [Apple avtal](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/), [skatt](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/), [utbetalning](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments/), [pris](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/).

**Google:** skapa app-post som app, svenska, **Paid**, support info@auroramedia.se och avsedda marknader. Bekräfta permanent paketnamn före uppladdning. Koppla rätt payments profile och verifiera begärda utgivar-/skatte-/bankuppgifter. Konfigurera Play App Signing, skydda upload key och ladda upp signerad AAB till testspår. [Google skapa app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en), [betalningsprofil](https://support.google.com/googleplay/android-developer/answer/3092739?hl=en), [bank](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en), [signering](https://developer.android.com/studio/publish/app-signing).

Välj Paid innan appen erbjuds gratis. Google tillåter betald → gratis, men gratiserbjuden app kan inte bli betald med samma paketnamn. Granska Sverige som distributionsland och det slutliga kundpriset 39 SEK efter butikens pris-/skatteberäkning. [Google apppris](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en).

39 SEK avser kundpris, inte nettoutbetalning. Köpet sker i respektive butik. Inga Stripe-köp, IAP-produkter, abonnemang eller extra upplåsningsskärmar behövs för vald modell. Appposterna och exakt svenskt pris är verifierade; avtal, signering, Googlepaketets bindning och publicering återstår.

## Slutmaterial och inskickning

- Använd [store-listings-sv.txt](store-listings-sv.txt). Bekräfta support-URL och offentlig policy-URL, kategori (sport är ett förslag), åldersklassning/målgrupp, innehållsdeklarationer, krypterings-/exportfrågor och rättigheter till mallar/bilder/typsnitt.
- Ta skärmbilder från färdig app. Inga webbfunktioner, gratispåståenden eller obekräftade priser i namn/subtitle/skärmbilder.
- Ge granskaren instruktioner för lokal redigering, bibliotek, egna banor och import/export. Inget testkonto behövs när appkonton saknas.
- Använd TestFlight/Play-testspår och kontrollera faktisk kontotyp. Googles 12 testare kontinuerligt i 14 dagar gäller personliga konton skapade efter 13 november 2023; antag inte kontotyp från företagsnamnet. [Google testkrav](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
- Verifiera signerad version, fysiska tester, policies/metadata, avtal och exakt svenskt pris före submission. Butikerna bedömer också nytta/stabilitet. [Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), [Google funktionalitet](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en).

Ansvarig utgivare godkänner slutunderlaget före publicering. Fyll verifierade resultat i status-/releasekvitton. Ändra inte prisutkastets falska verifieringsfält till sant utan kontobevis.
