# Visa när en bana inte kunde sparas lokalt

6 september 2026. Utvecklingsförslag; inte publicerat.

När webbläsarens lagring är blockerad, full eller banan för stor visade planeraren tidigare en sparbekräftelse trots att skrivningen misslyckades. Sparstatus uppdateras nu först efter en lyckad skrivning; annars får användaren ett felmeddelande och råd att exportera JSON. En uppdaterad bana placeras först så att den inte trimmas bort som en äldre post. Misslyckad borttagning visas också.

Verifiering: 148 tester i 14 filer, typkontroll, lint och produktionsbygge passerar. Tre nya regressionstester fallerar mot tidigare kod. Lokalt webbläsarprov: exempelbana sparad och återfunnen i Öppna bana efter omladdning. Felvägarna verifieras med simulerad lagringskvot och blockerad lagring. Ingen molnsparning eller publicering ändrad.

