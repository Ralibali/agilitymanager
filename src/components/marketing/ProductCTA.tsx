import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { trackGrowthEvent } from "@/lib/growth";

interface Props {
  /** Kontext-nyckel som skickas in i events. */
  placement: string;
  /** Kort, konkret produktlöfte i just den kontexten. */
  headline: string;
  body: string;
  cta: string;
  /** UTM/source som läggs på /auth-länken. */
  source: string;
  /** Extra query-parametrar till signup-länken (t.ex. competition, sport). Encodas korrekt en gång. */
  signupParams?: Record<string, string | null | undefined>;
  /** Sekundär outline-CTA (valfri). */
  secondary?: { label: string; to: string };
}

/**
 * Återanvändbar CTA för publika SEO-sidor.
 * Kontextuell copy, konsekvent styling, spårar view + click via growth-lagret.
 */
export function ProductCTA({ placement, headline, body, cta, source, secondary }: Props) {
  const seen = useRef(false);

  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    trackGrowthEvent("public_product_cta_view", { placement, source });
  }, [placement, source]);

  const handleClick = () => {
    trackGrowthEvent("public_product_cta_click", { placement, source });
  };

  return (
    <aside
      aria-label="AgilityManager"
      className="mx-auto my-10 max-w-3xl overflow-hidden rounded-3xl border border-brand-600/25 bg-gradient-to-br from-brand-50 via-bone to-white p-6 shadow-[0_8px_30px_-12px_rgba(31,86,44,0.25)] sm:p-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-md">
          <Sparkles size={24} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl leading-tight text-forest sm:text-3xl">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-stone sm:text-base">{body}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/auth?mode=signup&source=${encodeURIComponent(source)}`}
              onClick={handleClick}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              {cta} <ArrowRight size={16} />
            </Link>
            {secondary && (
              <Link
                to={secondary.to}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-brand-600/30 bg-white px-5 text-sm font-semibold text-forest transition hover:bg-brand-50"
              >
                {secondary.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
