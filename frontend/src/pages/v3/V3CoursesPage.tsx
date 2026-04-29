import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  PenTool,
  Pencil,
  Play,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useV3Courses, useV3CourseRecommendations, type V3Course } from "@/hooks/v3/useV3Courses";
import { usePremium } from "@/components/PremiumGate";
import { V3RowsSkeleton, V3Skeleton, V3StatTilesSkeleton } from "@/components/v3/V3Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  hoopers: "Hoopers",
  agility: "Agility",
  grundträning: "Grundträning",
  alla: "Alla",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `${days} dagar sedan`;
  if (days < 30) return `${Math.floor(days / 7)} v sedan`;
  return new Date(iso).toLocaleDateString("sv-SE");
}

type Tab = "katalog" | "minabanor";

export default function V3CoursesPage() {
  const isPremium = usePremium();
  const { courses, saved, purchases, dogs, loading, deleteSaved } = useV3Courses();
  const [tab, setTab] = useState<Tab>("katalog");
  const [category, setCategory] = useState<string>("alla");
  const [selected, setSelected] = useState<V3Course | null>(null);

  const recs = useV3CourseRecommendations(courses, dogs, purchases);
  const categories = useMemo(() => ["alla", ...Array.from(new Set(courses.map((c) => c.category)))], [courses]);
  const filtered = useMemo(() => (category === "alla" ? courses : courses.filter((c) => c.category === category)), [courses, category]);
  const priceFor = (c: V3Course) => (isPremium && c.discounted_price_sek ? c.discounted_price_sek : c.price_sek);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
        <div className="space-y-2"><V3Skeleton className="h-3 w-24" /><V3Skeleton className="h-10 w-2/3" shape="rounded-v3-base" /></div>
        <V3StatTilesSkeleton count={4} />
        <V3RowsSkeleton count={3} height="h-32" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <div>
        <div className="text-[11px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-2">v3 · Banor & utbildning</div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="font-v3-display text-[40px] lg:text-[56px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">Banor &amp; kurser</h1>
          <Link to="/v3/course-planner" className="v3-tappable inline-flex items-center gap-2 rounded-v3-base bg-v3-text-primary text-v3-canvas px-4 py-2.5 text-v3-sm font-medium shadow-v3-sm hover:opacity-90"><PenTool size={16} />Öppna banplanerare</Link>
        </div>
        <p className="text-v3-base text-v3-text-secondary mt-3 max-w-2xl">Utforska kurser från instruktörer, plocka upp din rekommendation och hoppa rakt in i dina egna sparade banor.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 v3-stagger">
        <StatTile label="Kurser" value={courses.length} icon={GraduationCap} />
        <StatTile label="Köpta" value={purchases.size} icon={CheckCircle2} />
        <StatTile label="Sparade banor" value={saved.length} icon={PenTool} />
        <StatTile label="Din nivå" value={isPremium ? "Pro" : "Free"} icon={Sparkles} hint={isPremium ? "Rabatt aktiv" : "Uppgradera"} />
      </div>

      <div className="inline-flex rounded-v3-base bg-v3-canvas-elevated p-1 shadow-v3-xs border border-v3-canvas-sunken/40">
        {[{ v: "katalog" as const, label: "Kurskatalog" }, { v: "minabanor" as const, label: `Mina banor (${saved.length})` }].map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)} className={cn("px-4 py-1.5 rounded-v3-sm text-v3-sm font-medium v3-focus-ring transition-colors", tab === t.v ? "bg-v3-text-primary text-v3-canvas shadow-v3-xs" : "text-v3-text-secondary hover:text-v3-text-primary")}>{t.label}</button>
        ))}
      </div>

      {tab === "katalog" ? (
        <CatalogTab courses={filtered} allCount={courses.length} purchases={purchases} isPremium={isPremium} recs={recs} categories={categories} activeCategory={category} onCategory={setCategory} onSelect={setSelected} priceFor={priceFor} />
      ) : (
        <SavedTab saved={saved} onDelete={deleteSaved} />
      )}

      <CourseDetailDialog course={selected} onClose={() => setSelected(null)} isPremium={isPremium} purchased={selected ? purchases.has(selected.id) : false} priceFor={priceFor} />
    </div>
  );
}

