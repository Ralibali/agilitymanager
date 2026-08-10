import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, LayoutGrid, Ruler, ShieldCheck, Smartphone, Sparkles, Users, MousePointer2, Save, Copy, FileDown } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { CourseMapLegend } from "@/components/CourseMapLegend";
import { COURSE_BANK } from "@/features/free-planner/courseBank";

const demo = [
  { n: 1, x: 13, y: 78, r: -18, t: "jump" }, { n: 2, x: 26, y: 65, r: 20, t: "jump" },
  { n: 3, x: 40, y: 76, r: 4, t: "tunnel" }, { n: 4, x: 50, y: 58, r: 70, t: "jump" },
  { n: 5, x: 67, y: 67, r: -10, t: "weave" }, { n: 6, x: 80, y: 52, r: 82, t: "jump" },
  { n: 7, x: 66, y: 37, r: 8, t: "aframe" }, { n: 8, x: 47, y: 33, r: -25, t: "jump" },
  { n: 9, x: 27, y: 40, r: 66, t: "tunnel" }, { n: 10, x: 18, y: 20, r: 10, t: "jump" },
];

function MiniObstacle({ item }: { item: (typeof demo)[number] }) {
  const line = item.t === "tunnel" ? "w-10 rounded-t-full border-x-4 border-t-4 border-slate-700 h-6" : item.t === "weave" ? "w-12 border-t-2 border-dotted border-slate-700" : item.t === "aframe" ? "h-7 w-10 border-x-[8px] border-b-4 border-primary/70 [clip-path:polygon(0_100%,50%_0,100%_100%)]" : "w-10 border-t-[3px] border-slate-800";
  return <div className="absolute" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%,-50%) rotate(${item.r}deg)` }}><div className={line} /><span className="absolute -right-4 -top-4 grid h-5 w-5 place-items-center rounded-full border border-slate-700 bg-white text-[9px] font-bold text-slate-900">{item.n}</span></div>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Gratis banplanerare för agility | AgilityManager</title>
        <meta name="description" content={`Rita agilitybanor gratis direkt i webbläsaren. Ingen inloggning krävs. Meterskala, svensk regelcheck och Banbank med ${COURSE_BANK.length} originalbanor för klass 1–3.`} />
        <link rel="canonical" href="https://agilitymanager.se/" />
        <meta property="og:title" content="Rita agilitybanor gratis – AgilityManager" />
        <meta property="og:description" content={`Gratis banplanerare för agility med svensk regelcheck och ${COURSE_BANK.length} kopierbara banor. Börja rita direkt utan konto.`} />
        <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication","name":"AgilityManager Banplanerare","applicationCategory":"SportsApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"SEK"},"description":"Gratis webbaserad banplanerare för agility med meterskala, svensk regelcheck och Banbank."})}</script>
      </Helmet>
      <LandingNav />

      <main>
        <section className="overflow-hidden border-b border-border bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/.12),transparent_38%)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:pb-24 lg:pt-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> 100 % gratis att börja · inget konto</div>
              <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">Rita din agilitybana <span className="text-primary">direkt.</span></h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">AgilityManagers kostnadsfria banplanerare är byggd för svenska agilityförare, tränare, instruktörer och klubbar. Placera hinder i riktig meterskala, numrera, mät avstånd och bygg banor utan att registrera dig.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link to="/banplanerare" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">Rita en bana gratis <ArrowRight className="h-5 w-5" /></Link><Link to="/banplanerare?view=bank" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card px-7 text-base font-semibold hover:bg-muted"><LayoutGrid className="h-5 w-5" /> Öppna Banbanken</Link></div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{["Ingen installation","Mobil & dator",`${COURSE_BANK.length} banor i Banbanken`,"Lokal autosparning"].map(x=><span key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{x}</span>)}</div>
            </div>

            <div className="relative rounded-[2rem] border border-slate-300 bg-white p-3 shadow-2xl shadow-slate-900/10">
              <div className="mb-2 flex items-center justify-between px-2 text-xs text-slate-500"><span className="font-semibold text-slate-800">Klass 1 · träningsbana</span><span>30 × 40 m</span></div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-300 bg-white" style={{backgroundImage:"linear-gradient(to right,#d9dee7 1px,transparent 1px),linear-gradient(to bottom,#d9dee7 1px,transparent 1px)",backgroundSize:"10% 12.5%"}}>
                <CourseMapLegend title="Agility · Klass 1" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M13 78 C20 70 20 68 26 65 S34 70 40 76 S47 65 50 58 S60 64 67 67 S78 62 80 52 S73 42 66 37 S55 31 47 33 S35 38 27 40 S22 29 18 20" fill="none" stroke="hsl(var(--primary))" strokeWidth=".7" strokeDasharray="2 1.5" opacity=".65" /><g fill="hsl(var(--primary))">{demo.slice(0,-1).map((o,i)=><polygon key={i} points={`${(o.x+demo[i+1].x)/2},${(o.y+demo[i+1].y)/2} ${(o.x+demo[i+1].x)/2-1},${(o.y+demo[i+1].y)/2-1} ${(o.x+demo[i+1].x)/2+1},${(o.y+demo[i+1].y)/2-1}`} />)}</g></svg>
                {demo.map(item=><MiniObstacle key={item.n} item={item} />)}
                <span className="absolute bottom-2 left-2 text-[9px] font-medium text-slate-500">AgilityManager.se · banritning</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">Meterskala</b><span className="text-muted-foreground">1 m-grid</span></div><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">Hundlinje</b><span className="text-muted-foreground">live</span></div><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">Regelcheck</b><span className="text-muted-foreground">Sverige</span></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Från idé till färdig banritning</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">Allt du behöver för att planera en bana</h2><p className="mt-4 text-lg text-muted-foreground">Vi har byggt ritmiljön efter hur tävlings- och träningsbanor faktiskt presenteras: tydligt rutnät, hinder i planvy, numrering vid ansatsen, hundlinje, mått och baninformation.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[
            [MousePointer2,"Placera och rotera hinder","Dra in hopp, tunnel, slalom, kontaktfält, långhopp, mur och fler hinder. Flytta och rotera direkt på ritbordet."],
            [Ruler,"Riktig meterskala","Banområdet ritas i meter med rutnät så att avstånd, placering och säkerhetsmarginaler blir begripliga."],
            [ShieldCheck,"Svensk regelcheck","Välj klass och bantyp och få direkt varningar för regler som går att kontrollera från själva ritningen."],
            [Save,"Autospara gratis","Din aktuella bana kan ligga kvar lokalt på enheten utan att du först behöver skapa konto."],
            [Copy,"Kopiera från Banbanken",`Välj bland ${COURSE_BANK.length} originalbanor för klass 1–3, öppna en bana och anpassa den till din egen träningsyta.`],
            [FileDown,"Ta med banan","Exportera banans data och använd ritningen när du bygger träningsbanan på klubben eller hemma."],
          ].map(([Icon,title,text])=>{const C=Icon as typeof Ruler;return <article key={String(title)} className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><C className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-semibold">{String(title)}</h3><p className="mt-2 leading-7 text-muted-foreground">{String(text)}</p></article>})}</div>
        </section>

        <section className="border-y border-border bg-muted/35 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-8 lg:grid-cols-2 lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Banbanken · {COURSE_BANK.length} regeltestade originalbanor</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Slipp börja från ett tomt papper</h2><p className="mt-4 text-lg leading-8 text-muted-foreground">Filtrera banor för agilityklass och hoppklass i klass 1, 2 och 3. Välj fokus som flyt, handling, kontaktfält, fart eller teknik, kopiera sedan layouten till planeringsverktyget och gör den till din egen.</p><Link to="/banplanerare?view=bank" className="mt-6 inline-flex items-center gap-2 font-bold text-primary">Utforska alla banor <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl border border-border bg-card p-6"><Users className="h-6 w-6 text-primary"/><h3 className="mt-4 font-semibold">För tränare & instruktörer</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Förbered pass, återanvänd uppställningar och bygg tydliga sekvenser för gruppträning.</p></div><div className="rounded-3xl border border-border bg-card p-6"><Smartphone className="h-6 w-6 text-primary"/><h3 className="mt-4 font-semibold">För förare</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Spara inspiration, förstå linjer och ta med en tydlig karta till träningsplanen.</p></div></div></div></div></section>

        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:py-24"><h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Börja med första hindret. Kontot kan vänta.</h2><p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Öppna banplaneraren och börja rita direkt. Gratisläget är inte en låtsas-demo – det är själva verktyget.</p><Link to="/banplanerare" className="mt-7 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 font-bold text-primary-foreground">Öppna gratis banplaneraren <ArrowRight className="h-5 w-5" /></Link></section>
      </main>
      <LandingFooterV2 />
    </div>
  );
}
