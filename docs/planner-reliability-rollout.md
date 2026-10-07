# Banplaneraren: molnsparning och bekräftelsemejl

Den här ändringen kräver en databasmigration och inställningar i projektets Auth-tjänst. Att publicera enbart webbappen aktiverar inte dessa delar.

## Driftsättningsordning

1. Använd projektet `rcubbmnosawdtaupixnm` som webbappen redan är ansluten till. Kontrollera att det är rätt Lovable/Supabase-miljö innan något appliceras.
2. Applicera `supabase/migrations/20261007090204_planner_cloud_versions.sql` med den befintliga migrationsprocessen. Om projektet hanteras via Lovable Cloud måste migrationen appliceras där. Migrationen lägger till revisioner, privata historikposter och skrivskydd via RLS. Den behåller befintliga banor och deras synlighet, och skapar en första historikpost för dem.
3. Uppdatera den driftade Auth-konfigurationen enligt nedan. `supabase/config.toml` dokumenterar samma värden men ändrar inte den driftade tjänsten genom en frontendpublicering.
4. Publicera webbappen. Gör kontrollen nedan med ett eget testkonto.

Ingen produktionsmigration, publicering av banor, mejlsändning eller ändring av driftad Auth-konfiguration gjordes när den här PR:en skapades. Den tillgängliga Supabase-anslutningen gav inte åtkomst till målprojektet. Banan ”TEST Hark” har inte öppnats eller ändrats.

## Bekräftelsemejl

| Inställning | Värde |
| --- | --- |
| Site URL | `https://agilitymanager.se` |
| Tillåtna returadresser | `https://agilitymanager.se/auth/bekrafta`, `https://www.agilitymanager.se/auth/bekrafta` |
| Minsta längd för nya lösenord | 8 tecken |
| Ämne, Confirm signup | `Bekräfta ditt konto hos AgilityManager` |
| HTML, Confirm signup | Innehållet i `supabase/templates/confirmation.html` |

Mallen går till webbappens `/auth/bekrafta` med `TokenHash`. Webbappen verifierar token via Supabase-klienten med projektets publika API-nyckel. Lägg inte in en bar `/auth/v1/verify`-adress som reservlänk: den kan ge ”No API key found in request”. Behåll mallvariablerna exakt som de står i filen.

Spårnings-/omdirigeringsdomänen `email.auth.lovable.cloud` bestäms av mejlleverantören. En ändring av React-koden ersätter inte den. Kontrollera i Lovable/leverantören om länkspårning kan stängas av eller en egen domän konfigureras, och kontrollera slutdestinationen för både knappen och reservlänken efter eventuella omskrivningar.

## Kontroll efter driftsättning

- Logga in, spara en ny privat bana och kontrollera ”Sparad på kontot · v1”. Öppna den i en separat webbläsare. Äldre lokala banor flyttas inte automatiskt: öppna dem under ”Lokalt & äldre banprofil” och välj Spara bana medan du är inloggad.
- Spara en ändring som v2. Öppna v1 via versionslistan och spara som v3. V1 och v2 ska finnas kvar. En gammal flik får ett konfliktmeddelande; Spara som kan behålla dess ändringar separat.
- Kontrollera med ett annat konto att den privata banan och historiken inte kan läsas. Även historiken bakom en publik bana ska vara privat.
- Koppla ned nätet och försök spara. Utkastet ska finnas kvar och statusen ska visa osparade ändringar. JSON-export fungerar som egen säkerhetskopia.
- Skapa ett eget testkonto med minst 8 tecken. Kontrollera svenskt ämne, knapp och reservlänk. En förbrukad eller utgången länk ska visa svensk förklaring och möjlighet att få en ny. Kontrollera även återutsändning. Skicka endast till en adress testaren kontrollerar.
- Öppna en bana med start- och målmarkörer. Kontrollera att tabellens delsträckor summerar till banlängden och att Domar-PDF visar samma längd och tider.

## Automatiska kontroller

`npm test`, `npm run test:planner-db`, `npm run lint`, `npm run build` och `npm run test:e2e` körs i Planner CI. Databastestet kör själva migrationen i PGlite och testar RLS, historik, oförändrad synlighet och konfliktkontroll. Webbläsartesternas konto-/mejlserver är simulerad; de ersätter inte kontrollen av driftade tjänster ovan.

Vid återställning kan den tidigare webbappen publiceras igen utan att ta bort de nya databasfälten eller historiktabellen. Radera inte versionerna som del av en frontendåterställning.
