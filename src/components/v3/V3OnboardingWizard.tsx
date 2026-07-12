import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Dog as DogIcon, Target, Check, Clock3, Package } from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { trackGrowthEvent } from "@/lib/growth";
import {
  recommendDailyPlan,
  AGILITY_FOCUS_KEYS,
  HOOPERS_FOCUS_KEYS,
  FOCUS_LABELS,
  type FocusArea,
  type RecSport,
} from "@/lib/trainingRecommendations";

type Sport = Enums<"sport">;
type SizeClass = Enums<"size_class">;

interface Props {
  onComplete: () => void;
}

const STEPS = ["Välkommen", "Hund", "Fokus", "Startplan"];

const SIZE_OPTIONS: { value: SizeClass; label: string; sub: string }[] = [
  { value: "XS", label: "XS", sub: "<28 cm" },
  { value: "S", label: "S", sub: "28–34 cm" },
  { value: "M", label: "M", sub: "35–42 cm" },
  { value: "L", label: "L", sub: ">43 cm" },
];

const SPORT_OPTIONS: { value: Sport; label: string; description: string }[] = [
  { value: "Agility", label: "Agility", description: "Klassisk agility" },
  { value: "Hoopers", label: "Hoopers", description: "Lågintensiv & flow" },
  { value: "Båda", label: "Båda", description: "Tränar i båda" },
];

// Sportspecifika huvudmål — Hoopers-tävling kallas inte K1.
const AGILITY_GOALS = [
  { value: "compete_k1", label: "Tävla i K1", emoji: "🏆" },
  { value: "improve_times", label: "Snabbare tider", emoji: "⚡" },
  { value: "train_more", label: "Träna mer regelbundet", emoji: "📅" },
  { value: "track", label: "Bara ha koll", emoji: "📊" },
  { value: "other", label: "Annat", emoji: "✨" },
];

const HOOPERS_GOALS = [
  { value: "compete_startklass", label: "Tävla i startklass", emoji: "🏆" },
  { value: "clean_lines", label: "Rena linjer & flow", emoji: "🌊" },
  { value: "train_more", label: "Träna mer regelbundet", emoji: "📅" },
  { value: "track", label: "Bara ha koll", emoji: "📊" },
  { value: "other", label: "Annat", emoji: "✨" },
];

const BOTH_GOALS = [
  { value: "compete_any", label: "Tävla i startklass", emoji: "🏆" },
  { value: "train_more", label: "Träna mer regelbundet", emoji: "📅" },
  { value: "improve_times", label: "Utvecklas i båda sporterna", emoji: "⚡" },
  { value: "track", label: "Bara ha koll", emoji: "📊" },
  { value: "other", label: "Annat", emoji: "✨" },
];

/**
 * V3 Onboarding – 4 steg, mobile-first.
 * Skapar ALDRIG ett fejkat träningspass. Sista steget visar en konkret
 * startplan att göra (inte en sparad träning). Sparar sport, fokus och mål
 * i user_metadata + training_goals.
 */
