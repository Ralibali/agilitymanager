import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Check, Loader2, Dog as DogIcon, Calendar, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Sport = Database["public"]["Enums"]["sport"];
type SizeClass = Database["public"]["Enums"]["size_class"];
type Gender = Database["public"]["Enums"]["dog_gender"];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded?: (dogId: string) => void;
}

const schema = z.object({
  name: z.string().trim().min(1, "Namn krävs").max(40),
  breed: z.string().trim().max(60).optional(),
  birthdate: z.string().optional(),
  gender: z.enum(["Hane", "Tik"]),
  sport: z.enum(["Agility", "Hoopers", "Båda"]),
  size_class: z.enum(["XS", "S", "M", "L"]),
  color: z.string().trim().max(40).optional(),
});

type FormState = {
  name: string;
  breed: string;
  birthdate: string;
  gender: Gender;
  sport: Sport;
  size_class: SizeClass;
  color: string;
};

const defaultState: FormState = {
  name: "",
  breed: "",
  birthdate: "",
  gender: "Hane",
  sport: "Agility",
  size_class: "L",
  color: "",
};

export function V3AddDogSheet({ open, onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(defaultState);
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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

  const submit = async () => {
    if (!user?.id) {
      toast.error("Du måste vara inloggad");
      return;
    }
    const parsed = schema.safeParse(form);
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
    const { data, error } = await supabase
      .from("dogs")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        breed: parsed.data.breed ?? "",
        birthdate: parsed.data.birthdate || null,
        gender: parsed.data.gender,
        sport: parsed.data.sport,
        size_class: parsed.data.size_class,
        color: parsed.data.color ?? "",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Kunde inte spara hund", { description: error?.message });
      return;
    }
    toast.success(`${parsed.data.name} tillagd 🐾`);
    onAdded?.(data.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] font-v3-sans" role="dialog" aria-modal="true" aria-label="Lägg till hund">
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
          "pb-[env(safe-area-inset-bottom,0px)] animate-in slide-in-from-bottom duration-300",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>

        <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
          <div>
            <h2 className="font-v3-display text-[24px] leading-tight text-v3-text-primary">
              Ny hund
            </h2>
            <p className="text-v3-xs text-v3-text-tertiary mt-0.5">
              Lägg till en kompis till stallet
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
          <Field label="Namn" icon={<DogIcon size={13} />} error={errors.name}>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="t.ex. Bella"
              maxLength={40}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ras" icon={<DogIcon size={13} />}>
              <input
                value={form.breed}
                onChange={(e) => update("breed", e.target.value)}
                placeholder="t.ex. Border Collie"
                maxLength={60}
                className={inputClass}
              />
            </Field>
            <Field label="Färg" icon={<Palette size={13} />}>
              <input
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                placeholder="t.ex. svart/vit"
                maxLength={40}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Födelsedatum" icon={<Calendar size={13} />}>
              <input
                type="date"
                value={form.birthdate}
                onChange={(e) => update("birthdate", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Kön">
              <select
                value={form.gender}
                onChange={(e) => update("gender", e.target.value as Gender)}
                className={selectClass}
              >
                <option value="Hane">Hane</option>
                <option value="Tik">Tik</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sport">
              <select
                value={form.sport}
                onChange={(e) => update("sport", e.target.value as Sport)}
                className={selectClass}
              >
                <option value="Agility">Agility</option>
                <option value="Hoopers">Hoopers</option>
                <option value="Båda">Båda</option>
              </select>
            </Field>
            <Field label="Storleksklass">
              <select
                value={form.size_class}
                onChange={(e) => update("size_class", e.target.value as SizeClass)}
                className={selectClass}
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="border-t border-v3-canvas-sunken/40 px-5 py-3 bg-v3-canvas-elevated shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-v3-base text-v3-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-secondary transition-colors"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className={cn(
              "flex-1 h-11 rounded-v3-base inline-flex items-center justify-center gap-2",
              "bg-v3-brand-500 text-white text-v3-sm font-medium",
              "hover:bg-v3-brand-600 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sparar…
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2} /> Spara hund
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary focus:outline-none focus:border-v3-brand-500/60 focus:ring-2 focus:ring-v3-brand-500/15 transition-colors";

const selectClass = cn(inputClass, "appearance-none cursor-pointer pr-8");

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] font-medium text-v3-text-tertiary mb-1.5">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-v3-accent-tavlings mt-1">{error}</p>}
    </div>
  );
}
