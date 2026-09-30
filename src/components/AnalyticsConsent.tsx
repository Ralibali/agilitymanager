import { useEffect, useState } from 'react';
import { setAnalyticsConsent } from '@/lib/ga4Runtime';
import { OPEN_COOKIE_SETTINGS_EVENT } from '@/lib/cookieSettings';

const KEY = 'agilitymanager_ga4_consent_v1';

/**
 * Samtyckesruta för valfri statistik. Visas tills besökaren har valt; därefter
 * öppnas den igen via "Cookieinställningar" i sidfoten (openCookieSettings).
 */
export default function AnalyticsConsent() {
  const [open, setOpen] = useState(() => { try { return !localStorage.getItem(KEY); } catch { return true; } });

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const choose = (accepted: boolean) => {
    try { localStorage.setItem(KEY, accepted ? 'accepted' : 'declined'); } catch { /* session choice remains valid */ }
    setAnalyticsConsent(accepted); setOpen(false);
  };

  if (!open) return null;
  return (
    <section
      role="dialog"
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-2xl border-2 border-ink bg-paper p-4 text-ink shadow-hard-sm sm:bottom-5 sm:left-5 sm:right-auto sm:mx-0 print:hidden"
    >
      <h2 id="analytics-consent-title" className="text-sm font-extrabold">Valfri statistik</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
        Med ditt samtycke använder vi Google Analytics 4 och statistikcookies för att förstå hur
        webbplatsen används. Du kan ändra ditt val under Cookieinställningar i sidfoten.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition-colors hover:bg-ink/5"
          onClick={() => choose(false)}
        >
          Endast nödvändiga
        </button>
        <button
          type="button"
          className="rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition-colors hover:bg-ink/5"
          onClick={() => choose(true)}
        >
          Acceptera statistik
        </button>
      </div>
    </section>
  );
}