function StatTile({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 shadow-v3-xs"><div className="flex items-center gap-2 text-v3-text-tertiary mb-1"><Icon size={14} /><span className="text-[11px] tracking-[0.04em] font-medium">{label}</span></div><div className="font-v3-display text-[28px] leading-none tracking-[-0.01em] text-v3-text-primary">{value}</div>{hint && <div className="text-v3-sm text-v3-text-secondary mt-1.5">{hint}</div>}</div>;
}

function CatalogTab({ courses, allCount, purchases, isPremium, recs, categories, activeCategory, onCategory, onSelect, priceFor }: { courses: V3Course[]; allCount: number; purchases: Set<string>; isPremium: boolean; recs: { items: V3Course[]; reason: string }; categories: string[]; activeCategory: string; onCategory: (c: string) => void; onSelect: (c: V3Course) => void; priceFor: (c: V3Course) => number }) {
  return (
    <div className="space-y-8">
      {!isPremium && <div className="rounded-v3-xl bg-v3-accent-traning/10 border border-v3-accent-traning/30 p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-v3-base bg-v3-accent-traning/20 flex items-center justify-center"><Star size={16} className="text-v3-accent-traning" /></div><div className="flex-1 min-w-0"><div className="text-v3-sm font-medium text-v3-text-primary">Pro-medlemmar får rabatt på alla kurser</div><div className="text-v3-sm text-v3-text-secondary">19 kr/mån. Aktivera och börja spara direkt.</div></div><Link to="/v3/settings" className="v3-tappable rounded-v3-base bg-v3-text-primary text-v3-canvas px-3.5 py-2 text-v3-sm font-medium">Bli Pro</Link></div>}

      {recs.items.length > 0 && <section><div className="flex items-end justify-between mb-3"><div><div className="flex items-center gap-2 text-v3-text-tertiary mb-1"><Sparkles size={14} /><span className="text-[11px] tracking-[0.04em] font-medium">Rekommenderat för dig</span></div><p className="text-v3-sm text-v3-text-secondary">Matchat mot dina hundar · {recs.reason}</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 v3-stagger">{recs.items.map((c) => <button key={c.id} onClick={() => onSelect(c)} className="v3-tappable text-left rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 shadow-v3-xs hover:border-v3-text-tertiary/40 transition-colors relative"><div className="absolute -top-2 -right-2 rounded-v3-pill bg-v3-accent-prestation text-v3-canvas text-[10px] font-medium px-2 py-0.5 shadow-v3-xs">Tips</div><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-v3-base bg-v3-canvas-sunken flex items-center justify-center shrink-0"><GraduationCap size={18} className="text-v3-text-secondary" strokeWidth={1.5} /></div><div className="min-w-0 flex-1"><div className="text-v3-base font-medium text-v3-text-primary truncate">{c.title}</div><p className="text-v3-sm text-v3-text-secondary line-clamp-2 mt-0.5">{c.description}</p><div className="flex items-center justify-between mt-2 text-v3-sm"><span className="text-v3-text-tertiary">{CATEGORY_LABELS[c.category] ?? c.category}</span><span className="font-medium text-v3-text-primary tabular-nums">{priceFor(c)} kr</span></div></div></div></button>)}</div></section>}

      {categories.length > 2 && <div className="flex flex-wrap gap-2">{categories.map((c) => <button key={c} onClick={() => onCategory(c)} className={cn("px-3 py-1.5 rounded-v3-pill text-v3-sm v3-focus-ring transition-colors", activeCategory === c ? "bg-v3-text-primary text-v3-canvas" : "bg-v3-canvas-elevated text-v3-text-secondary hover:text-v3-text-primary border border-v3-canvas-sunken/40")}>{CATEGORY_LABELS[c] ?? c}</button>)}</div>}

      {courses.length === 0 ? <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-10 text-center"><GraduationCap className="mx-auto mb-3 text-v3-text-tertiary" size={32} /><div className="text-v3-base font-medium text-v3-text-primary">{allCount === 0 ? "Inga kurser ännu" : "Inga kurser i denna kategori"}</div><p className="text-v3-sm text-v3-text-secondary mt-1">Vi lägger till nya kurser löpande.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4 v3-stagger">{courses.map((c) => <CourseCard key={c.id} course={c} purchased={purchases.has(c.id)} price={priceFor(c)} isPremium={isPremium} onSelect={() => onSelect(c)} />)}</div>}
    </div>
  );
}

