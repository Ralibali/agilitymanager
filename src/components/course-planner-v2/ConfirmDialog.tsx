/**
 * Tillgängliga bekräftelse- och namndialoger för Banplaneraren v2.
 * Ersätter window.confirm()/window.prompt() som varken går att styla,
 * fungerar med skärmläsare eller följer appens designsystem.
 */
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Röd bekräftelseknapp för destruktiva åtgärder. */
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = "Fortsätt", cancelLabel = "Avbryt",
  destructive = false, onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-2 border-ink bg-paper">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl uppercase tracking-wide">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-ink/60">{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-2 border-ink/15 bg-paper font-bold hover:bg-cream">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "border-2 border-ink bg-ember font-bold text-paper hover:bg-ember/90"
                : "border-2 border-ink bg-forest font-bold text-paper hover:bg-forest/90"
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface NameCourseDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  /** Förbestämt namn, t.ex. "Min bana (kopia)". */
  initialName: string;
  confirmLabel?: string;
  onSubmit: (name: string) => void;
}

export function NameCourseDialog({
  open, onOpenChange, title, description, initialName,
  confirmLabel = "Spara", onSubmit,
}: NameCourseDialogProps) {
  const [value, setValue] = useState(initialName);

  // Fyll i aktuellt namn när dialogen öppnas — justering under render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initialName);
  }

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onOpenChange(false);
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-ink bg-paper sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wide">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name-course-input">Bananamn</Label>
            <Input
              id="name-course-input"
              value={value}
              maxLength={120}
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
