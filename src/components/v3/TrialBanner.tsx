import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Crown, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Smal trial-banner som visas i v3-skalet för användare på fri provperiod.
 * - >3 dagar kvar: diskret ton.
 * - ≤3 dagar kvar: framträdande färg + tydlig CTA.
 * - 0 dagar / utgången utan prenumeration: "Provperioden är slut".
 *
 * Visas inte för betalande Pro-användare.
 */
export function TrialBanner() {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const state = useMemo(() => {
    if (subscription.loading) return null;
    // Betalande: dölj alltid.
    if (subscription.subscribed && !subscription.isTrial) return null;

    // Trial pågår.
    if (subscription.isTrial && subscription.subscriptionEnd) {
      const end = new Date(subscription.subscriptionEnd).getTime();
      const msLeft = end - Date.now();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      return { kind: "trial" as const, daysLeft };
    }

    // Inte prenumererad och inte trial — provperioden är slut.
    if (!subscription.subscribed) {
      return { kind: "expired" as const, daysLeft: 0 };
    }

    return null;
  }, [subscription]);

  if (!state || dismissed) return null;

  const goUpgrade = () => navigate("/settings");

  if (state.kind === "expired") {
    return (
      <div className="w-full bg-[hsl(var(--destructive))]/10 border-b border-[hsl(var(--destructive))]/30 text-[hsl(var(--destructive))]">
        <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-2 flex items-center gap-3 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1 font-medium">
            Din provperiod är slut — fortsätt med Pro för att behålla alla funktioner.
          </span>
          <button
            type="button"
            onClick={goUpgrade}
            className="rounded-full bg-[hsl(var(--destructive))] text-white px-3 py-1 text-xs font-semibold hover:opacity-90"
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
          ? "w-full bg-[hsl(var(--secondary))]/15 border-b border-[hsl(var(--secondary))]/40 text-[hsl(var(--secondary))]"
          : "w-full bg-[hsl(var(--primary))]/8 border-b border-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]"
      }
    >
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-2 flex items-center gap-3 text-sm">
        <Crown size={16} className="shrink-0" />
        {urgent ? (
          <>
            <span className="flex-1 font-medium">
              Bara {dayLabel} kvar — säkra din Pro nu.
            </span>
            <button
              type="button"
              onClick={goUpgrade}
              className="rounded-full bg-[hsl(var(--secondary))] text-white px-3 py-1 text-xs font-semibold hover:opacity-90"
            >
              Uppgradera
            </button>
          </>
        ) : (
          <>
            <span className="flex-1">
              {dayLabel} kvar av din Pro-period.
            </span>
            <button
              type="button"
              onClick={goUpgrade}
              className="text-xs underline underline-offset-2 hover:no-underline"
            >
              Hantera
            </button>
            <button
              type="button"
              aria-label="Dölj"
              onClick={() => setDismissed(true)}
              className="p-1 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