function CourseCard({ course, purchased, price, isPremium, onSelect }: { course: V3Course; purchased: boolean; price: number; isPremium: boolean; onSelect: () => void }) {
  const hasDiscount = isPremium && course.discounted_price_sek && course.discounted_price_sek < course.price_sek;
  return (
    <button onClick={onSelect} className="v3-tappable text-left rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 overflow-hidden shadow-v3-xs hover:border-v3-text-tertiary/40 transition-colors">
      <div className="relative aspect-video bg-v3-text-primary overflow-hidden">
        {course.image_url ? <img src={course.image_url} alt={course.title} className="w-full h-full object-cover opacity-80" /> : <div className="absolute inset-0 bg-gradient-to-br from-v3-text-primary to-v3-text-secondary flex items-center justify-center"><GraduationCap size={42} className="text-v3-canvas/40" strokeWidth={1.2} /></div>}
        {course.trailer_url && <div className="absolute inset-0 bg-v3-text-primary/35 flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-v3-canvas/95 flex items-center justify-center shadow-v3-sm"><Play size={22} className="text-v3-text-primary ml-1" fill="currentColor" /></div></div>}
        <div className="absolute top-3 left-3 flex gap-1.5"><span className="rounded-v3-pill bg-v3-canvas/95 text-v3-text-primary text-[11px] font-medium px-2 py-0.5">{CATEGORY_LABELS[course.category] ?? course.category}</span>{purchased && <span className="rounded-v3-pill bg-v3-accent-traning text-v3-canvas text-[11px] font-medium px-2 py-0.5">Köpt</span>}</div>
        {course.partner_name && <div className="absolute bottom-3 right-3"><span className="rounded-v3-pill bg-v3-canvas/95 text-v3-text-primary text-[11px] font-medium px-2 py-0.5">{course.partner_name}</span></div>}
      </div>
      <div className="p-4"><div className="font-v3-display text-[20px] leading-tight tracking-[-0.01em] text-v3-text-primary mb-1">{course.title}</div><p className="text-v3-sm text-v3-text-secondary line-clamp-2 mb-3">{course.description}</p><div className="flex items-center justify-between"><div className="flex items-center gap-1.5 text-v3-sm text-v3-text-tertiary"><GraduationCap size={14} /><span className="truncate">{course.instructor_name}</span></div><div className="flex items-center gap-2">{hasDiscount && <span className="text-v3-sm line-through text-v3-text-tertiary tabular-nums">{course.price_sek} kr</span>}<span className="text-v3-base font-medium text-v3-text-primary tabular-nums">{price} kr</span></div></div></div>
    </button>
  );
}

