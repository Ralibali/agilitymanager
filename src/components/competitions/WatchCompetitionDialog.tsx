import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  competitionId: string;
  competitionName: string;
  /** Sätts som knappens fullbredd i mobil-CTA. */
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

/**
 * Publik "Bevaka tävling"-dialog — kräver ingen inloggning.
 * Skickar bara e-post + competition_id till edge functionen
 * `watch-competition`. Klienten läser aldrig något tillbaka.
 */
export function WatchCompetitionDialog({
  competitionId,
  competitionName,
  className,
  variant = "outline",
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("watch-competition", {
        body: { email: email.trim().toLowerCase(), competition_id: competitionId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
    } catch (err) {
      toast({
        title: "Kunde inte spara bevakning",
        description: err instanceof Error ? err.message : "Försök igen om en stund.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTimeout(() => {
        setDone(false);
        setEmail("");
      }, 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Bell className="w-4 h-4 mr-2" />
          Bevaka tävling
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Kolla din mejl 📬</DialogTitle>
              <DialogDescription>
                Vi har skickat en bekräftelselänk till <strong>{email}</strong>. Klicka på den för
                att aktivera bevakningen av <strong>{competitionName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => reset(false)}>Stäng</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Bevaka {competitionName}</DialogTitle>
              <DialogDescription>
                Vi mejlar dig när anmälan snart stänger och när resultat publiceras för den här
                tävlingen. Avregistrera när som helst med länken i mejlen.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="watch-email">E-postadress</Label>
              <Input
                id="watch-email"
                type="email"
                required
                autoComplete="email"
                placeholder="din@epost.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vi använder e-postadressen bara för utskick om just den här tävlingen. Se{" "}
                <a href="/integritetspolicy" className="underline">
                  integritetspolicyn
                </a>
                .
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => reset(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sparar…" : "Bevaka"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
