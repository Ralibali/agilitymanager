import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, X } from "lucide-react";
import { V3_QUICK_ACTIONS } from "./navConfig";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Specialfall: 'log-training' öppnar inline-sheet istället för att navigera. */
  onLogTraining?: () => void;
}

const ACCENT_BG: Record<string, string> = {
  traning: "bg-v3-accent-traning/12 text-v3-accent-traning",
  tavlings: "bg-v3-accent-tavlings/12 text-v3-accent-tavlings",
  prestation: "bg-v3-accent-prestation/12 text-v3-accent-prestation",
  halsa: "bg-v3-accent-halsa/12 text-v3-accent-halsa",
};

/**
 * Quick-action bottom-sheet som öppnas från FAB.
 * Stänger på ESC, backdrop-klick, eller efter val.
 */
export function V3QuickActionSheet({ open, onClose, onLogTraining }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] font-v3-sans" role="dialog" aria-modal="true" aria-label="Snabbåtgärder">
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-v3-text-primary/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-v3-canvas-elevated rounded-t-v3-2xl shadow-v3-xl overflow-hidden",
          "pb-[env(safe-area-inset-bottom,0px)] animate-v3-sheet-in",
        )}
      >
        <div className="relative bg-v3-text-primary text-v3-text-inverse px-5 pt-4 pb-5">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-v3-brand-500/20" />
          <div className="relative flex justify-center pb-3">
            <span className="h-1 w-9 rounded-full bg-white/25" />
          </div>
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-white/70 mb-3">
                <Heart size={12} /> Teamets nästa steg
              </div>
              <h2 className="font-v3-display text-[26px] leading-tight text-white">Vad vill du fånga nu?</h2>
              <p className="text-v3-sm text-white/68 mt-1 max-w-sm">
                Logga medan känslan är färsk — passet, målet, tävlingen eller hälsan.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Stäng"
              className="h-8 w-8 grid place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            >
              <X size={16} strokeWidth={1.6} />
            </button>
          </div>
        </div>
        <div className="px-3 py-4 space-y-1.5">
          {V3_QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  if (a.id === "log-training" && onLogTraining) {
                    onLogTraining();
                    return;
                  }
                  onClose();
                  navigate(a.path);
                }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-v3-xl px-3 py-3 text-left",
                  "hover:bg-v3-canvas-secondary active:bg-v3-canvas-sunken/60 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v3-brand-500/40",
                )}
              >
                <div className={cn("h-12 w-12 rounded-v3-xl grid place-items-center shrink-0", ACCENT_BG[a.accent])}>
                  <Icon size={21} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-v3-base font-medium text-v3-text-primary leading-tight">
                    {a.label}
                  </div>
                  <div className="text-v3-xs text-v3-text-tertiary mt-0.5 leading-relaxed">
                    {a.description}
                  </div>
                </div>
                <span className="text-v3-text-tertiary text-v3-lg" aria-hidden>›</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
