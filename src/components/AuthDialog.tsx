import { authErrorMessage, confirmationRedirect } from "@/lib/authMessages";
import { ResendConfirmation } from "@/components/ResendConfirmation";
import { useState } from "react";
import { LogIn, Mail, Lock, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/**
 * Inloggning/konto — behövs bara för molnlagring, kommentarer och
 * klubbdelning. Att rita och dela banor via länk är alltid fritt.
 */
export function AuthDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onOpenChange(false);
        onDone?.();
      } else {
        if (password.length < 8) { setError("Välj ett lösenord med minst 8 tecken."); return; }
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: confirmationRedirect() } });
        if (error) throw error;
        // Supabase can return an empty identities array for an existing account.
        if (data.user && data.user.identities?.length !== 0) track("account_created");
        setNotice("Kolla din e-post — bekräfta kontot och logga sedan in.");
        setMode("login");
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-ink bg-paper sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl uppercase tracking-wide">
            {mode === "login" ? "Logga in" : "Skapa konto"}
          </DialogTitle>
          <DialogDescription className="text-ink/60">
            Kontot är gratis och behövs bara för att spara banor i molnet,
            kommentera och dela med din klubb.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-2 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">
              <Mail className="h-3.5 w-3.5" /> E-post
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@klubben.se"
              className="h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-4 outline-none transition-colors focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">
              <Lock className="h-3.5 w-3.5" /> Lösenord
            </span>
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Minst 8 tecken" : "Ditt lösenord"}
              className="h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-4 outline-none transition-colors focus:border-ink"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl border-2 border-ember/40 bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl border-2 border-forest/40 bg-forest/10 px-3 py-2 text-sm font-semibold text-forest">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="pressable shadow-hard-sm flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-tang font-bold text-ink disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === "login" ? "Logga in" : "Skapa gratis konto"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setNotice(null);
            }}
            className="w-full text-center text-sm font-semibold text-ink/60 underline-offset-4 hover:text-ink hover:underline"
          >
            {mode === "login" ? "Inget konto? Skapa ett här" : "Har du redan ett konto? Logga in"}
          </button>
        </form>
        <button type="button" className="text-sm underline" onClick={() => setResendOpen(v => !v)}>Saknar du bekräftelsemejlet?</button>
        {resendOpen && <ResendConfirmation key={email} initialEmail={email} />}
      </DialogContent>
    </Dialog>
  );
}
