import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlannerProfile } from "@/lib/plannerProfile";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = [
  { id: "ide", label: "Idé / önskemål" },
  { id: "bugg", label: "Bugg" },
  { id: "hinder", label: "Hinder & regler" },
  { id: "annat", label: "Annat" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

/** Maxstorlek på bifogad bana — speglar migrationens policy-cap (60 kB). */
const MAX_SNAPSHOT_CHARS = 50_000;

/** Serialisera och storlekskapa en bansnapshot; hoppa över om den är för stor. */
function boundedSnapshot(courseData: unknown): unknown {
  try {
    const s = JSON.stringify(courseData);
    return s.length <= MAX_SNAPSHOT_CHARS ? courseData : null;
  } catch {
    return null;
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nuvarande bana — bifogas frivilligt som underlag. */
  courseData?: unknown;
};

export default function FeedbackDialog({ open, onOpenChange, courseData }: Props) {
  const { profile } = usePlannerProfile();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("ide");
  const [message, setMessage] = useState("");
  const [attach, setAttach] = useState(true);
  const [sending, setSending] = useState(false);

  // Fyll i namn/e-post från profilen när dialogen öppnas — justering under
  // render i stället för en effekt (undviker cascaderande renders).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName((n) => n || profile?.name || "");
      setEmail((e) => e || profile?.email || "");
    }
  }

  async function submit() {
    const text = message.trim();
    if (text.length < 3) {
      toast.error("Skriv några ord om vad du vill förbättra");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("planner_feedback").insert({
        name: name.trim() || null,
        email: email.trim() || null,
        category,
        message: text.slice(0, 4000),
        course_snapshot: attach ? (boundedSnapshot(courseData) as never) : null,
        page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      });
      if (error) {
        toast.error("Kunde inte skicka just nu — försök igen");
        return;
      }
      toast.success("Tack! Ditt förslag är skickat.");
      setMessage("");
      onOpenChange(false);
    } catch {
      toast.error("Kunde inte skicka just nu — försök igen");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-ink bg-paper">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wide">
            Hjälp oss göra banbyggaren bättre
          </DialogTitle>
          <DialogDescription className="text-ink/70">
            Banbyggaren är gratis just nu. Skicka in idéer, buggar eller material — vi
            läser allt och bygger vidare på det.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Typ av förslag">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full border-2 border-ink px-3 py-1.5 text-sm font-bold transition-colors ${
                  category === c.id ? "bg-forest text-paper" : "bg-paper hover:bg-cream"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Vad saknas? Vad krånglar? Vilka hinder eller funktioner vill du se?"
            aria-label="Ditt förslag eller felmeddelande"
            className="w-full rounded-xl border-2 border-ink bg-paper p-3 text-sm outline-none focus:border-forest"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Namn (frivilligt)"
              aria-label="Namn (frivilligt)"
              maxLength={80}
              className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
            />
            <input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-post (om du vill ha svar)"
              aria-label="E-post (om du vill ha svar)"
              maxLength={255}
              className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
            />
          </div>

          {courseData ? (
            <label className="flex items-start gap-2 rounded-xl bg-cream p-3 text-sm">
              <input
                type="checkbox"
                checked={attach}
                onChange={(e) => setAttach(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Bifoga min nuvarande bana som underlag — hjälper oss förstå exakt vad du menar.
              </span>
            </label>
          ) : null}

          <button
            onClick={() => void submit()}
            disabled={sending}
            className="pressable shadow-hard-sm inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-tang px-5 font-bold text-ink disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Skicka förslag
          </button>
          <p className="flex items-center gap-1.5 text-xs text-ink/55">
            <Sparkles className="h-3.5 w-3.5" /> Vi använder ditt material bara för att
            utveckla banbyggaren.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
