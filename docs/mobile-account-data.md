# Konto, integritet och radering för mobilförberedelsen

Inventering och lokal verifiering: 30 september 2026. Inga konton eller produktionsuppgifter har raderats. Ingen databasändring eller backenddeployment har gjorts.

## Färdiga lokala delar

- `src/mobile/MobilePrivacyPage.tsx`: offentlig information för `/integritet` med de uppgiftsflöden som kan beläggas i aktuell kod.
- `src/mobile/MobileDeleteAccountPage.tsx`: offentlig sida för `/radera-konto`, inloggning och permanent kontoradering med skriven bekräftelse. Även utan inloggning finns kontaktväg för konto/banprofil.
- `src/lib/accountDeletion.ts`: skickar enbart bekräftelsen och aktuell användares JWT till backend. En ändrad inloggning jämfört med det konto som visades avbryter åtgärden. Serverbekräftad radering hålls isär från eventuell lokal utloggningsstörning.
- `supabase/functions/delete-account/`: serverfunktion för hård radering via Supabase Auth, serverkontroll av identitet och aktiv session, återkallande av sessioner, kontroll av raderingsresultat och ett strikt kontrollskript för databeroenden. Kräver backenddriftsättning, aktiveringsflagga och verifiering mot hela faktiska schemat.

## Två separata identiteter

### Konto för e-post/lösenord

`AuthDialog.tsx` använder `supabase.auth.signUp` och `signInWithPassword`. `AuthContext.tsx` hanterar sessionen. `saved_courses`, `course_comments`, klubbdelning och `dog_match_profiles` används av kontofunktioner. Hundprofilers `store` innehåller hundens namn, sport, klassnivå och storlek. Accepterade vänner kan läsa och redigera dessa profiler genom befintliga RLS-regler.

Klientlagringen för auth sköts av `previewAuthStorage.ts`; vanlig drift använder localStorage medan vissa inramade förhandsvisningar delar inloggning via värdplattformen. Ingen serverhemlighet läggs i mobilpaketet av denna ändring.

### E-postbekräftelse och mobilens inloggning

Mobilappen använder lösenordsinloggning. Efter registrering instrueras användaren att bekräfta e-posten och därefter logga in i appen manuellt. `signUp` anger inte `emailRedirectTo`, så Supabase använder projektets konfigurerade Site URL för bekräftelselänken; WebView-adressen `capacitor://localhost` skickas inte automatiskt som redirect. Site URL måste kontrolleras mot den publicerade tjänstens adress inför lansering. Inget lösenordsåterställnings-, OAuth- eller magic-link-flöde finns i denna version, och den egna URL-schemat routar sidor utan att växla in authcallbacktokens. Lägg inte till löften om automatisk återinloggning från e-post eller OAuth utan att implementera och verifiera ett sådant flöde.

### Banprofil med namn/e-post och profilnyckel

`plannerProfile.ts` och `planner-social/index.ts` använder `planner_profiles.id` och ett slumpat `edit_token`. Detta är **inte** samma konto som `auth.users`. E-post ensam ger inte åtkomst till en befintlig banprofil. Namn och e-post skickas vid profilsparande; profil-id, namn, e-post och nyckel lagras i localStorage under `am-planner-profile`.

Profiler har banor, kommentarer och betyg genom kaskader i `20260816080012_…sql`. Instruktörens `coaching_groups` refererar banprofilen, och elev-, uppgifts-, rapport- och återkopplingsdata ligger under grupperna. Elevlänkar använder separata tokens. Ingen auth-FK till banprofilen finns i de lokala migrationsfilerna.

**Kvar:** automatiserad permanent radering av banprofil/instruktörsdata. Kontoraderingsfunktionen tar aldrig bort en banprofil utifrån samma e-postadress. Säker framtida profilradering måste verifiera profil-id och profilnyckel på servern och testa hela instruktörsgrafen. Tills dess hänvisar sidan en sådan begäran till befintliga kontaktadressen `info@auroramedia.se`. Det är en kontaktväg; ingen tidsfrist eller garanterad process har utlovats. Produkttexten skiljer tydligt mellan att glömma profilen lokalt och att radera serverdata.

## Vad som faktiskt kan beläggas

