import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Video, UploadCloud, CheckCircle2, X, ArrowLeft, ArrowRight, Loader2, Star, ShieldCheck, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type CoachPackId = "1" | "3" | "5";

export const COACH_PACKS: {
  id: CoachPackId; title: string; price: number; pro: number; sub: string; popular?: boolean;
}[] = [
  { id: "1", title: "1 video", price: 149, pro: 79, sub: "Perfekt att testa" },
  { id: "3", title: "3-pack", price: 399, pro: 199, sub: "Spara 50 kr", popular: true },
  { id: "5", title: "5-pack", price: 599, pro: 299, sub: "Bäst värde" },
];

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
type Sport = "agility" | "hoopers" | "freestyle";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPack?: CoachPackId;
}

type Step = 1 | 2 | 3 | 4;

export default function CoachUploadFlow({ open, onOpenChange, initialPack = "1" }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [pack, setPack] = useState<CoachPackId>(initialPack);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [sport, setSport] = useState<Sport>("agility");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset on open / pack change
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPack(initialPack);
    setProgress(0);
    setSubmitting(false);
  }, [open, initialPack]);

  // Object URL cleanup
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectedPack = COACH_PACKS.find((p) => p.id === pack)!;

  const handleFileChosen = (f: File | null) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(mp4|mov|webm|m4v)$/i)) {
      toast.error("Filformatet stöds inte. Använd MP4, MOV, WEBM eller M4V.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`Filen är för stor (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 20 MB.`);
      return;
    }
    setFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChosen(f);
  };

  const goNext = () => setStep((s) => Math.min(4, s + 1) as Step);
  const goBack = () => setStep((s) => Math.max(1, s - 1) as Step);

  const handleConfirmAndSubmit = async () => {
    if (!file || !question.trim()) {
      toast.error("Välj en video och skriv en fråga.");
      return;
    }

    // Måste vara inloggad innan vi kan ladda upp (RLS kräver auth.uid)
    if (!user) {
      // Spara intent och hoppa till auth
      try {
        sessionStorage.setItem("coach_intent", JSON.stringify({
          pack, sport, question: question.trim(), fileName: file.name, fileSize: file.size,
        }));
      } catch {}
      toast.message("Skapa ett gratis konto för att slutföra uppladdningen.");
      navigate(`/auth?redirect=/v3/coach&intent=coach&pack=${pack}`);
      return;
    }

    setSubmitting(true);
    setStep(4);

    try {
      // 1) Skapa Stripe-checkout om paketet inte redan är betalt
      const params = new URLSearchParams(window.location.search);
      const hasPaid = params.get("coach_paid") === "true";

      if (!hasPaid) {
        sessionStorage.setItem("coach_pending", JSON.stringify({
          pack, sport, question: question.trim(), fileName: file.name,
        }));
        const { data, error } = await supabase.functions.invoke("create-coach-payment", {
          body: { pack },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("Kunde inte starta betalningen.");
      }

      // 2) Ladda upp video (med fejkad progress för att inte blockera UI:t)
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const ticker = setInterval(() => setProgress((p) => Math.min(90, p + 7)), 250);
      const { error: uploadError } = await supabase.storage
        .from("training-videos")
        .upload(filePath, file, { contentType: file.type || "video/mp4" });
      clearInterval(ticker);
      if (uploadError) throw uploadError;
      setProgress(95);

      // 3) Skapa coach_feedback-rad
      const { error: insertError } = await supabase.from("coach_feedback").insert({
        user_id: user.id,
        video_url: filePath,
        question: question.trim(),
        sport,
        status: "pending",
      } as any);
      if (insertError) throw insertError;

      setProgress(100);
      toast.success("Video inskickad! Coachen återkommer med svar.");
      sessionStorage.removeItem("coach_pending");

      // Stäng efter en kort paus så användaren hinner se 100%
      setTimeout(() => {
        onOpenChange(false);
        setFile(null);
        setQuestion("");
        setStep(1);
      }, 800);
    } catch (e: any) {
      console.error("Coach submit error:", e);
      toast.error(e?.message || "Något gick fel. Försök igen.");
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white">
        {/* Header med stegindikator */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-black/5">
          <DialogTitle className="font-display text-[20px] text-forest">
            {step === 1 && "Välj paket"}
            {step === 2 && "Ladda upp din video"}
            {step === 3 && "Granska och bekräfta"}
            {step === 4 && (submitting ? "Skickar in…" : "Klart!")}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-text-secondary">
            Steg {step} av 4 · Coach Malin Öster svarar inom 5 arbetsdagar
          </DialogDescription>
          <StepDots step={step} />
        </DialogHeader>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <PackPicker pack={pack} onChange={setPack} />
          )}

          {step === 2 && (
            <VideoPicker
              file={file}
              previewUrl={previewUrl}
              onPick={() => inputRef.current?.click()}
              onClear={() => setFile(null)}
              onDrop={onDrop}
              inputRef={inputRef}
              onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
              question={question}
              setQuestion={setQuestion}
              sport={sport}
              setSport={setSport}
            />
          )}

          {step === 3 && (
            <ReviewStep pack={selectedPack} file={file!} question={question} sport={sport} />
          )}

          {step === 4 && (
            <SubmittingStep submitting={submitting} progress={progress} />
          )}
        </div>

        {/* Footer-knappar */}
        {step !== 4 && (
          <div className="px-6 py-4 border-t border-black/5 bg-cream/40 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={step === 1 ? () => onOpenChange(false) : goBack}
              className="h-10"
            >
              {step === 1 ? "Avbryt" : <><ArrowLeft size={14} className="mr-1" /> Tillbaka</>}
            </Button>

            {step === 1 && (
              <Button variant="brand" onClick={goNext} className="h-10">
                Fortsätt <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button
                variant="brand"
                onClick={goNext}
                disabled={!file || question.trim().length < 5}
                className="h-10"
              >
                Granska <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button variant="brand" onClick={handleConfirmAndSubmit} className="h-10">
                <Lock size={14} className="mr-1" /> Bekräfta &amp; betala
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- Sub-komponenter -------------------------- */

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5 mt-3" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? "w-6 bg-forest" : i < step ? "w-3 bg-forest/60" : "w-3 bg-stone/25"
          }`}
        />
      ))}
    </div>
  );
}

function PackPicker({ pack, onChange }: { pack: CoachPackId; onChange: (p: CoachPackId) => void }) {
  return (
    <RadioGroup value={pack} onValueChange={(v) => onChange(v as CoachPackId)} className="space-y-2.5">
      {COACH_PACKS.map((p) => {
        const checked = p.id === pack;
        return (
          <label
            key={p.id}
            htmlFor={`pack-${p.id}`}
            className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition ${
              checked ? "border-forest bg-forest/[0.04] ring-1 ring-forest/30" : "border-stone/15 bg-white hover:bg-cream/60"
            }`}
          >
            <RadioGroupItem id={`pack-${p.id}`} value={p.id} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-display text-[17px] text-forest">{p.title}</div>
                {p.popular && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                    <Star size={10} fill="currentColor" /> Populärast
                  </span>
                )}
              </div>
              <div className="text-[12px] text-stone mt-0.5">{p.sub}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-[20px] text-forest leading-none">{p.price} kr</div>
              <div className="text-[11px] text-stone mt-1">Pro: {p.pro} kr</div>
            </div>
          </label>
        );
      })}
      <p className="text-[12px] text-stone flex items-center gap-1.5 pt-1">
        <ShieldCheck size={13} /> Säker betalning via Stripe · Engångsbetalning, inget abonnemang
      </p>
    </RadioGroup>
  );
}

