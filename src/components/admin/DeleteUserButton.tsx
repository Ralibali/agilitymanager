import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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

const CONFIRM_WORD = "RADERA";

interface Props {
  userId: string;
  userName: string;
  onDeleted?: () => void;
}

/** Låter en admin radera ett användarkonto permanent. */
export default function DeleteUserButton({ userId, userName, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (confirm.trim().toUpperCase() !== CONFIRM_WORD) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { target_user_id: userId },
      });
      if (error) throw error;
      const err = (data as { error?: string } | null)?.error;
      if (err) throw new Error(err);
      toast.success(`${userName} är permanent raderad`);
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte radera kontot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setConfirm(""); setOpen(true); }}
        aria-label={`Radera ${userName}`}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-v3-base border border-destructive/30 text-destructive hover:bg-destructive/5 text-v3-xs v3-focus-ring"
      >
        <Trash2 className="h-3.5 w-3.5" /> Radera
      </button>

      <AlertDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera {userName} permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              Kontot och all data (hundar, träningspass, resultat, banor, medlemskap) raderas direkt
              och kan inte återskapas. Skriv {CONFIRM_WORD} för att bekräfta.
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
    </>
  );
}
