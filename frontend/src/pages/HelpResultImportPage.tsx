import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Search, Filter, CheckCircle2, Database, ExternalLink, AlertCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

/**
 * Publik hjälpsida som förklarar hur "Hämta mina resultat"-funktionen fungerar.
 * Länkad från FetchMyResultDialog för full transparens kring datakällor och GDPR.
 */
export default function HelpResultImportPage() {
  return (
    <>
      <SEO
        title="Så fungerar resultathämtning | Agility Manager"
        description="Transparent förklaring av hur vi hämtar dina tävlingsresultat från agilitydata.se och shok.se — vad som matchas, vad som sparas och vad som händer med andras data."
        canonical="https://agilitymanager.lovable.app/hjalp/resultathamtning"
      />
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-5 py-8">
          <Link
            to="/v3/competition"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft size={14} /> Tillbaka till tävlingar
          </Link>

          <header className="mb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <Shield size={12} />
              Transparens & GDPR
            </div>
            <h1 className="text-3xl font-display text-foreground mb-2">Så fungerar resultathämtning</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              När du trycker på <strong>Hämta mina resultat</strong> i en tävling kör vi ett 4-stegs flöde
              som är byggt för att vara transparent och GDPR-tryggt. Här är hela kedjan, steg för steg.
            </p>
          </header>

          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <Search size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-foreground mb-1">1. Vi söker efter resultat</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Först försöker vi hämta tävlingens publika resultatsida direkt från arrangörens länk
                    (oftast{" "}
                    <a href="https://agilitydata.se" target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex items-center gap-0.5">
                      agilitydata.se <ExternalLink size={10} />
                    </a>{" "}
                    eller{" "}
                    <a href="https://shok.se" target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex items-center gap-0.5">
                      shok.se <ExternalLink size={10} />
                    </a>
                    ). Om resultaten inte är publicerade där — eller länken är trasig — faller vi
                    automatiskt tillbaka på{" "}
                    <a href="https://agilitydata.se/resultat/soek-hund/" target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex items-center gap-0.5">
                      agilitydata.se/sök-hund <ExternalLink size={10} />
                    </a>
                    , som är agilitydata:s officiella söktjänst för hundresultat.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <Filter size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-foreground mb-1">2. Vi filtrerar på serversidan</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Datan landar först i vår backend, aldrig i din webbläsare. Där matchar vi rader mot{" "}
                    <strong>din hund</strong> och <strong>ditt förarnamn</strong> (samt tävlingsdatum vid
                    sök-fallback, ±2 dagar för flerdagstävlingar). Bara rader som matchar skickas vidare
                    till appen.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Andras rader passerar bara i RAM-minnet under några sekunder och slängs sedan — de
                    sparas aldrig i någon databas.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <CheckCircle2 size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-foreground mb-1">3. Du väljer vad som ska sparas</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Du ser en lista över träffarna med klass, placering, tid, fel och status. Bocka i de
                    rader du vill spara — du har full kontroll och inget importeras automatiskt.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <Database size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-foreground mb-1">4. Vi sparar — bara dina rader</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Valda rader sparas i din egen resultatlogg, kopplade till ditt konto och din hund.
                    Källa (t.ex. agilitydata.se) och importtidpunkt loggas i anteckningsfältet så att du
                    alltid kan se varifrån datan kommer.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h2 className="text-base font-medium text-foreground mb-1.5">
                    När det inte fungerar
                  </h2>
                  <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed list-disc pl-4">
                    <li>
                      <strong>Inga träffar:</strong> Resultaten kanske inte är publicerade ännu, eller så
                      stavas namnen annorlunda i listan. Justera förarnamnet och försök igen.
                    </li>
                    <li>
                      <strong>Förarnamn:</strong> Måste matcha exakt som i resultatlistan. Spara namnet i
                      Inställningar för att slippa skriva det varje gång.
                    </li>
                    <li>
                      <strong>Hundnamn:</strong> Använd registreringsnamnet (kennelnamn) — inte smeknamn.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-medium text-foreground mb-2">Vill du veta mer?</h2>
              <ul className="text-sm space-y-1.5">
                <li>
                  <Link to="/integritetspolicy" className="text-primary hover:underline">
                    Integritetspolicy →
                  </Link>
                </li>
                <li>
                  <Link to="/ansvarsfriskrivning" className="text-primary hover:underline">
                    Ansvarsfriskrivning →
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
