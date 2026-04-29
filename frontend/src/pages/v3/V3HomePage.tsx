import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Dog as DogIcon, Target, BarChart3, CalendarDays, Flame, Medal, Lightbulb, ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard, type NextEvent } from "@/hooks/v3/useV3Dashboard";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { DogHero } from "@/components/v3/DogHero";
import { ActivityTimeline } from "@/components/v3/ActivityTimeline";
import { V3EmptyState } from "@/components/v3/V3EmptyState";
import { V3OnboardingWizard } from "@/components/v3/V3OnboardingWizard";
import { BrandPill } from "@/components/brand/BrandPill";
import { CoursePath } from "@/components/brand/CoursePath";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase("sv-SE") + s.slice(1);
}

function getTimeGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 11) return "Godmorgon";
  if (h >= 11 && h < 17) return "Hej";
  if (h >= 17 && h < 22) return "God kväll";
  return "Sent uppe";
}

function pickCopy<T>(items: T[], seedParts: Array<string | number | null | undefined>): T {
  const seed = seedParts.join("|");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return items[hash % items.length];
}

function todaySeed(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentWeekDays(): { d: string; n: string; active: boolean; iso: string }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const labels = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"];

  return labels.map((d, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const isToday = date.getTime() === today.getTime();
    return { d, n: String(date.getDate()), active: isToday, iso: date.toISOString().slice(0, 10) };
  });
}

const HERO_EMPTY_COPY = [
  "Kom igång genom att logga första passet, sätta ett mål eller planera nästa tävling.",
  "Börja enkelt: fånga dagens känsla och bygg historiken steg för steg.",
  "När du loggar några pass börjar AgilityManager visa mönster, riktning och framsteg.",
  "Ett kort pass räcker. Det viktiga är att börja samla teamets utveckling på ett ställe.",
];

const HERO_ACTIVE_COPY = [
  "Fortsätt bygga rutinen tillsammans med {dog}. Små steg varje dag skapar tryggare träning.",
  "Välj ett tydligt fokus för nästa pass med {dog} och fånga vad som faktiskt fungerade.",
  "Håll koll på känslan, framstegen och nästa steg för {dog} utan att behöva minnas allt själv.",
  "Varje pass med {dog} säger något. Logga det som gick bra och vad ni vill testa nästa gång.",
  "Gör dagens träning enkel: ett fokus, en känsla och ett nästa steg för {dog}.",
];

const NEXT_EMPTY_COPY = [
  { title: "Logga första passet", body: "Börja med ett enkelt pass. När historiken växer får du bättre överblick här." },
  { title: "Välj dagens fokus", body: "Skriv ner vad ni tränade och hur det kändes. Det räcker för att börja se mönster." },
  { title: "Skapa första träningsspåret", body: "När du loggar pass kan du följa utveckling, mål och tävlingskänsla över tid." },
  { title: "Spara dagens känsla", body: "Ett kort loggat pass gör nästa träning lättare att planera." },
];

const NEXT_ACTIVE_COPY = [
  { title: "Planera nästa pass", body: "Följ upp känslan från senaste passet och välj ett tydligt fokus." },
  { title: "Bygg vidare på senaste passet", body: "Titta på vad som gick bra och välj en liten sak att förstärka nästa gång." },
  { title: "Fånga nästa utvecklingssteg", body: "Logga det du vill komma ihåg innan detaljerna försvinner." },
  { title: "Håll rytmen i träningen", body: "Ett kort, genomtänkt pass kan göra mer nytta än ett långt utan tydligt fokus." },
];

const STREAK_ZERO_COPY = [
  "Logga första passet för att starta en streak.",
  "Streaken börjar när du sparar dagens första pass.",
  "Börja lugnt – ett pass räcker för att skapa rytm.",
  "När du loggar pass följer vi kontinuiteten här.",
];

const STREAK_ACTIVE_COPY = [
  "Fortsätt bygga rutinen.",
  "Fin kontinuitet – håll det enkelt och håll i.",
  "Ni har börjat skapa en bra träningsrytm.",
  "Små pass ofta bygger stabil utveckling.",
];

