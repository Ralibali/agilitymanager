import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { X, Check, Loader2, Star, MapPin, Clock, Dumbbell, Smile, Tag as TagIcon, Battery, User as UserIcon } from "lucide-react";
import { useV3Dogs, type V3Dog } from "@/hooks/v3/useV3Dogs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onLogged?: () => void;
}

const TRAINING_TYPES_AGILITY = ["Bana", "Hinder", "Kontakt", "Vändning", "Distans", "Kombination", "Annan"] as const;
const TRAINING_TYPES_HOOPERS = ["Bana", "Dirigering", "Hoop", "Tunnel", "Tunna", "Kombination", "Annan"] as const;

const OBSTACLES_AGILITY = ["Hopp", "Tunnel", "A-ram", "Gångbro", "Slalom", "Bordstopp"];
const OBSTACLES_HOOPERS = ["Hoop", "Tunnel", "Tunna", "Staket"];

const COMMON_TAGS = ["Snabb", "Fokuserad", "Nervös", "Ny övning", "Kontakt", "Slalom", "Distans"];

const schema = z.object({
  dog_id: z.string().uuid("Välj en hund"),
  type: z.string().min(1).max(40),
  duration_min: z.number().int().min(1, "Minst 1 min").max(600, "Max 600 min"),
  overall_mood: z.number().int().min(1).max(5),
  notes_good: z.string().trim().max(500).optional(),
  obstacles: z.array(z.string().max(40)).max(20),
  tags: z.array(z.string().max(40)).max(15),
  dog_energy: z.number().int().min(1).max(5),
  handler_energy: z.number().int().min(1).max(5),
  location: z.string().trim().max(120).optional(),
});

type FormState = {
  dog_id: string;
  type: string;
  duration_min: string;
  overall_mood: number;
  notes_good: string;
  obstacles: string[];
  tags: string[];
  dog_energy: number;
  handler_energy: number;
  location: string;
};

const defaultState = (firstDogId: string | null): FormState => ({
  dog_id: firstDogId ?? "",
  type: "Bana",
  duration_min: "30",
  overall_mood: 4,
  notes_good: "",
  obstacles: [],
  tags: [],
  dog_energy: 4,
  handler_energy: 4,
  location: "",
});

function localIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Bottom-sheet för v3 Logga pass.
 * – Allt på en vy (snabbt, Linear-känsla)
 * – 10 fält enligt Standard-omfång
 * – zod-validering, sonner-toast, stänger på success
 */
