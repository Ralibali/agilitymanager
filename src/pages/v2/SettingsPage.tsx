import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Crown, LogOut, ExternalLink, Check, Loader2, Sparkles, Moon, Sun, Eye, EyeOff, User as UserIcon, Shield, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth, PLANS } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, DSCard, DSButton, DSInput, SegmentedControl, StatusBadge } from "@/components/ds";
import { Switch } from "@/components/ui/switch";
import SupportForm from "@/components/SupportForm";
import { useIsAdmin } from "@/components/layout/useIsAdmin";

const PREMIUM_FEATURES = [
  "Avancerad statistik & felanalys",
  "Banplaneraren med export",
  "Tidsstämplade videoanteckningar",
  "Tävlingskalender & påminnelser",
  "Export till PDF & CSV",
];

export default function V2SettingsPage() {
  const { user, signOut, subscription, checkSubscription } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useIsAdmin();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; handler_first_name: string; handler_last_name: string; show_results_to_friends: boolean; show_competitions_to_friends: boolean } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [billingTab, setBillingTab] = useState<"monthly" | "yearly">("yearly");

  // Handle checkout return
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

  // Load profile
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
    } catch (err) {
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
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast.error("Kunde inte spara profilen");
    else toast.success("Profilen sparad");
  };

  const isPro = subscription.subscribed;
  const currentPlan = billingTab === "monthly" ? PLANS.monthly : PLANS.yearly;

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Inställningar"
        subtitle="Hantera profil, prenumeration och integritet."
        actions={
          isAdmin ? (
            <DSButton variant="ghost" onClick={() => navigate("/admin")}>
              <Shield className="h-4 w-4" /> Admin
            </DSButton>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* MAIN COLUMN */}
        <div className="space-y-6">
          {/* Profile */}
          <DSCard className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-text-secondary" />
              </div>
              <div>
                <h2 className="text-h3 text-text-primary">Profil</h2>
                <p className="text-small text-text-tertiary">{user?.email}</p>
              </div>
            </div>

            {profile ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-small text-text-secondary mb-1.5 block">Visningsnamn</label>
                    <DSInput
                      value={profile.display_name}
                      onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-small text-text-secondary mb-1.5 block">Förnamn</label>
                    <DSInput
                      value={profile.handler_first_name}
                      onChange={(e) => setProfile({ ...profile, handler_first_name: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-small text-text-secondary mb-1.5 block">Efternamn</label>
                    <DSInput
                      value={profile.handler_last_name}
                      onChange={(e) => setProfile({ ...profile, handler_last_name: e.target.value })}
                    />
                  </div>
                </div>
                <DSButton onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara profil"}
                </DSButton>
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            )}
          </DSCard>

          {/* Subscription */}
          <DSCard className="p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-h3 text-text-primary">Prenumeration</h2>
                  <p className="text-small text-text-tertiary">
                    {isPro ? "Du har Premium aktiverat" : "Lås upp alla funktioner"}
                  </p>
                </div>
              </div>
              {isPro && <StatusBadge variant="success" label="Aktiv" />}
            </div>

            {isPro ? (
              <div className="space-y-4">
                {subscription.subscriptionEnd && (
                  <p className="text-body text-text-secondary">
                    Förnyas {new Date(subscription.subscriptionEnd).toLocaleDateString("sv-SE")}
                  </p>
                )}
                <DSButton variant="secondary" onClick={handlePortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Hantera prenumeration
                </DSButton>
              </div>
            ) : (
              <div className="space-y-4">
                <SegmentedControl
                  value={billingTab}
                  onChange={(v) => setBillingTab(v as "monthly" | "yearly")}
                  options={[
                    { value: "monthly", label: "Månadsvis" },
                    { value: "yearly", label: "Årsvis (spara 56%)" },
                  ]}
                />

                <div className="rounded-xl border border-border bg-surface-2/50 p-5">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <p className="text-small text-text-tertiary">{currentPlan.label}</p>
                      <p className="text-h2 text-text-primary">{currentPlan.price}</p>
                    </div>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <ul className="space-y-2 mb-5">
                    {PREMIUM_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-body text-text-secondary">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <DSButton
                    onClick={() => handleCheckout(currentPlan.priceId)}
                    disabled={checkoutLoading === currentPlan.priceId}
                    className="w-full"
                  >
                    {checkoutLoading === currentPlan.priceId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Uppgradera till Premium</>
                    )}
                  </DSButton>
                </div>
              </div>
            )}
          </DSCard>

          {/* Support */}
          <DSCard className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-text-secondary" />
              </div>
              <div>
                <h2 className="text-h3 text-text-primary">Kontakta support</h2>
                <p className="text-small text-text-tertiary">Vi svarar inom ett dygn</p>
              </div>
            </div>
            <SupportForm />
          </DSCard>
        </div>

        {/* SIDE COLUMN */}
        <aside className="space-y-6">
          {/* Privacy */}
          <DSCard className="p-6">
            <h3 className="text-h3 text-text-primary mb-4">Integritet</h3>
            <div className="space-y-4">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-body text-text-primary">
                    <Eye className="h-3.5 w-3.5" /> Visa resultat för vänner
                  </div>
                  <p className="text-small text-text-tertiary mt-0.5">
                    Vänner kan se dina tävlingsresultat
                  </p>
                </div>
                <Switch
                  checked={profile?.show_results_to_friends ?? true}
                  onCheckedChange={(v) => profile && setProfile({ ...profile, show_results_to_friends: v })}
                />
              </label>

              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-body text-text-primary">
                    <EyeOff className="h-3.5 w-3.5" /> Visa tävlingar för vänner
                  </div>
                  <p className="text-small text-text-tertiary mt-0.5">
                    Vänner kan se dina planerade tävlingar
                  </p>
                </div>
                <Switch
                  checked={profile?.show_competitions_to_friends ?? true}
                  onCheckedChange={(v) => profile && setProfile({ ...profile, show_competitions_to_friends: v })}
                />
              </label>

              {profile && (
                <DSButton variant="ghost" size="sm" onClick={saveProfile} disabled={savingProfile}>
                  Spara integritet
                </DSButton>
              )}
            </div>
          </DSCard>

          {/* Theme */}
          <DSCard className="p-6">
            <h3 className="text-h3 text-text-primary mb-4">Utseende</h3>
            <SegmentedControl
              value={theme === "dark" ? "dark" : "light"}
              onChange={(v) => setTheme(v)}
              options={[
                { value: "light", label: "Ljust" },
                { value: "dark", label: "Mörkt" },
              ]}
            />
          </DSCard>

          {/* Sign out */}
          <DSCard className="p-6">
            <h3 className="text-h3 text-text-primary mb-2">Konto</h3>
            <p className="text-small text-text-tertiary mb-4">
              Logga ut från denna enhet
            </p>
            <DSButton variant="secondary" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4" /> Logga ut
            </DSButton>
          </DSCard>
        </aside>
      </div>
    </>
  );
}