function VideoPicker({
  file, previewUrl, onPick, onClear, onDrop, inputRef, onChange, question, setQuestion, sport, setSport,
}: {
  file: File | null;
  previewUrl: string | null;
  onPick: () => void;
  onClear: () => void;
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  question: string;
  setQuestion: (v: string) => void;
  sport: Sport;
  setSport: (s: Sport) => void;
}) {
  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        id="coach-video-input"
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
        className="sr-only"
        onChange={onChange}
      />

      {!file ? (
        <label
          htmlFor="coach-video-input"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={(e) => { e.preventDefault(); onPick(); }}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone/30 bg-cream/40 p-8 cursor-pointer hover:bg-cream/70 transition"
        >
          <UploadCloud size={28} className="text-forest" />
          <div className="font-medium text-text-primary">Dra hit din video eller klicka för att välja</div>
          <div className="text-[12px] text-stone">MP4, MOV, WEBM eller M4V · Max 20 MB</div>
        </label>
      ) : (
        <div className="rounded-2xl border border-stone/15 bg-white p-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
              <Video size={18} className="text-forest" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary truncate">{file.name}</div>
              <div className="text-[12px] text-stone">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-full hover:bg-black/5 text-stone"
              aria-label="Ta bort"
            >
              <X size={14} />
            </button>
          </div>
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              className="mt-3 w-full max-h-56 rounded-xl bg-black"
            />
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="coach-sport" className="text-[13px] font-medium">Sport</Label>
        <div className="flex gap-2">
          {(["agility", "hoopers", "freestyle"] as Sport[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(s)}
              className={`px-3 h-9 rounded-full text-[13px] capitalize border transition ${
                sport === s ? "bg-forest text-white border-forest" : "bg-white text-text-secondary border-stone/20 hover:bg-cream/60"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coach-question" className="text-[13px] font-medium">Vad vill du ha feedback på?</Label>
        <Textarea
          id="coach-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 600))}
          rows={4}
          placeholder="T.ex. 'Hjälp mig med dirigering till hinder 5–6, hunden tvekar.'"
          className="resize-none"
        />
        <div className="text-[11px] text-stone text-right">{question.length}/600</div>
      </div>
    </div>
  );
}

function ReviewStep({
  pack, file, question, sport,
}: { pack: typeof COACH_PACKS[number]; file: File; question: string; sport: Sport }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone/15 bg-cream/40 p-4">
        <div className="text-[11px] tracking-wide font-medium text-stone uppercase mb-2">Din beställning</div>
        <Row label="Paket" value={`${pack.title} (${pack.price} kr · Pro ${pack.pro} kr)`} />
        <Row label="Sport" value={<span className="capitalize">{sport}</span>} />
        <Row label="Video" value={`${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`} />
        <div className="mt-3 pt-3 border-t border-stone/15">
          <div className="text-[11px] tracking-wide font-medium text-stone uppercase mb-1">Din fråga</div>
          <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">{question}</p>
        </div>
      </div>

      <ul className="space-y-2 text-[13px] text-text-secondary">
        <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-forest mt-0.5 shrink-0" /> Du betalar via Stripe — inget dras innan du bekräftat.</li>
        <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-forest mt-0.5 shrink-0" /> Videon laddas upp först efter bekräftad betalning.</li>
        <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-forest mt-0.5 shrink-0" /> Svar inom 5 arbetsdagar — annars full återbetalning.</li>
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <div className="text-[12px] text-stone">{label}</div>
      <div className="text-[14px] text-text-primary font-medium text-right">{value}</div>
    </div>
  );
}

function SubmittingStep({ submitting, progress }: { submitting: boolean; progress: number }) {
  return (
    <div className="py-8 flex flex-col items-center text-center gap-4">
      {submitting ? (
        <>
          <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center">
            <Loader2 size={26} className="text-forest animate-spin" />
          </div>
          <div className="font-display text-[18px] text-forest">Skickar in…</div>
          <p className="text-[13px] text-text-secondary max-w-xs">
            Vi skickar dig vidare till säker betalning. Lämna inte sidan.
          </p>
          <div className="w-full max-w-xs">
            <Progress value={progress} className="h-2" />
          </div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-forest" />
          </div>
          <div className="font-display text-[20px] text-forest">Allt klart!</div>
          <p className="text-[13px] text-text-secondary max-w-xs">
            Din video är inskickad. Du får en notis när coachen svarat.
          </p>
        </>
      )}
    </div>
  );
}