| Uppgifter | Kodens lagring/överföring |
| --- | --- |
| Banutkast, lokala banor, träningspass, resultat, favoriter, filter | Enhetens localStorage; dessa är separata från authkontot |
| E-post/lösenord och inloggningssession | Supabase Auth; session på enheten |
| Kontots sparade banor och kommentarer | Supabase via `features/course-planner-v2/library.ts` |
| Hundprofiler och vänfunktioner | `dog_match_profiles`, `profiles`, `friendships` |
| Banprofil, delade banor, kommentarer och betyg | `planner_profiles`, `planner_courses`, `planner_course_comments`, `planner_course_ratings` |
| Instruktörsgrupper, elevnamn/hundnamn, uppgifter, rapporter, återkoppling | `coaching_*` via banprofilens ägarbevis |
| Feedback | Valfria namn/e-post, kategori, meddelande, sidans adress, webbläsarinformation och valfri banögonblicksbild i `planner_feedback` |
| Webbpush | Endpoint, pushnycklar, valda tävlingar och user-agent i `push_subscriptions`; historik i `push_notifications_sent`. Ingen koppling till authkonto i lokalt schema |
| Nära-mig-funktionen | Position läses efter tillstånd och används för avstånd/närmaste län i tävlingsvyn |
| Kartbilder | Hämtas från `tile.openstreetmap.org` |
| Statistik i mobilpaketet | Ingen statistikinsamling; `main-native.tsx` startar inte GA4 och `vite.native.config.ts` ersätter `analytics` med `nativeAnalytics.ts` utan insamling |
| Statistik på webbdomänen | GA4 med samtycke. Frågeparametrar/fragment rensas ur sid-URL; konto/elev exkluderas. Tillåtna värdar är `agilitymanager.se` och `www.agilitymanager.se`, inte mobilens lokala ursprung |
| Externa videor och partnerlänkar | Länkar till externa tjänster; inte videofiler lagrade i denna app |

Övergripande rättslig grund, personuppgiftsansvarig med organisations-/adressuppgifter, leverantörsavtal, lagringsfrister, faktiska backup-/loggrutiner och dataöverföringar har **inte** kunnat fastställas ur koden. Den offentliga sidan hittar inte på dem. Innan butikslansering måste ansvarig för tjänsten komplettera och godkänna den publicerade integritetstexten och butiksformulären mot verklig drift. Detta dokument är en teknisk inventering, inte ett färdigt rättsligt godkännande.

## Säkert raderingsflöde

1. Kunden skriver `RADERA` och skickar användar-JWT i `Authorization`. Begäran får inte innehålla användar-id eller extra fält och begränsas till 1 KiB.
2. Serverns `getUser(jwt)` verifierar JWT hos Auth; anonyma authkonton avvisas. Endast den verifierade användarens id kan raderas.
3. Efter verifiering läses den signerade `session_id`-claimen. Den måste stämma med verifierad `sub` och en levande rad för samma användare i `auth.sessions`. En gammal utloggad JWT räcker inte.
4. `account_deletion_preflight` körs som service_role, med `SECURITY INVOKER`. `PUBLIC`, `anon` och `authenticated` har inte rätt att köra den. Den ändrar inga uppgifter.
5. Kontrollerna kräver validerade `ON DELETE CASCADE` genom hela den användaranknutna FK-grafen och för kända identitetskolumner i `public`. Saknas en kaskad eller finns ägda Storage-objekt avbryts raderingen före dataradering. Storage-objekt måste först hanteras via Storage API av ett separat verifierat flöde.
6. Servern återkallar alla användarens sessioner och hårdraderar Auth-användaren med `admin.deleteUser(id, false)`. Inga klientanrop med service_role finns.
7. Servern bekräftar från Auth att användaren saknas (404) innan den svarar `deleted: true`. Klienten rensar därefter sin authsession.

Supabase JWT-access-token kan vara kryptografiskt giltig fram till sin utgång även efter global utloggning/radering. Aktiv-session-kontrollen skyddar raderingsfunktionen. FK-kraven förhindrar att kontoanknutna rader återskapas för ett borttaget auth-id. Andra känsliga backendfunktioner behöver också kontroll av session/användare där strikt omedelbar återkallelse krävs. Ingen garanti om generell tokeninvalidering lämnas.

Kontrollen är avsiktligt strikt och kan neka radering för äldre delat klubb-/affärsinnehåll. Ändra inte godtyckligt hela databasen till CASCADE för att få den att gå igenom: gemensamt innehåll, betalningshistorik och andra personers uppgifter behöver verksamhetsbeslut och en egen verifierad hantering. Om det verkliga schemat innehåller användarreferenser med andra namn eller inuti JSON måste de täckas efter inventering; heuristiken är inte ett ersättningsbevis för en fullständig granskning.

## Viktigt om schema och driftsättning

