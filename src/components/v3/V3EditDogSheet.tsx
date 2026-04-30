import { useEffect, useState } from "react";
import { X, Check, Loader2, Trash2, Power, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import type { Dog } from "@/types";

type Sport = Database["public"]["Enums"]["sport"];
type SizeClass = Database["public"]["Enums"]["size_class"];
type CompetitionLevel = Database["public"]["Enums"]["competition_level"];
type HoopersLevel = Database["public"]["Enums"]["hoopers_level"];
type HoopersSize = Database["public"]["Enums"]["hoopers_size"];

interface Props {
  open: boolean;
  dog: Dog | null;
  onClose: () => void;
  onSaved?: () => void;
}

type FormState = {
  name: string;
  breed: string;
  notes: string;
  sport: Sport;
  size_class: SizeClass;
  competition_level: CompetitionLevel;
  jumping_level: CompetitionLevel;
  hoopers_level: HoopersLevel;
  hoopers_size: HoopersSize;
  is_active_competition_dog: boolean;
};

function fromDog(d: Dog): FormState {
  return {
    name: d.name,
    breed: d.breed ?? "",
    notes: d.notes ?? "",
    sport: d.sport,
    size_class: d.size_class,
    competition_level: d.competition_level,
    jumping_level: d.jumping_level,
    hoopers_level: d.hoopers_level,
    hoopers_size: d.hoopers_size,
    is_active_competition_dog: d.is_active_competition_dog,
  };
}

export function V3EditDogSheet({ open, dog, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && dog) setForm(fromDog(dog));
  }, [open, dog]);

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

  if (!open || !dog || !form) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("dogs")
      .update({
        name: form.name.trim(),
        breed: form.breed.trim(),
        notes: form.notes.trim(),
        sport: form.sport,
        size_class: form.size_class,
        competition_level: form.competition_level,
        jumping_level: form.jumping_level,
        hoopers_level: form.hoopers_level,
        hoopers_size: form.hoopers_size,
        is_active_competition_dog: form.is_active_competition_dog,
      })
      .eq("id", dog.id);
    setSubmitting(false);
    if (error) {
      toast.error("Kunde inte spara", { description: error.message });
      return;
    }
    toast.success("Hund uppdaterad");
    onSaved?.();
    onClose();
  };

  const remove = async () => {
    if (!confirm(`Ta bort ${dog.name}? Träningsdata och resultat kopplade till hunden tas också bort.`)) return;
    setSubmitting(true);
    const { error } = await supabase.from("dogs").delete().eq("id", dog.id);
    setSubmitting(false);
    if (error) {
      toast.error("Kunde inte ta bort", { description: error.message });
      return;
    }
    toast.success(`${dog.name} borttagen`);
    onSaved?.();
    onClose();
  };

  const uploadPhoto = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5 MB");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${dog.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dog-photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("dog-photos").getPublicUrl(path);
      const { error: updErr } = await supabase.from("dogs").update({ photo_url: urlData.publicUrl }).eq("id", dog.id);
      if (updErr) throw updErr;
      toast.success("Foto uppdaterat");
      onSaved?.();
    } catch (err: any) {
      toast.error("Kunde inte ladda upp", { description: err?.message });
    } finally {
      setUploading(false);
    }
  };

  const showAgility = form.sport === "Agility" || form.sport === "Båda";
  const showHoopers = form.sport === "Hoopers" || form.sport === "Båda";

  return (
    <div className="fixed inset-0 z-[70] font-v3-sans" role="dialog" aria-modal="true" aria-label="Redigera hund">
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-v3-text-primary/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-v3-canvas-elevated shadow-v3-xl",
          "max-h-[92vh] flex flex-col",
          "rounded-t-v3-2xl pb-[env(safe-area-inset-bottom,0px)] animate-v3-sheet-in",
          "lg:inset-x-auto lg:right-6 lg:top-6 lg:bottom-6 lg:w-[720px] lg:max-w-[calc(100vw-3rem)] lg:max-h-none lg:rounded-v3-2xl lg:animate-v3-scale-in",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1 shrink-0 lg:hidden">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>

        <div className="flex items-center justify-between px-5 lg:px-7 pt-4 lg:pt-6 pb-4 shrink-0 border-b border-v3-canvas-sunken/40">
          <div className="min-w-0">
            <h2 className="font-v3-display text-[24px] lg:text-[30px] leading-tight text-v3-text-primary truncate">
              Redigera {dog.name}
            </h2>
            <p className="text-v3-xs lg:text-v3-sm text-v3-text-tertiary mt-0.5">
              Profil, sport och nivåer
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

        <div className="overflow-y-auto px-5 lg:px-7 py-5 lg:py-6 space-y-5 flex-1">
          <div className="flex items-center gap-3 rounded-v3-2xl bg-v3-canvas border border-v3-canvas-sunken/60 p-3">
            <div className="h-16 w-16 rounded-v3-xl bg-v3-brand-100 grid place-items-center overflow-hidden shrink-0">
              {dog.photo_url ? (
                <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-v3-display text-[28px] text-v3-brand-700 leading-none">
                  {dog.name[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-v3-sm font-medium text-v3-text-primary">Profilbild</div>
              <div className="text-v3-xs text-v3-text-tertiary mt-0.5">Använd gärna en tydlig bild på hunden.</div>
            </div>
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-secondary hover:text-v3-text-primary cursor-pointer transition-colors shrink-0">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {uploading ? "Laddar…" : dog.photo_url ? "Byt" : "Lägg till"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Namn">
              <input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={40} className={inputClass} />
            </Field>

            <Field label="Ras">
              <input value={form.breed} onChange={(e) => update("breed", e.target.value)} maxLength={60} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Sport">
              <select value={form.sport} onChange={(e) => update("sport", e.target.value as Sport)} className={selectClass}>
                <option value="Agility">Agility</option>
                <option value="Hoopers">Hoopers</option>
                <option value="Båda">Båda</option>
              </select>
            </Field>
            <Field label="Storleksklass">
              <select value={form.size_class} onChange={(e) => update("size_class", e.target.value as SizeClass)} className={selectClass}>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </Field>
          </div>

          {showAgility && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="Agility-klass">
                <select value={form.competition_level} onChange={(e) => update("competition_level", e.target.value as CompetitionLevel)} className={selectClass}>
                  <option value="Nollklass">Nollklass</option>
                  <option value="K1">Klass 1</option>
                  <option value="K2">Klass 2</option>
                  <option value="K3">Klass 3</option>
                </select>
              </Field>
              <Field label="Hopp-klass">
                <select value={form.jumping_level} onChange={(e) => update("jumping_level", e.target.value as CompetitionLevel)} className={selectClass}>
                  <option value="Nollklass">Nollklass</option>
                  <option value="K1">Klass 1</option>
                  <option value="K2">Klass 2</option>
                  <option value="K3">Klass 3</option>
                </select>
              </Field>
            </div>
          )}

          {showHoopers && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="Hoopers-klass">
                <select value={form.hoopers_level} onChange={(e) => update("hoopers_level", e.target.value as HoopersLevel)} className={selectClass}>
                  <option value="Startklass">Startklass</option>
                  <option value="Klass 1">Klass 1</option>
                  <option value="Klass 2">Klass 2</option>
                  <option value="Klass 3">Klass 3</option>
                </select>
              </Field>
              <Field label="Hoopers-storlek">
                <select value={form.hoopers_size} onChange={(e) => update("hoopers_size", e.target.value as HoopersSize)} className={selectClass}>
                  <option value="Small">Small (&lt;40 cm)</option>
                  <option value="Large">Large (≥40 cm)</option>
                </select>
              </Field>
            </div>
          )}

          <Field label="Anteckningar">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Personlighet, träningsfokus, skador…"
              className={cn(inputClass, "h-auto min-h-[112px] resize-none leading-snug py-3")}
            />
          </Field>

          <button
            type="button"
            onClick={() => update("is_active_competition_dog", !form.is_active_competition_dog)}
            className={cn(
              "w-full flex items-center justify-between rounded-v3-base border px-4 py-3 transition-colors",
              form.is_active_competition_dog
                ? "bg-v3-brand-500/10 border-v3-brand-500/30"
                : "bg-v3-canvas border-v3-canvas-sunken/60 hover:border-v3-text-tertiary/50",
            )}
          >
            <div className="flex items-center gap-2.5 text-left">
              <Power size={16} className={form.is_active_competition_dog ? "text-v3-brand-700" : "text-v3-text-tertiary"} />
              <div>
                <div className="text-v3-sm font-medium text-v3-text-primary">
                  {form.is_active_competition_dog ? "Aktiv tävlingshund" : "Pensionerad"}
                </div>
                <div className="text-[11px] text-v3-text-tertiary mt-0.5">
                  {form.is_active_competition_dog ? "Visas i statistik och tävlingsval" : "Sparas men exkluderas från aktiv lista"}
                </div>
              </div>
            </div>
            <span className={cn("h-5 w-9 rounded-full relative transition-colors", form.is_active_competition_dog ? "bg-v3-brand-500" : "bg-v3-canvas-sunken")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-card transition-transform", form.is_active_competition_dog ? "translate-x-[18px]" : "translate-x-0.5")} />
            </span>
          </button>

          <button type="button" onClick={remove} disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-v3-base text-v3-sm font-medium text-v3-accent-tavlings hover:bg-v3-accent-tavlings/10 transition-colors">
            <Trash2 size={14} /> Ta bort hund
          </button>
        </div>

        <div className="border-t border-v3-canvas-sunken/40 px-5 lg:px-7 py-3 bg-v3-canvas-elevated shrink-0 flex items-center gap-3">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-v3-base text-v3-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-secondary transition-colors">
            Avbryt
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className={cn("flex-1 h-11 rounded-v3-base inline-flex items-center justify-center gap-2", "bg-v3-brand-500 text-white text-v3-sm font-medium", "hover:bg-v3-brand-600 transition-colors", "disabled:opacity-50 disabled:cursor-not-allowed")}
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Sparar…</> : <><Check size={16} strokeWidth={2} /> Spara</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary focus:outline-none focus:border-v3-brand-500/60 focus:ring-2 focus:ring-v3-brand-500/15 transition-colors";

const selectClass = cn(inputClass, "appearance-none cursor-pointer pr-8");

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.06em] font-medium text-v3-text-tertiary mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
