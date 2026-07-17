import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Loader2, Sparkles, Users, Video } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { SEO, SITE_URL } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth, PLANS, TRIAL_DAYS } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackAnalyticsEvent, billingIntervalFromPriceId } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "1 hund",
  "Träningslogg med känsla och fokus",
  "Nästa-stegsrekommendationer",
  "Gratis banbyggare (upplåst testläge)",
  "Tävlingskalender med intressemärkning",
  "Statistik 30 dagar tillbaka",
];

const PRO_FEATURES = [
  "Allt i Gratis",
  "Obegränsat antal hundar",
  "Obegränsade sparade banor + 3D-vy",
  "Full tävlingshistorik",
  "Avancerad statistik (90+ dagar)",
  "AI-träningsinsikter",
  "Vänner, chatt och bandelning",
  "Tävlingskalender med påminnelser",
  "Resultatimport från agilitydata.se",
  "CSV-export av träningsdata",
];

const PRICING_FAQS = [
  {
    q: "Är AgilityManager gratis?",
    a: "Ja. Grundversionen är gratis utan tidsbegränsning och utan kortuppgifter. Pro är ett tillval för dig som vill ha alla funktioner.",
  },
  {
    q: `Hur fungerar provperioden?`,
    a: `Nya konton får ${TRIAL_DAYS} dagar av Pro-funktionerna gratis. Ingen betalning krävs för att starta, och du behöver inte säga upp något — provperioden tar bara slut.`,
  },
  {
    q: "Kan jag byta mellan månad och år?",
    a: "Ja. Du kan byta när som helst via kundportalen under Inställningar. Årsvalet ger två månader gratis jämfört med månadsvis betalning.",
  },
  {
    q: "Hur säger jag upp Pro?",
    a: "Under Inställningar → Prenumeration → Hantera. Uppsägningen sker direkt i Stripes kundportal och du behåller Pro till periodens slut.",
  },
  {
    q: "Får jag rabatt om jag bjuder in en vän?",
    a: "Ja! När en vän du bjudit in skapar konto får ni båda 30 dagars Pro gratis. Dela din unika länk från Inställningar → Bjud in vänner.",
  },
  {
    q: "Vad kostar videoanalys av en coach?",
    a: "Vår SM-meriterade coach analyserar din träningsvideo från 79 kr per video. Du laddar upp videon i appen och får konkret feedback inom 48 timmar.",
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  const isPro = subscription.subscribed && !subscription.isTrial;

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      navigate(`/auth?mode=signup&redirect=${encodeURIComponent("/priser")}&source=pricing`);
      return;
    }
    setLoading(priceId);
    try {
      trackAnalyticsEvent("pro_checkout_started", {
        billing_interval: billingIntervalFromPriceId(priceId),
        source: "pricing_page",
      });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
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
      setLoading(null);
    }
  };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Priser – AgilityManager Pro",
      description:
        "Priser för AgilityManager: gratis grundversion och Pro från 66 kr/mån vid årsbetalning. Träningslogg, banbyggare, tävlingskalender och statistik för agility och hoopers.",
      url: `${SITE_URL}/priser`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: PRICING_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "AgilityManager Pro",
      description:
        "Pro-prenumeration på AgilityManager – obegränsade hundar, banbyggare med 3D, AI-träningsinsikter, resultatimport och tävlingskalender för agility och hoopers.",
      brand: { "@type": "Brand", name: "AgilityManager" },
      offers: [
        {
          "@type": "Offer",
          price: "79",
          priceCurrency: "SEK",
          name: "Pro månadsvis",
          url: `${SITE_URL}/priser`,
        },
        {
          "@type": "Offer",
          price: "790",
          priceCurrency: "SEK",
          name: "Pro årsvis",
          url: `${SITE_URL}/priser`,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-bone font-sans-ds">
      <SEO
        title="Priser – Pro från 66 kr/mån"
        description="AgilityManager är gratis att börja med. Pro kostar 79 kr/mån eller 790 kr/år (66 kr/mån) och låser upp obegränsade hundar, banbyggare med 3D, AI-insikter och resultatimport."
        canonical="/priser"
        jsonLd={jsonLd}
      />
      <LandingNav />

      <main className="pt-28 pb-20 px-5">
        <div className="max-w-5xl mx-auto">
          {/* Rubrik */}
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-forest/70">
              Priser
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-forest mt-3 tracking-tight">
              Enkel prissättning.{" "}
              <span className="text-forest-soft">Stor effekt på träningen.</span>
            </h1>
            <p className="text-stone mt-4 text-[15px] sm:text-base">
              Börja gratis utan kortuppgifter. Uppgradera till Pro när du vill ha allt —
              och säg upp när du vill.
            </p>
          </div>

          {/* Toggle */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <div
              className="inline-flex rounded-full border border-forest/15 bg-card p-1"
              role="tablist"
              aria-label="Välj betalningsperiod"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!annual}
                onClick={() => setAnnual(false)}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-medium transition-colors",
                  !annual ? "bg-forest text-bone" : "text-stone hover:text-forest",
                )}
              >
                Månadsvis
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={annual}
                onClick={() => setAnnual(true)}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1.5",
                  annual ? "bg-forest text-bone" : "text-stone hover:text-forest",
                )}
              >
                Årsvis
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    annual ? "bg-bone/20 text-bone" : "bg-forest/10 text-forest",
                  )}
                >
                  −17%
                </span>
              </button>
            </div>
          </div>

          {/* Kort */}
          <div className="mt-8 grid md:grid-cols-2 gap-5 max-w-3xl mx-auto items-stretch">
            {/* Gratis */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border border-forest/12 bg-card p-7 flex flex-col"
            >
              <h2 className="font-display text-xl text-forest">Gratis</h2>
              <p className="text-stone text-sm mt-1">För dig som vill komma igång</p>
              <div className="font-display text-3xl text-forest mt-5">
                0 kr
                <span className="text-base font-normal text-stone"> / alltid</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-forest">
                    <Check size={16} className="mt-0.5 shrink-0 text-forest/60" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full mt-8 border-forest/25 text-forest hover:bg-forest/5"
                onClick={() =>
                  user
                    ? navigate("/v3")
                    : navigate("/auth?mode=signup&source=pricing_free")
                }
              >
                {user ? "Öppna appen" : "Skapa gratis konto"}
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="relative rounded-3xl border-2 border-forest bg-card p-7 flex flex-col shadow-[0_18px_40px_rgba(26,107,60,0.14)]"
            >
              <div className="absolute -top-3 left-6 text-xs font-bold px-3 py-1 rounded-full bg-forest text-bone inline-flex items-center gap-1">
                <Crown size={11} /> Mest populär
              </div>
              <h2 className="font-display text-xl text-forest">Pro</h2>
              <p className="text-stone text-sm mt-1">För den seriösa tävlaren</p>

              <div className="font-display text-3xl text-forest mt-5 flex items-baseline gap-1 min-h-[2.5rem]">
                {annual ? PLANS.yearly.amount : PLANS.monthly.amount} kr
                <span className="text-base font-normal text-stone">
                  /{annual ? "år" : "mån"}
                </span>
              </div>
              <p className="text-xs font-semibold text-forest min-h-[1.25rem]">
                {annual
                  ? `Motsvarar ${PLANS.yearly.monthlyEquivalent} · ${PLANS.yearly.savingsLabel}`
                  : `Eller ${PLANS.yearly.price} — två månader gratis`}
              </p>

              <ul className="mt-5 space-y-3 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-forest">
                    <Check size={16} className="mt-0.5 shrink-0 text-forest" />
                    {f}
                  </li>
                ))}
              </ul>

              {isPro ? (
                <Button
                  className="w-full mt-8 bg-forest text-bone hover:bg-forest-soft"
                  onClick={() => navigate("/v3/settings")}
                >
                  Du har Pro — hantera prenumeration
                </Button>
              ) : (
                <Button
                  className="w-full mt-8 bg-forest text-bone hover:bg-forest-soft font-semibold"
                  disabled={!!loading}
                  onClick={() =>
                    handleCheckout(annual ? PLANS.yearly.priceId : PLANS.monthly.priceId)
                  }
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {user
                    ? `Uppgradera till Pro — ${annual ? PLANS.yearly.price : PLANS.monthly.price}`
                    : `Starta ${TRIAL_DAYS} dagars gratis provperiod`}
                </Button>
              )}
              <p className="text-[11px] text-stone text-center mt-3">
                {user
                  ? "Säker betalning via Stripe. Säg upp när du vill."
                  : "Inga kortuppgifter krävs för att skapa konto."}
              </p>
            </motion.div>
          </div>

          {/* Coach + Klubb */}
          <div className="mt-6 grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border border-forest/12 bg-card p-6"
            >
              <div className="flex items-center gap-2 text-forest">
                <Video size={18} />
                <h3 className="font-display text-lg">Videoanalys av coach</h3>
              </div>
              <p className="text-sm text-stone mt-2">
                Ladda upp en träningsvideo och få konkret feedback på dirigering, linjer
                och tempo av vår SM-meriterade coach — inom 48 timmar.
              </p>
              <p className="font-display text-xl text-forest mt-3">
                från 79 kr <span className="text-sm font-normal text-stone">/ video</span>
              </p>
              <Link
                to="/coach"
                className="inline-flex items-center gap-1 text-sm font-medium text-forest underline-offset-2 hover:underline mt-3"
              >
                Läs mer om coachning <Sparkles size={13} />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="rounded-3xl border border-forest/12 bg-card p-6"
            >
              <div className="flex items-center gap-2 text-forest">
                <Users size={18} />
                <h3 className="font-display text-lg">Klubb eller träningsgrupp?</h3>
              </div>
              <p className="text-sm text-stone mt-2">
                Klubbar får anslagstavla, gemensam kalender och undergrupper — gratis.
                Hör av dig om ni vill ha Pro till hela klubben till grupppris.
              </p>
              <a
                href="mailto:info@auroramedia.se?subject=Klubbpris%20AgilityManager%20Pro"
                className="inline-flex items-center gap-1 text-sm font-medium text-forest underline-offset-2 hover:underline mt-3"
              >
                Kontakta oss om klubbpris
              </a>
            </motion.div>
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl text-forest text-center">
              Vanliga frågor om priser
            </h2>
            <Accordion type="single" collapsible className="mt-6">
              {PRICING_FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`pricing-faq-${i}`}>
                  <AccordionTrigger className="text-left text-forest">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-stone">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
