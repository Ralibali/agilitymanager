import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight, Box, Check, Copy, FileDown, LayoutGrid, MousePointer2,
  Ruler, Save, ShieldCheck, Smartphone, Sparkles, Users, ZoomIn,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { CourseMapLegend } from "@/components/CourseMapLegend";

const demo = [
  { n: 1, x: 13, y: 78, r: -18, t: "jump" }, { n: 2, x: 26, y: 65, r: 20, t: "jump" },
  { n: 3, x: 40, y: 76, r: 4, t: "tunnel" }, { n: 4, x: 50, y: 58, r: 70, t: "jump" },
  { n: 5, x: 67, y: 67, r: -10, t: "weave" }, { n: 6, x: 80, y: 52, r: 82, t: "jump" },
  { n: 7, x: 66, y: 37, r: 8, t: "aframe" }, { n: 8, x: 47, y: 33, r: -25, t: "jump" },
  { n: 9, x: 27, y: 40, r: 66, t: "tunnel" }, { n: 10, x: 18, y: 20, r: 10, t: "jump" },
];

function MiniObstacle({ item }: { item: (typeof demo)[number] }) {
  const line = item.t === "tunnel"
    ? "w-10 rounded-t-full border-x-4 border-t-4 border-slate-700 h-6"
    : item.t === "weave"
      ? "w-12 border-t-2 border-dotted border-slate-700"
      : item.t === "aframe"
        ? "h-7 w-10 border-x-[8px] border-b-4 border-primary/70 [clip-path:polygon(0_100%,50%_0,100%_100%)]"
        : "w-10 border-t-[3px] border-slate-800";
  return (
    <div className="absolute" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%,-50%) rotate(${item.r}deg)` }}>
      <div className={line} />
      <span className="absolute -right-4 -top-4 grid h-5 w-5 place-items-center rounded-full border border-slate-700 bg-white text-[9px] font-bold text-slate-900">{item.n}</span>
    </div>
  );
}

const FEATURES = [
  [MousePointer2, "Full hindereditor", "Placera, flytta, rotera, duplicera, lås, lagerordna och numrera hinder. Samma editor används både publikt och inloggat."],
  [Ruler, "Riktig meterskala", "Banarea i meter med linjaler, 0,5 m snap, zoom, panorering, avstånd och banlinje."],
  [ShieldCheck, "Regelverk & bananalys", "Välj sport, storleksklass, klassmall och aktivt regelverk. Få livevarningar för sådant som går att kontrollera från ritningen."],
  [LayoutGrid, "Agility + Hoopers", "Byt mellan agility och hoopers och få rätt hinderpalett, banstorlekar, mallar och regelsystem för sporten."],
  [FileDown, "PDF, bild & JSON", "Exportera domar-PDF, tränings-PDF, bygg-PDF, startlista, bild eller JSON. Importera JSON tillbaka till editorn."],
  [Box, "2D + 3D", "Studera banan som ritning, spela upp banlinjen och öppna 3D-vy eller gå-banan-läge för bättre rumslig förståelse."],
  [Save, "Autosparning utan konto", "Banan sparas lokalt medan du arbetar. Konto behövs först om du vill ha molnsynk och kontobundna funktioner."],
  [Copy, "Banbibliotek", "Öppna färdiga banor och mallar direkt i samma editor. Inloggade användare får dessutom egna och klubbdelade banor."],
  [Smartphone, "Mobil på riktigt", "Touchdragning, pinch-zoom, mobil hinderpanel och bottom dock – inte en nedskalad desktop-demo."],
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Gratis banplanerare för agility & hoopers | AgilityManager</title>
        <meta name="description" content="Använd AgilityManagers fulla banplanerare gratis utan konto. Rita agility och hoopers i meterskala med regelkontroll, banlinje, PDF-export, 3D, banbibliotek och lokal autosparning." />
        <link rel="canonical" href="https://agilitymanager.se/" />
        <meta property="og:title" content="Hela banplaneraren är gratis | AgilityManager" />
        <meta property="og:description" content="Samma fulla banplanerare som i AgilityManager – agility + hoopers, meter, regler, PDF, 3D och banbibliotek. Börja utan konto." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AgilityManager Banplanerare",
          applicationCategory: "SportsApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
          description: "Gratis full banplanerare för agility och hoopers med meterskala, regelkontroll, export, 3D och banbibliotek.",
        })}</script>
      </Helmet>
      <LandingNav />

      <main>
        <section className="overflow-hidden border-b border-border bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/.12),transparent_38%)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:pb-24 lg:pt-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Hela banplaneraren · 0 kr · inget konto för att börja</div>
              <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">Rita agility & hoopers <span className="text-primary">på riktigt.</span></h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">Det här är inte en förenklad gratisdemo. Du får samma fulla banplanerare som används inne i AgilityManager: komplett hindereditor, riktig meterskala, klassmallar, regelkontroll, banlinje, analys, PDF/export, 3D och banbibliotek.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/banplanerare" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">Öppna hela planaren gratis <ArrowRight className="h-5 w-5" /></Link>
                <Link to="/banplanerare?view=bank" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card px-7 text-base font-semibold hover:bg-muted"><LayoutGrid className="h-5 w-5" /> Öppna banbiblioteket</Link>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{["Agility + Hoopers","Mobil & dator","PDF + 3D","Lokal autosparning","Ingen registrering för att rita"].map(x=><span key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{x}</span>)}</div>
            </div>

            <div className="relative rounded-[2rem] border border-slate-300 bg-white p-3 shadow-2xl shadow-slate-900/10">
              <div className="mb-2 flex items-center justify-between px-2 text-xs text-slate-500"><span className="font-semibold text-slate-800">Agility · banritning</span><span>30 × 40 m</span></div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-300 bg-white" style={{backgroundImage:"linear-gradient(to right,#d9dee7 1px,transparent 1px),linear-gradient(to bottom,#d9dee7 1px,transparent 1px)",backgroundSize:"10% 12.5%"}}>
                <CourseMapLegend title="Agility · träningsbana" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M13 78 C20 70 20 68 26 65 S34 70 40 76 S47 65 50 58 S60 64 67 67 S78 62 80 52 S73 42 66 37 S55 31 47 33 S35 38 27 40 S22 29 18 20" fill="none" stroke="hsl(var(--primary))" strokeWidth=".7" strokeDasharray="2 1.5" opacity=".65" /></svg>
                {demo.map(item=><MiniObstacle key={item.n} item={item} />)}
                <span className="absolute bottom-2 left-2 text-[9px] font-medium text-slate-500">AgilityManager.se · full banplanerare</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]"><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">Meter</b><span className="text-muted-foreground">linjal</span></div><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">Regler</b><span className="text-muted-foreground">live</span></div><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">Export</b><span className="text-muted-foreground">PDF</span></div><div className="rounded-xl bg-muted p-2"><b className="block text-foreground">3D</b><span className="text-muted-foreground">gå bana</span></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">En editor. Hela vägen.</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">Gratisversionen är själva banplaneraren</h2><p className="mt-4 text-lg text-muted-foreground">Samma ritmotor, samma hinder, samma regelmotor och samma export används oavsett om du är utloggad, Free-användare eller Pro. Kontot lägger till moln och samarbete – det låser inte upp själva ritandet.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([Icon,title,text])=>{const C=Icon;return <article key={title} className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><C className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-2 leading-7 text-muted-foreground">{text}</p></article>})}</div>
        </section>

        <section className="border-y border-border bg-muted/35 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Agility + Hoopers</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Byt sport – editorn följer med</h2><p className="mt-4 text-lg leading-8 text-muted-foreground">Agilityläget innehåller hopp, mur, långhopp, däck, tunnel, slalom, kontaktfält, bord och bankontroll. Hoopersläget byter till hoop, tunnel, tunna, staket och dirigeringsområde. Sportvalet styr även tillgängliga mallar, banstorlekar och regelverk.</p><Link to="/banplanerare" className="mt-6 inline-flex items-center gap-2 font-bold text-primary">Prova gratis <ArrowRight className="h-4 w-4" /></Link></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl border border-border bg-card p-6"><Users className="h-6 w-6 text-primary"/><h3 className="mt-4 font-semibold">För tränare & klubbar</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Förbered kompletta träningspass, bygg-PDF, återanvänd banor och dela vidare när du loggar in.</p></div><div className="rounded-3xl border border-border bg-card p-6"><ZoomIn className="h-6 w-6 text-primary"/><h3 className="mt-4 font-semibold">För förare</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Studera linjer, zooma in sekvenser, kontrollera avstånd och ta med en tydlig karta till planen.</p></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center">
              <div><p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-300">Vad kräver konto?</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Ritandet är gratis. Kontot är för molnet.</h2><p className="mt-4 max-w-2xl leading-7 text-white/65">Du behöver inte registrera dig för att rita, autospara lokalt, använda regler, 3D eller exportera. Logga in först när du vill molnspara, dela i klubb eller koppla banan till träningsloggen.</p></div>
              <div className="grid gap-2 text-sm">{["Rita och redigera · gratis utan konto","Lokal autosparning · gratis utan konto","PDF/bild/JSON/3D · gratis utan konto","Molnsynk · konto","Klubbdelning · konto","Träningslogg-koppling · konto"].map((x)=><div key={x} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><Check className="h-4 w-4 text-emerald-300" />{x}</div>)}</div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 text-center sm:px-6 lg:pb-28"><h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Öppna planaren. Börja med första hindret.</h2><p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Ingen trial, ingen låst demo och inget registreringssteg före ritbordet.</p><Link to="/banplanerare" className="mt-7 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 font-bold text-primary-foreground">Rita gratis nu <ArrowRight className="h-5 w-5" /></Link></section>
      </main>
      <LandingFooterV2 />
    </div>
  );
}