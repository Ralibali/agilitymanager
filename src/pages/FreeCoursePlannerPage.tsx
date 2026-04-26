import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, RotateCcw, Trash2, Plus, MousePointer2, Save, FileDown, Dumbbell, BarChart3, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ObstacleType = "jump" | "tunnel" | "weave" | "start" | "finish";

type FreeObstacle = {
  id: string;
  type: ObstacleType;
  label: string;
  symbol: string;
  x: number;
  y: number;
  rotation: number;
  number?: number;
};

const MAX_FREE_OBSTACLES = 10;
const WATERMARK = "Skapad med AgilityManager.se";
const FUNNEL_SOURCE = "free_course_planner";
const AUTH_SIGNUP = `/auth?mode=signup&redirect=/v3&source=${FUNNEL_SOURCE}`;
const AUTH_LOGIN = `/auth?mode=login&redirect=/v3&source=${FUNNEL_SOURCE}`;

const OBSTACLES: { type: ObstacleType; label: string; symbol: string }[] = [
  { type: "jump", label: "Hopp", symbol: "┃" },
  { type: "tunnel", label: "Tunnel", symbol: "⌒" },
  { type: "weave", label: "Slalom", symbol: "⫶" },
  { type: "start", label: "Start", symbol: "▸" },
  { type: "finish", label: "Mål", symbol: "◼" },
];

const START_COURSE: FreeObstacle[] = [
  { id: "demo-start", type: "start", label: "Start", symbol: "▸", x: 72, y: 398, rotation: 0 },
  { id: "demo-1", type: "jump", label: "Hopp", symbol: "┃", x: 145, y: 330, rotation: 0, number: 1 },
  { id: "demo-2", type: "tunnel", label: "Tunnel", symbol: "⌒", x: 260, y: 250, rotation: 20, number: 2 },
  { id: "demo-3", type: "jump", label: "Hopp", symbol: "┃", x: 380, y: 170, rotation: -18, number: 3 },
  { id: "demo-finish", type: "finish", label: "Mål", symbol: "◼", x: 500, y: 94, rotation: 0 },
];

function createObstacle(type: ObstacleType, index: number): FreeObstacle {
  const template = OBSTACLES.find((item) => item.type === type) ?? OBSTACLES[0];
  return {
    id: `${type}-${Date.now()}-${index}`,
    type,
    label: template.label,
    symbol: template.symbol,
    x: 95 + ((index * 74) % 420),
    y: 110 + ((index * 58) % 260),
    rotation: type === "tunnel" ? 20 : 0,
    number: type === "start" || type === "finish" ? undefined : index,
  };
}

