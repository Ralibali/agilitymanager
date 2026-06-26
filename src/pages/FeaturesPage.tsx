import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Dog,
  HeartPulse,
  LayoutGrid,
  MessageCircle,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { Button } from "@/components/ui/button";

const featureGroups = [
  {
    eyebrow: "Träna smartare",
    title: "Från magkänsla till tydlig utveckling",
    description: "Logga det som faktiskt spelar roll och få en samlad bild av hundens träning, känsla och nästa steg.",
    items: [
      { icon: Activity, title: "Snabb träningslogg", text: "Spara sport, fokus, tid, känsla och anteckningar på några få tryck." },
      { icon: Target, title: "Mål som går att följa", text: "Bryt ner stora ambitioner i konkreta delmål och se framstegen över tid." },
      { icon: BarChart3, title: "Statistik som hjälper", text: "Upptäck kontinuitet, styrkor och återkommande utmaningar utan kalkylblad." },
      { icon: HeartPulse, title: "Hälsa i samma flöde", text: "Följ vikt, återhämtning och händelser som påverkar träningen." },
    ],
  },
  {
    eyebrow: "Planera och tävla",
    title: "Allt inför nästa pass och start",
    description: "Skapa banor, hitta tävlingar och samla resultaten där du redan planerar träningen.",
    items: [
      { icon: LayoutGrid, title: "Modern banplanerare", text: "Bygg agility- och hoopersbanor, spara upplägg och exportera för träning eller klubb." },
      { icon: CalendarDays, title: "Tävlingskalender", text: "Hitta relevanta tävlingar och samla planerade starter i en tydlig översikt." },
      { icon: Trophy, title: "Resultat och klassresa", text: "Spara lopp, följ utvecklingen per hund och se vad träningen leder till." },
      { icon: Dog, title: "En profil per hund", text: "Separera mål, historik, hälsa och resultat när du tränar flera hundar." },
    ],
  },
  {
    eyebrow: "Tillsammans",
    title: "Bygg en träningsvardag som håller",
    description: "Dela kunskap och håll kontakten med människorna som hjälper dig och hunden framåt.",
    items: [
      { icon: Users, title: "Vänner och klubbar", text: "Samla träningskompisar, klubbar och gemensamma aktiviteter i appen." },
      { icon: MessageCircle, title: "Chatt och delning", text: "Dela banor och idéer utan att hoppa mellan flera olika tjänster." },
      { icon: Sparkles, title: "Smartare rekommendationer", text: "Få mer relevanta insikter när träningshistoriken växer." },
      { icon: Check, title: "Byggt för Sverige", text: "Agility och hoopers i ett svenskt, mobilanpassat arbetsflöde." },
    ],
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Funktioner – AgilityManager för agility och hoopers</title>
        <meta
          name="description"
          content="Upptäck AgilityManagers träningslogg, banplanerare, tävlingskalender, statistik, mål, hundprofiler och funktioner för agility och hoopers."
        />
        <link rel="canonical" href="https://agilitymanager.se/funktioner" />
      </Helmet>

      <LandingNav />
      <main id="main-content">
        <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pb-20 sm:pt-36">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.12),transparent_32%),radial-gradient(circle_at_85%_35%,hsl(var(--secondary)/0.7),transparent_36%)]" />
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Ett system för hela träningsresan
            </span>
            <h1 className="mx-auto mt-6 max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              Mindre administration. Mer riktning med din hund.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              AgilityManager samlar träning, banor, mål, tävlingar, resultat och hälsa i en enkel produkt som fungerar lika bra i mobilen som hemma vid datorn.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="brand" className="h-12 px-6" onClick={() => navigate("/auth?mode=signup")}>Skapa gratis konto</Button>
              <Button variant="brand-outline" className="h-12 px-6" onClick={() => navigate("/banplanerare")}>Testa banplaneraren</Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Gratis för en hund · Inga kortuppgifter krävs · Pro från 79 kr/mån</p>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl space-y-16 sm:space-y-20">
            {featureGroups.map((group, groupIndex) => (
              <article key={group.title} className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
                <div className={groupIndex % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{group.eyebrow}</p>
                  <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{group.title}</h2>
                  <p className="mt-4 max-w-lg leading-7 text-muted-foreground">{group.description}</p>
                </div>
                <div className={`grid gap-4 sm:grid-cols-2 ${groupIndex % 2 === 1 ? "lg:order-1" : ""}`}>
                  {group.items.map((item) => (
                    <div key={item.title} className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <item.icon aria-hidden="true" size={21} />
                      </div>
                      <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-foreground px-6 py-10 text-background shadow-xl sm:px-10 sm:py-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/60">Börja där nyttan är störst</p>
                <h2 className="mt-3 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Logga första passet i dag. Låt historiken göra nästa beslut enklare.
                </h2>
                <p className="mt-4 max-w-2xl leading-7 text-background/70">Grundversionen är gratis. När du vill ha djupare analys, fler möjligheter och export finns Pro för 79 kr/mån eller 790 kr/år.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signup")}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70"
              >
                Kom igång gratis <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>
      <LandingFooterV2 />
    </div>
  );
}
