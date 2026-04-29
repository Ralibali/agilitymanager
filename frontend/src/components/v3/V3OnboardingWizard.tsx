import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Dog as DogIcon, Target, Dumbbell, Check } from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Sport = Enums<"sport">;
type SizeClass = Enums<"size_class">;

interface Props {
  onComplete: () => void;
}

const STEPS = ["Välkommen", "Hund", "Träning", "Mål", "Klar"];

const SIZE_OPTIONS: { value: SizeClass; label: string; sub: string }[] = [
  { value: "XS", label: "XS", sub: "<28cm" },
  { value: "S", label: "S", sub: "28–34cm" },
  { value: "M", label: "M", sub: "35–42cm" },
  { value: "L", label: "L", sub: ">43cm" },
];

const SPORT_OPTIONS: { value: Sport; label: string; description: string }[] = [
  { value: "Agility", label: "Agility", description: "Klassisk agility" },
  { value: "Hoopers", label: "Hoopers", description: "Lågintensiv & flow" },
  { value: "Båda", label: "Båda", description: "Tränar i båda" },
];

const OBSTACLE_CHIPS = ["Slalom", "Kontakt", "Hopp", "Tunnel", "Bord"];

const GOAL_OPTIONS = [
  { value: "compete_k1", label: "Tävla i Klass 1", emoji: "🏆" },
  { value: "improve_times", label: "Förbättra tider", emoji: "⚡" },
  { value: "train_more", label: "Träna mer regelbundet", emoji: "📅" },
  { value: "track", label: "Bara ha koll", emoji: "📊" },
  { value: "other", label: "Annat", emoji: "✨" },
];

/**
 * V3-anpassad onboarding-wizard.
 * 5 steg: Välkommen → Hund → Första pass → Mål → Klar.
 * Använder samma DB-flöden som äldre OnboardingWizard men v3-tokens & micro-motion.
 */