export default function FreeCoursePlannerPage() {
  const [obstacles, setObstacles] = useState<FreeObstacle[]>(START_COURSE);
  const [selectedId, setSelectedId] = useState<string | null>(START_COURSE[1]?.id ?? null);
  const [limitHit, setLimitHit] = useState(false);
  const [lockedAction, setLockedAction] = useState<"save" | "export" | null>(null);

  const selected = useMemo(() => obstacles.find((obstacle) => obstacle.id === selectedId) ?? null, [obstacles, selectedId]);

  const addObstacle = (type: ObstacleType) => {
    if (obstacles.length >= MAX_FREE_OBSTACLES) {
      setLimitHit(true);
      return;
    }
    setLimitHit(false);
    const next = createObstacle(type, obstacles.length + 1);
    setObstacles((items) => [...items, next]);
    setSelectedId(next.id);
  };

  const moveSelected = (dx: number, dy: number) => {
    if (!selectedId) return;
    setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, x: Math.min(550, Math.max(40, item.x + dx)), y: Math.min(410, Math.max(50, item.y + dy)) } : item));
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    setObstacles((items) => items.map((item) => item.id === selectedId ? { ...item, rotation: (item.rotation + 15) % 360 } : item));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setObstacles((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setLimitHit(false);
  };

  const reset = () => {
    setObstacles(START_COURSE);
    setSelectedId(START_COURSE[1]?.id ?? null);
    setLimitHit(false);
    setLockedAction(null);
  };

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#172016]">
      <Helmet>
        <title>Gratis banplanerare för agility | AgilityManager.se</title>
        <meta name="description" content="Rita en enkel agilitybana gratis online. Testa AgilityManagers begränsade banplanerare med hopp, tunnel, slalom, start och mål." />
        <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
      </Helmet>

      <header className="border-b border-black/10 bg-[#fffaf2]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">Agility<span className="text-[#617457]">Manager</span></Link>
          <div className="flex items-center gap-2">
            <Link to={AUTH_LOGIN} className="hidden sm:inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium hover:bg-black/[0.03]">Logga in</Link>
            <Link to={AUTH_SIGNUP} className="inline-flex h-10 items-center justify-center rounded-full bg-[#617457] px-4 text-sm font-medium text-white hover:bg-[#526349]">Skapa konto</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-5 pt-10 pb-6 grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#617457]/20 bg-white/70 px-3 py-1 text-xs font-medium text-[#617457]">Gratis begränsad version</div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight mt-4">Gratis banplanerare för agility</h1>
            <p className="text-lg text-black/65 mt-4 max-w-xl">Rita en enkel träningsbana direkt i webbläsaren. När du vill spara banan, logga passet och följa utvecklingen skapar du konto och fortsätter i appen.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#verktyg" className="inline-flex h-12 items-center justify-center rounded-full bg-[#617457] px-5 text-sm font-medium text-white hover:bg-[#526349]">Testa gratis<ArrowRight size={16} className="ml-2" /></a>
              <Link to={AUTH_SIGNUP} className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium hover:bg-black/[0.03]">Spara banor med konto</Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 max-w-lg text-xs text-black/60">
              <div className="rounded-2xl bg-white/70 border border-black/10 p-3"><strong className="block text-black">10 hinder</strong> i gratisläget</div>
              <div className="rounded-2xl bg-white/70 border border-black/10 p-3"><strong className="block text-black">Spara i appen</strong> med konto</div>
              <div className="rounded-2xl bg-white/70 border border-black/10 p-3"><strong className="block text-black">Logga pass</strong> och se statistik</div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-black/10 bg-white p-4 shadow-2xl shadow-black/10"><PlannerCanvas obstacles={obstacles} selectedId={selectedId} onSelect={setSelectedId} /></div>
        </section>

        <section id="verktyg" className="max-w-6xl mx-auto px-5 py-8 grid lg:grid-cols-[260px_1fr_280px] gap-4">
          <aside className="rounded-3xl border border-black/10 bg-white p-4 h-fit">
            <h2 className="font-display text-xl">Lägg till hinder</h2>
            <p className="text-sm text-black/55 mt-1">Gratisversionen är begränsad till {MAX_FREE_OBSTACLES} hinder.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">{OBSTACLES.map((item) => <button key={item.type} type="button" onClick={() => addObstacle(item.type)} className="rounded-2xl border border-black/10 bg-[#f7f3eb] p-3 text-left hover:border-[#617457]/40 hover:bg-[#eef2ea] transition-colors"><span className="block text-2xl leading-none">{item.symbol}</span><span className="block text-xs font-medium mt-2">{item.label}</span></button>)}</div>
            {limitHit && <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">Gratisversionen tillåter max {MAX_FREE_OBSTACLES} hinder. Skapa konto för full banplanerare.</div>}
          </aside>

          <div className="rounded-[2rem] border border-black/10 bg-white p-3 shadow-xl shadow-black/5"><PlannerCanvas obstacles={obstacles} selectedId={selectedId} onSelect={setSelectedId} large /></div>

          <aside className="rounded-3xl border border-black/10 bg-white p-4 h-fit space-y-4">
            <div><h2 className="font-display text-xl">Valt hinder</h2>{selected ? <p className="text-sm text-black/60 mt-1">{selected.label} · x {Math.round(selected.x)}, y {Math.round(selected.y)}</p> : <p className="text-sm text-black/60 mt-1">Klicka på ett hinder i banan.</p>}</div>
            <div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => moveSelected(0, -15)} disabled={!selected} className="tool-btn">↑</button><button type="button" onClick={() => moveSelected(-15, 0)} disabled={!selected} className="tool-btn">←</button><button type="button" onClick={() => moveSelected(15, 0)} disabled={!selected} className="tool-btn">→</button><button type="button" onClick={() => moveSelected(0, 15)} disabled={!selected} className="tool-btn">↓</button><button type="button" onClick={rotateSelected} disabled={!selected} className="tool-btn col-span-2"><RotateCcw size={14} /> Rotera</button></div>
            <button type="button" onClick={removeSelected} disabled={!selected} className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-medium text-red-700 disabled:opacity-40"><Trash2 size={14} /> Ta bort</button>
            <button type="button" onClick={reset} className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white text-sm font-medium hover:bg-black/[0.03]">Återställ demo</button>

            <div className="rounded-3xl border border-[#617457]/20 bg-[#f2f6ee] p-4">
              <div className="text-sm font-semibold text-[#172016]">Vill du fortsätta senare?</div>
              <p className="text-sm text-black/60 mt-1">Spara banan i appen, logga passet efter träningen och följ utvecklingen i statistik.</p>
              <div className="grid grid-cols-2 gap-2 mt-3"><button type="button" onClick={() => setLockedAction("save")} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white border border-black/10 text-sm font-medium hover:bg-black/[0.03]"><Save size={14} /> Spara</button><button type="button" onClick={() => setLockedAction("export")} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white border border-black/10 text-sm font-medium hover:bg-black/[0.03]"><FileDown size={14} /> Export</button></div>
              {lockedAction && <div className="mt-3 rounded-2xl bg-white border border-black/10 p-3 text-sm text-black/65"><strong className="text-black">{lockedAction === "save" ? "Spara bana" : "Exportera bana"}</strong> är en konto-funktion. Skapa konto så kan du fortsätta i fulla banplaneraren.<Link to={AUTH_SIGNUP} className="mt-2 inline-flex w-full h-9 items-center justify-center rounded-full bg-[#617457] text-white text-sm font-medium">Skapa konto</Link></div>}
            </div>

            <div className="rounded-3xl bg-[#172016] p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-medium"><Lock size={15} /> Nästa steg</div>
              <p className="text-sm text-white/70 mt-2">Gå från bana till träningspass: skapa konto, logga passet och se statistik över vad som fungerar.</p>
              <Link to={AUTH_SIGNUP} className="mt-4 inline-flex w-full h-10 items-center justify-center rounded-full bg-white text-sm font-medium text-[#172016]">Skapa gratis konto</Link>
            </div>
          </aside>
        </section>

        <section className="max-w-6xl mx-auto px-5 py-10">
          <div className="rounded-[2rem] bg-[#172016] text-white p-6 lg:p-8 overflow-hidden relative">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#617457]/30 blur-3xl" />
            <div className="relative grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
              <div><div className="text-xs uppercase tracking-[0.12em] text-white/50 font-semibold">Så blir gratisverktyget till utveckling</div><h2 className="font-display text-3xl lg:text-4xl mt-3">Rita banan. Träna passet. Följ utvecklingen.</h2><p className="text-white/70 mt-3 max-w-lg">Banplaneraren är starten. Värdet kommer när du sparar övningen, loggar hur det gick och ser mönster i statistiken.</p><Link to={AUTH_SIGNUP} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-[#172016] hover:bg-white/90">Fortsätt i appen <ArrowRight size={15} className="ml-2" /></Link></div>
              <div className="grid sm:grid-cols-3 gap-3"><JourneyCard icon={Save} title="1. Spara bana" text="Behåll övningen och bygg ett bibliotek." /><JourneyCard icon={Dumbbell} title="2. Logga pass" text="Fånga känslan medan den är färsk." /><JourneyCard icon={BarChart3} title="3. Se statistik" text="Förstå vad som går framåt över tid." /></div>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 py-12 prose prose-stone">
          <h2>Rita agilitybana online gratis</h2>
          <p>Med AgilityManagers gratis banplanerare kan du snabbt skissa upp en enkel agilitybana för träning. Verktyget passar när du vill testa en kombination, planera ett pass eller visualisera en kortare övning innan du bygger på planen.</p>
          <h2>Från gratis bana till träningslogg och statistik</h2>
          <p>Gratisversionen är medvetet enkel: max tio hinder, ingen sparning och vattenstämpeln “{WATERMARK}”. När du skapar konto kan du fortsätta i appen, logga träningspass och följa utvecklingen över tid.</p>
        </section>
      </main>
    </div>
  );
}

function JourneyCard({ icon: Icon, title, text }: { icon: typeof Save; title: string; text: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center mb-3"><Icon size={17} /></div><h3 className="font-semibold text-sm">{title}</h3><p className="text-sm text-white/60 mt-1">{text}</p></div>;
}

function PlannerCanvas({ obstacles, selectedId, onSelect, large }: { obstacles: FreeObstacle[]; selectedId: string | null; onSelect: (id: string) => void; large?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#edf2e7]", large ? "min-h-[540px]" : "min-h-[360px]") }>
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-black/60 border border-black/10">20 × 30 m demo</div>
      <div className="absolute right-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-black/60 border border-black/10 inline-flex items-center gap-1"><MousePointer2 size={12} /> Klicka hinder</div>
      {obstacles.map((obstacle) => {
        const selected = obstacle.id === selectedId;
        return <button key={obstacle.id} type="button" onClick={() => onSelect(obstacle.id)} className={cn("absolute grid place-items-center rounded-xl border bg-white shadow-sm transition-all", selected ? "border-[#617457] ring-4 ring-[#617457]/15 scale-105" : "border-black/15 hover:border-[#617457]/40", obstacle.type === "tunnel" ? "h-14 w-20" : obstacle.type === "weave" ? "h-10 w-24" : "h-12 w-12")} style={{ left: `${(obstacle.x / 600) * 100}%`, top: `${(obstacle.y / 460) * 100}%`, transform: `translate(-50%, -50%) rotate(${obstacle.rotation}deg)` }} title={obstacle.label}><span className="text-2xl leading-none text-[#172016]">{obstacle.symbol}</span>{obstacle.number && <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-[#617457] text-white text-xs font-bold grid place-items-center">{obstacle.number}</span>}</button>;
      })}
      <div className="absolute left-4 bottom-4 rounded-full bg-white/90 border border-black/10 px-3 py-1 text-xs font-semibold text-[#617457] shadow-sm inline-flex items-center gap-1.5"><CheckCircle2 size={12} /> Gratis demo</div>
      <div className="absolute bottom-4 right-4 rounded-full bg-white/85 border border-black/10 px-3 py-1 text-xs font-semibold text-black/55 shadow-sm">{WATERMARK}</div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/70 to-transparent h-24 pointer-events-none" />
    </div>
  );
}
