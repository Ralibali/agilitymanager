# Hundförsäkring och affiliate

Projektbrief kontrollerad 2026-09-07. AgilityManager.se erbjuder en banplanerare, banbibliotek, svensk tävlingskalender och guider för agility och hoopers. Försäkringsöversikten riktar sig till svenska hundägare som tränar och tävlar. Målet är användbara jämförelser och, efter godkännande, bekräftad affiliateprovision.

## Sida och källor

- Canonical: https://agilitymanager.se/jamfor-hundforsakring. Önskad stavning `/jämför-försäkrings` och `/jamfor-forsakrings` omdirigeras i klienten.
- Tre aktörer i alfabetisk ordning: Lassie, Petson och Svedea. Urvalet är ingen marknadsomfattande jämförelse eller rangordning.
- `src/content/dog-insurance.json` innehåller daterade fakta och primärkällor. Samma data används av React-sidan och den förgenererade HTML-sidan. Kontrollera produktsidorna igen före sakändringar; ändra inte kontrolldatum utan en verklig kontroll.
- Individuella premier, omdömen, påstådd tävlingstäckning och skadehanteringsbetyg ingår inte. Besökaren ombeds kontrollera faktiska villkor för sin hund.
- Internlänkar finns i huvudmeny och sidfot, och sidan ingår i sitemap. Bekräfta HTML, canonical och sidans visning efter publicering.

## Verifierad partnerstatus

Adtractions kanalöversikt visade den 2026-09-07 att `agilitymanager.se`, kanal **2103592373**, är aktiv med **0 aktiva samarbeten**. Hönsgårdens godkännanden gäller en annan kanal och får inte användas här. Inga försäkringsansökningar är verifierat inskickade vid denna kontroll. Datorns låsning hindrade fortsatt arbete i den inloggade webbläsaren.

`src/content/affiliate-partners.json` är därför tom. En färdig annonskomponent finns på sidtyperna, men visas först när ett samarbete för rätt kanal har verifierats. Lägg aldrig in testlänkar i produktionsfilen.

Efter ett faktiskt godkännande:

1. Kontrollera godkänd status för just kanal 2103592373 och spara program-ID, destination och verkligt kontrolldatum.
2. Hämta fullständiga HTTPS-spårningslänkar i Adtraction för den kanalen. Använd EPI 1 `jamfor-hundforsakring` för jämförelsen och `sitewide-banner` för annonsraden. Ändra aldrig någon annan kanals länk för hand.
3. Spara exakt genererad länk som `insuranceUrl` respektive `bannerUrl`. Matcha försäkringsaktörens `id` mot jämförelsedatan. En återförsäljare kan ha enbart `bannerUrl`.
4. Följ annonsörens godkända material och särskilda kanalregler. Textannonsens namn/beskrivning måste vara tillåten och aktuell. Kontrollera länkdestinationerna innan publicering.
5. Kör lint, tester, build och webbläsarkontroll med den riktiga datan. Bekräfta annonsmärkning, `rel=sponsored` och att planerarens verktyg är åtkomliga även på mobil.
6. Kontrollera programstatus minst månadsvis före nya länkar. Ta bort inaktuella samarbeten.

## Uppföljning

Inga intäkter eller konverteringar har verifierats för denna nya sida. Följ Search Console för sidans egna visningar och klick efter publicering; separat från besökarantal och affiliateklick. Följ klick, väntande provision och godkänd provision var för sig i Adtraction med sidans EPI. Dra inga slutsatser om intäkt per klick utan gemensam period och faktisk data.

En kort skärmdemonstration av jämförelsen kan senare testa övergången från guide till försäkringsaktör. Prioritet nu är korrekt sida, godkända samarbeten och fungerande spårningslänkar. Ingen annonsbudget eller extern produktion har startats.