export function V3OnboardingWizard({ onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Steg 1 – Hund
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [sport, setSport] = useState<Sport>("Agility");
  const [sizeClass, setSizeClass] = useState<SizeClass>("L");
  const [createdDogId, setCreatedDogId] = useState<string | null>(null);

  // Steg 2 – Fokus + huvudmål
  const [focus, setFocus] = useState<FocusArea[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  // För sport = "Båda": vilken sport gäller dagens första plan?
  const [bothPlanSport, setBothPlanSport] = useState<RecSport>("Agility");

  // Steg 3 – visa alternativ
  const [showAlternative, setShowAlternative] = useState(false);

  // Om sport = "Båda" väljer användaren själv (default: Agility, eller Hoopers om fokus pekar dit)
  const focusPicksHoopers = focus.some((f) => (HOOPERS_FOCUS_KEYS as string[]).includes(f as string));
  const recSport: RecSport =
    sport === "Hoopers"
      ? "Hoopers"
      : sport === "Agility"
      ? "Agility"
      : focusPicksHoopers
      ? "Hoopers"
      : bothPlanSport;
  const focusOptions: FocusArea[] = recSport === "Hoopers" ? HOOPERS_FOCUS_KEYS : AGILITY_FOCUS_KEYS;

  const goalOptions =
    sport === "Hoopers" ? HOOPERS_GOALS : sport === "Agility" ? AGILITY_GOALS : BOTH_GOALS;

  const starterPlan = useMemo(
    () => recommendDailyPlan({ sport: recSport, focus }),
    [recSport, focus],
  );

  useEffect(() => {
    trackGrowthEvent("onboarding_started");
  }, []);

  useEffect(() => {
    if (step === 3) {
      trackGrowthEvent("starter_plan_viewed", {
        plan_id: starterPlan.id,
        focus: starterPlan.focusKey,
        minutes: starterPlan.minutes,
      });
      setShowAlternative(false);
    }
  }, [step, starterPlan.id, starterPlan.focusKey, starterPlan.minutes]);

  const toggleFocus = (f: FocusArea) => {
    setFocus((prev) => {
      if (prev.includes(f)) return prev.filter((x) => x !== f);
      if (prev.length >= 2) return [prev[1], f]; // rulla in senaste
      return [...prev, f];
    });
  };

  const handleCreateDog = async () => {
    if (!dogName.trim()) return;
    setLoading(true);
    try {
      const dog = await store.addDog({
        name: dogName.trim(),
        breed: breed.trim(),
        gender: "Hane",
        color: "",
        birthdate: null,
        photo_url: null,
        size_class: sizeClass,
        competition_level: "Nollklass",
        jumping_level: "Nollklass",
        is_active_competition_dog: true,
        notes: "",
        theme_color: "hsl(138, 39%, 41%)",
        sport,
        hoopers_level: "Startklass",
        hoopers_size: sizeClass === "L" ? "Large" : "Small",
        withers_cm: null,
      });
      if (!dog) {
        toast.error("Kunde inte skapa hund", { description: "Försök igen om en stund." });
        setLoading(false);
        return;
      }
      setCreatedDogId(dog.id);
      trackGrowthEvent("dog_created", { sport, size_class: sizeClass });
      setStep(2);
    } catch {
      toast.error("Kunde inte skapa hund");
    }
    setLoading(false);
  };

  const handleFocusStep = async () => {
    if (focus.length === 0) return;
    trackGrowthEvent("onboarding_focus_selected", { focus, goal: selectedGoal, sport: recSport });

    if (selectedGoal && createdDogId) {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          await supabase.from("training_goals").insert({
            user_id: userId,
            dog_id: createdDogId,
            title: goalOptions.find((g) => g.value === selectedGoal)?.label || selectedGoal,
            goal_type: selectedGoal,
            category: "onboarding",
            status: "active",
          });
        }
      } catch {
        /* ignore — goal-loggning får inte blockera onboardingen */
      }
    }
    setStep(3);
  };

  const finalize = async (target?: string) => {
    try {
      await supabase.auth.updateUser({
        data: {
          onboarding_complete: true,
          onboarding_focus: focus,
          onboarding_goal: selectedGoal || null,
          onboarding_sport: recSport,
          starter_plan_id: starterPlan.id,
          starter_plan_selected_at: new Date().toISOString(),
        },
      });
      await supabase.auth.refreshSession();
    } catch {
      /* ignore */
    }
    trackGrowthEvent("onboarding_completed", {
      focus,
      goal: selectedGoal,
      sport: recSport,
      starter_plan_id: starterPlan.id,
    });
    // Navigera FÖRST så eventuella query-params (t.ex. ?logNow=1) bevaras;
    // stäng sen onboardingen. V3HomePage får inte reload:a i callbacken.
    if (target) navigate(target);
    onComplete();
  };


  const handleSkip = async () => {
    await supabase.auth.updateUser({
      data: { onboarding_complete: true, onboarding_skipped: true },
    });
    trackGrowthEvent("onboarding_completed", { skipped: true });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-v3-canvas overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 pt-8 lg:items-center lg:p-8">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex justify-center items-center gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "transition-all duration-300",
                  i === step
                    ? "w-8 h-2 rounded-full bg-v3-brand-500"
                    : i < step
                    ? "w-2 h-2 rounded-full bg-v3-brand-400"
                    : "w-2 h-2 rounded-full bg-v3-canvas-sunken",
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Steg 0 – Välkommen */}
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-v3-brand-100 flex items-center justify-center mx-auto shadow-v3-base">
                  <Sparkles className="h-9 w-9 text-v3-brand-700" strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                  <p className="text-v3-xs tracking-[0.18em] text-v3-text-tertiary uppercase">Välkommen</p>
                  <h1 className="font-v3-display text-v3-4xl text-v3-text-primary leading-tight">
                    Få veta vad du och din hund ska träna på härnäst.
                  </h1>
                  <p className="text-v3-base text-v3-text-secondary leading-relaxed">
                    På några minuter får ni ett första pass anpassat efter ert fokus.
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="w-full min-h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand"
                >
                  Kom igång <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* Steg 1 – Hund */}
            {step === 1 && (
              <motion.div
                key="dog"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-v3-accent-traning/10 flex items-center justify-center mx-auto">
                    <DogIcon className="h-6 w-6 text-v3-accent-traning" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">Din hund</h2>
                  <p className="text-v3-sm text-v3-text-secondary">Vi behöver bara det viktigaste.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Namn <span className="text-v3-error">*</span>
                    </label>
                    <input
                      autoFocus
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                      placeholder="T.ex. Bella"
                      autoComplete="off"
                      className="w-full h-12 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated px-3 text-v3-base text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
                    />
                  </div>

                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Sport
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SPORT_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSport(s.value)}
                          className={cn(
                            "min-h-14 rounded-v3-base p-2.5 text-left transition-all v3-focus-ring",
                            sport === s.value
                              ? "bg-v3-brand-500 text-white shadow-v3-brand"
                              : "bg-v3-canvas-elevated border border-v3-canvas-sunken text-v3-text-primary hover:border-v3-brand-300",
                          )}
                        >
                          <div className="text-v3-sm font-semibold">{s.label}</div>
                          <div className={cn("text-v3-2xs mt-0.5", sport === s.value ? "text-white/80" : "text-v3-text-tertiary")}>
                            {s.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Storleksklass
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SIZE_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSizeClass(s.value)}
                          className={cn(
                            "min-h-12 rounded-v3-base p-2 text-center transition-all v3-focus-ring",
                            sizeClass === s.value
                              ? "bg-v3-brand-500 text-white shadow-v3-brand"
                              : "bg-v3-canvas-elevated border border-v3-canvas-sunken text-v3-text-primary",
                          )}
                        >
                          <div className="font-v3-display text-v3-lg">{s.label}</div>
                          <div className={cn("text-[10px] mt-0.5", sizeClass === s.value ? "text-white/80" : "text-v3-text-tertiary")}>
                            {s.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <details className="rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated">
                    <summary className="cursor-pointer px-3 py-2 text-v3-sm text-v3-text-secondary">
                      Ras (valfritt)
                    </summary>
                    <div className="px-3 pb-3">
                      <input
                        value={breed}
                        onChange={(e) => setBreed(e.target.value)}
                        placeholder="T.ex. Border Collie"
                        className="w-full h-11 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
                      />
                    </div>
                  </details>
                </div>

                <button
                  onClick={handleCreateDog}
                  disabled={!dogName.trim() || loading}
                  className="w-full min-h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand disabled:opacity-50"
                >
                  {loading ? "Skapar…" : "Spara och fortsätt"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* Steg 2 – Fokus + Mål */}
            {step === 2 && (
              <motion.div
                key="focus"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-v3-accent-prestation/10 flex items-center justify-center mx-auto">
                    <Target className="h-6 w-6 text-v3-accent-prestation" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">Vad vill ni fokusera på?</h2>
                  <p className="text-v3-sm text-v3-text-secondary">Välj 1–2 områden – vi anpassar dagens pass.</p>
                </div>

                {sport === "Båda" && (
                  <div className="space-y-2">
                    <p className="text-v3-sm font-medium text-v3-text-secondary text-center">
                      Vilken sport gäller dagens första pass?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Agility", "Hoopers"] as const).map((s) => {
                        const isActive = recSport === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setBothPlanSport(s);
                              // Rensa fokusval som inte passar den nya sporten
                              setFocus((prev) =>
                                prev.filter((f) =>
                                  s === "Hoopers"
                                    ? (HOOPERS_FOCUS_KEYS as string[]).includes(f as string)
                                    : (AGILITY_FOCUS_KEYS as string[]).includes(f as string),
                                ),
                              );
                            }}
                            className={cn(
                              "min-h-12 rounded-v3-base border-2 text-v3-sm font-semibold transition-all v3-focus-ring",
                              isActive
                                ? "border-v3-brand-500 bg-v3-brand-500 text-white"
                                : "border-v3-canvas-sunken bg-v3-canvas-elevated text-v3-text-primary",
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}


                <div className="flex flex-wrap gap-2 justify-center">
                  {focusOptions.map((f) => {
                    const active = focus.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFocus(f)}
                        className={cn(
                          "min-h-11 px-3.5 rounded-full text-v3-sm font-medium transition-all v3-focus-ring inline-flex items-center gap-1.5",
                          active
                            ? "bg-v3-brand-500 text-white shadow-v3-sm"
                            : "bg-v3-canvas-elevated border border-v3-canvas-sunken text-v3-text-primary",
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {FOCUS_LABELS[f]}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-v3-sm font-medium text-v3-text-secondary">Huvudmål (valfritt)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {goalOptions.map((g) => {
                      const active = selectedGoal === g.value;
                      return (
                        <button
                          key={g.value}
                          onClick={() => setSelectedGoal(active ? "" : g.value)}
                          className={cn(
                            "w-full min-h-12 p-3 rounded-v3-base border-2 text-left transition-all flex items-center gap-3 v3-focus-ring",
                            active
                              ? "border-v3-brand-500 bg-v3-brand-50"
                              : "border-v3-canvas-sunken bg-v3-canvas-elevated",
                          )}
                        >
                          <span className="text-xl">{g.emoji}</span>
                          <span className={cn("text-v3-sm font-medium flex-1", active ? "text-v3-brand-800" : "text-v3-text-primary")}>
                            {g.label}
                          </span>
                          {active && <Check className="h-4 w-4 text-v3-brand-600" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleFocusStep}
                  disabled={focus.length === 0}
                  className="w-full min-h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand disabled:opacity-50"
                >
                  Fortsätt <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* Steg 3 – Startplan (ej sparad träning) */}
            {step === 3 && (
              <motion.div
                key="starter"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-v3-brand-500/12 flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6 text-v3-brand-700" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">Ditt startpass</h2>
                  <p className="text-v3-sm text-v3-text-secondary">
                    Spara planen och logga först när ni har tränat.
                  </p>
                </div>

                <article className="rounded-v3-xl border border-v3-brand-500/25 bg-v3-brand-50/50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-elevated px-2.5 py-1 text-[11px] font-semibold text-v3-text-secondary">
                      <Clock3 size={11} /> {starterPlan.minutes} min
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-elevated px-2.5 py-1 text-[11px] font-semibold text-v3-text-secondary">
                      Fokus: {starterPlan.focusLabel}
                    </span>
                  </div>
                  <h3 className="font-v3-display text-v3-xl text-v3-text-primary leading-snug">
                    {starterPlan.title}
                  </h3>
                  <p className="text-v3-sm text-v3-text-secondary leading-relaxed">{starterPlan.why}</p>

                  <ol className="space-y-2">
                    {starterPlan.steps.map((s, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-v3-brand-500 text-[11px] font-black text-white">
                          {i + 1}
                        </span>
                        <span className="text-v3-sm text-v3-text-primary leading-6">{s}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="flex items-start gap-2 rounded-v3-base border border-dashed border-v3-canvas-sunken bg-v3-canvas-elevated/60 p-2.5 text-[12px] text-v3-text-secondary">
                    <Package size={13} className="mt-0.5 shrink-0" />
                    <span>{starterPlan.equipment.join(" · ")}</span>
                  </div>
                </article>

                {showAlternative ? (
                  <article className="rounded-v3-xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-sunken/60 px-2.5 py-1 text-[11px] font-semibold text-v3-text-secondary">
                        <Clock3 size={11} /> {starterPlan.alternative.minutes} min
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-v3-text-tertiary">
                        Lättare variant
                      </span>
                    </div>
                    <h4 className="font-v3-display text-v3-lg text-v3-text-primary leading-snug">
                      {starterPlan.alternative.title}
                    </h4>
                    <p className="text-v3-sm text-v3-text-secondary leading-relaxed">
                      {starterPlan.alternative.why}
                    </p>
                  </article>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAlternative(true);
                      trackGrowthEvent("starter_plan_alternative_viewed", {
                        plan_id: starterPlan.id,
                        alternative_id: starterPlan.alternative.id,
                      });
                    }}
                    className="w-full text-v3-sm text-v3-brand-700 hover:text-v3-brand-800 underline underline-offset-4"
                  >
                    Visa lättare variant
                  </button>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => finalize()}
                    className="w-full min-h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand"
                  >
                    Spara startpasset – till min dashboard <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => finalize("/v3?logNow=1")}
                    className="w-full min-h-11 rounded-v3-base bg-v3-canvas-elevated hover:bg-v3-canvas-sunken/60 border border-v3-canvas-sunken text-v3-text-primary text-v3-sm font-medium inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring"
                  >
                    Jag har redan tränat – logga ett riktigt pass
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global skip */}
          {step > 0 && step < 3 && (
            <button
              onClick={handleSkip}
              className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-secondary mx-auto block mt-8 underline underline-offset-4"
            >
              Hoppa över hela guiden
            </button>
          )}
          {step > 0 && step < 3 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-secondary mx-auto block mt-3"
            >
              ← Tillbaka
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
