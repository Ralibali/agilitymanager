import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Mail } from "lucide-react";

export const NEWSLETTER_KEY = "am-newsletter-email";

export function isSubscribed(): boolean {
  try {
    return !!localStorage.getItem(NEWSLETTER_KEY);
  } catch {
    return false;
  }
}

export function subscribe(email: string) {
  try {
    localStorage.setItem(NEWSLETTER_KEY, email);
  } catch {
    /* ignorera */
  }
}

/**
 * E-postfångst med marknadsföringssamtycke.
 * variant "dark" = på mörk bakgrund, "light" = på ljus.
 */
export function EmailCapture({
  variant = "light",
  heading = "Få nya banor & träningstips först",
  subtext = "Ett kort mejl då och då — färdiga banor, tävlingspåminnelser och smarta träningsgrepp. Ingen spam, avsluta när du vill.",
  compact = false,
  onDone,
}: {
  variant?: "light" | "dark";
  heading?: string;
  subtext?: string;
  compact?: boolean;
  onDone?: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(isSubscribed());
  const [error, setError] = useState("");

  const dark = variant === "dark";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Skriv en giltig e-postadress.");
      return;
    }
    if (!consent) {
      setError("Bocka i samtycket så får vi skicka mejl till dig.");
      return;
    }
    subscribe(trimmed);
    setDone(true);
    onDone?.(trimmed);
  };

  if (done) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-4 ${
          dark ? "border-tang/60 bg-tang/10 text-paper" : "border-forest/50 bg-forest/10 text-ink"
        }`}
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${dark ? "bg-tang text-ink" : "bg-forest text-paper"}`}>
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <p className="font-bold">
          Klart! Du är på listan — håll utkik i inkorgen.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <>
          <h3 className={`font-display text-3xl tracking-wide sm:text-4xl ${dark ? "text-paper" : "text-ink"}`}>
            {heading}
          </h3>
          <p className={`mt-2 leading-relaxed ${dark ? "text-paper/60" : "text-ink/60"}`}>{subtext}</p>
        </>
      )}
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Mail className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${dark ? "text-paper/40" : "text-ink/40"}`} />
          <span className="sr-only">E-postadress</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="din@epost.se"
            className={`h-14 w-full rounded-full border-2 bg-transparent pl-12 pr-4 font-semibold outline-none transition-colors ${
              dark
                ? "border-paper/25 text-paper placeholder:text-paper/35 focus:border-tang"
                : "border-ink text-ink placeholder:text-ink/35 focus:border-forest"
            }`}
          />
        </label>
        <button
          type="submit"
          className={`pressable inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full px-7 font-bold ${
            dark ? "shadow-hard-paper bg-tang text-ink" : "shadow-hard bg-tang text-ink"
          }`}
        >
          Anmäl mig <ArrowRight className="h-5 w-5" />
        </button>
      </form>
      <label className={`mt-3 flex cursor-pointer items-start gap-2.5 text-sm ${dark ? "text-paper/55" : "text-ink/55"}`}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            setError("");
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-tang"
        />
        Jag godkänner att AgilityManager skickar nyheter, banor och marknadsföring till min e-post.
      </label>
      {error && <p className="mt-2 text-sm font-bold text-ember">{error}</p>}
    </div>
  );
}
