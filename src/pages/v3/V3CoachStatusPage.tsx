import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight, Clock, Inbox, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type FeedbackRow = {
  id: string;
  question: string;
  sport: string;
  status: string;
  privacy_mode: string;
  coach_response: string | null;
  created_at: string;
};

type StepKey = "received" | "in_review" | "done";

function deriveStep(row: FeedbackRow): StepKey {
  if (row.coach_response && row.coach_response.length > 0) return "done";
  if (row.status === "in_review" || row.status === "analyzing") return "in_review";
  return "received";
}

const STEPS: Array<{ key: StepKey; label: string; icon: typeof Inbox }> = [
  { key: "received", label: "Mottagen", icon: Inbox },
  { key: "in_review", label: "Analyseras", icon: Loader2 },
  { key: "done", label: "Klar", icon: CheckCircle2 },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function V3CoachStatusPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("coach_feedback")
        .select("id, question, sport, status, privacy_mode, coach_response, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) setRows(data as unknown as FeedbackRow[]);
      setLoading(false);
    };
    load();

    // Realtime: uppdatera när coach svarar
    const channel = supabase
      .channel(`coach_feedback_status_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_feedback", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="max-w-[900px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <header className="space-y-2">
        <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
          Coach · Mina ärenden
        </div>
        <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary inline-flex items-center gap-3">
          <ClipboardList size={32} strokeWidth={1.6} className="text-v3-brand-500" />
          Status för dina videor
        </h1>
        <p className="text-v3-base text-v3-text-secondary max-w-xl">
          Följ var i processen din inskickade video befinner sig — mottagen, analyseras eller klar.
          Du får också en notis när coachen svarat.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          <div className="h-32 v3-skeleton rounded-v3-2xl" />
          <div className="h-32 v3-skeleton rounded-v3-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-v3-2xl border border-v3-border bg-v3-surface-1 p-8 text-center space-y-4">
          <div className="text-v3-text-secondary">Du har inte skickat in någon video ännu.</div>
          <Link
            to="/v3/coach"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-v3-xl bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors"
          >
            Skicka in en video
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const step = deriveStep(row);
            const stepIndex = STEPS.findIndex((s) => s.key === step);
            return (
              <li
                key={row.id}
                className="rounded-v3-2xl border border-v3-border bg-v3-surface-1 p-5 lg:p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
                      <Clock size={12} strokeWidth={2} />
                      {formatDate(row.created_at)} · {row.sport}
                      {row.privacy_mode === "private_no_export" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-v3-surface-2 text-v3-text-secondary">
                          <Lock size={10} strokeWidth={2} />
                          Privat · ej export
                        </span>
                      )}
                    </div>
                    <p className="text-v3-base text-v3-text-primary line-clamp-2 max-w-xl">
                      {row.question}
                    </p>
                  </div>
                  <Link
                    to="/v3/training"
                    className="text-v3-sm text-v3-brand-500 hover:text-v3-brand-600 inline-flex items-center gap-1 shrink-0"
                  >
                    Öppna
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Steg-indikator */}
                <div className="flex items-center gap-2 pt-1">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const reached = i <= stepIndex;
                    const active = i === stepIndex && step !== "done";
                    return (
                      <div key={s.key} className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            reached
                              ? "bg-v3-brand-500 text-white"
                              : "bg-v3-surface-2 text-v3-text-tertiary"
                          }`}
                          aria-current={active ? "step" : undefined}
                        >
                          <Icon
                            size={14}
                            strokeWidth={2}
                            className={active && s.key === "in_review" ? "animate-spin" : ""}
                          />
                        </div>
                        <div
                          className={`text-v3-xs leading-tight truncate ${
                            reached ? "text-v3-text-primary" : "text-v3-text-tertiary"
                          }`}
                        >
                          {s.label}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-px ${
                              i < stepIndex ? "bg-v3-brand-500" : "bg-v3-border"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {step === "done" && (
                  <div className="rounded-v3-xl bg-v3-brand-500/5 border border-v3-brand-500/20 p-4 text-v3-sm text-v3-text-primary">
                    Coachen har svarat. Öppna träningsvyn för att läsa svaret och ställa en eventuell följdfråga.
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
