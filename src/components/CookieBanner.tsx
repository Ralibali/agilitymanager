import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, ChevronDown, ChevronUp, Shield, BarChart3, Megaphone, X } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

/**
 * GDPR/LEK-anpassad cookie-banner med separata kategorier.
 * Nödvändiga cookies är alltid aktiva. Analys och marknadsföring kräver aktivt samtycke.
 */
export default function CookieBanner() {
  const { consent, hasDecided, acceptAll, rejectAll, update } = useCookieConsent();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  useEffect(() => {
    if (!hasDecided) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
    setOpen(false);
  }, [hasDecided]);

  useEffect(() => {
    const handler = () => {
      setAnalytics(consent?.analytics ?? false);
      setMarketing(consent?.marketing ?? false);
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener("am:open-cookie-settings", handler);
    return () => window.removeEventListener("am:open-cookie-settings", handler);
  }, [consent]);

  if (!open) return null;

  const handleAcceptAll = () => {
    acceptAll();
    setOpen(false);
  };
  const handleRejectAll = () => {
    rejectAll();
    setOpen(false);
  };
  const handleSave = () => {
    update({ analytics, marketing });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl rounded-3xl bg-card shadow-2xl border border-border pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Cookie size={20} className="text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="cookie-banner-title"
                className="font-semibold text-foreground text-base sm:text-lg"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Dina cookie-val
              </h2>
              <p id="cookie-banner-description" className="text-sm text-foreground/65 mt-1 leading-relaxed">
                Vi använder nödvändiga cookies för att tjänsten ska fungera. Analys och
                marknadsföring används bara om du aktivt samtycker. Du kan ändra dina val när som helst.{' '}
                <Link to="/cookiepolicy" className="underline text-primary hover:text-secondary">
                  Läs mer i cookiepolicyn
                </Link>
                .
              </p>
            </div>
            {hasDecided && (
              <button
                type="button"
                aria-label="Stäng cookieinställningar"
                onClick={() => setOpen(false)}
                className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-full hover:bg-foreground/5 text-foreground/50"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {showDetails && (
            <div className="mt-4 space-y-2">
              <CategoryRow
                icon={<Shield size={16} />}
                title="Nödvändiga"
                description="Krävs för inloggning, säkerhet, cookieval och grundläggande funktioner. Kan inte stängas av."
                checked
                disabled
              />
              <CategoryRow
                icon={<BarChart3 size={16} />}
                title="Analys"
                description="Hjälper oss förstå hur tjänsten används så att vi kan förbättra den. Laddas inte före samtycke."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                icon={<Megaphone size={16} />}
                title="Marknadsföring"
                description="Används för kampanjmätning, t.ex. UTM/referrer-lagring och eventuella annonspixlar. Laddas inte före samtycke."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-3 text-sm font-medium text-foreground/70 hover:text-foreground sm:h-10"
            >
              {showDetails ? (
                <>
                  Dölj inställningar <ChevronUp size={14} aria-hidden="true" />
                </>
              ) : (
                <>
                  Anpassa val <ChevronDown size={14} aria-hidden="true" />
                </>
              )}
            </button>
            <div className="flex-1" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
              <button
                type="button"
                onClick={handleRejectAll}
                className="h-11 px-4 rounded-full text-sm font-medium border border-border bg-card text-foreground/80 hover:bg-black/[0.03] sm:h-10"
              >
                Avböj valfria
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="h-11 px-4 rounded-full text-sm font-medium border border-border bg-card text-foreground/80 hover:bg-black/[0.03] sm:h-10"
              >
                Spara val
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="h-11 px-4 rounded-full text-sm font-semibold bg-[#1a6b3c] text-white hover:bg-[#155a32] shadow-sm sm:h-10"
              >
                Acceptera alla
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[#1a6b3c]" aria-hidden="true">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm text-[#172016]">{title}</div>
          <Toggle checked={checked} disabled={disabled} onChange={onChange} label={title} />
        </div>
        <p className="text-xs text-foreground/60 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={`${label}: ${checked ? 'på' : 'av'}`}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#1a6b3c]" : "bg-black/15"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Hjälpare som t.ex. footer-länkar kan trigga för att öppna bannern igen. */
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("am:open-cookie-settings"));
  }
}