export function V3LogTrainingSheet({ open, onClose, onLogged }: Props) {
  const { user } = useAuth();
  const { dogs, active, activeId } = useV3Dogs();
  const [form, setForm] = useState<FormState>(() => defaultState(activeId));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const selectedDog: V3Dog | null = useMemo(
    () => dogs.find((d) => d.id === form.dog_id) ?? null,
    [dogs, form.dog_id],
  );
  const isHoopers = selectedDog?.sport === "Hoopers";
  const types = isHoopers ? TRAINING_TYPES_HOOPERS : TRAINING_TYPES_AGILITY;
  const obstacleOptions = isHoopers ? OBSTACLES_HOOPERS : OBSTACLES_AGILITY;

  // Återställ när sheet öppnas / aktiv hund ändras
  useEffect(() => {
    if (open) {
      setForm(defaultState(activeId ?? active?.id ?? null));
      setErrors({});
    }
  }, [open, activeId, active?.id]);

  // ESC + scroll-lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleArr = (key: "obstacles" | "tags", value: string) =>
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value],
    }));

  const submit = async () => {
    if (!user?.id) {
      toast.error("Du måste vara inloggad");
      return;
    }
    const parsed = schema.safeParse({
      dog_id: form.dog_id,
      type: form.type,
      duration_min: Number(form.duration_min),
      overall_mood: form.overall_mood,
      notes_good: form.notes_good,
      obstacles: form.obstacles,
      tags: form.tags,
      dog_energy: form.dog_energy,
      handler_energy: form.handler_energy,
      location: form.location,
    });
    if (!parsed.success) {
      const fieldErrs: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof FormState;
        if (!fieldErrs[k]) fieldErrs[k] = i.message;
      });
      setErrors(fieldErrs);
      toast.error("Kolla fälten", { description: parsed.error.issues[0]?.message });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const today = localIsoDate();
    const { error } = await supabase.from("training_sessions").insert({
      user_id: user.id,
      dog_id: parsed.data.dog_id,
      date: today,
      duration_min: parsed.data.duration_min,
      type: parsed.data.type as never,
      sport: (isHoopers ? "Hoopers" : "Agility") as never,
      reps: 0,
      notes_good: parsed.data.notes_good ?? "",
      notes_improve: "",
      dog_energy: parsed.data.dog_energy,
      handler_energy: parsed.data.handler_energy,
      tags: parsed.data.tags,
      obstacles_trained: parsed.data.obstacles,
      overall_mood: parsed.data.overall_mood,
      location: parsed.data.location ?? "",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Kunde inte spara passet", { description: error.message });
      return;
    }
    toast.success("Pass loggat", {
      description: `${parsed.data.duration_min} min ${parsed.data.type.toLowerCase()}`,
    });
    window.dispatchEvent(new CustomEvent("v3:training-logged", { detail: { dogId: parsed.data.dog_id, date: today } }));
    onLogged?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] font-v3-sans" role="dialog" aria-modal="true" aria-label="Logga pass">
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-v3-text-primary/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-v3-canvas-elevated rounded-t-v3-2xl shadow-v3-xl",
          "max-h-[92vh] flex flex-col",
          "pb-[env(safe-area-inset-bottom,0px)] animate-v3-sheet-in",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>

        <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
          <div>
            <h2 className="font-v3-display text-[24px] leading-tight text-v3-text-primary">
              Logga pass
            </h2>
            <p className="text-v3-xs text-v3-text-tertiary mt-0.5">
              {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="h-9 w-9 grid place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/60 hover:text-v3-text-primary transition-colors"
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hund" icon={<UserIcon size={13} />} error={errors.dog_id}>
              <select value={form.dog_id} onChange={(e) => update("dog_id", e.target.value)} className={selectClass}>
                {dogs.length === 0 && <option value="">Inga hundar</option>}
                {dogs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Typ" icon={<Dumbbell size={13} />}>
              <select value={form.type} onChange={(e) => update("type", e.target.value)} className={selectClass}>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Längd (min)" icon={<Clock size={13} />} error={errors.duration_min}>
              <input inputMode="numeric" value={form.duration_min} onChange={(e) => update("duration_min", e.target.value.replace(/[^0-9]/g, ""))} className={inputClass} />
            </Field>
            <Field label="Plats" icon={<MapPin size={13} />}>
              <input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="t.ex. klubben" maxLength={120} className={inputClass} />
            </Field>
          </div>

          <Field label="Hur kändes passet?" icon={<Smile size={13} />}>
            <StarPicker value={form.overall_mood} onChange={(v) => update("overall_mood", v)} />
          </Field>

          <Field label="Tränade hinder" icon={<Dumbbell size={13} />}>
            <ChipRow options={obstacleOptions} selected={form.obstacles} onToggle={(o) => toggleArr("obstacles", o)} />
          </Field>

          <Field label="Taggar" icon={<TagIcon size={13} />}>
            <ChipRow options={COMMON_TAGS} selected={form.tags} onToggle={(t) => toggleArr("tags", t)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hundens energi" icon={<Battery size={13} />}>
              <StarPicker value={form.dog_energy} onChange={(v) => update("dog_energy", v)} compact />
            </Field>
            <Field label="Din energi" icon={<Battery size={13} />}>
              <StarPicker value={form.handler_energy} onChange={(v) => update("handler_energy", v)} compact />
            </Field>
          </div>

          <Field label="Vad funkade bra?">
            <textarea value={form.notes_good} onChange={(e) => update("notes_good", e.target.value)} maxLength={500} rows={3} placeholder="Snabb slalom, bra kontaktzoner…" className={cn(inputClass, "resize-none leading-snug")} />
            <div className="text-[10px] text-v3-text-tertiary text-right mt-1">{form.notes_good.length}/500</div>
          </Field>
        </div>

        <div className="border-t border-v3-canvas-sunken/40 px-5 py-3 bg-v3-canvas-elevated shrink-0 flex items-center gap-3">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-v3-base text-v3-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-secondary transition-colors">Avbryt</button>
          <button type="button" onClick={submit} disabled={submitting || !form.dog_id} className={cn("flex-1 h-11 rounded-v3-base inline-flex items-center justify-center gap-2", "bg-v3-brand-500 text-white text-v3-sm font-medium", "hover:bg-v3-brand-600 transition-colors", "disabled:opacity-50 disabled:cursor-not-allowed") }>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Sparar…</> : <><Check size={16} strokeWidth={2} /> Spara pass</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full h-10 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary focus:outline-none focus:border-v3-brand-500/60 focus:ring-2 focus:ring-v3-brand-500/15 transition-colors";
const selectClass = cn(inputClass, "appearance-none cursor-pointer pr-8");

function Field({ label, icon, error, children }: { label: string; icon?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return <div><label className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] font-medium text-v3-text-tertiary mb-1.5">{icon}{label}</label>{children}{error && <p className="text-[11px] text-v3-accent-tavlings mt-1">{error}</p>}</div>;
}

function StarPicker({ value, onChange, compact = false }: { value: number; onChange: (v: number) => void; compact?: boolean }) {
  return <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" aria-label={`${i} av 5`} onClick={() => onChange(i)} className={cn("grid place-items-center rounded-md transition-colors", compact ? "h-8 w-8" : "h-9 w-9", i <= value ? "text-v3-brand-600" : "text-v3-canvas-sunken hover:text-v3-text-tertiary")}><Star size={compact ? 16 : 18} fill={i <= value ? "currentColor" : "none"} strokeWidth={1.6} /></button>)}</div>;
}

function ChipRow({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => { const isOn = selected.includes(o); return <button key={o} type="button" onClick={() => onToggle(o)} className={cn("h-8 px-3 rounded-full text-v3-xs font-medium transition-colors border", isOn ? "bg-v3-brand-500/10 border-v3-brand-500/30 text-v3-brand-700" : "bg-v3-canvas border-v3-canvas-sunken/60 text-v3-text-secondary hover:border-v3-text-tertiary/50")}>{o}</button>; })}</div>;
}
