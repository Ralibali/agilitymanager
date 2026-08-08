import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface ClubMember {
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

export function ClubMembersSection({ clubId, isAdmin }: { clubId: string; isAdmin: boolean }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRemove, setPendingRemove] = useState<ClubMember | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_club_members", { p_club_id: clubId });
    if (error) toast.error("Kunde inte hämta medlemmar");
    setMembers((data as ClubMember[] | null) ?? []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { void load(); }, [load]);

  const removeMember = async (member: ClubMember) => {
    setBusy(true);
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", member.user_id);
    setBusy(false);
    setPendingRemove(null);
    if (error) {
      toast.error("Kunde inte ta bort medlemmen");
      return;
    }
    toast.success(
      member.user_id === user?.id ? "Du har lämnat klubben" : `${member.display_name} togs bort`,
    );
    if (member.user_id === user?.id) {
      window.location.href = "/v3/klubbar";
      return;
    }
    void load();
  };

  return (
    <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Medlemmar</h2>
        <span className="text-v3-xs text-v3-text-tertiary">{members.length} st</span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="v3-skeleton h-14 rounded-v3-base" />)}</div>
      ) : members.length === 0 ? (
        <p className="mt-3 text-v3-sm text-v3-text-secondary">Inga medlemmar hittades.</p>
      ) : (
        <ul className="mt-4 divide-y divide-v3-canvas-sunken/40">
          {members.map((m) => {
            const isSelf = m.user_id === user?.id;
            const canRemove = isAdmin || isSelf;
            return (
              <li key={m.user_id} className="flex items-center gap-3 py-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-v3-canvas grid place-items-center">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={m.display_name} className="h-full w-full object-cover" />
                    : <UserRound className="h-4 w-4 text-v3-text-tertiary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-v3-sm font-medium text-v3-text-primary">
                    {m.display_name}{isSelf && " (du)"}
                  </p>
                  <p className="flex items-center gap-1 text-v3-xs text-v3-text-tertiary">
                    {m.role === "admin" && <Crown className="h-3 w-3" />}
                    {m.role === "admin" ? "Admin" : "Medlem"}
                    {m.status !== "accepted" && " · väntar på godkännande"}
                  </p>
                </div>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => setPendingRemove(m)}
                    aria-label={isSelf ? "Lämna klubben" : `Ta bort ${m.display_name}`}
                    className="v3-focus-ring inline-flex h-9 items-center gap-1.5 rounded-v3-base border border-destructive/30 px-3 text-v3-xs font-medium text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {isSelf ? "Lämna" : "Ta bort"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!pendingRemove} onOpenChange={(v) => !busy && !v && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemove?.user_id === user?.id ? "Lämna klubben?" : `Ta bort ${pendingRemove?.display_name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Medlemskapet tas bort direkt. Personen kan ansöka igen senare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); if (pendingRemove) void removeMember(pendingRemove); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ta bort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
