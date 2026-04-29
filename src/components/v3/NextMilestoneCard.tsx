import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import type { NextMilestone } from "@/hooks/v3/useV3Milestones";
import ShareToFriendDialog from "@/components/ShareToFriendDialog";

interface NextMilestoneCardProps {
  /** Den närmst uppnåbara olåsta milstolpen */
  primary: NextMilestone;
  /** Övriga olåsta mål – visas som kompakta progress-rader under */
  others?: NextMilestone[];
}

function buildShareText(m: NextMilestone): string {
  const pct = Math.round(m.progress * 100);
  return `${m.emoji} Mitt nästa mål i AgilityManager: ${m.title} – ${m.current}/${m.target} (${pct}%). ${m.hint}!`;
}

/**
 * Visuell widget för nästa milstolpe.
 * Hero-kort med emoji, hint ("3 pass kvar till 100 träningspass") och
 * en stor progress-bar. Övriga olåsta mål staplas under som tunna rader
 * så användaren ser hela "stegen" framför sig.
 */
export function NextMilestoneCard({ primary, others = [] }: NextMilestoneCardProps) {
  const pct = Math.round(primary.progress * 100);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<NextMilestone>(primary);

  const handleShare = async (m: NextMilestone) => {
    const text = buildShareText(m);
    const shareData: ShareData = {
      title: "Mitt nästa mål",
      text,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };
    // Web Share API om tillgängligt (mobil), annars intern dialog
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Kopierat – välj en kompis att skicka till");
      } catch {
        // ignorera
      }
    }
    setShareTarget(m);
    setShareOpen(true);
  };

  return (
    <section
      aria-label="Nästa milstolpe"
      className="rounded-v3-2xl border border-v3-canvas-sunken/40 bg-gradient-to-br from-v3-brand-500/[0.06] via-v3-canvas-elevated to-v3-canvas-elevated p-5 sm:p-6 space-y-5"
    >
      {/* Eyebrow + emoji-hero */}
      <header className="flex items-start gap-4">
        <div
          className="shrink-0 h-14 w-14 rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 grid place-items-center text-[28px] leading-none shadow-sm"
          aria-hidden
        >
          {primary.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-v3-xs tracking-[0.04em] font-medium text-v3-text-tertiary">
            Nästa milstolpe · {primary.category}
          </p>
          <h3 className="font-v3-display text-v3-xl sm:text-v3-2xl text-v3-text-primary leading-tight mt-1">
            {primary.hint}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => handleShare(primary)}
          aria-label={`Dela milstolpe: ${primary.title}`}
          className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-v3-text-secondary hover:text-v3-brand-500 hover:bg-v3-brand-500/10 transition-colors"
        >
          <Share2 size={16} />
        </button>
      </header>

      {/* Progress-bar */}
      <div className="space-y-2">
        <div
          className="relative h-3 rounded-full bg-v3-canvas-sunken/60 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% mot ${primary.title}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-v3-brand-500 to-v3-brand-400 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-v3-xs text-v3-text-tertiary tabular-nums">
          <span>
            {primary.current} / {primary.target}
          </span>
          <span className="font-medium text-v3-text-secondary">{pct}%</span>
        </div>
      </div>

      {/* Övriga olåsta mål */}
      {others.length > 0 && (
        <ul className="space-y-2 pt-1 border-t border-v3-canvas-sunken/40">
          {others.map((m) => {
            const p = Math.round(m.progress * 100);
            return (
              <li key={m.id} className="flex items-center gap-3 pt-3">
                <span className="text-base leading-none shrink-0" aria-hidden>
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-v3-sm text-v3-text-primary truncate">{m.hint}</p>
                    <span className="text-v3-xs text-v3-text-tertiary tabular-nums shrink-0">
                      {m.current}/{m.target}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-v3-canvas-sunken/60 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={p}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-v3-brand-500/80 transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.max(2, p)}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleShare(m)}
                  aria-label={`Dela milstolpe: ${m.title}`}
                  className="shrink-0 h-8 w-8 -mr-1 rounded-full grid place-items-center text-v3-text-tertiary hover:text-v3-brand-500 hover:bg-v3-brand-500/10 transition-colors"
                >
                  <Share2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ShareToFriendDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        sharedType="training"
        sharedId={shareTarget.id}
        sharedData={{
          name: shareTarget.title,
          hint: shareTarget.hint,
          current: shareTarget.current,
          target: shareTarget.target,
          category: shareTarget.category,
          emoji: shareTarget.emoji,
          kind: "milestone",
        }}
      />
    </section>
  );
}
