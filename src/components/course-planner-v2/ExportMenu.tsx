/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Export-meny: dropdown med fyra PDF-val + JSON export/import.
 */
import { ChevronDown, FileDown, Upload } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Props {
  onJudge: () => void;
  onTraining: () => void;
  onBuild: () => void;
  onStartlist: () => void;
  onJson: () => void;
  onImportJson: () => void;
  on3DView?: () => void;
  on3DWalk?: () => void;
}

export function ExportMenu({ onJudge, onTraining, onBuild, onStartlist, onJson, onImportJson, on3DView, on3DWalk }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-9 px-3 grid sm:inline-flex place-items-center sm:items-center rounded-full bg-white border border-black/10 text-[12px] font-semibold gap-1.5 hover:border-neutral-400"
          title="Exportera bana"
        >
          <FileDown size={14} />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown size={12} className="opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Exportera som PDF</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onJudge}>Domar-PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={onTraining}>Tränings-PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={onBuild}>Bygg-PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={onStartlist}>Startlista</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onJson}>Exportera JSON</DropdownMenuItem>
        <DropdownMenuItem onSelect={onImportJson}>
          <Upload size={13} className="mr-1.5" /> Importera JSON…
        </DropdownMenuItem>
        {(on3DView || on3DWalk) && <DropdownMenuSeparator />}
        {on3DView && <DropdownMenuItem onSelect={on3DView}>Visa 3D-vy</DropdownMenuItem>}
        {on3DWalk && <DropdownMenuItem onSelect={on3DWalk}>Gå banan (3D)</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
