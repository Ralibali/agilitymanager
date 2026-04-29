/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Export-meny: dropdown med fyra PDF-val + JSON.
 */
import { ChevronDown, FileDown } from "lucide-react";
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
}

export function ExportMenu({ onJudge, onTraining, onBuild, onStartlist, onJson }: Props) {
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
        <DropdownMenuItem onSelect={onJson}>JSON (rådata)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
