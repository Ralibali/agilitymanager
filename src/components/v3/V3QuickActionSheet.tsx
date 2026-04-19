import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
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
          "absolute inset-x-0 bottom-0 bg-v3-canvas-elevated rounded-t-v3-2xl shadow-v3-xl",
          "pb-[env(safe-area-inset-bottom,0px)] animate-v3-sheet-in",
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <h2 className="font-v3-display text-[22px] text-v3-text-primary">Vad vill du logga?</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="h-8 w-8 grid place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/60 hover:text-v3-text-primary transition-colors"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>
        <p className="px-5 pb-4 text-v3-sm text-v3-text-secondary">
          Snabbgenväg till det du gör oftast.
        </p>
        <div className="px-3 pb-5 space-y-1.5">
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
                  "w-full flex items-center gap-3 rounded-v3-lg px-3 py-3 text-left",
                  "hover:bg-v3-canvas-secondary transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v3-brand-500/40",
                )}
              >
                <div className={cn("h-11 w-11 rounded-v3-lg grid place-items-center shrink-0", ACCENT_BG[a.accent])}>
                  <Icon size={20} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-v3-base font-medium text-v3-text-primary leading-tight">
                    {a.label}
                  </div>
                  <div className="text-v3-xs text-v3-text-tertiary mt-0.5">
                    {a.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