const RESULT_ZERO_COPY = [
  "När du loggar resultat visas framstegen här.",
  "Resultat dyker upp här när första loppet är sparat.",
  "Logga tävlingsresultat för att följa utvecklingen över tid.",
  "Här samlas godkända lopp när du börjar registrera starter.",
];

const RESULT_ACTIVE_COPY = [
  "Bra jobbat, ni är på väg.",
  "Fint kvitto på träningen – fortsätt följa mönstren.",
  "Stabil utveckling. Spara detaljerna medan de är färska.",
  "Härligt att se resultat växa fram över tid.",
];

function useGreeting(): { greeting: string; name: string } {
  const { user } = useAuth();
  const [name, setName] = useState<string>("vovvägare");
  const [greeting, setGreeting] = useState<string>(() => getTimeGreeting());

  useEffect(() => {
    const id = window.setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user?.id) { setName("vovvägare"); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      const raw = data?.display_name?.trim();
      const cleaned = raw && raw.includes("@") ? raw.split("@")[0] : raw;
      setName(cleaned && cleaned.length > 0 ? cleaned : "vovvägare");
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return { greeting, name };
}

export default function V3HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { greeting, name } = useGreeting();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { stats, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);

  const streakDays = stats?.streakDays ?? 0;
  const passedThisMonth = stats?.passedThisMonth ?? 0;
  const hasTimeline = timeline.length > 0;

  const copy = useMemo(() => {
    const seed = [todaySeed(), active?.id, hasTimeline ? "active" : "empty"];
    return {
      hero: pickCopy(hasTimeline ? HERO_ACTIVE_COPY : HERO_EMPTY_COPY, seed).replace("{dog}", active?.name ?? "din hund"),
      next: pickCopy(hasTimeline ? NEXT_ACTIVE_COPY : NEXT_EMPTY_COPY, seed),
      streak: pickCopy(streakDays > 0 ? STREAK_ACTIVE_COPY : STREAK_ZERO_COPY, [...seed, streakDays]),
      result: pickCopy(passedThisMonth > 0 ? RESULT_ACTIVE_COPY : RESULT_ZERO_COPY, [...seed, passedThisMonth]),
    };
  }, [active?.id, active?.name, hasTimeline, passedThisMonth, streakDays]);

  const smartTips = useMemo(() => buildSmartTips({ dogName: active?.name, hasTimeline, streakDays, passedThisMonth, nextEvent }), [active?.name, hasTimeline, nextEvent, passedThisMonth, streakDays]);
  const activationSteps = useMemo(() => buildActivationSteps({ hasDog: dogs.length > 0, hasTimeline, hasNextEvent: Boolean(nextEvent), hasResult: passedThisMonth > 0 }), [dogs.length, hasTimeline, nextEvent, passedThisMonth]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (dogsLoading || !user) return;
    const meta = (user.user_metadata ?? {}) as { onboarding_complete?: boolean; onboarding_skipped?: boolean };
    const done = meta.onboarding_complete || meta.onboarding_skipped;
    if (!done && dogs.length === 0) setShowOnboarding(true);
  }, [user, dogs, dogsLoading]);

  if (showOnboarding) {
    return <V3OnboardingWizard onComplete={() => { setShowOnboarding(false); window.location.reload(); }} />;
  }

  return (
    <div className="max-w-[1180px] mx-auto px-5 lg:px-10 py-6 lg:py-9 space-y-4 lg:space-y-5 animate-v3-fade-in">
      <DashboardHero greeting={greeting} name={name} heroCopy={copy.hero} />

      {dogsLoading ? (
        <div className="h-28 rounded-v3-2xl v3-skeleton" />
      ) : dogs.length === 0 ? (
        <V3EmptyState
          icon={DogIcon}
          accent="brand"
          title="Lägg till din första hund"
          description="Allt i AgilityManager kretsar kring dina hundar – träning, tävlingar och mål. Ta 30 sekunder och kom igång."
          actions={[{ label: "Starta guiden", onClick: () => setShowOnboarding(true), icon: Plus }, { label: "Lägg till manuellt", onClick: () => navigate("/v3/dogs"), variant: "secondary" }]}
        />
      ) : (
        <DogHero dogs={dogs} active={active} activeId={activeId} onSelect={setActive} onAddDog={() => navigate("/v3/dogs")} />
      )}

      {active && (
        <>
          <section aria-label="Snabbstart" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <ActionCard icon={Plus} title="Logga pass" description="Registrera ett träningspass" accent="brand" onClick={openV3LogSheet} />
            <ActionCard icon={CalendarDays} title="Planera tävling" description="Se och anmäl till tävlingar" accent="tavling" onClick={() => navigate("/v3/competition?action=new")} />
            <ActionCard icon={Target} title="Sätt mål" description="Fokusera och följ din plan" accent="prestation" onClick={() => navigate("/v3/goals?action=new")} />
            <ActionCard icon={BarChart3} title="Se statistik" description="Följ utveckling och resultat" accent="neutral" onClick={() => navigate("/v3/stats")} />
          </section>

          <SmartTipsPanel tips={smartTips} onLog={openV3LogSheet} onNavigate={navigate} />
          <ActivationChecklist steps={activationSteps} onLog={openV3LogSheet} onNavigate={navigate} />

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
            <NextUpSoftCard loading={dashLoading} hasNext={Boolean(nextEvent)} nextCopy={copy.next} onOpen={() => navigate("/v3/competition")} onLog={openV3LogSheet} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard icon={Flame} label="Streak" value={String(streakDays)} suffix={streakDays === 1 ? "dag" : "dagar i rad"} note={copy.streak} tone="warm" />
              <MetricCard icon={Medal} label="Klarade lopp denna månad" value={String(passedThisMonth)} suffix="lopp" note={copy.result} tone="green" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-4">
            <WeeklyOverviewCard hasActivity={hasTimeline} />
            <ActivityTimeline entries={timeline} loading={dashLoading} />
          </div>
        </>
      )}
    </div>
  );
}

