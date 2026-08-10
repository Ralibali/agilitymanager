import { Link } from "react-router-dom";
import { ArrowRight, Ruler, ShieldCheck } from "lucide-react";

export function PlannerEverywhereCallout() {
  return (
    <aside className="border-y border-primary/15 bg-primary/[0.045]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-bold text-primary">Gratis banplanerare på AgilityManager</div>
          <div className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Rita agility- och hoopersbanor utan konto. Meterskala, hinderplacering, banlinje, avstånd, svensk regelkontroll och Banbanken ingår.</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs"><span className="inline-flex items-center gap-1.5"><Ruler className="h-4 w-4 text-primary"/>Meterskala</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary"/>Regelcheck</span><Link to="/banplanerare" className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 font-bold text-primary-foreground">Rita gratis <ArrowRight className="h-3.5 w-3.5"/></Link></div>
      </div>
    </aside>
  );
}
