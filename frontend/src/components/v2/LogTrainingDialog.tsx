import { useState, useMemo, useEffect } from "react";
import { Star, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DSButton, DSInput } from "@/components/ds";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TrainingType, Dog } from "@/types";
import { store } from "@/lib/store";

const AGILITY_TYPES: TrainingType[] = [
  "Bana",
  "Hinder",
  "Kontakt",
  "Vändning",
  "Distans",
  "Kombination",
  "Annan",
  "Målgång",
];
const HOOPERS_TYPES: TrainingType[] = [
  "Bana",
  "Dirigering",
  "Hoop",
  "Tunnel",
  "Tunna",
  "Kombination",
  "Annan",
];
const AGILITY_OBSTACLES = [
  "Hopp",
  "Tunnel",
  "A-ram",
  "Gångbro",
  "Gungbräda",
  "Slalom",
  "Bordstopp",
  "Hoppring",
];
const HOOPERS_OBSTACLES = ["Hoop", "Tunnel", "Tunna", "Staket"];
const COMMON_TAGS = [
  "Kontaktfält",
  "Slalom",
  "Svängar",
  "Distans",
  "Balans",
  "Målgång",
  "Tempo",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dogs: Dog[];
  onSaved: () => void;
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <Label className="text-micro text-text-tertiary uppercase tracking-wide">
        {label}
      </Label>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              size={20}
              className={cn(
                "transition-colors",
                i <= value
                  ? "fill-amber-500 text-amber-500"
                  : "text-text-tertiary",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "px-2.5 h-7 rounded-pill text-small font-medium transition-colors border-[0.5px]",
              active
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-surface text-text-secondary border-border-default hover:border-border-strong",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Fas 4: ny logga-träning-dialog som matchar designsystemet.
 * Sport-specifik form (Agility/Hoopers) baserat på vald hund.
 */
export function LogTrainingDialog({ open, onOpenChange, dogs, onSaved }: Props) {
  const [dogId, setDogId] = useState(dogs[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("30");
  const [type, setType] = useState<TrainingType>("Bana");
  const [reps, setReps] = useState("5");
  const [location, setLocation] = useState("");
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [faults, setFaults] = useState("0");
  const [bestTime, setBestTime] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notesGood, setNotesGood] = useState("");
  const [notesImprove, setNotesImprove] = useState("");
  const [dogEnergy, setDogEnergy] = useState(3);
  const [handlerEnergy, setHandlerEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [zoneKept, setZoneKept] = useState(false);
  const [dirigering, setDirigering] = useState(3);
  const [banflyt, setBanflyt] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && dogs.length > 0 && !dogId) setDogId(dogs[0].id);
  }, [open, dogs, dogId]);

  const selectedDog = useMemo(() => dogs.find((d) => d.id === dogId), [dogs, dogId]);
  const isHoopers = selectedDog?.sport === "Hoopers";
  const types = isHoopers ? HOOPERS_TYPES : AGILITY_TYPES;
  const obstacleOptions = isHoopers ? HOOPERS_OBSTACLES : AGILITY_OBSTACLES;

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSubmit = async () => {
    if (!dogId) return;
    setSaving(true);
    await store.addTraining({
      sport: selectedDog?.sport ?? "Agility",
      dog_id: dogId,
      date,
      duration_min: parseInt(duration) || 0,
      type,
      reps: parseInt(reps) || 0,
      notes_good: notesGood.trim(),
      notes_improve: notesImprove.trim(),
      dog_energy: dogEnergy,
      handler_energy: handlerEnergy,
      tags,
      obstacles_trained: obstacles,
      fault_count: parseInt(faults) || 0,
      best_time_sec: bestTime ? parseFloat(bestTime) : null,
      jump_height_used: !isHoopers ? selectedDog?.size_class ?? null : null,
      handler_zone_kept: isHoopers ? zoneKept : null,
      overall_mood: mood,
      location: location.trim(),
      dirigering_score: isHoopers ? dirigering : null,
      banflyt_score: isHoopers ? banflyt : null,
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-surface border-border-default">
        <DialogHeader>
          <DialogTitle className="font-display text-h1 text-text-primary">
            Logga träningspass
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-micro text-text-tertiary uppercase tracking-wide">
              Hund
            </Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger className="mt-1 h-10 rounded-ds-md border-border-default">
                <SelectValue placeholder="Välj hund" />
              </SelectTrigger>
              <SelectContent>
                {dogs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                Datum
              </Label>
              <DSInput
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                Typ
              </Label>
              <Select value={type} onValueChange={(v) => setType(v as TrainingType)}>
                <SelectTrigger className="mt-1 h-10 rounded-ds-md border-border-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                Längd (min)
              </Label>
              <DSInput
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Plats
              </Label>
              <DSInput
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="T.ex. klubben"
                className="mt-1"
              />
            </div>
          </div>

          <div className="rounded-ds-md bg-subtle p-3 space-y-3">
            <div className="text-micro text-text-tertiary uppercase tracking-wide font-medium">
              {isHoopers ? "Hoopers" : "Agility"}-specifikt
            </div>

            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                Tränade hinder
              </Label>
              <div className="mt-1.5">
                <ChipGroup
                  options={obstacleOptions}
                  selected={obstacles}
                  onToggle={(o) => toggle(obstacles, setObstacles, o)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                  Antal fel
                </Label>
                <DSInput
                  type="number"
                  min="0"
                  value={faults}
                  onChange={(e) => setFaults(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                  Bästa tid (s)
                </Label>
                <DSInput
                  type="number"
                  step="0.01"
                  value={bestTime}
                  onChange={(e) => setBestTime(e.target.value)}
                  placeholder="32.45"
                  className="mt-1"
                />
              </div>
            </div>

            {isHoopers && (
              <div className="space-y-3 pt-1">
                <StarRating
                  value={dirigering}
                  onChange={setDirigering}
                  label="Dirigeringskvalitet"
                />
                <StarRating value={banflyt} onChange={setBanflyt} label="Banflyt" />
                <div className="flex items-center justify-between">
                  <Label className="text-small text-text-secondary">
                    Höll dirigeringsområdet
                  </Label>
                  <Switch checked={zoneKept} onCheckedChange={setZoneKept} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                Repetitioner
              </Label>
              <DSInput
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="mt-1"
              />
            </div>
            <StarRating value={mood} onChange={setMood} label="Känsla" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StarRating value={dogEnergy} onChange={setDogEnergy} label="Hundens energi" />
            <StarRating value={handlerEnergy} onChange={setHandlerEnergy} label="Din energi" />
          </div>

          <div>
            <Label className="text-micro text-text-tertiary uppercase tracking-wide">
              Vad funkade bra?
            </Label>
            <Textarea
              value={notesGood}
              onChange={(e) => setNotesGood(e.target.value)}
              rows={2}
              className="mt-1 rounded-ds-md border-border-default"
              placeholder="Snabb slalom, bra kontaktzoner…"
            />
          </div>
          <div>
            <Label className="text-micro text-text-tertiary uppercase tracking-wide">
              Att jobba mer på
            </Label>
            <Textarea
              value={notesImprove}
              onChange={(e) => setNotesImprove(e.target.value)}
              rows={2}
              className="mt-1 rounded-ds-md border-border-default"
              placeholder="Vägran vid tunneln…"
            />
          </div>

          <div>
            <Label className="text-micro text-text-tertiary uppercase tracking-wide">
              Taggar
            </Label>
            <div className="mt-1.5">
              <ChipGroup
                options={COMMON_TAGS}
                selected={tags}
                onToggle={(t) => toggle(tags, setTags, t)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <DSButton
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </DSButton>
            <DSButton
              className="flex-1"
              onClick={handleSubmit}
              disabled={!dogId || saving}
            >
              {saving ? "Sparar…" : "Spara pass"}
            </DSButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
