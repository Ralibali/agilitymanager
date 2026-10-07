import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithNameEmail, usePlannerProfile, validateProfileInput } from "@/lib/plannerProfile";

/**
 * Liten popup som skapar en lättviktsprofil (namn + e-post).
 * Inget lösenord och ingen bekräftelse behövs.
 */
export function PlannerProfileDialog({
  open,
  onOpenChange,
  onReady,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReady?: () => void;
  reason?: string;
}) {
  const { profile } = usePlannerProfile();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile?.name ?? "");
      setEmail(profile?.email ?? "");
    }
  }, [open, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateProfileInput(name, email);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(true);
    try {
      await signInWithNameEmail(name, email);
      toast.success("Profil klar");
      onOpenChange(false);
      onReady?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara profilen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-2 border-ink bg-paper text-ink shadow-hard-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide">
            <UserRound className="h-5 w-5" /> Din banprofil
          </DialogTitle>
          <DialogDescription className="text-ink/75">
            {reason ?? "Ange namn och e-post så kan du spara, dela och få kommentarer på dina banor."}
            {" "}Inget lösenord behövs och profilen är gratis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="planner-profile-name">Namn</Label>
            <Input className="min-h-11 rounded-xl border-2 border-ink/40 bg-paper"
              id="planner-profile-name"
              value={name}
              maxLength={80}
              autoComplete="name"
              placeholder="Anna Andersson"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="planner-profile-email">E-post</Label>
            <Input className="min-h-11 rounded-xl border-2 border-ink/40 bg-paper"
              id="planner-profile-email"
              type="email"
              value={email}
              maxLength={255}
              autoComplete="email"
              placeholder="anna@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              E-posten visas aldrig för andra – bara ditt namn syns vid banor och kommentarer.
              Den används för din profil, inte för utskick.
            </p>
          </div>
          <Button type="submit" className="min-h-11 w-full rounded-full border-2 border-ink bg-ink font-bold text-paper shadow-hard-sm hover:bg-forest" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {profile ? "Uppdatera profil" : "Skapa profil"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PlannerProfileDialog;
