import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, X, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackGrowthEvent } from "@/lib/growth";

/**
 * Pro-värdekort – visas ENDAST efter användarens första loggade träningspass.
 * Målet är att presentera Pros värde när användaren har upplevt kärnan
 * (första riktiga passet), inte att blockera flöden innan dess.
 *
 * - Betalande Pro-användare: renderas ej.
 * - Trial-användare: visas som mjuk uppmaning (utan urgency).
 * - Utan prenumeration: visas som tydlig CTA.
 * - Dismissbar (sparas i user_metadata så det håller mellan enheter).
 */
export function ProValueCard() {
  const { subscription, user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  // Läs dismiss-status från user_metadata (klientside – inte känslig data).
  useEffect(() => {
    if (!user) return;
    const meta = (user.user_metadata ?? {}) as { pro_value_card_dismissed_at?: string };
    setDismissed(Boolean(meta.pro_value_card_dismissed_at));
  }, [user]);

  const trialDaysLeft = useMemo(() => {
    if (!subscription.isTrial || !subscription.subscriptionEnd) return null;
    const ms = new Date(subscription.subscriptionEnd).getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [subscription.isTrial, subscription.subscriptionEnd]);

  // Betalande Pro (inte trial) – dölj.
  if (subscription.loading) return null;
  if (subscription.subscribed && !subscription.isTrial) return null;
  if (dismissed) return null;

  const handleDismiss = async () => {
    setDismissed(true);
    trackGrowthEvent("pro_value_card_dismissed");
    try {
      await supabase.auth.updateUser({
        data: { pro_value_card_dismissed_at: new Date().toISOString() },
      });
    } catch {
      /* ignore */
    }
  };

  const handleUpgrade = () => {
    trackGrowthEvent("pro_value_card_cta_click", { in_trial: subscription.isTrial });
    navigate("/v3/settings#pro-prenumeration");
  };

  const eyebrow = subscription.isTrial
    ? trialDaysLeft && trialDaysLeft <= 3
      ? `Bara ${trialDaysLeft === 1 ? "1 dag" : `${trialDaysLeft} dagar`} kvar av provperioden`
      : "Din provperiod pågår"
    : "Fortsätt utveckla er";

  return (
    <section
      aria-label="Pro-värde"
      className="relative rounded-v3-2xl border border-v3-brand-500/25 bg-gradient-to-br from-v3-brand-50 via-v3-canvas-elevated to-v3-canvas-elevated p-5 shadow-v3-base"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dölj Pro-kortet"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/60 hover:text-v3-text-secondary v3-focus-ring"
      >
        <X size={14} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-v3-brand-500/12 text-v3-brand-700">
          <Crown size={20} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-v3-2xs uppercase tracking-[0.16em] text-v3-text-tertiary">{eyebrow}</p>
          <h3 className="mt-1 font-v3-display text-v3-xl leading-snug text-v3-text-primary">
            Bygg vidare på ert första pass med Pro
          </h3>
          <p className="mt-1 text-v3-sm leading-relaxed text-v3-text-secondary">
            Nu när ni har loggat första passet – lås upp verktygen som gör skillnaden på lång sikt.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {[
          "Detaljerad statistik och trender per hund",
          "Banplaneraren utan begränsningar (PDF-export & delning)",
          "Automatiska tävlingsresultat och påminnelser",
        ].map((line) => (
          <li key={line} className="flex gap-2 text-v3-sm text-v3-text-primary">
            <Check size={16} className="mt-0.5 shrink-0 text-v3-brand-600" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleUpgrade}
          className="min-h-11 flex-1 rounded-v3-base bg-v3-brand-500 px-4 text-sm font-semibold text-white shadow-v3-brand hover:bg-v3-brand-600 v3-focus-ring"
        >
          Se planer och priser
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-11 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated px-4 text-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-sunken/60 v3-focus-ring"
        >
          Inte nu
        </button>
      </div>
    </section>
  );
}
