import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Cloud, Dog, Library, MousePointer2, Ruler, ShieldCheck, Smartphone } from "lucide-react";
import { trackGrowthEvent } from "@/lib/growth";

const FEATURE_CARDS = [
  { icon: Ruler, title: "Riktig meterskala", text: "Ritbordet använder 1-metersrutnät och banmått i meter, inte en lös skiss." },
  { icon: ShieldCheck, title: "Svensk bancheck", text: "Livekontroll av bland annat hinderantal, hoppassager, avstånd, kontakthinder och raka ansatser." },
  { icon: Smartphone, title: "Mobil, surfplatta och dator", text: "Dra, rotera, numrera och ändra banan direkt med mus eller touch." },
];

export default function LandingPage() {
  return (
    <div className="light min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Rita agilitybana gratis | AgilityManager</title>
        <meta
          name="description"
          content="Rita agilitybanor gratis direkt i webbläsaren. Svensk regelkontroll, riktig meterskala, lokal autosparning och banbank – utan registrering."
        />
        <link rel="canonical" href="https://agilitymanager.se/" />
      </Helmet>

      <header className="border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="mr-auto font-display text-xl font-semibold tracking-tight">
            Agility<span className="text-primary">Manager</span>
          </Link>
          <Link to="/banplanerare?view=bank" className="hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-medium hover:bg-muted sm:inline-flex">
            <Library size={16} /> Banbanken
          </Link>
          <Link to="/auth?mode=login" className="h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted inline-flex">
            Logga in
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.12),transparent_45%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                <CheckCircle2 size={14} /> Gratis · ingen registrering krävs
              </div>
              <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Rita en riktig agilitybana.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Planera nästa träning i riktig meterskala. Lägg ut hindren, dra hundlinjen och få svenska banregler kontrollerade direkt medan du bygger.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/banplanerare"
                  onClick={() => trackGrowthEvent("free_tool_cta_clicked", { placement: "new_landing_hero", tool: "course_planner" })}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  Rita en bana <ArrowRight size={18} />
                </Link>
                <Link
                  to="/banplanerare?view=bank"
                  onClick={() => trackGrowthEvent("course_bank_cta_clicked", { placement: "new_landing_hero" })}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-base font-semibold hover:bg-muted"
                >
                  <Library size={18} /> Utforska banbanken
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> Ingen betalvägg i ritandet</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> Sparas på din enhet</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> Svenska regler + FCI</span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-3 shadow-2xl shadow-foreground/10 sm:p-4">
              <div className="rounded-[1.4rem] border border-border bg-muted p-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-foreground/15 bg-background">
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      backgroundImage: "linear-gradient(to right, hsl(var(--foreground) / 0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
                      backgroundSize: "5% 6.66%",
                    }}
                  />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" aria-hidden>
                    <polyline points="14,12 30,12 47,12 64,12 84,12 84,31 67,31 49,31 31,31 14,31 14,50 31,50 49,50 67,50 84,50 84,66 67,66 49,66 31,66 14,66" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.25" strokeWidth="1.4" strokeDasharray="3 3" />
                    {["14,12","30,12","47,12","64,12","84,12","84,31","67,31","49,31","31,31","14,31","14,50","31,50","49,50","67,50","84,50","84,66","67,66","49,66","31,66","14,66"].map((point, i) => {
                      const [cx, cy] = point.split(",");
                      return <circle key={point} cx={cx} cy={cy} r="2.4" fill="hsl(var(--foreground))" opacity={i === 0 || i === 19 ? 1 : 0.72} />;
                    })}
                  </svg>
                  <div className="absolute left-3 top-3 rounded-lg border border-border bg-card/90 px-2.5 py-1 text-[10px] font-semibold">40 × 30 m</div>
                  <div className="absolute bottom-3 left-3 rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">✓ Bancheck</div>
                  <div className="absolute bottom-3 right-3 rounded-lg border border-border bg-card/90 px-2.5 py-1 text-[10px] font-semibold">20 hinder</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Bygg för verkligheten</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Inte bara ikoner på en tom yta.</h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Målet är att ritningen ska gå att använda när hindren faktiskt ska ställas ut på planen. Därför bygger vi in mått, riktning och regler i själva arbetsflödet.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURE_CARDS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-3xl border border-border bg-card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={20} /></div>
                <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Library size={14} /> Banbanken</div>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Börja från en bana istället för ett tomt papper.</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Kopiera en färdig svensk agility- eller hoppbana med ett klick och justera den efter din egen plan och träning.
                </p>
                <Link to="/banplanerare?view=bank" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline">
                  Öppna banbanken <ArrowRight size={17} />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-card p-5"><MousePointer2 className="text-primary" /><h3 className="mt-4 font-display text-lg font-semibold">Kopiera</h3><p className="mt-1 text-sm text-muted-foreground">Öppna en färdig layout i editorn direkt.</p></div>
                <div className="rounded-3xl border border-border bg-card p-5"><Ruler className="text-primary" /><h3 className="mt-4 font-display text-lg font-semibold">Anpassa</h3><p className="mt-1 text-sm text-muted-foreground">Flytta hinder och se avstånden uppdateras live.</p></div>
                <div className="rounded-3xl border border-border bg-card p-5"><Cloud className="text-primary" /><h3 className="mt-4 font-display text-lg font-semibold">Molnspara senare</h3><p className="mt-1 text-sm text-muted-foreground">Konto behövs först när du vill synka och publicera.</p></div>
                <div className="rounded-3xl border border-border bg-card p-5"><Dog className="text-primary" /><h3 className="mt-4 font-display text-lg font-semibold">Träningen finns kvar</h3><p className="mt-1 text-sm text-muted-foreground">Hundar, träningslogg och statistik lever vidare bakom kontot.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Rita första banan nu.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Du behöver inte skapa konto, ange kort eller installera något.</p>
          <Link to="/banplanerare" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20">
            Öppna banplaneraren <ArrowRight size={18} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center">
          <div className="font-display font-semibold text-foreground">Agility<span className="text-primary">Manager</span></div>
          <p className="md:mr-auto">Banplanering först. Träningsresan när du vill.</p>
          <Link to="/integritetspolicy" className="hover:text-foreground">Integritet</Link>
          <Link to="/ansvarsfriskrivning" className="hover:text-foreground">Ansvarsfriskrivning</Link>
        </div>
      </footer>
    </div>
  );
}
