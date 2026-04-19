import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Loader2, Calendar, Weight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";
import { HEALTH_TYPES, type V3HealthLog } from "@/hooks/v3/useV3Health";

interface Props {
  open: boolean;
  onClose: () => void;
  dog: V3Dog | null;
  editing?: V3HealthLog | null;
  onSaved?: () => void;
}

const schema = z.object({
  type: z.string(),
  title: z.string().trim().min(1, "Ange en titel").max(140),
  description: z.string().trim().max(500).optional(),
  date: z.string().min(1, "Välj datum"),
  weight_kg: z.number().positive().nullable(),
  next_date: z.string().nullable(),
});

const todayISO = () => new Date().toISOString().slice(0, 10);

export function V3AddHealthSheet({ open, onClose, dog, editing, onSaved }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<string>("vet_visit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(editing?.type ?? "vet_visit");
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setDate(editing?.date ?? todayISO());
      setWeight(editing?.weight_kg?.toString() ?? "");
      setNextDate(editing?.next_date ?? "");
    }
  }, [open, editing]);

  if (!open) return null;

  const isEdit = !!editing;
  const isWeight = type === "weight";

  const handleSave = async () => {
    if (!user?.id || !dog) return;
    const parsed = schema.safeParse({
      type,
      title: title || HEALTH_TYPES.find((t) => t.value === type)?.label || "Logg",
      description,
      date,
      weight_kg: isWeight && weight ? Number(weight) : weight ? Number(weight) : null,
      next_date: nextDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Kontrollera fälten");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        dog_id: dog.id,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        date: parsed.data.date,
        weight_kg: parsed.data.weight_kg,
        next_date: parsed.data.next_date,
      };

      if (isEdit && editing) {
        const { error } = await supabase
          .from("health_logs")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Hälsologg uppdaterad");
      } else {
        const { error } = await supabase.from("health_logs").insert(payload);
        if (error) throw error;
        toast.success("Hälsologg sparad");
      }
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] bg-v3-surface text-v3-text-primary rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-v3-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-v3-surface px-5 pt-4 pb-3 border-b border-v3-border">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-v3-border" />
          <div className="flex items-center justify-between">
            <h2 className="text-v3-lg font-v3-display">
              {isEdit ? "Redigera hälsologg" : "Ny hälsologg"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-v3-canvas-elevated transition"
              aria-label="Stäng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {dog && (
            <p className="text-v3-sm text-v3-text-tertiary mt-1">
              För <span className="text-v3-text-secondary">{dog.name}</span>
            </p>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Typ */}
          <div>
            <label className="block text-v3-sm font-medium mb-2 text-v3-text-secondary">
              Typ av logg
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HEALTH_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border transition",
                    type === t.value
                      ? "border-v3-accent-halsa bg-v3-accent-halsa/10 text-v3-text-primary"
                      : "border-v3-border bg-v3-canvas hover:bg-v3-canvas-elevated text-v3-text-secondary",
                  )}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Titel */}
          <div>
            <label className="block text-v3-sm font-medium mb-1.5 text-v3-text-secondary">
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Årsvaccin"
              className="w-full px-4 py-3 rounded-xl bg-v3-canvas border border-v3-border focus:border-v3-accent-halsa focus:outline-none transition"
              maxLength={140}
            />
          </div>

          {/* Datum */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-v3-sm font-medium mb-1.5 text-v3-text-secondary">
                <Calendar className="w-3.5 h-3.5" /> Datum
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-v3-canvas border border-v3-border focus:border-v3-accent-halsa focus:outline-none transition"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-v3-sm font-medium mb-1.5 text-v3-text-secondary">
                <Calendar className="w-3.5 h-3.5" /> Påminn nästa
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-v3-canvas border border-v3-border focus:border-v3-accent-halsa focus:outline-none transition"
              />
            </div>
          </div>

          {/* Vikt – alltid synligt men markerat när vikt-typ är vald */}
          <div>
            <label className="flex items-center gap-1.5 text-v3-sm font-medium mb-1.5 text-v3-text-secondary">
              <Weight className="w-3.5 h-3.5" /> Vikt (kg) {isWeight && <span className="text-v3-accent-halsa">*</span>}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={isWeight ? "12.5" : "valfritt"}
              className="w-full px-4 py-3 rounded-xl bg-v3-canvas border border-v3-border focus:border-v3-accent-halsa focus:outline-none transition"
            />
          </div>

          {/* Beskrivning */}
          <div>
            <label className="block text-v3-sm font-medium mb-1.5 text-v3-text-secondary">
              Anteckningar
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaljer, dosering, vetens namn…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-v3-canvas border border-v3-border focus:border-v3-accent-halsa focus:outline-none transition resize-none"
              maxLength={500}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-v3-surface border-t border-v3-border px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-v3-border text-v3-text-secondary hover:bg-v3-canvas-elevated transition font-medium"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] px-4 py-3 rounded-xl bg-v3-accent-halsa text-white hover:opacity-90 transition font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Spara ändringar" : "Spara logg"}
          </button>
        </div>
      </div>
    </div>
  );
}
