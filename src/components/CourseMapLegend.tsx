import { CheckCircle2 } from "lucide-react";

export function CourseMapLegend({ title = "Agility · Klass 1", length = "ca 150 m", ring = "30 × 40 m" }: { title?: string; length?: string; ring?: string }) {
  return (
    <div className="pointer-events-none absolute right-3 top-12 z-10 hidden rounded-xl border border-slate-300 bg-white/95 p-2.5 text-[10px] leading-4 text-slate-800 shadow-sm sm:block">
      <div className="font-bold text-slate-950">{title}</div>
      <div>Banlängd: {length}</div>
      <div>Banområde: {ring}</div>
      <div className="mt-1 flex items-center gap-1 font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Svensk regelcheck</div>
    </div>
  );
}
