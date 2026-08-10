import { Link } from "react-router-dom";
import { ArrowRight, Check, LayoutGrid, Smartphone, Ruler, Share2 } from "lucide-react";

/** Reusable, content-rich internal-link section for public pages. */
export function PlannerSeoFooter() {
  return (
    <section className="border-t border-border bg-muted/35 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-primary">Gratis agilityverktyg</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Rita nästa agilitybana gratis</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">AgilityManagers banplanerare fungerar direkt i webbläsaren utan registrering. Bygg i meterskala, placera och rotera hinder, numrera banan, se hundlinje och avstånd och kontrollera ritningen mot svenska banregler.</p>
            <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
              {["Ingen inloggning för att börja", "Agility och hoopers", "Lokal autosparning", "Banbank med kopierbara banor", "Svensk regelkontroll", "Mobil, surfplatta och dator"].map((item) => <div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{item}</div>)}
            </div>
            <Link to="/banplanerare" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">Öppna gratis banplaneraren <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[ [LayoutGrid,"Riktig banritning","Rutnät och meterskala"], [Ruler,"Mät avstånd","Kontrollera hinderlinjer"], [Smartphone,"Rita överallt","Touchanpassad editor"], [Share2,"Bygg en banbank","Spara, kopiera och dela"] ].map(([Icon,title,text]) => {
              const C = Icon as typeof LayoutGrid;
              return <div key={String(title)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><C className="h-5 w-5 text-primary" /><div className="mt-3 font-semibold">{String(title)}</div><div className="mt-1 text-xs text-muted-foreground">{String(text)}</div></div>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
