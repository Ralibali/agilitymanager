import { Hand, Hash, LayoutGrid, MoreHorizontal, MousePointer2, Plus, Redo2, ShieldCheck, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileTool = "select" | "number" | "pan";

interface Props {
  tool: "select" | "erase" | "number" | "measure" | "pan";
  onSetTool: (t: MobileTool) => void;
  onAddObstacle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onValidate: () => void;
  errorCount: number;
  warningCount: number;
  onMore: () => void;
}

/**
 * Sticky mobil bottom-dock. Endast synlig < lg. Bakom safe-area så knapparna
 * aldrig hamnar under hemknapps-bar/dynamic island.
 *
 * Knapparna är ≥ 44 × 44 px och organiserade i två grupper: primära
 * (Hinder / Välj / Numrera) + verktyg (Ångra / Gör om / Validera / Mer).
 */
export function MobileBottomDock({
  tool,
  onSetTool,
  onAddObstacle,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onValidate,
  errorCount,
  warningCount,
  onMore,
}: Props) {
  const issueLevel = errorCount > 0 ? "error" : warningCount > 0 ? "warn" : "ok";

  return (
    <nav
      aria-label="Banbyggarens mobilverktyg"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-2px_16px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.25rem)" }}
    >
      <div className="mx-auto max-w-4xl px-2 pt-2">
        <div className="grid grid-cols-7 gap-1">
          <DockButton
            label="Hinder"
            icon={<Plus size={20} strokeWidth={2.2} />}
            onClick={onAddObstacle}
            primary
          />
          <DockButton
            label="Välj"
            icon={<MousePointer2 size={18} />}
            onClick={() => onSetTool("select")}
            active={tool === "select"}
          />
          <DockButton
            label="Nr"
            icon={<Hash size={18} />}
            onClick={() => onSetTool("number")}
            active={tool === "number"}
          />
          <DockButton
            label="Ångra"
            icon={<Undo2 size={18} />}
            onClick={onUndo}
            disabled={!canUndo}
          />
          <DockButton
            label="Gör om"
            icon={<Redo2 size={18} />}
            onClick={onRedo}
            disabled={!canRedo}
          />
          <DockButton
            label="Regler"
            icon={<ShieldCheck size={18} />}
            onClick={onValidate}
            badge={
              issueLevel === "error"
                ? { text: String(errorCount), tone: "error" }
                : issueLevel === "warn"
                ? { text: String(warningCount), tone: "warn" }
                : undefined
            }
          />
          <DockButton
            label="Mer"
            icon={<MoreHorizontal size={18} />}
            onClick={onMore}
          />
        </div>
      </div>
    </nav>
  );
}

function DockButton({
  label,
  icon,
  onClick,
  active,
  primary,
  disabled,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
  badge?: { text: string; tone: "error" | "warn" };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold",
        "transition active:scale-95 disabled:opacity-40",
        primary
          ? "bg-primary text-primary-foreground shadow-sm"
          : active
          ? "bg-foreground/90 text-background"
          : "bg-transparent text-foreground hover:bg-muted",
      )}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span
          className={cn(
            "absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white",
            badge.tone === "error" ? "bg-red-600" : "bg-amber-500 text-black",
          )}
        >
          {badge.text}
        </span>
      )}
    </button>
  );
}

export default MobileBottomDock;

/** Ikon-export för sido-referens (används i "Mer"-arket). */
export const MobileDockLibraryIcon = LayoutGrid;