type SmartTip = { title: string; body: string; actionLabel: string; action: "log" | "goals" | "competition" | "stats" | "training"; tone: "brand" | "warm" | "neutral"; };
type ActivationStep = { title: string; body: string; done: boolean; actionLabel: string; action: "log" | "dog" | "competition" | "stats"; };

function buildActivationSteps({ hasDog, hasTimeline, hasNextEvent, hasResult }: { hasDog: boolean; hasTimeline: boolean; hasNextEvent: boolean; hasResult: boolean }): ActivationStep[] {
  return [
    { title: "Lägg till hund", body: "Bygg allt runt rätt hund och sport.", done: hasDog, actionLabel: "Hundar", action: "dog" },
    { title: "Logga första passet", body: "Det gör statistiken och dashboarden levande.", done: hasTimeline, actionLabel: "Logga pass", action: "log" },
    { title: "Planera nästa start", body: "Ge träningen en tydlig riktning.", done: hasNextEvent, actionLabel: "Planera", action: "competition" },
    { title: "Följ utvecklingen", body: "Se vad som fungerar och vad som behöver justeras.", done: hasTimeline || hasResult, actionLabel: "Statistik", action: "stats" },
  ];
}

function buildSmartTips({ dogName, hasTimeline, streakDays, passedThisMonth, nextEvent }: { dogName?: string; hasTimeline: boolean; streakDays: number; passedThisMonth: number; nextEvent: NextEvent }): SmartTip[] {
  const name = dogName ?? "din hund";
  const tips: SmartTip[] = [];
  if (!hasTimeline) {
    tips.push({ title: "Börja med första passet", body: `Logga ett enkelt pass med ${name}. Det räcker med typ, tid och känsla för att börja bygga historik.`, actionLabel: "Logga pass", action: "log", tone: "brand" });
    tips.push({ title: "Sätt ett första fokus", body: "Ett mål gör nästa träningspass lättare att välja och följa upp.", actionLabel: "Skapa mål", action: "goals", tone: "neutral" });
  } else {
    tips.push({ title: "Följ upp senaste passet", body: "Skriv ner vad som fungerade innan känslan försvinner. Små noteringar ger bättre mönster över tid.", actionLabel: "Logga pass", action: "log", tone: "brand" });
  }
  if (streakDays === 0 && hasTimeline) tips.push({ title: "Starta om rutinen", body: "Ett kort pass idag räcker för att börja bygga kontinuitet igen.", actionLabel: "Logga pass", action: "log", tone: "warm" });
  else if (streakDays > 0) tips.push({ title: "Skydda träningsrytmen", body: `${streakDays} ${streakDays === 1 ? "dag" : "dagar"} i rad. Planera nästa enkla pass medan rutinen sitter.`, actionLabel: "Se träning", action: "training", tone: "warm" });
  if (!nextEvent) tips.push({ title: "Planera nästa start", body: "Lägg in en tävling eller träningsaktivitet så får dashboarden mer riktning.", actionLabel: "Planera tävling", action: "competition", tone: "neutral" });
  else tips.push({ title: "Förbered nästa aktivitet", body: "Du har något på gång. Använd de senaste passen för att välja rätt fokus inför starten.", actionLabel: "Se tävlingar", action: "competition", tone: "neutral" });
  if (passedThisMonth === 0 && hasTimeline) tips.push({ title: "Spara tävlingsresultat", body: "När du loggar resultat kan appen visa pass-rate och utveckling över tid.", actionLabel: "Logga resultat", action: "competition", tone: "neutral" });
  else if (passedThisMonth > 0) tips.push({ title: "Analysera vad som fungerade", body: "Du har godkända lopp den här månaden. Se om träningen visar ett mönster.", actionLabel: "Se statistik", action: "stats", tone: "brand" });
  return tips.slice(0, 3);
}

