import { useEffect, useState } from "react";
import { Gift, Copy, Share2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Bjud in en agilitykompis"-kort.
 * - Hämtar användarens referral_code från profiles
 * - Bygger en delbar invite-länk till /invite/{code}
 * - Visar antal vänner som redan givit belöning
 *
 * Belöningen (7 dagar Pro till båda) hanteras serverside av
 * `process-referral-reward` när den nya användaren går till Pro.
 */
export function ReferralCard() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardCount, setRewardCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [profileRes, rewardsRes] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("referrer_id", user.id),
      ]);
      if (cancelled) return;
      setCode(profileRes.data?.referral_code ?? null);
      setRewardCount(rewardsRes.count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  const inviteUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.agilitymanager.se"}/invite/${code}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Länk kopierad");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunde inte kopiera länken");
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    const shareData = {
      title: "AgilityManager",
      text: "Häng med på AgilityManager — vi får båda 7 dagars Pro när du provar!",
      url: inviteUrl,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // användaren avbröt — falla tillbaka på copy
      }
    }
    await handleCopy();
  };

  return (
    <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-v3-base bg-v3-brand-100 flex items-center justify-center">
          <Gift className="h-4 w-4 text-v3-brand-700" />
        </div>
        <div>
          <h3 className="font-v3-display text-v3-xl text-v3-text-primary">Bjud in en agilitykompis</h3>
          <p className="text-v3-sm text-v3-text-tertiary">Båda får 7 dagars Pro när din kompis testar</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-v3-text-tertiary" />
        </div>
      ) : inviteUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-secondary/50 px-3 h-10">
            <span className="flex-1 text-v3-sm text-v3-text-secondary truncate" title={inviteUrl}>
              {inviteUrl}
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-v3-xs text-v3-text-secondary hover:text-v3-text-primary v3-tappable shrink-0"
              aria-label="Kopiera länken"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-v3-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Kopierad" : "Kopiera"}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full h-10 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring"
          >
            <Share2 className="h-4 w-4" /> Dela inbjudan
          </button>

          {rewardCount > 0 && (
            <p className="text-v3-xs text-v3-text-tertiary text-center pt-1">
              {rewardCount} {rewardCount === 1 ? "kompis" : "kompisar"} har redan gett dig Pro-tid 🎉
            </p>
          )}
        </div>
      ) : (
        <p className="text-v3-sm text-v3-text-tertiary">Din inbjudningskod skapas inom kort — försök igen om en stund.</p>
      )}
    </section>
  );
}
