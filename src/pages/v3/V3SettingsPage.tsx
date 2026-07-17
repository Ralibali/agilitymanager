import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Check,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  MessageCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

import { PLANS, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import SupportForm from "@/components/SupportForm";
import { useIsAdmin } from "@/components/layout/useIsAdmin";
import { V3ProValueCard } from "@/components/v3/V3ProValueCard";
import { ReferralCard } from "@/components/v3/ReferralCard";
import { cn } from "@/lib/utils";
import { trackAnalyticsEvent, billingIntervalFromPriceId } from "@/lib/analytics";
import {
  getGuestInterestsSyncEnabled,
  setGuestInterestsSyncEnabled,
  subscribeGuestInterestsSyncPref,
} from "@/lib/guestInterestsSyncPref";
import {
  clearGuestInterestItems,
  readGuestInterestItems,
  subscribeGuestInterests,
} from "@/lib/guestInterestsStorage";

const PREMIUM_FEATURES = [
  "Avancerad statistik och felanalys",
  "Full banplanerare med export",
  "Tidsstämplade videoanteckningar",
  "Tävlingskalender och påminnelser",
  "Export till PDF och CSV",
];

type ProfileState = {
  display_name: string;
  handler_first_name: string;
  handler_last_name: string;
  show_results_to_friends: boolean;
  show_competitions_to_friends: boolean;
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getDaysLeft(value: string | null): number | null {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export default function V3SettingsPage() {
  const { user, signOut, subscription, checkSubscription } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useIsAdmin();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [billingTab, setBillingTab] = useState<"monthly" | "yearly">("yearly");
  const [guestSyncEnabled, setGuestSyncEnabledState] = useState(getGuestInterestsSyncEnabled());
  const [localGuestCount, setLocalGuestCount] = useState(0);

  const hasPaidPlan = subscription.subscribed && !subscription.isTrial;
  const hasProAccess = subscription.subscribed;
  const currentPlan = billingTab === "monthly" ? PLANS.monthly : PLANS.yearly;
  const subscriptionDate = useMemo(
    () => formatDate(subscription.subscriptionEnd),
    [subscription.subscriptionEnd],
  );
  const trialDaysLeft = useMemo(
    () => (subscription.isTrial ? getDaysLeft(subscription.subscriptionEnd) : null),
    [subscription.isTrial, subscription.subscriptionEnd],
  );

  useEffect(() => {
    const refreshCount = () => setLocalGuestCount(readGuestInterestItems().length);
    refreshCount();
    const offCount = subscribeGuestInterests(refreshCount);
    const offPref = subscribeGuestInterestsSyncPref(() =>
      setGuestSyncEnabledState(getGuestInterestsSyncEnabled()),
    );
    return () => {
      offCount();
      offPref();
    };
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    window.history.replaceState({}, "", "/v3/settings");

    if (checkout === "cancel") {
      toast.info("Betalningen avbröts. Du kan välja plan när du är redo.");
      return;
    }

    if (checkout !== "success") return;

    toast.success("Betalningen är klar. Vi aktiverar Pro nu.");
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        await checkSubscription();
        if (attempt < 7) await new Promise((resolve) => window.setTimeout(resolve, 1_500));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, checkSubscription]);

  // Scrolla direkt till Pro-sektionen när man landar med #pro-prenumeration
  // (t.ex. från trial-bannerns "Fortsätt med Pro").
  const location = useLocation();
  useEffect(() => {
    if (location.hash !== "#pro-prenumeration") return;
    const timer = window.setTimeout(() => {
      document.getElementById("pro-prenumeration")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void supabase
      .from("profiles")
      .select("display_name, handler_first_name, handler_last_name, show_results_to_friends, show_competitions_to_friends")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Kunde inte läsa din profil");
          return;
        }
        setProfile({
          display_name: data?.display_name ?? "",
          handler_first_name: data?.handler_first_name ?? "",
          handler_last_name: data?.handler_last_name ?? "",
          show_results_to_friends: data?.show_results_to_friends ?? true,
          show_competitions_to_friends: data?.show_competitions_to_friends ?? true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleToggleGuestSync = (enabled: boolean) => {
    setGuestInterestsSyncEnabled(enabled);
    setGuestSyncEnabledState(enabled);
    toast.success(
      enabled
        ? "Synk aktiverad — lokala markeringar följer med vid inloggning"
        : "Synk avstängd — markeringar stannar på den här enheten",
    );
  };

  const handleClearLocalGuestData = () => {
    if (localGuestCount === 0) return;
    const accepted = window.confirm(
      `Rensa ${localGuestCount} lokala tävlingsmarkering${localGuestCount === 1 ? "" : "ar"} från den här enheten? Redan synkade markeringar påverkas inte.`,
    );
    if (!accepted) return;
    clearGuestInterestItems();
    setLocalGuestCount(0);
    toast.success("Lokala markeringar rensade");
  };

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      trackAnalyticsEvent("pro_checkout_started", {
        billing_interval: billingIntervalFromPriceId(priceId),
        source: "settings",
      });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (!data?.url || typeof data.url !== "string") throw new Error("Checkout URL saknas");
      window.location.assign(data.url);
    } catch (error) {
      console.error("create-checkout failed", error);
      toast.error("Kunde inte starta betalningen. Försök igen om en stund.");
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (!data?.url || typeof data.url !== "string") throw new Error("Portal URL saknas");
      window.location.assign(data.url);
    } catch (error) {
      console.error("customer-portal failed", error);
      toast.error("Kunde inte öppna kundportalen. Försök igen om en stund.");
      setPortalLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast.error("Kunde inte spara profilen");
    else toast.success("Profilen sparad");
  };

  const planStatusCopy = hasPaidPlan
    ? "Din Pro-prenumeration är aktiv"
    : subscription.isTrial
      ? `Full Pro-provperiod${trialDaysLeft === null ? "" : ` · ${trialDaysLeft} dagar kvar`}`
      : "Välj Pro när du vill låsa upp hela träningssystemet";

  return (
    <div className="mx-auto max-w-[1160px] space-y-7 px-4 py-5 animate-v3-fade-in sm:px-6 lg:px-10 lg:py-10">
      <Helmet>
        <title>Inställningar – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-v3-sans text-v3-xs tracking-[0.18em] text-v3-text-tertiary">Ditt konto</p>
          <h1 className="font-v3-display text-v3-4xl text-v3-text-primary lg:text-v3-5xl">Inställningar</h1>
          <p className="max-w-xl text-v3-base text-v3-text-secondary">
            Hantera profil, Pro, integritet och hur AgilityManager fungerar för dig.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate("/v3/admin")}
            className="v3-focus-ring v3-tappable inline-flex h-11 items-center gap-2 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-secondary px-4 text-v3-sm text-v3-text-primary"
          >
            <Shield className="h-4 w-4" aria-hidden="true" /> Admin
          </button>
        )}
      </header>

      {!hasPaidPlan && (
        <V3ProValueCard
          title={subscription.isTrial ? "Behåll hela träningssystemet efter provperioden" : "Gör AgilityManager till ditt träningssystem"}
          description={subscription.isTrial
            ? "Du har redan tillgång till hela Pro. Välj års- eller månadsplan nu så fortsätter allt fungera utan avbrott."
            : "Kombinera logg, statistik, banplanering och tävlingsöversikt för att få tydligare beslut inför varje pass."}
          ctaLabel={checkoutLoading === currentPlan.priceId ? "Öppnar säker betalning…" : `Välj ${currentPlan.label.toLowerCase()}`}
          onClick={() => handleCheckout(currentPlan.priceId)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-6 v3-stagger">
          <section className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-v3-base bg-v3-canvas-secondary">
                <UserIcon className="h-4 w-4 text-v3-text-secondary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Profil</h2>
                <p className="text-v3-sm text-v3-text-tertiary">{user?.email}</p>
              </div>
            </div>

            {profile ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-v3-sm text-v3-text-secondary">
                    <span className="mb-1.5 block">Visningsnamn</span>
                    <input
                      value={profile.display_name}
                      onChange={(event) => setProfile({ ...profile, display_name: event.target.value })}
                      autoComplete="nickname"
                      className="v3-focus-ring h-11 w-full rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary"
                    />
                  </label>
                  <label className="block text-v3-sm text-v3-text-secondary">
                    <span className="mb-1.5 block">Förnamn</span>
                    <input
                      value={profile.handler_first_name}
                      onChange={(event) => setProfile({ ...profile, handler_first_name: event.target.value })}
                      autoComplete="given-name"
                      className="v3-focus-ring h-11 w-full rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary"
                    />
                  </label>
                  <label className="block text-v3-sm text-v3-text-secondary sm:col-span-2">
                    <span className="mb-1.5 block">Efternamn</span>
                    <input
                      value={profile.handler_last_name}
                      onChange={(event) => setProfile({ ...profile, handler_last_name: event.target.value })}
                      autoComplete="family-name"
                      className="v3-focus-ring h-11 w-full rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="v3-focus-ring v3-tappable inline-flex h-11 items-center gap-2 rounded-v3-base bg-v3-brand-500 px-4 text-v3-sm font-medium text-white disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {savingProfile ? "Sparar…" : "Spara profil"}
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-8" role="status" aria-label="Laddar profil">
                <Loader2 className="h-5 w-5 animate-spin text-v3-text-tertiary" />
              </div>
            )}
          </section>

          <section id="pro-prenumeration" className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6 scroll-mt-24">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-v3-base bg-v3-brand-100">
                  <Crown className="h-4 w-4 text-v3-brand-700" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Pro</h2>
                  <p className="text-v3-sm text-v3-text-tertiary">{planStatusCopy}</p>
                </div>
              </div>
              {hasProAccess && (
                <span className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-v3-2xs font-semibold",
                  hasPaidPlan
                    ? "bg-v3-success/10 text-v3-success"
                    : "bg-v3-brand-100 text-v3-brand-700",
                )}>
                  {hasPaidPlan ? "Aktiv" : "Provperiod"}
                </span>
              )}
            </div>

            {hasPaidPlan ? (
              <div className="space-y-4">
                <div className="rounded-v3-xl border border-v3-success/20 bg-v3-success/5 p-4">
                  <p className="font-medium text-v3-text-primary">Du har tillgång till alla Pro-funktioner.</p>
                  {subscriptionDate && <p className="mt-1 text-v3-sm text-v3-text-secondary">Nästa period börjar {subscriptionDate}.</p>}
                </div>
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="v3-focus-ring v3-tappable inline-flex h-11 items-center gap-2 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-secondary px-4 text-v3-sm text-v3-text-primary disabled:opacity-50"
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                  {portalLoading ? "Öppnar…" : "Hantera prenumeration"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {subscription.isTrial && (
                  <div className="rounded-v3-xl border border-v3-brand-500/20 bg-v3-brand-100/50 p-4">
                    <p className="font-medium text-v3-text-primary">
                      Du har full Pro{subscriptionDate ? ` till ${subscriptionDate}` : " under provperioden"}.
                    </p>
                    <p className="mt-1 text-v3-sm leading-6 text-v3-text-secondary">
                      Välj plan före slutdatumet för att behålla statistik, export och alla smarta verktyg utan avbrott.
                    </p>
                  </div>
                )}

                <div className="inline-flex w-full rounded-v3-base bg-v3-canvas-secondary p-1 sm:w-auto" aria-label="Välj betalningsperiod">
                  {(["monthly", "yearly"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setBillingTab(value)}
                      aria-pressed={billingTab === value}
                      className={cn(
                        "h-10 flex-1 rounded-[calc(theme(borderRadius.v3-base)-2px)] px-4 text-v3-sm font-medium transition-all sm:flex-none",
                        billingTab === value
                          ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-xs"
                          : "text-v3-text-tertiary hover:text-v3-text-secondary",
                      )}
                    >
                      {value === "monthly" ? "Månadsvis" : `Årsvis · ${PLANS.yearly.savingsLabel}`}
                    </button>
                  ))}
                </div>

                <div className="rounded-v3-xl border border-v3-brand-500/20 bg-v3-canvas-secondary/40 p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-v3-sm text-v3-text-tertiary">{currentPlan.label}</p>
                      <p className="mt-1 font-v3-display text-v3-3xl text-v3-text-primary">{currentPlan.price}</p>
                      {billingTab === "yearly" && (
                        <p className="mt-1 text-v3-sm text-v3-text-tertiary">Motsvarar {PLANS.yearly.monthlyEquivalent}</p>
                      )}
                    </div>
                    <Sparkles className="h-5 w-5 text-v3-brand-500" aria-hidden="true" />
                  </div>
                  <ul className="mb-5 space-y-2.5">
                    {PREMIUM_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-v3-sm text-v3-text-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-v3-brand-500" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleCheckout(currentPlan.priceId)}
                    disabled={checkoutLoading !== null}
                    className="v3-focus-ring v3-tappable inline-flex h-12 w-full items-center justify-center gap-2 rounded-v3-base bg-v3-brand-500 text-v3-sm font-semibold text-white disabled:opacity-50"
                  >
                    {checkoutLoading === currentPlan.priceId && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {checkoutLoading === currentPlan.priceId ? "Öppnar säker betalning…" : `Välj ${currentPlan.label.toLowerCase()}`}
                  </button>
                  <p className="mt-2 text-center text-v3-2xs text-v3-text-tertiary">Säker betalning via Stripe · Avsluta när som helst</p>
                </div>
              </div>
            )}
          </section>

          <section className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-v3-base bg-v3-canvas-secondary">
                <MessageCircle className="h-4 w-4 text-v3-text-secondary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Kontakta support</h2>
                <p className="text-v3-sm text-v3-text-tertiary">Berätta vad du behöver hjälp med</p>
              </div>
            </div>
            <SupportForm />
          </section>
        </div>

        <aside className="space-y-6 v3-stagger">
          <ReferralCard />

          <section className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6">
            <h3 className="mb-4 font-v3-display text-v3-xl text-v3-text-primary">Integritet</h3>
            <div className="space-y-5">
              <label className="flex cursor-pointer items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-v3-sm text-v3-text-primary"><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Visa resultat för vänner</div>
                  <p className="mt-0.5 text-v3-xs text-v3-text-tertiary">Vänner kan se dina tävlingsresultat</p>
                </div>
                <Switch checked={profile?.show_results_to_friends ?? true} onCheckedChange={(value) => profile && setProfile({ ...profile, show_results_to_friends: value })} />
              </label>
              <label className="flex cursor-pointer items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-v3-sm text-v3-text-primary"><EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Visa tävlingar för vänner</div>
                  <p className="mt-0.5 text-v3-xs text-v3-text-tertiary">Vänner kan se dina planerade tävlingar</p>
                </div>
                <Switch checked={profile?.show_competitions_to_friends ?? true} onCheckedChange={(value) => profile && setProfile({ ...profile, show_competitions_to_friends: value })} />
              </label>
              {profile && (
                <button type="button" onClick={saveProfile} disabled={savingProfile} className="text-v3-sm font-medium text-v3-text-secondary underline underline-offset-4 hover:text-v3-text-primary disabled:opacity-50">
                  Spara integritet
                </button>
              )}
            </div>
          </section>

          <section className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6">
            <h3 className="font-v3-display text-v3-xl text-v3-text-primary">Lokala tävlingsmarkeringar</h3>
            <p className="mb-4 mt-1 text-v3-xs leading-5 text-v3-text-tertiary">
              Markeringar du gör utloggad kan följa med till kontot nästa gång du loggar in.
            </p>
            <label className="mb-4 flex cursor-pointer items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-v3-sm text-v3-text-primary"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Synka över enheter</div>
                <p className="mt-0.5 text-v3-xs text-v3-text-tertiary">Flytta lokala markeringar till kontot vid inloggning</p>
              </div>
              <Switch checked={guestSyncEnabled} onCheckedChange={handleToggleGuestSync} />
            </label>
            <div className="flex items-center justify-between gap-3 border-t border-v3-canvas-sunken pt-3">
              <span className="text-v3-xs text-v3-text-tertiary">
                {localGuestCount === 0 ? "Inga lokala markeringar" : `${localGuestCount} lokal${localGuestCount === 1 ? "" : "a"} markering${localGuestCount === 1 ? "" : "ar"}`}
              </span>
              <button
                type="button"
                onClick={handleClearLocalGuestData}
                disabled={localGuestCount === 0}
                className="v3-focus-ring v3-tappable inline-flex h-9 items-center gap-1.5 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-secondary px-3 text-v3-xs text-v3-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Rensa
              </button>
            </div>
          </section>

          <section className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6">
            <h3 className="mb-1 font-v3-display text-v3-xl text-v3-text-primary">Utseende</h3>
            <p className="mb-4 text-v3-xs text-v3-text-tertiary">Välj det läge som känns bäst för dig.</p>
            <div className="inline-flex w-full rounded-v3-base bg-v3-canvas-secondary p-1">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setTheme(mode)}
                  aria-pressed={theme === mode}
                  className={cn(
                    "h-10 flex-1 rounded-[calc(theme(borderRadius.v3-base)-2px)] text-v3-sm font-medium transition-all",
                    (theme === mode || (mode === "light" && theme !== "dark"))
                      ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-xs"
                      : "text-v3-text-tertiary",
                  )}
                >
                  {mode === "light" ? "Ljust" : "Mörkt"}
                </button>
              ))}
            </div>
          </section>

          <section className="animate-v3-fade-up rounded-v3-2xl border border-v3-canvas-sunken bg-v3-canvas-elevated p-5 sm:p-6">
            <h3 className="font-v3-display text-v3-xl text-v3-text-primary">Konto</h3>
            <p className="mb-4 mt-1 text-v3-sm text-v3-text-tertiary">Logga ut från den här enheten.</p>
            <button
              type="button"
              onClick={signOut}
              className="v3-focus-ring v3-tappable inline-flex h-11 w-full items-center justify-center gap-2 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-secondary text-v3-sm text-v3-text-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Logga ut
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
