import { useEffect, useState } from "react";
import { ArrowRight, Check, Plus, Search, Trophy, Flame, Heart, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hämtar visningsnamn från profiles.display_name för inloggad användare.
 * Faller tillbaka till "där" så att hälsningen alltid känns naturlig.
 */
function useGreetingName(): string {
  const { user } = useAuth();
  const [name, setName] = useState<string>("där");

  useEffect(() => {
    if (!user?.id) {
      setName("där");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const raw = data?.display_name?.trim();
      // display_name kan vara en e-post om profilen aldrig redigerats – ta då bara första delen.
      const cleaned = raw && raw.includes("@") ? raw.split("@")[0] : raw;
      setName(cleaned && cleaned.length > 0 ? cleaned : "där");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return name;
}

/**
 * AgilityManager – The Addiction Update
 * Fas 1: Designsystem-referens.
 *
 * Denna sida är ENDA källan för v3-primitives (Inter + Instrument Serif,
 * varm sand-palette, brand-grön #3F8F55). Inget på inloggade sidor påverkas
 * – v3 byggs parallellt och rullas ut i kommande faser.
 *
 * Route: /design-demo
 */
export default function DesignDemoPage() {
  return (
    <div className="min-h-screen bg-v3-canvas font-v3-sans text-v3-text-primary v3-selection antialiased">
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-16 md:py-20 space-y-20">
        <Header />
        <Section title="Färger" subtitle="Canvas, brand och accent. Allt går via tokens.">
          <ColorGrid />
        </Section>

        <Section title="Typografi" subtitle="Inter för UI. Instrument Serif för känsla.">
          <TypographyShowcase />
        </Section>

        <Section title="Knappar" subtitle="Aldrig weight 700. Aldrig gradients. Lugn elevation.">
          <ButtonShowcase />
        </Section>

        <Section title="Kort" subtitle="Vit yta på varm canvas. Hover ger elevation, aldrig scale.">
          <CardShowcase />
        </Section>

        <Section title="Inputs" subtitle="Sunken bakgrund, brand-ring vid focus.">
          <InputShowcase />
        </Section>

        <Section title="Stat-block" subtitle="Stora siffror i Instrument Serif. Tabular nums.">
          <StatShowcase />
        </Section>

        <Section title="Timeline" subtitle="Tunn vertikal linje. Cirkulär markör per typ.">
          <TimelineShowcase />
        </Section>

        <Section title="Tomma tillstånd" subtitle="Varma och specifika. Aldrig 'inga resultat'.">
          <EmptyStateShowcase />
        </Section>

        <footer className="pt-16 border-t border-v3-canvas-sunken">
          <p className="text-v3-sm text-v3-text-tertiary">
            Fas 1 av The Addiction Update · Tokens i{" "}
            <code className="font-v3-mono text-v3-xs">src/lib/design-system.ts</code>
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function Header() {
  const name = useGreetingName();
  return (
    <header className="space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-v3-base bg-v3-brand-50 text-v3-brand-700">
        <span className="text-v3-xs font-medium tracking-wide uppercase">Fas 1</span>
      </div>
      <h1 className="font-v3-display text-v3-5xl md:text-v3-6xl text-v3-text-primary">
        Godmorgon, {name}.
      </h1>
      <p className="text-v3-lg text-v3-text-secondary max-w-[640px] leading-relaxed">
        Varm, lugn, självsäker. Inter för UI, Instrument Serif för stora siffror
        och rubriker. Alla färger, radier, skuggor och rörelser bor i en token-fil.
        Komponenterna nedan är referensen kommande faser bygger på.
      </p>
    </header>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">{title}</h2>
        {subtitle && (
          <p className="text-v3-sm text-v3-text-tertiary max-w-[560px]">{subtitle}</p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function ColorGrid() {
  const groups = [
    {
      label: "Canvas",
      swatches: [
        { name: "primary", className: "bg-v3-canvas border border-v3-canvas-sunken" },
        { name: "secondary", className: "bg-v3-canvas-secondary" },
        { name: "elevated", className: "bg-v3-canvas-elevated border border-v3-canvas-sunken" },
        { name: "sunken", className: "bg-v3-canvas-sunken" },
      ],
    },
    {
      label: "Brand",
      swatches: [
        { name: "100", className: "bg-v3-brand-100" },
        { name: "300", className: "bg-v3-brand-300" },
        { name: "500", className: "bg-v3-brand-500" },
        { name: "700", className: "bg-v3-brand-700" },
        { name: "900", className: "bg-v3-brand-900" },
      ],
    },
    {
      label: "Accent",
      swatches: [
        { name: "tävling", className: "bg-v3-accent-tavlings" },
        { name: "träning", className: "bg-v3-accent-traning" },
        { name: "prestation", className: "bg-v3-accent-prestation" },
        { name: "hälsa", className: "bg-v3-accent-halsa" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.label} className="space-y-3">
          <div className="text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary">
            {g.label}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {g.swatches.map((s) => (
              <div key={s.name} className="space-y-2">
                <div className={`h-20 rounded-v3-lg ${s.className}`} />
                <div className="text-v3-xs text-v3-text-secondary">{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function TypographyShowcase() {
  return (
    <div className="space-y-8 bg-v3-canvas-elevated rounded-v3-xl p-8 md:p-10 shadow-v3-xs">
      <div>
        <p className="text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary mb-2">
          Display · Instrument Serif
        </p>
        <p className="font-v3-display text-v3-6xl">Godmorgon, Christoffer.</p>
        <p className="font-v3-display text-v3-4xl text-v3-text-secondary">
          Luna, 4 år · 18 pass den här månaden
        </p>
      </div>

      <div className="border-t border-v3-canvas-sunken pt-6">
        <p className="text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary mb-2">
          UI · Inter
        </p>
        <p className="text-v3-2xl text-v3-text-primary mb-1">
          Stora rubriker använder weight 500.
        </p>
        <p className="text-v3-base text-v3-text-secondary mb-1">
          Brödtext använder regular. Aldrig bold. Det signalerar premium, inte desperation.
        </p>
        <p className="text-v3-sm text-v3-text-tertiary">
          Småtext för metadata och hjälpinformation.
        </p>
      </div>

      <div className="border-t border-v3-canvas-sunken pt-6">
        <p className="text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary mb-2">
          Numerals · tabular
        </p>
        <p className="font-v3-display text-v3-5xl tabular-nums">3.84s · 18 · 8.2</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function ButtonShowcase() {
  return (
    <div className="bg-v3-canvas-elevated rounded-v3-xl p-8 shadow-v3-xs space-y-6">
      <div className="flex flex-wrap gap-3">
        <V3Button variant="primary">Logga dagens pass</V3Button>
        <V3Button variant="secondary">Se Lunas profil</V3Button>
        <V3Button variant="ghost">Avbryt</V3Button>
        <V3Button variant="primary" disabled>
          Inaktiv
        </V3Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <V3Button variant="primary" icon={<Plus size={16} />}>
          Nytt pass
        </V3Button>
        <V3Button variant="secondary" icon={<Search size={16} />}>
          Sök
        </V3Button>
        <V3Button variant="primary" icon={<ArrowRight size={16} />} iconRight>
          Fortsätt
        </V3Button>
      </div>
    </div>
  );
}

function V3Button({
  variant,
  children,
  icon,
  iconRight,
  disabled,
}: {
  variant: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconRight?: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 h-11 px-5 rounded-v3-base text-v3-sm font-medium transition-all duration-200 v3-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary:
      "bg-v3-brand-500 text-white hover:bg-v3-brand-600 active:scale-[0.98] shadow-v3-xs hover:shadow-v3-sm",
    secondary:
      "bg-v3-canvas-elevated text-v3-text-primary border border-v3-canvas-sunken hover:bg-v3-canvas-secondary",
    ghost: "bg-transparent text-v3-text-secondary hover:bg-v3-canvas-secondary",
  } as const;
  return (
    <button className={`${base} ${styles[variant]}`} disabled={disabled}>
      {icon && !iconRight && icon}
      {children}
      {icon && iconRight && icon}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function CardShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Hundkort-hero (preview) */}
      <div className="bg-v3-canvas-elevated rounded-v3-2xl p-7 shadow-v3-sm hover:shadow-v3-base transition-shadow duration-300">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-v3-brand-100 ring-2 ring-v3-brand-500 ring-offset-2 ring-offset-v3-canvas-elevated flex items-center justify-center font-v3-display text-v3-2xl text-v3-brand-700">
            L
          </div>
          <div>
            <p className="font-v3-display text-v3-4xl text-v3-text-primary leading-none">Luna</p>
            <p className="text-v3-sm text-v3-text-tertiary mt-1">
              Border Collie · 4 år · 18 pass i månaden
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5 border-t border-v3-canvas-sunken pt-5">
          <Stat label="Slalom" value="3.8s" />
          <Stat label="Pass v.16" value="4/5" />
          <Stat label="Form" value="8.2" />
        </div>
        <blockquote className="text-v3-sm text-v3-text-secondary italic border-l-2 border-v3-brand-300 pl-3 mb-5">
          "Långsam start, bra energi efter uppvärmning"
        </blockquote>
        <V3Button variant="primary" icon={<ArrowRight size={16} />} iconRight>
          Logga dagens pass
        </V3Button>
      </div>

      {/* Subtilt info-kort */}
      <div className="bg-v3-canvas-elevated rounded-v3-xl p-6 shadow-v3-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-v3-base bg-v3-accent-prestation/10 flex items-center justify-center">
            <Flame size={18} className="text-v3-accent-prestation" />
          </div>
          <div>
            <p className="text-v3-sm font-medium">Träningsstreak</p>
            <p className="text-v3-xs text-v3-text-tertiary">Personbästa just nu</p>
          </div>
        </div>
        <p className="font-v3-display text-v3-5xl tabular-nums text-v3-text-primary">
          7 <span className="text-v3-2xl text-v3-text-tertiary">dagar</span>
        </p>
        <div className="h-1.5 bg-v3-canvas-sunken rounded-full overflow-hidden">
          <div className="h-full w-[70%] bg-v3-brand-500 rounded-full" />
        </div>
        <p className="text-v3-xs text-v3-text-tertiary">3 dagar till nästa milestone</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-v3-display text-v3-3xl tabular-nums text-v3-text-primary leading-none">
        {value}
      </p>
      <p className="text-v3-2xs uppercase tracking-wide text-v3-text-tertiary mt-1.5">{label}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function InputShowcase() {
  const [val, setVal] = useState("");
  return (
    <div className="bg-v3-canvas-elevated rounded-v3-xl p-8 shadow-v3-xs space-y-4 max-w-md">
      <div className="space-y-1.5">
        <label className="block text-v3-sm text-v3-text-secondary">Plats</label>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="t.ex. SAgiK Hagaby"
          className="w-full h-11 px-4 rounded-v3-base bg-v3-canvas-sunken border border-transparent text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary focus:bg-v3-canvas-elevated focus:border-v3-brand-500 focus:outline-none transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-v3-sm text-v3-text-secondary">Anteckning</label>
        <textarea
          rows={3}
          placeholder="Skriv fritt, eller hoppa över…"
          className="w-full px-4 py-3 rounded-v3-base bg-v3-canvas-sunken border border-transparent text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary focus:bg-v3-canvas-elevated focus:border-v3-brand-500 focus:outline-none transition-colors resize-none"
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function StatShowcase() {
  const items = [
    { label: "Träningspass", value: "142", trend: "↑ 12" },
    { label: "Tävlingar", value: "18", trend: "Nästa: 14d" },
    { label: "Bästa slalom", value: "3.8s", trend: "↑ 6%" },
    { label: "Form-index", value: "8.2", trend: "↑ 0.4" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((s) => (
        <div
          key={s.label}
          className="bg-v3-canvas-elevated rounded-v3-xl p-5 shadow-v3-xs hover:shadow-v3-sm transition-shadow duration-300"
        >
          <p className="font-v3-display text-v3-4xl tabular-nums text-v3-text-primary leading-none">
            {s.value}
          </p>
          <p className="text-v3-xs text-v3-text-tertiary mt-2">{s.label}</p>
          <p className="text-v3-2xs text-v3-brand-600 mt-3 tabular-nums">{s.trend}</p>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function TimelineShowcase() {
  const events = [
    {
      time: "Igår, 18:04",
      title: "Slalomträning",
      meta: "32 minuter · 4 hinder",
      note: "Hittade rätt ingång från vänster. Pinn 4-5 fortfarande utmaning.",
      icon: Trophy,
      color: "v3-accent-traning",
    },
    {
      time: "3 dagar sen",
      title: "Tävling: Uppsala Cup",
      meta: "Klass 1 · Plats 3 av 18",
      note: "Luna körde perfekt slalom. Föll på A-hindret pga stress.",
      icon: Trophy,
      color: "v3-accent-tavlings",
    },
    {
      time: "Förra veckan",
      title: "Vaccinerad",
      meta: "Veterinär Nyström · 450 kr",
      note: "Allt som planerat.",
      icon: Heart,
      color: "v3-accent-halsa",
    },
  ];

  return (
    <div className="bg-v3-canvas-elevated rounded-v3-xl p-8 shadow-v3-xs">
      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-v3-canvas-sunken" />
        <div className="space-y-8">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <div key={i} className="relative">
                <div
                  className={`absolute -left-8 top-0 w-6 h-6 rounded-full bg-v3-canvas-elevated border-2 flex items-center justify-center`}
                  style={{ borderColor: `hsl(var(--${e.color}))` }}
                >
                  <Icon size={11} style={{ color: `hsl(var(--${e.color}))` }} />
                </div>
                <p className="text-v3-2xs uppercase tracking-wide text-v3-text-tertiary">
                  {e.time}
                </p>
                <p className="text-v3-base font-medium text-v3-text-primary mt-1">{e.title}</p>
                <p className="text-v3-sm text-v3-text-secondary mt-2 leading-relaxed">{e.note}</p>
                <p className="text-v3-xs text-v3-text-tertiary mt-2">{e.meta}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function EmptyStateShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-v3-canvas-elevated rounded-v3-xl p-10 shadow-v3-xs text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-v3-brand-50 flex items-center justify-center">
          <Calendar size={20} className="text-v3-brand-600" />
        </div>
        <p className="font-v3-display text-v3-2xl text-v3-text-primary mb-2">
          Inget pass loggat denna vecka.
        </p>
        <p className="text-v3-sm text-v3-text-secondary mb-6 max-w-[280px] mx-auto">
          Börja när du är redo. Det tar 30 sekunder.
        </p>
        <V3Button variant="primary" icon={<Plus size={16} />}>
          Logga första passet
        </V3Button>
      </div>

      <div className="bg-v3-canvas-elevated rounded-v3-xl p-10 shadow-v3-xs text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-v3-canvas-sunken flex items-center justify-center">
          <Check size={20} className="text-v3-text-tertiary" />
        </div>
        <p className="font-v3-display text-v3-2xl text-v3-text-primary mb-2">Allt är klart.</p>
        <p className="text-v3-sm text-v3-text-secondary max-w-[280px] mx-auto">
          Du har inga utestående uppgifter. Bra jobbat.
        </p>
      </div>
    </div>
  );
}