function SavedTab({ saved, onDelete }: { saved: { id: string; name: string; description: string; updated_at: string; canvas_width: number; canvas_height: number }[]; onDelete: (id: string) => Promise<void> }) {
  return <div className="space-y-4"><div className="flex items-center justify-between"><div><div className="text-[11px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-0.5">Sparade banor</div><p className="text-v3-sm text-v3-text-secondary">Hoppa rakt in i banplaneraren och fortsätt jobba.</p></div><Link to="/v3/course-planner" className="v3-tappable inline-flex items-center gap-1.5 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 px-3 py-2 text-v3-sm font-medium text-v3-text-primary"><PenTool size={14} />Ny bana</Link></div>{saved.length === 0 ? <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-10 text-center"><PenTool className="mx-auto mb-3 text-v3-text-tertiary" size={32} /><div className="text-v3-base font-medium text-v3-text-primary">Inga sparade banor</div><p className="text-v3-sm text-v3-text-secondary mt-1 mb-4">Skissa en bana och spara den för att hitta den här.</p><Link to="/v3/course-planner" className="v3-tappable inline-flex items-center gap-1.5 rounded-v3-base bg-v3-text-primary text-v3-canvas px-4 py-2 text-v3-sm font-medium"><PenTool size={14} />Öppna banplanerare</Link></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3 v3-stagger">{saved.map((s) => <div key={s.id} className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 shadow-v3-xs flex items-center gap-3"><div className="w-12 h-12 rounded-v3-base bg-v3-canvas-sunken flex items-center justify-center shrink-0"><PenTool size={18} className="text-v3-text-secondary" strokeWidth={1.5} /></div><div className="min-w-0 flex-1"><div className="text-v3-base font-medium text-v3-text-primary truncate">{s.name}</div><div className="text-v3-sm text-v3-text-tertiary flex items-center gap-2"><Clock size={12} /><span>{timeAgo(s.updated_at)}</span><span>·</span><span className="tabular-nums">{Math.round(s.canvas_width / 20)}×{Math.round(s.canvas_height / 20)} m</span></div></div><Link to="/v3/course-planner" className="v3-tappable inline-flex items-center justify-center w-9 h-9 rounded-v3-base bg-v3-canvas-sunken text-v3-text-primary" title="Öppna"><Pencil size={14} /></Link><button onClick={async () => { if (!confirm(`Ta bort "${s.name}"?`)) return; try { await onDelete(s.id); toast.success("Banan togs bort"); } catch { toast.error("Kunde inte ta bort banan"); } }} className="v3-tappable inline-flex items-center justify-center w-9 h-9 rounded-v3-base text-v3-text-tertiary hover:text-v3-accent-tavlings" title="Ta bort"><Trash2 size={14} /></button></div>)}</div>}</div>;
}

function CourseDetailDialog({ course, onClose, isPremium, purchased, priceFor }: { course: V3Course | null; onClose: () => void; isPremium: boolean; purchased: boolean; priceFor: (c: V3Course) => number }) {
  if (!course) return null;
  const hasDiscount = isPremium && course.discounted_price_sek && course.discounted_price_sek < course.price_sek;
  const handleBuy = () => { if (course.partner_url) { window.open(course.partner_url, "_blank"); toast.info("Du omdirigeras till kursanordnaren"); } };

  return (
    <Dialog open={!!course} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[560px] max-h-[88vh] overflow-y-auto bg-v3-canvas-elevated p-0 gap-0">
        <div className="p-5 pb-3">
          <DialogHeader><DialogTitle className="font-v3-display text-2xl tracking-[-0.01em] pr-8">{course.title}</DialogTitle></DialogHeader>
        </div>

        {course.trailer_url && (
          <div className="px-5 pb-4">
            <a href={course.trailer_url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video rounded-v3-base overflow-hidden bg-v3-text-primary group shadow-v3-sm">
              {course.image_url ? <img src={course.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /> : <div className="absolute inset-0 bg-gradient-to-br from-v3-text-primary via-v3-text-secondary to-v3-brand-700" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/20" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
                <div className="w-16 h-16 rounded-full bg-white/95 grid place-items-center shadow-v3-sm group-hover:scale-105 transition-transform"><Play size={26} className="text-v3-text-primary ml-1" fill="currentColor" /></div>
                <div className="mt-3 rounded-full bg-white/95 px-4 py-1.5 text-v3-sm font-medium text-v3-text-primary inline-flex items-center gap-1.5">Titta på trailer <ExternalLink size={13} /></div>
              </div>
            </a>
          </div>
        )}

        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-v3-xl bg-v3-canvas p-4 border border-v3-canvas-sunken/40">
            <p className="text-v3-sm text-v3-text-secondary leading-relaxed">{course.long_description || course.description}</p>
          </div>

          <Separator />
          <div><div className="text-[11px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-1">Instruktör</div><div className="text-v3-base font-medium text-v3-text-primary">{course.instructor_name}</div>{course.instructor_bio && <p className="text-v3-sm text-v3-text-secondary mt-1">{course.instructor_bio}</p>}</div>
          <Separator />
          <div className="flex items-center justify-between"><div><div className="text-[11px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-0.5">Kursanordnare</div><div className="text-v3-sm font-medium text-v3-text-primary">{course.partner_name}</div></div>{course.partner_url && <a href={course.partner_url} target="_blank" rel="noopener noreferrer" className="text-v3-sm text-v3-text-primary inline-flex items-center gap-1 hover:underline">Hemsida <ExternalLink size={12} /></a>}</div>
          <Separator />
          <div className="flex items-center justify-between rounded-v3-xl bg-v3-canvas-sunken/50 p-4"><div><div className="text-[11px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-0.5">Pris</div><div className="flex items-center gap-2">{hasDiscount && <span className="text-v3-sm line-through text-v3-text-tertiary tabular-nums">{course.price_sek} kr</span>}<span className="font-v3-display text-[28px] leading-none text-v3-text-primary tabular-nums">{priceFor(course)} kr</span></div>{hasDiscount && <div className="text-v3-sm text-v3-accent-prestation mt-1 flex items-center gap-1"><Star size={11} /> Pro-rabatt aktiv</div>}</div>{purchased ? <span className="rounded-v3-pill bg-v3-accent-traning text-v3-canvas text-v3-sm font-medium px-3 py-2 inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Köpt</span> : <button onClick={handleBuy} className="v3-tappable inline-flex items-center gap-1.5 rounded-v3-base bg-v3-text-primary text-v3-canvas px-4 py-2.5 text-v3-sm font-medium"><ShoppingCart size={14} />Anmäl dig</button>}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
