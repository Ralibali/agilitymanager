import { Link } from "react-router-dom";
import { ArrowRight, Check, LayoutGrid, Library, Ruler, ShieldCheck, Smartphone } from "lucide-react";

export function LandingFooterV2() {
  return (
    <footer className="border-t border-border bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-primary/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <div className="text-sm font-bold uppercase tracking-[.15em] text-emerald-300">AgilityManagers fulla banplanerare · gratis</div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Samma banplanerare – med eller utan konto.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/65">Rita agility och hoopers i riktig meterskala med komplett hinderpalett, klassmallar, versionerade regelverk, banlinje, analys, PDF/export, 3D, zoom, pan och lokal autosparning. Registrering behövs först när du vill använda kontobundna funktioner som molnsynk och klubbdelning.</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">{["Ingen registrering för att rita","Agility + hoopers","PDF · bild · JSON · 3D","Mobil, surfplatta och dator"].map(x=><span key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-300"/>{x}</span>)}</div>
            <div className="mt-6 flex flex-wrap gap-3"><Link to="/banplanerare" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 font-bold text-slate-950 hover:bg-white/90"><LayoutGrid className="h-4 w-4"/>Öppna hela planaren <ArrowRight className="h-4 w-4"/></Link><Link to="/banplanerare?view=bank" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-5 font-semibold hover:bg-white/5"><Library className="h-4 w-4"/>Banbibliotek</Link></div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Ruler className="mx-auto h-5 w-5 text-emerald-300"/><b className="mt-3 block text-sm">Meterskala</b><span className="text-xs text-white/50">linjal + snap</span></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="mx-auto h-5 w-5 text-emerald-300"/><b className="mt-3 block text-sm">Regelverk</b><span className="text-xs text-white/50">livekontroll</span></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Smartphone className="mx-auto h-5 w-5 text-emerald-300"/><b className="mt-3 block text-sm">Full editor</b><span className="text-xs text-white/50">touch + desktop</span></div></div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div><div className="font-display text-lg font-semibold">Agility<span className="text-emerald-300">Manager</span></div><p className="mt-3 text-sm leading-6 text-white/55">Rita först. Konto när du vill synka, dela i klubb eller koppla banan till resten av din träning.</p></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-white/45">Banplanering</h3><div className="mt-4 flex flex-col gap-2 text-sm text-white/70"><Link to="/banplanerare">Gratis banplanerare</Link><Link to="/banplanerare?view=bank">Banbibliotek</Link><Link to="/om-agility">Om agility</Link><Link to="/hoopers">Om hoopers</Link><Link to="/hoopers-regler">Hoopers-regler</Link></div></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-white/45">Mer på AgilityManager</h3><div className="mt-4 flex flex-col gap-2 text-sm text-white/70"><Link to="/tavlingar">Tävlingar</Link><Link to="/blogg">Blogg</Link><Link to="/raser">Hundraser</Link><Link to="/coach">Coach</Link><Link to="/auth?mode=login">Logga in</Link></div></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-white/45">Information</h3><div className="mt-4 flex flex-col gap-2 text-sm text-white/70"><Link to="/integritetspolicy">Integritetspolicy</Link><Link to="/cookiepolicy">Cookiepolicy</Link><Link to="/ansvarsfriskrivning">Ansvarsfriskrivning</Link><a href="https://agilityklubben.se" target="_blank" rel="noreferrer">Svenska Agilityklubben</a></div></div>
      </div>
      <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/40">© {new Date().getFullYear()} AgilityManager · Aurora Media AB</div>
    </footer>
  );
}