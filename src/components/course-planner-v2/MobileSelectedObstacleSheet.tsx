import { RotateCcw, RotateCw, Copy, Trash2, Lock, Unlock, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ObstacleTypeV2 } from "@/features/course-planner-v2/config";

interface Obstacle {
  id: string;
  type: ObstacleTypeV2;
  number?: number;
  locked?: boolean;
  curveDeg?: number;
  curveSide?: "left" | "right";
}

interface Props {
  obstacle: Obstacle;
  label: string;
  onRotate: (deg: number) => void;
  onNumber: (n: number | undefined) => void;
  onToggleLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTunnelCurve?: (patch: { curveDeg?: number; curveSide?: "left" | "right" }) => void;
  onClose: () => void;
}

/**
 * Kompakt, non-modal action-panel för det markerade hindret på mobil.
 *
 * - Placeras strax ovanför MobileBottomDock och respekterar safe-area.
 * - Täcker inte hela canvasen — max ~40dvh — så användaren fortfarande ser
 *   hindret medan hen justerar.
 * - Alla touch-targets minst 44 CSS-px.
 */
export function MobileSelectedObstacleSheet({
  obstacle,
  label,
  onRotate,
  onNumber,
  onToggleLock,
  onDuplicate,
  onDelete,
  onTunnelCurve,
  onClose,
}: Props) {
  const isTunnel = obstacle.type === "tunnel";
  const num = obstacle.number;
  const locked = !!obstacle.locked;

  return (
    <div
      role="dialog"
      aria-label={`Redigera ${label}`}
      className="lg:hidden fixed inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
      style={{
        // Docken är ca 72px hög + safe-area. Lägg oss precis ovanpå den.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
        maxHeight: "40dvh",
      }}
    >
      <div className="mx-auto max-w-4xl px-3 pt-2 pb-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Markerat hinder
            </div>
            <div className="truncate text-[14px] font-semibold text-foreground">
              {label}
              {num != null && <span className="ml-2 text-primary">#{num}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Rotation */}
        <div className="mb-2 grid grid-cols-3 gap-2">
          <ActionBtn onClick={() => onRotate(-15)} disabled={locked} icon={<RotateCcw size={16} />} label="−15°" />
          <ActionBtn onClick={() => onRotate(15)} disabled={locked} icon={<RotateCw size={16} />} label="+15°" />
          <ActionBtn onClick={() => onRotate(90)} disabled={locked} icon={<RotateCw size={16} />} label="+90°" />
        </div>

        {/* Nummer + åtgärder */}
        <div className="mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1">
            <button
              type="button"
              onClick={() => onNumber(num && num > 1 ? num - 1 : undefined)}
              disabled={locked}
              aria-label="Sänk nummer"
              className="grid h-11 w-11 place-items-center rounded-lg text-foreground/80 disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <div className="min-w-10 text-center text-[14px] font-semibold tabular-nums">
              {num ?? "—"}
            </div>
            <button
              type="button"
              onClick={() => onNumber((num ?? 0) + 1)}
              disabled={locked}
              aria-label="Höj nummer"
              className="grid h-11 w-11 place-items-center rounded-lg text-foreground/80 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
          <ActionBtn onClick={onToggleLock} icon={locked ? <Unlock size={16} /> : <Lock size={16} />} label={locked ? "Lås upp" : "Lås"} />
          <ActionBtn onClick={onDuplicate} disabled={locked} icon={<Copy size={16} />} label="Dubbla" />
        </div>

        {/* Tunnel-curve */}
        {isTunnel && onTunnelCurve && (
          <div className="mb-2 rounded-xl border border-border bg-background p-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Tunnelböjning</span>
              <span className="font-semibold text-foreground/80">{obstacle.curveDeg ?? 0}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={obstacle.curveDeg ?? 0}
              onChange={(e) => onTunnelCurve({ curveDeg: Number(e.target.value) })}
              disabled={locked}
              aria-label="Tunnelböjning i grader"
              className="w-full"
            />
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onTunnelCurve({ curveSide: "left" })}
                disabled={locked}
                aria-pressed={obstacle.curveSide === "left"}
                className={cn(
                  "h-11 rounded-lg text-[12px] font-semibold border",
                  obstacle.curveSide === "left"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/80 border-border",
                )}
              >
                Böj vänster
              </button>
              <button
                type="button"
                onClick={() => onTunnelCurve({ curveSide: "right" })}
                disabled={locked}
                aria-pressed={obstacle.curveSide !== "left"}
                className={cn(
                  "h-11 rounded-lg text-[12px] font-semibold border",
                  obstacle.curveSide !== "left"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/80 border-border",
                )}
              >
                Böj höger
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={locked}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-[13px] font-semibold text-destructive disabled:opacity-40"
        >
          <Trash2 size={16} /> Radera hinder
        </button>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 text-[12px] font-semibold text-foreground/90 disabled:opacity-40 active:scale-[0.97]"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default MobileSelectedObstacleSheet;
