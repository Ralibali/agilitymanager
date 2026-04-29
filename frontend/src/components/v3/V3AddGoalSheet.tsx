import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Loader2, Target, Calendar, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";
import type { V3Goal } from "@/hooks/v3/useV3Goals";

interface Props {
  open: boolean;
  onClose: () => void;
  dog: V3Dog | null;
  /** För redigering – om angett uppdateras detta mål istället för insert. */
  editing?: V3Goal | null;
  onSaved?: () => void;
}

const CATEGORIES = [
  { value: "Träning", label: "Träning" },
  { value: "Tävling", label: "Tävling" },
  { value: "Hälsa", label: "Hälsa" },
  { value: "Annat", label: "Annat" },
];

const schema = z.object({
  title: z.string().trim().min(1, "Ange en titel").max(140),
  description: z.string().trim().max(500).optional(),
  category: z.string(),
  goal_type: z.enum(["milestone", "numeric"]),
  current_value: z.number().int().min(0).nullable(),
  target_value: z.number().int().min(0).nullable(),
  target_date: z.string().nullable(),
});

export function V3AddGoalSheet({ open, onClose, dog, editing, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Träning");
  const [goalType, setGoalType] = useState<"milestone" | "numeric">("milestone");
  const [currentValue, setCurrentValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setCategory(editing?.category ?? "Träning");
      setGoalType((editing?.goal_type as "milestone" | "numeric") ?? "milestone");
      setCurrentValue(editing?.current_value?.toString() ?? "");
      setTargetValue(editing?.target_value?.toString() ?? "");
      setTargetDate(editing?.target_date ?? "");
    }
  }, [open, editing]);

  if (!open) return null;

  const isEdit = !!editing;

  const handleSave = async () => {
    if (!user?.id || !dog) return;
    const parsed = schema.safeParse({
      title,
      description,
      category,
      goal_type: goalType,
      current_value: goalType === "numeric" && currentValue ? Number(currentValue) : null,
      target_value: goalType === "numeric" && targetValue ? Number(targetValue) : null,
      target_date: targetDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Kontrollera fälten");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user.id,
      dog_id: dog.id,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      category: parsed.data.category,
      goal_type: parsed.data.goal_type,
      current_value: parsed.data.current_value,
      target_value: parsed.data.target_value,
      target_date: parsed.data.target_date,
      status: editing?.status ?? "active",
    };

    const res = isEdit
      ? await supabase.from("training_goals").update(payload).eq("id", editing!.id)
      : await supabase.from("training_goals").insert(payload);

    setSaving(false);
    if (res.error) {
      toast.error(isEdit ? "Kunde inte uppdatera mål" : "Kunde inte skapa mål");
      return;
    }
    toast.success(isEdit ? "Mål uppdaterat" : "Mål skapat");
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[640px] bg-v3-canvas rounded-t-v3-2xl lg:rounded-v3-2xl lg:mb-10 max-h-[92vh] flex flex-col shadow-v3-xl animate-v3-sheet-in-4">
        <header className="flex items-center justify-between px-5 py-4 border-b border-v3-canvas-sunken/40 shrink-0">
          <div>
            <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
              {isEdit ? "Redigera mål" : "Nytt mål"}
            </div>
            <h2 className="font-v3-display text-v3-2xl text-v3-text-primary leading-none mt-1">
              {dog ? dog.name : "Mål"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:bg-v3-canvas-sunken transition-colors"
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <Field label="Titel" icon={<Target size={14} />}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. 10 nollrundor i K2"
              autoFocus
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <Field label="Kategori">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "h-9 px-4 rounded-v3-base text-v3-sm font-medium transition-colors",
                    category === c.value
                      ? "bg-v3-text-primary text-v3-text-inverse"
                      : "bg-v3-canvas-elevated text-v3-text-secondary border border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Typ av mål">
            <div className="grid grid-cols-2 gap-2">
              <TypeOption
                active={goalType === "milestone"}
                onClick={() => setGoalType("milestone")}
                title="Milstolpe"
                desc="Klart eller inte"
              />
              <TypeOption
                active={goalType === "numeric"}
                onClick={() => setGoalType("numeric")}
                title="Numeriskt"
                desc="Räkna mot ett mål"
              />
            </div>
          </Field>

          {goalType === "numeric" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nuvarande" icon={<Hash size={14} />}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
                />
              </Field>
              <Field label="Mål" icon={<Target size={14} />}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="10"
                  className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
                />
              </Field>
            </div>
          )}

          <Field label="Måldatum (valfritt)" icon={<Calendar size={14} />}>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <Field label="Beskrivning (valfritt)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mer detaljer eller plan…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40 resize-none"
            />
          </Field>
        </div>

        <footer className="px-5 py-4 border-t border-v3-canvas-sunken/40 shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dog}
            className="flex-1 h-11 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Spara ändringar" : "Skapa mål"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-2">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function TypeOption({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-3 rounded-v3-base border transition-colors",
        active
          ? "bg-v3-brand-500/10 border-v3-brand-500/40"
          : "bg-v3-canvas-elevated border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
      )}
    >
      <div className={cn("text-v3-sm font-medium", active ? "text-v3-brand-700" : "text-v3-text-primary")}>
        {title}
      </div>
      <div className="text-v3-xs text-v3-text-tertiary mt-0.5">{desc}</div>
    </button>
  );
}
