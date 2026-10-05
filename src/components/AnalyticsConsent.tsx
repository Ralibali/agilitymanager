import { COOKIE_SETTINGS_EVENT, readPrivacyConsent, storePrivacyConsent } from '@/lib/privacyConsent';
import { useEffect, useState } from 'react';
import { setAnalyticsConsent } from '@/lib/ga4Runtime';

const KEY = 'agilitymanager_ga4_consent_v2';
const OPEN_EVENT = COOKIE_SETTINGS_EVENT;

export default function AnalyticsConsent() {
  const [open, setOpen] = useState(() => !readPrivacyConsent(KEY));

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const choose = (accepted: boolean) => {
    storePrivacyConsent(KEY, accepted);
    setAnalyticsConsent(accepted);
    setOpen(false);
  };

  if (!open) return null;
  return (
    <section
      role="dialog"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-text"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border-2 border-ink bg-paper p-4 text-ink shadow-hard sm:bottom-5 sm:p-5"
    >
      <h2 id="analytics-consent-title" className="font-display text-xl uppercase tracking-wide">Valfri statistik</h2>
      <p id="analytics-consent-text" className="my-2 text-sm leading-relaxed text-ink/75">
        Med ditt samtycke använder vi Google Analytics 4 och statistikcookies för att förstå hur
        webbplatsen används. Du kan ändra ditt val när som helst via Cookieinställningar i sidfoten.{' '}
        <a className="font-semibold underline underline-offset-2" href="/cookies">Läs om cookies och lokal lagring</a>.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full border-2 border-ink bg-paper px-3 text-sm font-bold transition-colors hover:bg-cream"
          onClick={() => choose(false)}
        >
          Endast nödvändiga
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border-2 border-ink bg-paper px-3 text-sm font-bold transition-colors hover:bg-cream"
          onClick={() => choose(true)}
        >
          Acceptera statistik
        </button>
      </div>
    </section>
  );
}
