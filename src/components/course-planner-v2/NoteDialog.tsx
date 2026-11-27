/**
 * Skriv eller ändra en anteckning på banan (förarplanen).
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MARKUP_LIMITS } from "@/features/course-planner-v2/courseExtras";

export function NoteDialog({
  open, initialText, isNew, onSave, onDelete, onOpenChange,
}: {
  open: boolean;
  initialText: string;
  isNew: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState(initialText);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText(initialText);
  }
  const trimmed = text.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-ink bg-paper sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wide">{isNew ? "Ny anteckning" : "Anteckning"}</DialogTitle>
          <DialogDescription className="text-ink/75">
            Syns på banan, i PNG-bilden och i tränings-PDF:en. Kort och konkret fungerar bäst.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) onSave(trimmed);
          }}
          className="space-y-3"
        >
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MARKUP_LIMITS.noteChars))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && trimmed) {
                e.preventDefault();
                onSave(trimmed);
              }
            }}
            rows={3}
            aria-label="Anteckningens text"
            placeholder="T.ex. Framförbyte innan tunneln — belöna efter 7"
            className="w-full resize-none rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-ink"
          />
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70">
            <span>{text.length}/{MARKUP_LIMITS.noteChars} tecken</span>
            <span>Ctrl+Enter sparar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-11 items-center rounded-full border-2 border-ink/15 bg-white px-4 text-sm font-bold hover:border-ember hover:text-ember"
              >
                Ta bort
              </button>
            )}
            <button
              type="submit"
              disabled={!trimmed}
              className="pressable shadow-hard-sm ml-auto inline-flex h-11 items-center rounded-full border-2 border-ink bg-forest px-5 text-sm font-bold text-paper disabled:opacity-40"
            >
              {isNew ? "Lägg till" : "Spara"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
