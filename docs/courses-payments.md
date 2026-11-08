# Kursanmälningar och betalning

Granskat mot `main` (`1c1d716a`) och Git-historiken den 15 oktober 2026.

## Vad som redan finns

- `courses` och `course_purchases` i de genererade Supabase-typerna beskriver en äldre digital kurskatalog. De är inte anmälningar till instruktörsledda kurser med datum, ekipage och väntelista.
- Nuvarande källkod har ingen Stripe-kassa, betalningswebhook eller koppling mellan instruktör och betalningsmottagare. Stripe-ID:n i äldre tabeller visar inte att en sådan integration är aktiv.
- Commit `08aa47dc` tog bort den äldre Stripe-koden i samband med produktens omläggning till gratis banplanerare. Den öppna PR:en #2 gäller den gamla abonnemangskassan. Den äldre engångskassan gällde plattformens videoanalyskrediter. Ingen av dem hanterar betalning till kursinstruktörer.
- Ingen ändring i denna MVP aktiverar, återställer eller modifierar äldre Stripe-funktioner eller abonnemang. En eventuell äldre funktion som fortfarande finns driftsatt är inte en verifierad kursbetalningsintegration.

## MVP: betalning direkt till instruktören

Gratis kurser har pris 0 kr. Kurser med avgift anger ett totalpris i hela SEK och instruktörens betalningsinformation innan publicering. Deltagaren betalar direkt till instruktören enligt den informationen. Appen tar inte emot eller förmedlar pengar.

En bekräftad plats och mottagen betalning är två olika uppgifter. Instruktören måste kontrollera betalningen innan den markeras som mottagen. En väntelisteplats ska inte uppmana till betalning. Att öppna en länk, registrera en anmälan eller besöka en bekräftelsesida är aldrig ett betalningsbevis.

Kursens avgift och betalningssätt ska inte ändras medan aktiva anmälningar finns. Varje anmälan behåller priset och betalningsinformationen från anmälningstillfället. En betalningsmarkering ska ske genom den behörighetskontrollerade instruktörsfunktionen, med kontroll av kursägare och aktuell revision. Deltagare kan inte sätta eget pris eller markera en betalning som mottagen.

Återbetalning av redan mottagen betalning sker direkt mellan instruktör och deltagare. En avanmälan eller inställd kurs genomför ingen automatisk återbetalning och behåller betalningsuppgiften. Instruktören kan därefter uttryckligen registrera att en återbetalning redan har genomförts; den markeringen genomför ingen överföring. Kursens avbokningsvillkor ska framgå före anmälan.

Betalningsstatus är `not_required` för gratis kurser och `unpaid`, `paid` eller `refunded` för kurser med avgift. En väntelisteplats innebär ingen betalningsuppmaning även om dess framtida avgift sparas som `unpaid`. Endast kursägaren kan registrera mottagen betalning för en bekräftad plats. Återbetalning kräver en avbokad, tidigare betald plats och ett uttryckligt `refund_confirmed: true`. Båda åtgärderna kontrollerar revision och registrerar instruktör samt tid.

## Innan onlinebetalning kan aktiveras

Bekräfta vem som säljer kursen och ska ta emot pengarna. Implementera därefter mottagarkoppling, beredskapskontroll och ett separat granskat betalningsflöde. För självständiga instruktörer krävs en lösning som håller varje instruktörs betalningar och behörigheter åtskilda, exempelvis en genomtänkt Stripe Connect-integration.

En framtida kassa behöver serverberäknat pris, tidsbegränsad platsreservation, idempotenta betalningshändelser, verifierade webhook-signaturer, hantering av fördröjda/nekade betalningar och avstämning av avbokningar och återbetalningar. Testa hela flödet i en separat Stripe-testmiljö innan någon riktig betalning aktiveras. Återanvänd inte äldre abonnemangs- eller videoanalyskassor för kursavgifter.
