import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LayoutGrid, Library, LogIn } from "lucide-react";

const links = [
  { to: "/banplanerare", label: "Banplanerare" },
  { to: "/banor", label: "Banbanken · 25" },
  { to: "/om-agility", label: "Om agility" },
  { to: "/hoopers", label: "Hoopers" },
  { to: "/blogg", label: "Blogg" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="mr-auto flex items-center gap-2 font-display text-lg font-semibold tracking-tight" aria-label="AgilityManager startsida">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><LayoutGrid className="h-4 w-4" /></span>
          Agility<span className="-ml-2 text-primary">Manager</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Huvudmeny">
          {links.map((l) => <Link key={l.to} to={l.to} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>)}
        </nav>
        <Link to="/auth?mode=login" className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"><LogIn className="h-4 w-4" /> Logga in</Link>
        <Link to="/banplanerare" className="hidden h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 sm:inline-flex">Rita gratis</Link>
        <button type="button" onClick={() => setOpen(v => !v)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-muted lg:hidden" aria-label={open ? "Stäng meny" : "Öppna meny"}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="border-t border-border bg-background lg:hidden"><nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">{links.map(l=><Link key={l.to} to={l.to} onClick={()=>setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium hover:bg-muted">{l.label}</Link>)}<div className="my-2 h-px bg-border"/><Link to="/banplanerare" onClick={()=>setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground"><LayoutGrid className="h-4 w-4"/>Rita bana gratis</Link><Link to="/banor" onClick={()=>setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 font-semibold"><Library className="h-4 w-4"/>Se alla 25 banor</Link></nav></div>}
    </header>
  );
}
