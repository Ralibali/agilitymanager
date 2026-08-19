/**
 * Banplaneraren — meny för att spara och öppna banor.
 *
 * Visar sparstatus ("Sparad 14:03" / "Osparade ändringar") så att det syns
 * direkt efter att hinder har flyttats.
 */
import { FilePlus2, FolderOpen, Save, SaveAll, Loader2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onNew: () => void;
  /** Finns osparade ändringar sedan senaste explicita sparning? */
  dirty: boolean;
  /** ISO-tid för senaste explicita sparning. */
  lastSavedAt: string | null;
  saving?: boolean;
}

function timeLabel(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function CourseMenu({ onSave, onSaveAs, onOpen, onNew, dirty, lastSavedAt, saving }: Props) {
  const t = timeLabel(lastSavedAt);
  const status = saving ? "Sparar…" : dirty ? "Osparade ändringar" : t ? `Sparad ${t}` : "Inte sparad än";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={`Spara och öppna banor — ${status}`}
          aria-label={`Bana-meny. ${status}`}
          className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border-2 border-ink/15 bg-paper px-2.5 text-sm font-bold text-ink/70 transition-all hover:border-ink hover:text-ink sm:h-11 sm:px-3.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Bana</span>
          {dirty && !saving && (
            <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-tang" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-2 border-ink bg-paper">
        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-ink/50">
          {status}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={onSave} className="min-h-11 font-semibold">
          <Save className="mr-2 h-4 w-4" /> Spara bana
          <span className="ml-auto text-xs text-ink/40">Ctrl+S</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSaveAs} className="min-h-11 font-semibold">
          <SaveAll className="mr-2 h-4 w-4" /> Spara som…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpen} className="min-h-11 font-semibold">
          <FolderOpen className="mr-2 h-4 w-4" /> Öppna bana…
          <span className="ml-auto text-xs text-ink/40">Ctrl+O</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNew} className="min-h-11 font-semibold">
          <FilePlus2 className="mr-2 h-4 w-4" /> Ny bana
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
