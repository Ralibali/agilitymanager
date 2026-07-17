import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PLANS } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ClubSub {
  id: string;
  club_id: string;
  created_by: string | null;
  seats: number;
  status: string;
  current_period_end: string | null;
  stripe_price_id: string | null;
}

/**
 * Klubb Pro-kortet i klubbvyn.
 * Admin: köp platser (per-seat Stripe-checkout) eller se status + kundportal.
 * Medlem: ser "Pro via klubb" när klubbens prenumeration täcker alla.
 */
export function ClubProCard({ clubId, clubName, role }: { clubId: string; clubName: string; role?: string }) {
  const { user } = useAuth();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [clubSub, setClubSub] = useState<ClubSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState<number>(0);
  const [annual, setAnnual] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [{ count }, { data: sub }] = await Promise.all([
        supabase.from("club_members").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "accepted"),
        supabase.from("club_subscriptions").select("*").eq("club_id", clubId).maybeSingle(),
      ]);
      if (!alive) return;
      const members = count ?? 0;
      setMemberCount(members);
      setClubSub((sub as ClubSub | null) ?? null);
      setSeats((prev) => (prev > 0 ? prev : Math.max(members, 1)));
      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [clubId]);

  const isActive = clubSub?.status === "active";
  const covered = isActive && memberCount !== null && clubSub !== null && memberCount <= clubSub.seats;
  const isBuyer = !!user && !!clubSub?.created_by && clubSub.created_by === user.id;

  const price = useMemo(() => {
    const plan = annual ? PLANS.yearly : PLANS.monthly;
    return { unit: annual ? PLANS.yearly.amount : PLANS.monthly.amount, total: plan.amount * seats, per: annual ? "år" : "mån" };
  }, [annual, seats]);

  const startCheckout = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: annual ? PLANS.yearly.priceId : PLANS.monthly.priceId,
          mode: "club",
          clubId,
          seats,
        },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast({
        title: "Kunde inte starta checkout",
        description: err instanceof Error ? err.message : "Försök igen",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast({
        title: "Kunde inte öppna kundportalen",
        description: err instanceof Error ? err.message : "Försök igen",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className="v3-skeleton h-[140px] rounded-v3-2xl" />;
  }

  // ── Aktiv prenumeration ──
  if (isActive && clubSub) {
    return (
      <section className="rounded-v3-2xl border border-v3-brand-500/30 bg-v3-brand-500/5 p-5 shadow-v3-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-v3-brand-500 text-white text-v3-xs font-medium">
            <Crown className="w-3.5 h-3.5" /> Klubb Pro aktiv
          </span>
          {covered ? (
            <span className="text-v3-xs text-v3-text-secondary">Alla {memberCount} medlemmar har Pro</span>
          ) : (
            <span className="text-v3-xs text-amber-600 font-medium">
              {memberCount} medlemmar men bara {clubSub.seats} platser — Pro pausat tills platserna räcker
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-[10px] tracking-[0.04em] text-v3-text-tertiary font-medium">PLATSER</p>
            <p className="text-xl font-v3-display text-v3-text-primary mt-0.5">{clubSub.seats}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.04em] text-v3-text-tertiary font-medium">MEDLEMMAR</p>
            <p className="text-xl font-v3-display text-v3-text-primary mt-0.5">{memberCount ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.04em] text-v3-text-tertiary font-medium">FÖRNYAS</p>
            <p className="text-xl font-v3-display text-v3-text-primary mt-0.5">
              {clubSub.current_period_end
                ? new Date(clubSub.current_period_end).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
                : "—"}
            </p>
          </div>
        </div>
        {isAdmin && isBuyer && (
          <button
            type="button"
            onClick={openPortal}
            disabled={portalLoading}
            className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-v3-base border border-v3-canvas-sunken/40 bg-v3-canvas-elevated text-v3-sm font-medium text-v3-text-primary hover:bg-v3-canvas"
          >
            {portalLoading && <Loader2 size={15} className="animate-spin" />}
            Hantera betalning och platser
          </button>
        )}
        {isAdmin && !isBuyer && (
          <p className="mt-4 text-v3-xs text-v3-text-tertiary">Betalningen hanteras av administratören som startade prenumerationen.</p>
        )}
      </section>
    );
  }

  // ── Medlem (ej admin, ingen aktiv sub): visa inget köpflöde ──
  if (!isAdmin) return null;

  // ── Admin utan aktiv sub: köpflöde ──
  return (
    <section className="rounded-v3-2xl border border-v3-canvas-sunken/40 bg-v3-canvas-elevated p-5 shadow-v3-xs">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-v3-brand-700" />
        <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Ge hela {clubName} Pro</h2>
      </div>
      <p className="text-v3-sm text-v3-text-secondary mt-1.5">
        Köp platser till klubben — alla medlemmar får Pro så länge platserna räcker till.
      </p>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <div className="inline-flex rounded-full border border-v3-canvas-sunken/40 p-1">
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "h-8 px-3 rounded-full text-v3-xs font-medium transition-colors",
              annual ? "bg-v3-text-primary text-v3-canvas" : "text-v3-text-secondary",
            )}
          >
            Årsvis −17%
          </button>
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "h-8 px-3 rounded-full text-v3-xs font-medium transition-colors",
              !annual ? "bg-v3-text-primary text-v3-canvas" : "text-v3-text-secondary",
            )}
          >
            Månadsvis
          </button>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-label="Minska platser"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            className="w-9 h-9 rounded-v3-base border border-v3-canvas-sunken/40 text-v3-text-primary font-medium hover:bg-v3-canvas"
          >
            −
          </button>
          <span className="min-w-[70px] text-center text-v3-sm font-medium text-v3-text-primary">
            {seats} {seats === 1 ? "plats" : "platser"}
          </span>
          <button
            type="button"
            aria-label="Öka platser"
            onClick={() => setSeats((s) => Math.min(500, s + 1))}
            className="w-9 h-9 rounded-v3-base border border-v3-canvas-sunken/40 text-v3-text-primary font-medium hover:bg-v3-canvas"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-v3-display text-2xl text-v3-text-primary">{price.total.toLocaleString("sv-SE")} kr</span>
        <span className="text-v3-sm text-v3-text-secondary">/{price.per} ({price.unit} kr per plats)</span>
      </div>
      {memberCount !== null && memberCount > 0 && (
        <p className="mt-1 text-v3-xs text-v3-text-tertiary inline-flex items-center gap-1">
          <Users className="w-3 h-3" /> Klubben har {memberCount} {memberCount === 1 ? "medlem" : "medlemmar"} just nu
        </p>
      )}

      <button
        type="button"
        onClick={startCheckout}
        disabled={checkoutLoading}
        className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-semibold hover:bg-v3-brand-600 disabled:opacity-50"
      >
        {checkoutLoading && <Loader2 size={15} className="animate-spin" />}
        Starta Klubb Pro — {price.total.toLocaleString("sv-SE")} kr/{price.per}
      </button>
      <p className="mt-2 text-[11px] text-v3-text-tertiary inline-flex items-center gap-1">
        <Check className="w-3 h-3" /> Säker betalning via Stripe · Ändra antalet platser eller säg upp när du vill
      </p>
    </section>
  );
}