export function V3OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 - Dog
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [sport, setSport] = useState<Sport>("Agility");
  const [sizeClass, setSizeClass] = useState<SizeClass>("L");
  const [createdDogId, setCreatedDogId] = useState<string | null>(null);

  // Step 2 - Training
  const [duration, setDuration] = useState("30");
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [trainingNotes, setTrainingNotes] = useState("");

  // Step 3 - Goal
  const [selectedGoal, setSelectedGoal] = useState("");

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
      if (dog) setCreatedDogId(dog.id);
      setStep(2);
    } catch {
      toast.error("Kunde inte skapa hund");
    }
    setLoading(false);
  };

  const handleLogTraining = async () => {
    if (!createdDogId) {
      setStep(3);
      return;
    }
    setLoading(true);
    try {
      const notesAll = [...obstacles, trainingNotes.trim()].filter(Boolean).join(". ");
      await store.addTraining({
        dog_id: createdDogId,
        date: new Date().toISOString().split("T")[0],
        duration_min: parseInt(duration) || 30,
        type: "Bana",
        sport: sport === "Hoopers" ? "Hoopers" : "Agility",
        reps: 0,
        dog_energy: 3,
        handler_energy: 3,
        notes_good: notesAll,
        notes_improve: "",
        tags: obstacles,
        obstacles_trained: obstacles,
        overall_mood: null,
        fault_count: null,
        best_time_sec: null,
        location: null,
        jump_height_used: null,
        dirigering_score: null,
        banflyt_score: null,
        handler_zone_kept: null,
      });
      toast.success("Träningspass loggat!");
    } catch {
      toast.error("Kunde inte logga pass");
    }
    setLoading(false);
    setStep(3);
  };

  const handleSetGoal = async () => {
    if (selectedGoal && createdDogId) {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          await supabase.from("training_goals").insert({
            user_id: userId,
            dog_id: createdDogId,
            title: GOAL_OPTIONS.find((g) => g.value === selectedGoal)?.label || selectedGoal,
            goal_type: selectedGoal,
            category: "onboarding",
            status: "active",
          });
        }
      } catch {
        /* ignore */
      }
    }
    setStep(4);
  };

  const handleFinish = async (skipped = false) => {
    await supabase.auth.updateUser({
      data: { onboarding_complete: true, onboarding_skipped: skipped },
    });
    onComplete();
  };

  const handleSkip = () => handleFinish(true);

  // Confetti på sista steget
  useEffect(() => {
    if (step === 4) {
      void import("canvas-confetti").then((mod) => {
        mod.default({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#3F8F55", "#D97706", "#7C3AED"],
        });
      });
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 bg-v3-canvas overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Progress dots */}
          <div className="flex justify-center items-center gap-2 mb-10">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "transition-all duration-300",
                    i === step
                      ? "w-8 h-2 rounded-full bg-v3-brand-500"
                      : i < step
                      ? "w-2 h-2 rounded-full bg-v3-brand-400"
                      : "w-2 h-2 rounded-full bg-v3-canvas-sunken",
                  )}
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0 - Welcome */}
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-v3-brand-100 flex items-center justify-center mx-auto shadow-v3-base">
                  <Sparkles className="h-9 w-9 text-v3-brand-700" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <p className="text-v3-xs tracking-[0.18em] text-v3-text-tertiary">
                    Välkommen
                  </p>
                  <h1 className="font-v3-display text-v3-4xl text-v3-text-primary">
                    Låt oss komma igång.
                  </h1>
                  <p className="text-v3-base text-v3-text-secondary leading-relaxed">
                    Tre snabba steg så är du redo att logga, planera och utveckla.
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="w-full h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-v3-sans font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand"
                >
                  Lägg till din första hund <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* Step 1 - Dog */}
            {step === 1 && (
              <motion.div
                key="dog"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-v3-accent-traning/10 flex items-center justify-center mx-auto">
                    <DogIcon className="h-6 w-6 text-v3-accent-traning" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">
                    Din hund
                  </h2>
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
                      className="w-full h-11 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated px-3 text-v3-base text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
                    />
                  </div>

                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Ras <span className="text-v3-text-tertiary text-v3-xs">(valfritt)</span>
                    </label>
                    <input
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="T.ex. Border Collie"
                      className="w-full h-11 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated px-3 text-v3-base text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
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
                            "rounded-v3-base p-3 text-left transition-all v3-focus-ring",
                            sport === s.value
                              ? "bg-v3-brand-500 text-white shadow-v3-brand"
                              : "bg-v3-canvas-elevated border border-v3-canvas-sunken text-v3-text-primary hover:border-v3-brand-300",
                          )}
                        >
                          <div className="text-v3-sm font-semibold">{s.label}</div>
                          <div
                            className={cn(
                              "text-v3-2xs mt-0.5",
                              sport === s.value ? "text-white/80" : "text-v3-text-tertiary",
                            )}
                          >
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
                            "rounded-v3-base p-2.5 text-center transition-all v3-focus-ring",
                            sizeClass === s.value
                              ? "bg-v3-brand-500 text-white shadow-v3-brand"
                              : "bg-v3-canvas-elevated border border-v3-canvas-sunken text-v3-text-primary hover:border-v3-brand-300",
                          )}
                        >
                          <div className="font-v3-display text-v3-lg">{s.label}</div>
                          <div
                            className={cn(
                              "text-v3-2xs mt-0.5",
                              sizeClass === s.value ? "text-white/80" : "text-v3-text-tertiary",
                            )}
                          >
                            {s.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateDog}
                  disabled={!dogName.trim() || loading}
                  className="w-full h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Skapar…" : "Spara och fortsätt"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setStep(0)}
                  className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-secondary mx-auto block"
                >
                  ← Tillbaka
                </button>
              </motion.div>
            )}

            {/* Step 2 - Training */}
            {step === 2 && (
              <motion.div
                key="training"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-v3-accent-tavlings/10 flex items-center justify-center mx-auto">
                    <Dumbbell className="h-6 w-6 text-v3-accent-tavlings" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">
                      Logga första passet
                    </h2>
                    <p className="text-v3-sm text-v3-text-secondary">
                      Tar 30 sekunder. Du kan ändra senare.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Längd (minuter)
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min={1}
                      max={300}
                      className="w-full h-11 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated px-3 text-v3-base text-v3-text-primary v3-focus-ring tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Vad tränade ni?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {OBSTACLE_CHIPS.map((o) => {
                        const active = obstacles.includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() =>
                              setObstacles((prev) =>
                                active ? prev.filter((x) => x !== o) : [...prev, o],
                              )
                            }
                            className={cn(
                              "px-3.5 h-9 rounded-full text-v3-sm font-medium transition-all v3-focus-ring inline-flex items-center gap-1.5",
                              active
                                ? "bg-v3-brand-500 text-white shadow-v3-sm"
                                : "bg-v3-canvas-elevated border border-v3-canvas-sunken text-v3-text-primary",
                            )}
                          >
                            {active && <Check className="h-3.5 w-3.5" />}
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-v3-sm font-medium text-v3-text-secondary mb-1.5 block">
                      Anteckningar{" "}
                      <span className="text-v3-text-tertiary text-v3-xs">(valfritt)</span>
                    </label>
                    <textarea
                      value={trainingNotes}
                      onChange={(e) => setTrainingNotes(e.target.value)}
                      rows={2}
                      placeholder="T.ex. Bra fokus idag!"
                      className="w-full rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated px-3 py-2 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLogTraining}
                  disabled={loading}
                  className="w-full h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand disabled:opacity-50"
                >
                  {loading ? "Sparar…" : "Logga pass"} <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-secondary mx-auto block underline underline-offset-4"
                >
                  Hoppa över, jag loggar senare
                </button>
              </motion.div>
            )}

            {/* Step 3 - Goal */}
            {step === 3 && (
              <motion.div
                key="goal"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-v3-accent-prestation/10 flex items-center justify-center mx-auto">
                    <Target className="h-6 w-6 text-v3-accent-prestation" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-v3-display text-v3-3xl text-v3-text-primary">
                      Vad är ditt mål?
                    </h2>
                    <p className="text-v3-sm text-v3-text-secondary">
                      Välj det som passar bäst.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {GOAL_OPTIONS.map((g) => {
                    const active = selectedGoal === g.value;
                    return (
                      <button
                        key={g.value}
                        onClick={() => setSelectedGoal(g.value)}
                        className={cn(
                          "w-full p-3.5 rounded-v3-base border-2 text-left transition-all flex items-center gap-3 v3-focus-ring",
                          active
                            ? "border-v3-brand-500 bg-v3-brand-50"
                            : "border-v3-canvas-sunken bg-v3-canvas-elevated hover:border-v3-brand-200",
                        )}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <span
                          className={cn(
                            "text-v3-base font-medium flex-1",
                            active ? "text-v3-brand-800" : "text-v3-text-primary",
                          )}
                        >
                          {g.label}
                        </span>
                        {active && (
                          <Check className="h-4 w-4 text-v3-brand-600" strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleSetGoal}
                  disabled={!selectedGoal}
                  className="w-full h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand disabled:opacity-50"
                >
                  Fortsätt <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-secondary mx-auto block underline underline-offset-4"
                >
                  Hoppa över
                </button>
              </motion.div>
            )}

            {/* Step 4 - Done */}
            {step === 4 && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-center space-y-6"
              >
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
                  className="text-6xl"
                >
                  🐾
                </motion.div>
                <div className="space-y-2">
                  <p className="text-v3-xs tracking-[0.18em] text-v3-text-tertiary">
                    Klart
                  </p>
                  <h2 className="font-v3-display text-v3-4xl text-v3-text-primary">
                    Du är redo!
                  </h2>
                  <p className="text-v3-base text-v3-text-secondary">
                    <strong className="text-v3-text-primary">{dogName || "Din hund"}</strong>{" "}
                    är tillagd.
                  </p>
                </div>
                <div className="rounded-v3-xl bg-v3-canvas-secondary/60 border border-v3-canvas-sunken p-4 text-left space-y-2.5">
                  {[
                    { emoji: "📊", text: "Följ träningsstatistik" },
                    { emoji: "🏆", text: "Registrera tävlingsresultat" },
                    { emoji: "🎯", text: "Sätt och uppnå mål" },
                    { emoji: "👥", text: "Gå med i en klubb" },
                  ].map((item) => (
                    <div
                      key={item.text}
                      className="flex items-center gap-3 text-v3-sm text-v3-text-primary"
                    >
                      <span className="text-base">{item.emoji}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleFinish(false)}
                  className="w-full h-12 rounded-v3-base bg-v3-brand-500 hover:bg-v3-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring shadow-v3-brand"
                >
                  Gå till din dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global skip */}
          {step > 0 && step < 4 && (
            <button
              onClick={handleSkip}
              className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-secondary mx-auto block mt-8 underline underline-offset-4"
            >
              Hoppa över hela guiden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