Projekt-id i befintlig `supabase/config.toml` är `rcubbmnosawdtaupixnm`. Den tillgängliga Supabase-anslutningens projektlista omfattade inte detta projekt vid arbetet. Det verkliga schemat och policies har därför inte kunnat kontrolleras live. Äldre authtabeller saknar dessutom migrationskällor i detta repository: genererade `types.ts` visar tabeller/kolumner men bevisar inte deras FK-raderingsregler.

Ett konkret känt hinder är `dog_match_profiles.user_id`: lokal migration skapar kolumnen utan FK till `auth.users`. Preflight nekar därför radering för detta schema, så att molnuppgifter inte lämnas som föräldralösa rader. Ingen sådan FK har lagts till i produktion eller utan att först kontrollera befintliga data.

Genererade typer visar ytterligare dessa identitetskolumner att inventera: `achievements.user_id`, `cached_dog_results.user_id`, `club_event_signups.user_id`, `club_events.user_id`, `club_group_members.user_id`, `club_interest_leads.user_id`, `club_members.user_id`, `club_posts.user_id`, `club_subscriptions.created_by`, `clubs.created_by`, `coach_feedback.user_id`, `competition_interests.user_id`, `competition_log.user_id`, `competition_reminders.user_id`, `competition_results.user_id`, `course_comments.user_id`, `course_purchases.user_id`, `dogs.user_id`, `friendships.receiver_id/requester_id`, `health_logs.user_id`, `messages.receiver_id/sender_id`, `notifications.user_id`, `planned_competitions.user_id`, `planned_training.user_id`, `profiles.user_id`, `referral_rewards.referrer_id`, `saved_courses.user_id`, `signup_sources.user_id`, `stopwatch_results.user_id`, `support_tickets.user_id`, `training_goals.user_id`, `training_milestones.user_id`, `training_sessions.user_id` och `user_roles.user_id`.

Före aktivering:

1. Skaffa åtkomst till rätt projekt och inventera faktisk FK-graf, RLS, Storage, alla andra användarreferenser och eventuell faktura-/klubbdata. Fastställ hur gemensamma och rättsligt bevarade uppgifter ska behandlas.
2. Installera och granska `delete-account/preflight.sql` i staging. Det är ett funktionsskript, inte en utförd migration; det lägger inte till kaskader och raderar inga rader. Skapa versionerade schemareparationer med CLI:s dokumenterade migrationsflöde efter att de verkliga beroendena är kända.
3. Testa med särskilda stagingkonton: konto med hela datauppsättningen, annat konto, fel JWT, borttagen session, Storage-objekt, nätverksfel och blockerande FK. Bekräfta att rätt kontodata försvinner och att andra konton/delat innehåll behandlas enligt beslutet.
4. Deploya `delete-account` med JWT-kontroll aktiverad (standard). Servern verifierar dessutom själv mot Auth. Håll `SUPABASE_SERVICE_ROLE_KEY` enbart i serverns miljö och sätt `ACCOUNT_DELETION_ENABLED=true` först efter fullständig staginggranskning. Utan den flaggan nekar funktionen radering.
5. Publicera/verifiera webbadresserna `/integritet` och `/radera-konto` på tjänstens domän och kontrollera butikernas formulär. Lokalt skapade routes är inte samma sak som publicerade sidor.
6. Kontrollera att radering fungerar från både fysisk iPhone och Android med samma korrekt konfigurerade backend före inskickning till butikerna.

## Utförd lokal verifiering

26 tester passerade i tre nya testfiler. En PGlite-databas användes med påhittade konton för faktiska FK-/SQL- och rollkontroller; ingen riktig Supabase-användare berördes. Testerna täcker bland annat att det andra kontot behålls, ofullständig kaskad/orphan-risk och ägda Storage-objekt stoppas, utloggade sessioner nekas, klientval av konto avvisas, storleksgräns fungerar och radering aldrig rapporteras vid obekräftat resultat. TypeScriptkontroll och lint av de nya filerna passerade.

Kvar att verifiera: exakt produktionsschema, installation/driftsättning av backend, verklig Auth/Storage-integration och mobilflödet på fysiska enheter. Lokal verifiering av fixturer bevisar inte att det ännu okända produktionsschemat är klart.

## Kontrollerad dokumentation

Supabase changelog och aktuella dokumentationssidor kontrollerades 30 september 2026. Inget relevant ändrat Auth-admin-signaturkrav identifierades; Edge Function använder samma exakt pinnade `supabase-js@2.109.0` som befintlig plannerfunktion.

- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Auth deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Auth admin signOut](https://supabase.com/docs/reference/javascript/auth-admin-signout)
- [Sessions och session_id](https://supabase.com/docs/guides/auth/sessions)
- [Edge Function authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase changelog](https://supabase.com/changelog)