function SmartTipsPanel({ tips, onLog, onNavigate }: { tips: SmartTip[]; onLog: () => void; onNavigate: (path: string) => void }) {
  const handleAction = (action: SmartTip["action"]) => {
    if (action === "log") return onLog();
    if (action === "goals") return onNavigate("/v3/goals?action=new");
    if (action === "competition") return onNavigate("/v3/competition?action=new");
    if (action === "training") return onNavigate("/v3/training");
    return onNavigate("/v3/stats");
  };
  return (
    <section className="rounded-2xl bg-white border border-forest/8 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <BrandPill color="lime" dot>
            <Lightbulb size={11} strokeWidth={1.8} /> Smarta förslag
          </BrandPill>
          <h2 className="font-brand-display text-2xl text-forest">Nästa bästa steg</h2>
        </div>
        <BrandPill color="moss" className="hidden sm:inline-flex">Anpassas efter din data</BrandPill>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {tips.map((tip) => (
          <button
            key={tip.title}
            type="button"
            onClick={() => handleAction(tip.action)}
            className="group text-left bg-cream rounded-xl p-5 border border-forest/8 hover:border-forest/20 transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-lime grid place-items-center mb-3">
              <ArrowRight size={15} strokeWidth={1.8} className="text-forest group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="font-brand-display text-[14px] text-forest leading-tight">{tip.title}</h3>
            <p className="text-[13px] text-stone mt-1.5 leading-relaxed line-clamp-3">{tip.body}</p>
            <div className="text-sm font-medium text-forest mt-4">{tip.actionLabel} →</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ActivationChecklist({ steps, onLog, onNavigate }: { steps: ActivationStep[]; onLog: () => void; onNavigate: (path: string) => void }) {
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const handle = (action: ActivationStep["action"]) => {
    if (action === "log") return onLog();
    if (action === "dog") return onNavigate("/v3/dogs?action=new");
    if (action === "competition") return onNavigate("/v3/competition?action=new");
    return onNavigate("/v3/stats");
  };
  return (
    <section className="rounded-2xl bg-forest text-bone p-8 mb-8 overflow-hidden relative">
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <div className="text-[11px] tracking-[0.04em] font-medium text-bone/60">Kom igång</div>
          <h2 className="font-brand-display text-2xl mt-1">Din aktiveringsresa</h2>
          <p className="text-sm text-bone/65 mt-1">Ju fler steg användaren gör, desto tydligare blir värdet i appen.</p>
        </div>
        <div className="lg:text-right">
          <div className="font-brand-display text-[34px] leading-none tabular">{progress}%</div>
          <div className="text-[11px] text-bone/55 mt-1">{completed}/{steps.length} steg klara</div>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-bone/15 overflow-hidden mb-4">
        <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {steps.map((step) => (
          <button
            key={step.title}
            type="button"
            onClick={() => !step.done && handle(step.action)}
            className={cn(
              "text-left rounded-lg p-4 transition-all bg-bone/8",
              step.done ? "cursor-default" : "hover:bg-bone/15",
            )}
          >
            <div className="flex items-start gap-2">
              {step.done ? (
                <span className="h-[18px] w-[18px] rounded-full bg-lime grid place-items-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} strokeWidth={2} className="text-forest" />
                </span>
              ) : (
                <span className="h-[18px] w-[18px] rounded-full border border-bone/35 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-bone">{step.title}</h3>
                <p className="text-[11px] text-bone/60 mt-1 leading-relaxed">{step.body}</p>
                {!step.done && <div className="text-[11px] font-medium text-lime mt-2">{step.actionLabel} →</div>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DashboardHero({ greeting, name, heroCopy }: { greeting: string; name: string; heroCopy: string }) {
  const dateLabel = capitalizeFirst(new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" }));
  return (
    <header className="relative overflow-hidden rounded-2xl bg-bone-2 py-12 px-10 mb-8">
      <CoursePath
        variant="weave"
        accent="both"
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] opacity-50"
      />
      <div className="absolute right-12 bottom-6 h-14 w-14 rounded-full bg-white border-2 border-moss grid place-items-center shadow-sm" aria-hidden="true">
        <DogIcon size={26} strokeWidth={1.5} className="text-forest" />
      </div>
      <div className="relative max-w-2xl">
        <BrandPill color="moss">{dateLabel}</BrandPill>
        <h1 className="font-brand-display text-5xl leading-[1.02] tracking-[-0.025em] text-forest mt-4">
          {greeting === "Hej" ? "Hej" : greeting}, {name}
        </h1>
        <p className="text-base lg:text-[17px] text-stone max-w-xl mt-3 leading-relaxed">{heroCopy}</p>
        <Button variant="brand" onClick={openV3LogSheet} className="mt-5 h-12 px-6 gap-2 text-sm">
          <Plus size={17} /> Logga pass
        </Button>
      </div>
    </header>
  );
}

function ActionCard({ icon: Icon, title, description, accent, onClick }: { icon: LucideIcon; title: string; description: string; accent: "brand" | "tavling" | "prestation" | "neutral"; onClick: () => void }) {
  const styles = {
    brand:      { border: "border-l-lime",  iconBg: "bg-lime",         iconText: "text-forest" },
    tavling:    { border: "border-l-coral", iconBg: "bg-coral",        iconText: "text-bone" },
    prestation: { border: "border-l-moss",  iconBg: "bg-moss",         iconText: "text-moss-deep" },
    neutral:    { border: "border-l-stone", iconBg: "bg-stone",        iconText: "text-bone" },
  }[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left bg-white border border-forest/12 rounded-xl p-4 border-l-4 transition-all",
        "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20",
        styles.border,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-11 w-11 rounded-full grid place-items-center shrink-0", styles.iconBg, styles.iconText)}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h3 className="font-brand-display text-[17px] text-forest leading-tight">{title}</h3>
          <p className="text-sm text-stone mt-0.5 truncate">{description}</p>
        </div>
      </div>
    </button>
  );
}

function NextUpSoftCard({ loading, hasNext, nextCopy, onOpen, onLog }: { loading: boolean; hasNext: boolean; nextCopy: { title: string; body: string }; onOpen: () => void; onLog: () => void }) {
  if (loading) return <div className="h-[164px] rounded-2xl v3-skeleton" />;
  return (
    <section className="rounded-xl bg-white border border-forest/12 p-5 min-h-[164px]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-brand-display text-2xl text-forest">Nästa upp</h2>
        <button
          type="button"
          onClick={onOpen}
          className="h-8 px-3 rounded-full border border-forest/12 text-[11px] font-medium text-stone hover:bg-bone-2 transition-colors"
        >
          Tävlingar
        </button>
      </div>
      <div className="flex items-start gap-4">
        <div className="w-16 rounded-lg bg-bone-2 p-2 text-center shrink-0">
          <div className="text-[10px] tracking-[0.04em] font-medium text-stone">Nästa</div>
          <div className="font-brand-display text-[28px] leading-none text-forest mt-1">+</div>
          <div className="text-[10px] tracking-[0.04em] font-medium text-stone mt-1">Steg</div>
        </div>
        <div className="min-w-0 flex-1">
          <BrandPill color="moss">{hasNext ? "Tävling" : "Fokus"}</BrandPill>
          <h3 className="font-brand-display text-xl text-forest mt-2">{hasNext ? "Kommande aktivitet" : nextCopy.title}</h3>
          <p className="text-sm text-stone mt-1">{hasNext ? "Du har något på gång. Planera nästa pass runt kommande aktivitet." : nextCopy.body}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-stone">
            <span>Träning</span><span>Mål</span><span>Tävling</span>
          </div>
        </div>
      </div>
      {!hasNext && (
        <button type="button" onClick={onLog} className="mt-4 text-sm font-medium text-forest hover:text-forest-soft">
          Logga ett pass →
        </button>
      )}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, suffix, note, tone }: { icon: LucideIcon; label: string; value: string; suffix: string; note: string; tone: "warm" | "green" }) {
  const toneClass = tone === "warm" ? "bg-coral text-bone" : "bg-lime text-forest";
  return (
    <div className="rounded-xl bg-cream p-5 min-h-[164px]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-brand-display text-xl text-forest leading-tight">{label}</h2>
        <div className={cn("h-12 w-12 rounded-full grid place-items-center shrink-0", toneClass)}>
          <Icon size={20} strokeWidth={1.7} />
        </div>
      </div>
      <div className="mt-5 flex items-end gap-2">
        <div className="font-brand-display text-[48px] leading-none text-forest tabular">{value}</div>
        <div className="text-sm text-stone pb-1.5">{suffix}</div>
      </div>
      <p className="text-sm text-stone mt-4">{note}</p>
    </div>
  );
}

function WeeklyOverviewCard({ hasActivity }: { hasActivity: boolean }) {
  const days = getCurrentWeekDays();
  return (
    <section className="rounded-xl bg-white border border-forest/12 p-5">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="font-brand-display text-2xl text-forest">Veckans översikt</h2>
        <span className="text-[11px] text-stone">Automatisk översikt</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.iso}
            className={cn(
              "rounded-lg px-2 py-3 text-center border",
              day.active ? "border-forest bg-bone-2" : "border-transparent bg-bone-2/50",
            )}
          >
            <div className="text-[10px] tracking-[0.04em] font-medium text-stone">{day.d}</div>
            <div className="font-brand-display text-xl text-forest mt-1">{day.n}</div>
            <div className="text-forest text-sm mt-1">•</div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-sm text-stone mb-2">
          <span>{hasActivity ? "Följ veckans pass här" : "Inga pass loggade denna vecka"}</span>
          <span>{hasActivity ? "—" : "0%"}</span>
        </div>
        <div className="h-1.5 rounded-full bg-bone-2 overflow-hidden">
          <div className={cn("h-full rounded-full bg-lime", hasActivity ? "w-[20%]" : "w-0")} />
        </div>
      </div>
    </section>
  );
}
