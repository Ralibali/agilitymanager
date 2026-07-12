import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getAndClearUtmData } from "@/lib/utm";
import { readGuestInterestItems } from "@/lib/guestInterestsStorage";
import { trackGrowthEvent } from "@/lib/growthEvents";

function safeRedirectPath(value: string | null): string {
  if (!value) return "/v3";
  if (!value.startsWith("/")) return "/v3";
  if (value.startsWith("//")) return "/v3";
  return value;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const mode = searchParams.get("mode");
  const redirectPath = useMemo(() => safeRedirectPath(searchParams.get("redirect")), [searchParams]);
  const source = searchParams.get("source");

  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const startedModes = useRef(new Set<string>());
  const { toast } = useToast();

  const guestInterestCount = useMemo(() => {
    if (source !== "competitions") return 0;
    try {
      return readGuestInterestItems().length;
    } catch {
      return 0;
    }
  }, [source]);

  useEffect(() => {
    if (mode === "signup") setIsLogin(false);
    if (mode === "login") setIsLogin(true);
  }, [mode]);

  useEffect(() => {
    if (!source) return;
    try {
      window.localStorage.setItem("am_signup_source", source);
    } catch {
      // Ignore storage errors.
    }
  }, [source]);

  useEffect(() => {
    trackGrowthEvent("auth_viewed", {
      mode: resetMode ? "reset" : isLogin ? "login" : "signup",
      source: source ?? "direct",
      has_referral: Boolean(refCode),
      redirect: redirectPath,
    });
  }, [isLogin, redirectPath, refCode, resetMode, source]);

  const markAuthStarted = () => {
    const currentMode = resetMode ? "reset" : isLogin ? "login" : "signup";
    if (startedModes.current.has(currentMode)) return;
    startedModes.current.add(currentMode);
    trackGrowthEvent("auth_started", {
      mode: currentMode,
      source: source ?? "direct",
    });
  };

  const goToRedirect = () => {
    navigate(redirectPath, { replace: true });
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setConfirmationEmail(null);
    setResetMode(false);
    setIsLogin(nextMode === "login");
    const params = new URLSearchParams(searchParams);
    params.set("mode", nextMode);
    navigate(`/auth?${params.toString()}`, { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (resetMode) {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Fel", description: error.message, variant: "destructive" });
      } else {
        trackGrowthEvent("password_reset_requested", { source: source ?? "direct" });
        toast({ title: "Kolla din e-post", description: "En återställningslänk har skickats." });
        setResetMode(false);
      }
      return;
    }

    if (!isLogin && password.length < 6) {
      toast({
        title: "För kort lösenord",
        description: "Lösenordet måste vara minst 6 tecken.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isLogin) {
      trackGrowthEvent("login_submitted", { source: source ?? "direct" });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        trackGrowthEvent("login_failed", {
          source: source ?? "direct",
          reason: error.name || "auth_error",
        });
        toast({ title: "Inloggningsfel", description: error.message, variant: "destructive" });
      } else if (data.user) {
        trackGrowthEvent("login_completed", { source: source ?? "direct" });
        goToRedirect();
      }
      setLoading(false);
      return;
    }

    trackGrowthEvent("signup_submitted", {
      source: source ?? "direct",
      has_referral: Boolean(refCode),
    });

    const emailRedirectUrl = new URL(window.location.origin + redirectPath);
    if (source) emailRedirectUrl.searchParams.set("source", source);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          display_name: displayName.trim() || undefined,
          signup_source: source ?? undefined,
          referral_code: refCode ?? undefined,
        },
        emailRedirectTo: emailRedirectUrl.toString(),
      },
    });

    if (error) {
      trackGrowthEvent("signup_failed", {
        source: source ?? "direct",
        reason: error.name || "auth_error",
      });
      toast({ title: "Registreringsfel", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.session) {
      toast({ title: "Konto skapat!", description: "Din 14-dagars Pro-period har startat." });
      const utmData = getAndClearUtmData();

      if (data.user) {
        try {
          await supabase.from("signup_sources").insert({
            user_id: data.user.id,
            ...utmData,
            ...(source ? { utm_source: source } : {}),
            ...(refCode ? { utm_source: "friend_invite", referrer: refCode } : {}),
          });
        } catch {
          // Attribution får inte blockera registreringen.
        }

        if (refCode) {
          try {
            const { data: referrerProfile } = await supabase
              .from("profiles")
              .select("user_id")
              .eq("referral_code", refCode)
              .single();
            if (referrerProfile) {
              await supabase.from("friendships").insert({
                requester_id: referrerProfile.user_id,
                receiver_id: data.user.id,
                status: "pending",
              });
            }
          } catch {
            // Referral-kopplingen är sekundär till ett lyckat konto.
          }
        }
      }

      try {
        await supabase.functions.invoke("notify-admin", {
          body: {
            type: "new_user",
            data: { email: normalizedEmail, display_name: displayName.trim(), source },
          },
        });
      } catch {
        // Adminnotis får inte blockera registreringen.
      }

      trackGrowthEvent("signup_completed", {
        source: source ?? "direct",
        has_referral: Boolean(refCode),
      });
      goToRedirect();
    } else {
      trackGrowthEvent("signup_confirmation_required", {
        source: source ?? "direct",
        has_referral: Boolean(refCode),
      });
      setConfirmationEmail(normalizedEmail);
    }

    setLoading(false);
  };

  const pageTitle = resetMode ? "Återställ lösenord" : isLogin ? "Logga in" : "Skapa konto";

  return (
    <>
      <Helmet>
        <title>{pageTitle} – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
        <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden rounded-3xl border border-primary/10 bg-primary/[0.045] p-8 lg:block"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles size={23} />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Börja utan risk
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-foreground">
              Träna med en plan. Se varje framsteg.
            </h1>
            <p className="mt-4 max-w-md leading-7 text-muted-foreground">
              Testa hela AgilityManager Pro i 14 dagar. Ingen kortuppgift krävs och gratisversionen finns kvar efter provperioden.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Lägg till din hund och logga första passet på några minuter",
                "Samla banor, mål, tävlingar och statistik på ett ställe",
                "Få ett tydligt nästa steg i träningen",
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </motion.aside>

          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8"
          >
            <div className="mb-7 text-center">
              <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                agilitymanager
              </Link>
              <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
                {confirmationEmail ? (
                  <CheckCircle2 size={26} className="text-primary-foreground" />
                ) : (
                  <Sparkles size={26} className="text-primary-foreground" />
                )}
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
                {confirmationEmail
                  ? "Bekräfta din e-post"
                  : resetMode
                    ? "Återställ lösenord"
                    : isLogin
                      ? "Välkommen tillbaka"
                      : "Starta din träningsresa"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {confirmationEmail
                  ? `Vi har skickat en bekräftelselänk till ${confirmationEmail}.`
                  : resetMode
                    ? "Vi skickar en säker återställningslänk till dig."
                    : isLogin
                      ? "Logga in och fortsätt där du slutade."
                      : "14 dagar Pro gratis. Ingen kortuppgift."}
              </p>
            </div>

            {confirmationEmail ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                  Klicka på länken i mejlet för att aktivera kontot och starta din Pro-period. Kontrollera skräpposten om mejlet inte syns inom några minuter.
                </div>
                <Button className="w-full" onClick={() => switchMode("login")}>
                  Gå till inloggning
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmationEmail(null)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Ändra e-postadress
                </button>
              </div>
            ) : (
              <>
                {source === "free_course_planner" && !resetMode && (
                  <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                    <strong className="mb-1 block text-foreground">Spara banan och fortsätt utvecklas</strong>
                    Skapa konto så kan du spara banor, logga pass och se statistik över utvecklingen.
                  </div>
                )}

                {source === "competitions" && guestInterestCount > 0 && !resetMode && (
                  <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                    <strong className="mb-1 flex items-center gap-2 text-foreground">
                      <CheckCircle2 size={16} className="text-primary" />
                      Vi har sparat dina {guestInterestCount} markering{guestInterestCount === 1 ? "" : "ar"}
                    </strong>
                    De kopplas automatiskt till ditt konto när du loggat in — ingenting går förlorat.
                  </div>
                )}

                <form onSubmit={handleSubmit} onFocus={markAuthStarted} className="space-y-4">
                  {resetMode ? (
                    <>
                      <div>
                        <Label htmlFor="reset-email">E-post</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          autoComplete="email"
                          placeholder="din@email.se"
                        />
                      </div>
                      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                        {loading ? "Skickar..." : "Skicka återställningslänk"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setResetMode(false)}
                        className="w-full text-center text-sm text-primary"
                      >
                        Tillbaka till inloggning
                      </button>
                    </>
                  ) : (
                    <>
                      {!isLogin && (
                        <div>
                          <Label htmlFor="display-name">
                            Namn <span className="font-normal text-muted-foreground">(valfritt)</span>
                          </Label>
                          <Input
                            id="display-name"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            autoComplete="name"
                            placeholder="Ditt namn"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="auth-email">E-post</Label>
                        <Input
                          id="auth-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          autoComplete="email"
                          inputMode="email"
                          placeholder="din@email.se"
                        />
                      </div>

                      <div>
                        <Label htmlFor="auth-password">Lösenord</Label>
                        <div className="relative">
                          <Input
                            id="auth-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={6}
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            placeholder={isLogin ? "Ditt lösenord" : "Minst 6 tecken"}
                            className="pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {!isLogin && (
                          <p className={`mt-1.5 text-xs ${password.length >= 6 ? "text-primary" : "text-muted-foreground"}`}>
                            {password.length >= 6 ? "✓ Lösenordet är tillräckligt långt" : "Minst 6 tecken"}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full gradient-primary text-primary-foreground"
                        disabled={loading || !email.trim() || !password || (!isLogin && password.length < 6)}
                      >
                        {loading ? "Vänta..." : isLogin ? "Logga in" : "Skapa konto gratis"}
                      </Button>

                      {!isLogin && (
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck size={14} className="text-primary" />
                          Ingen kortuppgift · 14 dagar Pro · gratisversion därefter
                        </div>
                      )}

                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => setResetMode(true)}
                          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          Glömt lösenord?
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => switchMode(isLogin ? "signup" : "login")}
                        className="w-full text-center text-sm text-primary"
                      >
                        {isLogin ? "Har du inget konto? Skapa ett gratis" : "Har du redan konto? Logga in"}
                      </button>

                      {!isLogin && (
                        <p className="text-center text-[11px] leading-5 text-muted-foreground">
                          Genom att skapa konto godkänner du våra villkor och vår{" "}
                          <Link to="/integritetspolicy" className="underline hover:text-foreground">
                            integritetspolicy
                          </Link>
                          .
                        </p>
                      )}
                    </>
                  )}
                </form>
              </>
            )}
          </motion.main>
        </div>
      </div>
    </>
  );
}
