import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DSButton } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Dog } from "@/types";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "Tävling", label: "Tävling" },
  { value: "Träning", label: "Träning" },
  { value: "Hälsa", label: "Hälsa" },
  { value: "Annat", label: "Annat" },
];

const GOAL_TYPES = [
  { value: "milestone", label: "Milstolpe (klart/inte klart)" },
  { value: "numeric", label: "Numeriskt (t.ex. 10 nollrundor)" },
];

interface Props {
  dogs: Dog[];
  onAdded: () => void;
  trigger?: React.ReactNode;
  /** Externt kontrollerat öppet-läge (valfritt). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Förifyllda värden för redigering. */
  editId?: string;
  defaultValues?: Partial<{
    title: string;
    description: string;
    category: string;
    goalType: string;
    targetValue: string;
    currentValue: string;
    targetDate: string;
    dogId: string;
  }>;
}

export function AddGoalDialog({ dogs, onAdded, trigger, open: controlledOpen, onOpenChange, editId, defaultValues }: Props) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [category, setCategory] = useState(defaultValues?.category ?? "Träning");
  const [goalType, setGoalType] = useState(defaultValues?.goalType ?? "milestone");
  const [targetValue, setTargetValue] = useState(defaultValues?.targetValue ?? "");
  const [currentValue, setCurrentValue] = useState(defaultValues?.currentValue ?? "");
  const [targetDate, setTargetDate] = useState(defaultValues?.targetDate ?? "");
  const [dogId, setDogId] = useState(defaultValues?.dogId ?? dogs[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const isEdit = !!editId;

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("Träning");
    setGoalType("milestone");
    setTargetValue("");
    setCurrentValue("");
    setTargetDate("");
    setDogId(dogs[0]?.id ?? "");
  };

  const save = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Ange en titel");
      return;
    }
    if (!dogId) {
      toast.error("Välj en hund");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      dog_id: dogId,
      title: title.trim(),
      description: description.trim(),
      category,
      goal_type: goalType,
      target_value: goalType === "numeric" && targetValue ? Number(targetValue) : null,
      current_value: goalType === "numeric" && currentValue ? Number(currentValue) : null,
      target_date: targetDate || null,
      status: "active",
    };
    const res = isEdit
      ? await supabase.from("training_goals").update(payload).eq("id", editId!)
      : await supabase.from("training_goals").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(isEdit ? "Kunde inte uppdatera mål" : "Kunde inte skapa mål");
      return;
    }
    toast.success(isEdit ? "Mål uppdaterat" : "Mål skapat");
    if (!isEdit) reset();
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !controlledOpen && (
        <DialogTrigger asChild>
          <DSButton>
            <Plus className="w-4 h-4" /> Nytt mål
          </DSButton>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-600" />
            {isEdit ? "Redigera mål" : "Nytt mål"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="goal-title">Titel</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. 10 nollrundor i K2"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="goal-dog">Hund</Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger id="goal-dog">
                <SelectValue placeholder="Välj hund" />
              </SelectTrigger>
              <SelectContent>
                {dogs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="goal-cat">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="goal-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-type">Typ</Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger id="goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {goalType === "numeric" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="goal-current">Nuvarande</Label>
                <Input
                  id="goal-current"
                  type="number"
                  inputMode="numeric"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="goal-target">Mål</Label>
                <Input
                  id="goal-target"
                  type="number"
                  inputMode="numeric"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="goal-date">Måldatum (valfritt)</Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="goal-desc">Beskrivning (valfritt)</Label>
            <Textarea
              id="goal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mer detaljer eller plan…"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DSButton variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Avbryt
            </DSButton>
            <DSButton onClick={save} disabled={saving}>
              {saving ? "Sparar…" : isEdit ? "Spara" : "Skapa mål"}
            </DSButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
