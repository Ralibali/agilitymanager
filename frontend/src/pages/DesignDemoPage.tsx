import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Plus, Search, Trophy, Flame, Heart, Calendar, Dumbbell, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tidsanpassad hälsning baserat på lokal klocktid.
 * 06–11 → "Godmorgon", 11–17 → "Hej", 17–22 → "God kväll", 22–06 → "Sent uppe".
 */
function getTimeGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 11) return "Godmorgon";
  if (h >= 11 && h < 17) return "Hej";
  if (h >= 17 && h < 22) return "God kväll";
  return "Sent uppe";
}

/**
 * Hämtar visningsnamn från profiles.display_name + tidsanpassad hälsning.
 * Faller tillbaka till "där" så att hälsningen alltid känns naturlig.
 * Hälsningen uppdateras varje minut så den inte fastnar över ett dygnsskifte.
 */
function useGreeting(): { greeting: string; name: string } {
  const { user } = useAuth();
  const [name, setName] = useState<string>("där");
  const [greeting, setGreeting] = useState<string>(() => getTimeGreeting());

  useEffect(() => {
    const tick = () => setGreeting(getTimeGreeting());
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

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

  return { greeting, name };
}

/**
 * AgilityManager – The Addiction Update
 * Designsystem-referens.
 *
 * Denna sida är källan för v3-primitives (Epilogue + Urbanist,
 * varm sand-palette, brand-grön #3F8F55, domänaccenter).
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

        <Section
          title="Domänidentiteter"
          subtitle="Fyra domäner, en produktkaraktär. Varje sektion äger sin accentfärg."
        >
          <DomainIdentityShowcase />
        </Section>

        <footer className="pt-16 border-t border-v3-canvas-sunken">
          <p className="text-v3-sm text-v3-text-tertiary">
            The Addiction Update · Tokens i{" "}
            <code className="font-v3-mono text-v3-xs">src/lib/design-system.ts</code>
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

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
      <div className="space-y-1">
        <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">{title}</h2>
        {subtitle && (
          <p className="text-v3-base text-v3-text-secondary">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function Header() {
  const { greeting, name } = useGreeting();
  return (
    <header className="space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-v3-base bg-v3-brand-50 text-v3-brand-700">
        <span className="text-v3-xs font-medium tracking-wide uppercase">Fas 1</span>
      </div>
      <h1 className="font-v3-display text-v3-5xl md:text-v3-6xl text-v3-text-primary">
        {greeting}, {name}.
      </h1>
      <p className="text-v3-lg text-v3-text-secondary max-w-[640px] leading-relaxed">
        Varm, lugn, självsäker. Inter för UI, Instrument Serif för stora siffror
        och rubriker. Alla färger, radier, skuggor och rörelser bor i en token-fil.
        Komponenterna nedan är referensen kommande faser bygger på.
      </p>
    </header>
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
  const { greeting, name } = useGreeting();
  return (
    <div className="space-y-8 bg-v3-canvas-elevated rounded-v3-xl p-8 md:p-10 shadow-v3-xs">
      <div>
        <p className="text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary mb-2">
          Display · Urbanist
        </p>
        <p className="font-v3-display text-v3-6xl">{greeting}, {name}.</p>
        <p className="font-v3-display text-v3-4xl text-v3-text-secondary">
          Luna, 4 år · 18 pass den här månaden
        </p>
      </div>

      <div className="border-t border-v3-canvas-sunken pt-6">
        <p className="text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary mb-2">
          UI · Epilogue
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

/* ────────────────────────────────────────────────────────────────────────── */

type DomainKey = "traning" | "tavlings" | "prestation" | "halsa";

interface DomainConfig {
  key: DomainKey;
  label: string;
  heading: string;
  icon: LucideIcon;
  stat: string;
  statLabel: string;
  statSub: string;
  badge: string;
  cta: string;
  /** Tailwind-klasser för bakgrund och border på kortet */
  cardBg: string;
  cardBorder: string;
  /** Tailwind-klasser för accent-ikon och eyebrow */
  accentText: string;
  /** Tailwind-klass för mörkare text mot tintad yta */
  darkText: string;
  /** Tailwind-klass för badge-bakgrund */
  badgeBg: string;
}

const DOMAINS: DomainConfig[] = [
  {
    key: "traning",
    label: "Träning",
    heading: "Loggade pass.",
    icon: Dumbbell,
    stat: "18",
    statLabel: "pass",
    statSub: "den här månaden",
    badge: "Agility · Hoopers",
    cta: "Logga pass",
    cardBg: "bg-v3-accent-traning/10",
    cardBorder: "border-v3-accent-traning/20",
    accentText: "text-v3-accent-traning",
    darkText: "text-v3-accent-traning-text",
    badgeBg: "bg-v3-accent-traning/15",
  },
  {
    key: "tavlings",
    label: "Tävling",
    heading: "Dina resultat.",
    icon: Trophy,
    stat: "3/5",
    statLabel: "godkända",
    statSub: "senaste tävlingen",
    badge: "Klass 2 · SHoK",
    cta: "Se resultat",
    cardBg: "bg-v3-accent-tavlings/10",
    cardBorder: "border-v3-accent-tavlings/20",
    accentText: "text-v3-accent-tavlings",
    darkText: "text-v3-accent-tavlings-text",
    badgeBg: "bg-v3-accent-tavlings/15",
  },
  {
    key: "prestation",
    label: "Milstolpar",
    heading: "Din streak.",
    icon: Flame,
    stat: "7",
    statLabel: "dagar",
    statSub: "personbästa just nu",
    badge: "3 d till nästa",
    cta: "Se mål",
    cardBg: "bg-v3-accent-prestation/10",
    cardBorder: "border-v3-accent-prestation/20",
    accentText: "text-v3-accent-prestation",
    darkText: "text-v3-accent-prestation-text",
    badgeBg: "bg-v3-accent-prestation/15",
  },
  {
    key: "halsa",
    label: "Hälsa",
    heading: "Nästa veterinär.",
    icon: Heart,
    stat: "14d",
    statLabel: "kvar",
    statSub: "vaccin · 15 maj",
    badge: "Påminnelse aktiv",
    cta: "Hälsologg",
    cardBg: "bg-v3-accent-halsa/10",
    cardBorder: "border-v3-accent-halsa/20",
    accentText: "text-v3-accent-halsa",
    darkText: "text-v3-accent-halsa-text",
    badgeBg: "bg-v3-accent-halsa/15",
  },
];

function DomainCard({ d }: { d: DomainConfig }) {
  const Icon = d.icon;
  return (
    <div
      className={`rounded-v3-2xl border p-6 flex flex-col gap-5 ${d.cardBg} ${d.cardBorder}`}
    >
      {/* Eyebrow + ikon */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.08em] ${d.darkText}`}
        >
          {d.label}
        </span>
        <span
          className={`w-9 h-9 rounded-v3-base flex items-center justify-center ${d.badgeBg}`}
        >
          <Icon size={16} strokeWidth={1.75} className={d.accentText} />
        </span>
      </div>

      {/* Rubrik */}
      <h3 className="font-v3-display text-v3-2xl text-v3-text-primary leading-tight">
        {d.heading}
      </h3>

      {/* Stor siffra */}
      <div>
        <div className={`font-v3-display text-[40px] leading-none tabular-nums ${d.accentText}`}>
          {d.stat}
        </div>
        <div className="text-v3-sm text-v3-text-secondary mt-1">
          <span className="font-medium">{d.statLabel}</span>
          {" · "}
          <span className="text-v3-text-tertiary">{d.statSub}</span>
        </div>
      </div>

      {/* Badge */}
      <div>
        <span
          className={`inline-flex items-center h-6 px-2.5 rounded-full text-v3-xs font-medium ${d.badgeBg} ${d.darkText}`}
        >
          {d.badge}
        </span>
      </div>

      {/* CTA */}
      <button
        type="button"
        className={`mt-auto self-start inline-flex items-center gap-2 h-9 px-4 rounded-v3-base text-v3-xs font-medium transition-colors ${d.badgeBg} ${d.darkText} hover:opacity-80`}
      >
        {d.cta}
        <ArrowRight size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

function DomainIdentityShowcase() {
  return (
    <div className="space-y-10">
      {/* Fyra kort sida vid sida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {DOMAINS.map((d) => (
          <DomainCard key={d.key} d={d} />
        ))}
      </div>

      {/* Tokenreferens */}
      <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-v3-canvas-sunken/40">
          <h3 className="font-v3-display text-v3-xl text-v3-text-primary">Mönsterguide</h3>
          <p className="text-v3-sm text-v3-text-secondary mt-1">
            Klass-kombinationerna som skapar varje element ovan. Copy-paste-klara.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-v3-sm">
            <thead>
              <tr className="border-b border-v3-canvas-sunken/40">
                <th className="text-left px-6 py-3 text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary">
                  Element
                </th>
                <th className="text-left px-6 py-3 text-v3-xs font-medium uppercase tracking-wide text-v3-text-tertiary">
                  Tailwind-klasser (exempel: träning)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-v3-canvas-sunken/30">
              {[
                {
                  el: "Kortbakgrund",
                  cls: "bg-v3-accent-traning/10 border border-v3-accent-traning/20",
                },
                {
                  el: "Ikon-badge",
                  cls: "bg-v3-accent-traning/15  text-v3-accent-traning",
                },
                {
                  el: "Eyebrow / mörktext",
                  cls: "text-v3-accent-traning-text",
                },
                {
                  el: "Stor accentfärg",
                  cls: "text-v3-accent-traning  (ikon, siffra)",
                },
                {
                  el: "Badge pill",
                  cls: "bg-v3-accent-traning/15  text-v3-accent-traning-text",
                },
                {
                  el: "CTA-knapp",
                  cls: "bg-v3-accent-traning/15  text-v3-accent-traning-text  hover:opacity-80",
                },
              ].map(({ el, cls }) => (
                <tr key={el}>
                  <td className="px-6 py-3 text-v3-text-secondary font-medium whitespace-nowrap">
                    {el}
                  </td>
                  <td className="px-6 py-3 font-v3-mono text-v3-xs text-v3-text-tertiary">
                    {cls}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-v3-canvas-sunken/40 bg-v3-canvas-secondary">
          <p className="text-v3-xs text-v3-text-tertiary">
            Byt ut <code className="font-v3-mono">traning</code> mot{" "}
            <code className="font-v3-mono">tavlings</code>,{" "}
            <code className="font-v3-mono">prestation</code> eller{" "}
            <code className="font-v3-mono">halsa</code> för respektive domän.
          </p>
        </div>
      </div>
    </div>
  );
}
