import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Crown, LogOut, ExternalLink, Check, Loader2, Sparkles, Eye, EyeOff,
  User as UserIcon, Shield, MessageCircle, RefreshCw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

import { useAuth, PLANS } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import SupportForm from "@/components/SupportForm";
import { useIsAdmin } from "@/components/layout/useIsAdmin";
import { V3ProValueCard } from "@/components/v3/V3ProValueCard";
import { cn } from "@/lib/utils";
import {
  getGuestInterestsSyncEnabled,
  setGuestInterestsSyncEnabled,
  subscribeGuestInterestsSyncPref,
} from "@/lib/guestInterestsSyncPref";
import {
  readGuestInterestItems,
  clearGuestInterestItems,
  subscribeGuestInterests,
} from "@/lib/guestInterestsStorage";

const PREMIUM_FEATURES = [
  "Avancerad statistik & felanalys",
  "Banplaneraren med export",
  "Tidsstämplade videoanteckningar",
  "Tävlingskalender & påminnelser",
  "Export till PDF & CSV",
];

export default function V3SettingsPage() {
  const { user, signOut, subscription, checkSubscription } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useIsAdmin();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [profile, setProfile] = useState<{
    display_name: string;
    handler_first_name: string;
    handler_last_name: string;
    show_results_to_friends: boolean;
    show_competitions_to_friends: boolean;
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [billingTab, setBillingTab] = useState<"monthly" | "yearly">("yearly");

  // Gästmarkeringar (lokala) — synk-pref + lokal räknare
  const [guestSyncEnabled, setGuestSyncEnabledState] = useState<boolean>(getGuestInterestsSyncEnabled());
  const [localGuestCount, setLocalGuestCount] = useState<number>(0);

  useEffect(() => {
    const refreshCount = () => setLocalGuestCount(readGuestInterestItems().length);
    refreshCount();
    const offCount = subscribeGuestInterests(refreshCount);
    const offPref = subscribeGuestInterestsSyncPref(() => setGuestSyncEnabledState(getGuestInterestsSyncEnabled()));
    return () => { offCount(); offPref(); };
  }, []);

  const handleToggleGuestSync = (enabled: boolean) => {
    setGuestInterestsSyncEnabled(enabled);
    setGuestSyncEnabledState(enabled);
    toast.success(enabled ? "Synk aktiverad — lokala markeringar följer med vid inloggning" : "Synk avstängd — markeringar stannar på den här enheten");
  };

  const handleClearLocalGuestData = () => {
    if (localGuestCount === 0) return;
    if (!window.confirm(`Rensa ${localGuestCount} lokala tävlingsmarkering${localGuestCount === 1 ? "" : "ar"} från den här enheten? Markeringar som redan synkats till ditt konto påverkas inte.`)) return;
    clearGuestInterestItems();
    setLocalGuestCount(0);
    toast.success("Lokala markeringar rensade");
  };

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Betalning genomförd! Premium aktiveras inom kort.");
      let cancelled = false;
      (async () => {
        for (let i = 0; i < 10 && !cancelled; i++) {
          await checkSubscription();
          await new Promise((r) => setTimeout(r, 2000));
        }
      })();
      return () => { cancelled = true; };
    } else if (checkout === "cancel") {
      toast.info("Betalningen avbröts.");
    }
  }, [searchParams, checkSubscription]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, handler_first_name, handler_last_name, show_results_to_friends, show_competitions_to_friends")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({
          display_name: data.display_name ?? "",
          handler_first_name: data.handler_first_name ?? "",
          handler_last_name: data.handler_last_name ?? "",
          show_results_to_friends: data.show_results_to_friends ?? true,
          show_competitions_to_friends: data.show_competitions_to_friends ?? true,
        });
      });
  }, [user]);

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Kunde inte starta betalning");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Kunde inte öppna kundportal");
    } finally {
      setPortalLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update(profile).eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast.error("Kunde inte spara profilen");
    else toast.success("Profilen sparad");
  };

  const isPro = subscription.subscribed;
  const currentPlan = billingTab === "monthly" ? PLANS.monthly : PLANS.yearly;

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <Helmet><title>Inställningar – v3 – AgilityManager</title></Helmet>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <p className="text-v3-xs uppercase tracking-[0.18em] text-v3-text-tertiary font-v3-sans">System</p>
          <h1 className="font-v3-display text-v3-4xl lg:text-v3-5xl text-v3-text-primary">Inställningar</h1>
          <p className="text-v3-base text-v3-text-secondary max-w-xl">Hantera profil, prenumeration och integritet.</p>
        </div>
        {isAdmin && (
          <button onClick={() => navigate("/v3/admin")} className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-canvas-secondary border border-v3-canvas-sunken text-v3-sm text-v3-text-primary v3-tappable v3-focus-ring">
            <Shield className="h-4 w-4" /> Admin
          </button>
        )}
      </header>

      {!isPro && (
        <V3ProValueCard
          title="Gör AgilityManager till ditt träningssystem"
          description="När du börjar använda logg, statistik och banplanering tillsammans blir Pro-värdet tydligt: export, djupare analys och bättre överblick inför träning och tävling."
          ctaLabel={checkoutLoading === currentPlan.priceId ? "Startar…" : "Uppgradera"}
          onClick={() => handleCheckout(currentPlan.priceId)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 v3-stagger">
          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-v3-base bg-v3-canvas-secondary flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-v3-text-secondary" />
              </div>
              <div>
                <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Profil</h2>
                <p className="text-v3-sm text-v3-text-tertiary">{user?.email}</p>
              </div>
            </div>

            {profile ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-v3-sm text-v3-text-secondary mb-1.5 block">Visningsnamn</label>
                    <input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} className="w-full h-10 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary v3-focus-ring" />
                  </div>
                  <div>
                    <label className="text-v3-sm text-v3-text-secondary mb-1.5 block">Förnamn</label>
                    <input value={profile.handler_first_name} onChange={(e) => setProfile({ ...profile, handler_first_name: e.target.value })} className="w-full h-10 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary v3-focus-ring" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-v3-sm text-v3-text-secondary mb-1.5 block">Efternamn</label>
                    <input value={profile.handler_last_name} onChange={(e) => setProfile({ ...profile, handler_last_name: e.target.value })} className="w-full h-10 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 text-v3-sm text-v3-text-primary v3-focus-ring" />
                  </div>
                </div>
                <button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium v3-tappable v3-focus-ring disabled:opacity-50">
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara profil"}
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-v3-text-tertiary" /></div>
            )}
          </section>

          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-v3-base bg-v3-brand-100 flex items-center justify-center">
                  <Crown className="h-4 w-4 text-v3-brand-700" />
                </div>
                <div>
                  <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Prenumeration</h2>
                  <p className="text-v3-sm text-v3-text-tertiary">{isPro ? "Du har Premium aktiverat" : "Lås upp alla funktioner"}</p>
                </div>
              </div>
              {isPro && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-v3-2xs font-medium bg-v3-success/10 text-v3-success">Aktiv</span>}
            </div>

            {isPro ? (
              <div className="space-y-4">
                {subscription.subscriptionEnd && <p className="text-v3-base text-v3-text-secondary">Förnyas {new Date(subscription.subscriptionEnd).toLocaleDateString("sv-SE")}</p>}
                <button onClick={handlePortal} disabled={portalLoading} className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-canvas-secondary border border-v3-canvas-sunken text-v3-sm text-v3-text-primary v3-tappable v3-focus-ring">
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Hantera prenumeration
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex rounded-v3-base bg-v3-canvas-secondary p-1">
                  {(["monthly", "yearly"] as const).map((v) => (
                    <button key={v} onClick={() => setBillingTab(v)} className={cn("px-4 h-9 rounded-[calc(theme(borderRadius.v3-base)-2px)] text-v3-sm font-medium transition-all", billingTab === v ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-xs" : "text-v3-text-tertiary hover:text-v3-text-secondary")}>
                      {v === "monthly" ? "Månadsvis" : `Årsvis · ${PLANS.yearly.savingsLabel}`}
                    </button>
                  ))}
                </div>

                <div className="rounded-v3-xl border border-v3-canvas-sunken bg-v3-canvas-secondary/40 p-5">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <p className="text-v3-sm text-v3-text-tertiary">{currentPlan.label}</p>
                      <p className="font-v3-display text-v3-3xl text-v3-text-primary mt-1">{currentPlan.price}</p>
                      {billingTab === "yearly" && <p className="text-v3-sm text-v3-text-tertiary mt-0.5">Motsvarar {PLANS.yearly.monthlyEquivalent}</p>}
                    </div>
                    <Sparkles className="h-5 w-5 text-v3-brand-500" />
                  </div>
                  <ul className="space-y-2 mb-5">
                    {PREMIUM_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-v3-sm text-v3-text-secondary"><Check className="h-4 w-4 text-v3-brand-500 shrink-0 mt-0.5" />{f}</li>
                    ))}
                  </ul>
                  <button onClick={() => handleCheckout(currentPlan.priceId)} disabled={checkoutLoading === currentPlan.priceId} className="w-full h-11 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-semibold v3-tappable v3-focus-ring inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {checkoutLoading === currentPlan.priceId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uppgradera till Pro"}
                  </button>
                  <p className="text-v3-2xs text-v3-text-tertiary text-center mt-2">Avsluta när som helst i kundportalen</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-v3-base bg-v3-canvas-secondary flex items-center justify-center"><MessageCircle className="h-4 w-4 text-v3-text-secondary" /></div>
              <div><h2 className="font-v3-display text-v3-xl text-v3-text-primary">Kontakta support</h2><p className="text-v3-sm text-v3-text-tertiary">Vi svarar inom ett dygn</p></div>
            </div>
            <SupportForm />
          </section>
        </div>

        <aside className="space-y-6 v3-stagger">
          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <h3 className="font-v3-display text-v3-xl text-v3-text-primary mb-4">Integritet</h3>
            <div className="space-y-4">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div className="flex-1"><div className="flex items-center gap-1.5 text-v3-sm text-v3-text-primary"><Eye className="h-3.5 w-3.5" /> Visa resultat för vänner</div><p className="text-v3-xs text-v3-text-tertiary mt-0.5">Vänner kan se dina tävlingsresultat</p></div>
                <Switch checked={profile?.show_results_to_friends ?? true} onCheckedChange={(v) => profile && setProfile({ ...profile, show_results_to_friends: v })} />
              </label>
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div className="flex-1"><div className="flex items-center gap-1.5 text-v3-sm text-v3-text-primary"><EyeOff className="h-3.5 w-3.5" /> Visa tävlingar för vänner</div><p className="text-v3-xs text-v3-text-tertiary mt-0.5">Vänner kan se dina planerade tävlingar</p></div>
                <Switch checked={profile?.show_competitions_to_friends ?? true} onCheckedChange={(v) => profile && setProfile({ ...profile, show_competitions_to_friends: v })} />
              </label>
              {profile && <button onClick={saveProfile} disabled={savingProfile} className="text-v3-sm text-v3-text-secondary hover:text-v3-text-primary underline underline-offset-4">Spara integritet</button>}
            </div>
          </section>

          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <h3 className="font-v3-display text-v3-xl text-v3-text-primary mb-1">Lokala tävlingsmarkeringar</h3>
            <p className="text-v3-xs text-v3-text-tertiary mb-4">
              {user
                ? "Markeringar du gör utloggad sparas på enheten och kan synkas till ditt konto vid inloggning."
                : "Dina markeringar sparas just nu på den här enheten. Logga in för att synka dem till ditt konto."}
            </p>

            <label className="flex items-start justify-between gap-3 cursor-pointer mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-v3-sm text-v3-text-primary">
                  <RefreshCw className="h-3.5 w-3.5" /> Synka över enheter vid inloggning
                </div>
                <p className="text-v3-xs text-v3-text-tertiary mt-0.5">
                  När på: lokala markeringar flyttas till ditt konto nästa gång du loggar in.
                </p>
              </div>
              <Switch checked={guestSyncEnabled} onCheckedChange={handleToggleGuestSync} />
            </label>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-v3-canvas-sunken">
              <div className="text-v3-xs text-v3-text-tertiary">
                {localGuestCount === 0
                  ? "Inga lokala markeringar"
                  : `${localGuestCount} lokal${localGuestCount === 1 ? "" : "a"} markering${localGuestCount === 1 ? "" : "ar"}`}
              </div>
              <button
                onClick={handleClearLocalGuestData}
                disabled={localGuestCount === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-v3-base bg-v3-canvas-secondary border border-v3-canvas-sunken text-v3-xs text-v3-text-primary v3-tappable v3-focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" /> Rensa lokala data
              </button>
            </div>
          </section>

          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <h3 className="font-v3-display text-v3-xl text-v3-text-primary mb-4">Utseende</h3>
            <div className="inline-flex rounded-v3-base bg-v3-canvas-secondary p-1 w-full">
              {(["light", "dark"] as const).map((mode) => (
                <button key={mode} onClick={() => setTheme(mode)} className={cn("flex-1 h-9 rounded-[calc(theme(borderRadius.v3-base)-2px)] text-v3-sm font-medium transition-all", (theme === mode || (mode === "light" && theme !== "dark")) ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-xs" : "text-v3-text-tertiary")}>{mode === "light" ? "Ljust" : "Mörkt"}</button>
              ))}
            </div>
          </section>

          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-6 animate-v3-fade-up">
            <h3 className="font-v3-display text-v3-xl text-v3-text-primary mb-2">Konto</h3>
            <p className="text-v3-sm text-v3-text-tertiary mb-4">Logga ut från denna enhet</p>
            <button onClick={signOut} className="w-full h-10 rounded-v3-base bg-v3-canvas-secondary border border-v3-canvas-sunken text-v3-sm text-v3-text-primary inline-flex items-center justify-center gap-2 v3-tappable v3-focus-ring">
              <LogOut className="h-4 w-4" /> Logga ut
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
