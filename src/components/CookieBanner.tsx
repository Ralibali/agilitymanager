import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, ChevronDown, ChevronUp, Shield, BarChart3, Megaphone, X } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

/**
 * Cookie-banner med kategorier (nödvändiga, analys, marknadsföring).
 * Visas tills användaren gjort ett val. Valet sparas i en cookie i ett år.
 */
export default function CookieBanner() {
  const { consent, hasDecided, acceptAll, rejectAll, update } = useCookieConsent();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  useEffect(() => {
    if (!hasDecided) {
      // Visa efter en kort delay för att inte krocka med initial render
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
    setOpen(false);
  }, [hasDecided]);

  // Lyssna efter "öppna inställningar" (t.ex. från footer)
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
      className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl rounded-3xl bg-card shadow-2xl border border-border pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-[#1a6b3c]/10 flex items-center justify-center">
              <Cookie size={20} className="text-[#1a6b3c]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="cookie-banner-title"
                className="font-semibold text-[#172016] text-base sm:text-lg"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Vi använder cookies
              </h2>
              <p className="text-sm text-foreground/65 mt-1 leading-relaxed">
                Vi använder cookies för att appen ska fungera, mäta hur den används och förbättra
                upplevelsen. Du bestämmer själv vilka kategorier du tillåter.{" "}
                <Link to="/cookiepolicy" className="underline text-[#1a6b3c] hover:text-[#c85d1e]">
                  Läs mer i cookiepolicyn
                </Link>
                .
              </p>
            </div>
            {hasDecided && (
              <button
                type="button"
                aria-label="Stäng"
                onClick={() => setOpen(false)}
                className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-full hover:bg-black/5 text-foreground/50"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Kategorier */}
          {showDetails && (
            <div className="mt-4 space-y-2">
              <CategoryRow
                icon={<Shield size={16} />}
                title="Nödvändiga"
                description="Krävs för inloggning, säkerhet och grundläggande funktioner. Kan inte stängas av."
                checked
                disabled
              />
              <CategoryRow
                icon={<BarChart3 size={16} />}
                title="Analys"
                description="Hjälper oss förstå hur appen används så att vi kan förbättra den (t.ex. Plausible, Supabase Analytics)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                icon={<Megaphone size={16} />}
                title="Marknadsföring"
                description="Används för att mäta kampanjer och visa relevanta erbjudanden (t.ex. Meta Pixel, Google Ads)."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          {/* Knappar */}
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              {showDetails ? (
                <>
                  Dölj inställningar <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Visa inställningar <ChevronDown size={14} />
                </>
              )}
            </button>
            <div className="flex-1" />
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <button
                type="button"
                onClick={handleRejectAll}
                className="h-10 px-4 rounded-full text-sm font-medium border border-border bg-card text-foreground/80 hover:bg-black/[0.03]"
              >
                Avböj alla
              </button>
              {showDetails ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-10 px-4 rounded-full text-sm font-medium bg-[#172016] text-white hover:bg-black"
                >
                  Spara val
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="h-10 px-4 rounded-full text-sm font-semibold bg-[#1a6b3c] text-white hover:bg-[#155a32] shadow-sm"
                >
                  Acceptera alla
                </button>
              )}
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
      <div className="shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[#1a6b3c]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm text-[#172016]">{title}</div>
          <Toggle checked={checked} disabled={disabled} onChange={onChange} />
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
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
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
