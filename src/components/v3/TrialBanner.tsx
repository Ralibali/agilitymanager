import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Crown, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHasLoggedTraining } from "@/hooks/v3/useHasLoggedTraining";

/**
 * Smal trial-banner som visas i v3-skalet för användare på fri provperiod.
 * - >3 dagar kvar: diskret ton.
 * - ≤3 dagar kvar: framträdande färg + tydlig CTA.
 * - 0 dagar / utgången utan prenumeration: "Provperioden är slut".
 *
 * Visas inte för betalande Pro-användare, och inte förrän användaren har
 * loggat sitt första riktiga träningspass (håll paywall ur vägen innan
 * första aha-upplevelsen).
 */
export function TrialBanner() {
  const { subscription } = useAuth();
  const { hasLogged, loading: trainingLoading } = useHasLoggedTraining();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const state = useMemo(() => {
    if (subscription.loading) return null;
    if (trainingLoading) return null;
    if (!hasLogged) return null; // Ingen paywall innan första loggade passet.
    if (subscription.subscribed && !subscription.isTrial) return null;

    if (subscription.isTrial && subscription.subscriptionEnd) {
      const end = new Date(subscription.subscriptionEnd).getTime();
      const msLeft = end - Date.now();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      return { kind: "trial" as const, daysLeft };
    }

    if (!subscription.subscribed) {
      return { kind: "expired" as const, daysLeft: 0 };
    }

    return null;
  }, [subscription, hasLogged, trainingLoading]);


  if (!state || dismissed) return null;

  const goUpgrade = () => navigate("/v3/settings");

  if (state.kind === "expired") {
    return (
      <div className="w-full border-b border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-2 text-sm sm:px-5 lg:px-10">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 font-medium">
            Din provperiod är slut — fortsätt med Pro för att behålla alla funktioner.
          </span>
          <button
            type="button"
            onClick={goUpgrade}
            className="min-h-9 shrink-0 rounded-full bg-[hsl(var(--destructive))] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            Fortsätt med Pro
          </button>
        </div>
      </div>
    );
  }

  const urgent = state.daysLeft <= 3;
  const dayLabel = state.daysLeft === 1 ? "1 dag" : `${state.daysLeft} dagar`;

  return (
    <div
      className={
        urgent
          ? "w-full border-b border-[hsl(var(--secondary))]/40 bg-[hsl(var(--secondary))]/15 text-[hsl(var(--secondary))]"
          : "w-full border-b border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/8 text-[hsl(var(--primary))]"
      }
    >
      <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-2 text-sm sm:px-5 lg:px-10">
        <Crown size={16} className="shrink-0" aria-hidden="true" />
        {urgent ? (
          <>
            <span className="flex-1 font-medium">
              Bara {dayLabel} kvar — säkra din Pro nu.
            </span>
            <button
              type="button"
              onClick={goUpgrade}
              className="min-h-9 shrink-0 rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              Uppgradera
            </button>
          </>
        ) : (
          <>
            <span className="flex-1">{dayLabel} kvar av din Pro-provperiod.</span>
            <button
              type="button"
              onClick={goUpgrade}
              className="min-h-9 text-xs font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              Välj plan
            </button>
            <button
              type="button"
              aria-label="Dölj information om provperioden"
              onClick={() => setDismissed(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-current/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
