import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const CONFIRM_WORD = "RADERA";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (confirm.trim().toUpperCase() !== CONFIRM_WORD) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
      toast.success("Ditt konto är permanent raderat.");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte radera kontot");
      setBusy(false);
    }
  };

  return (
    <section className="animate-v3-fade-up rounded-v3-2xl border border-destructive/30 bg-v3-canvas-elevated p-5 sm:p-6">
      <h3 className="font-v3-display text-v3-xl text-v3-text-primary">Radera konto</h3>
      <p className="mb-4 mt-1 text-v3-sm text-v3-text-tertiary">
        Raderar ditt konto och all din data permanent — hundar, träningspass, tävlingsresultat, banor
        och medlemskap. Detta går inte att ångra.
      </p>
      <button
        type="button"
        onClick={() => { setConfirm(""); setOpen(true); }}
        className="v3-focus-ring v3-tappable inline-flex h-11 w-full items-center justify-center gap-2 rounded-v3-base border border-destructive/40 bg-destructive/5 text-v3-sm font-medium text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" /> Radera mitt konto permanent
      </button>

      <AlertDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera kontot permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              All din data raderas direkt och kan inte återskapas. Skriv {CONFIRM_WORD} för att bekräfta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_WORD}
            aria-label={`Skriv ${CONFIRM_WORD} för att bekräfta`}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || confirm.trim().toUpperCase() !== CONFIRM_WORD}
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Radera permanent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
