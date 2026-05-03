/**
 * Banplaneraren v2 — Export-meny.
 * Mobile-first: tydlig knapp med text så användaren ser att banan kan laddas ner/importeras.
 */
import { ChevronDown, FileDown, Upload, FileText, Box, Footprints } from "lucide-react";
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
          type="button"
          className="course-planner-export-trigger inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 text-sm font-black text-slate-100 transition hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40 sm:h-9 sm:rounded-full sm:border-border sm:bg-card sm:px-3 sm:text-[12px] sm:font-semibold sm:text-foreground sm:hover:border-neutral-400"
          title="Ladda ner eller exportera bana"
          aria-label="Ladda ner eller exportera bana"
        >
          <FileDown size={16} />
          <span>Ladda ner</span>
          <ChevronDown size={13} className="opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Ladda ner som PDF</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onJudge}>
          <FileText size={14} className="mr-2" /> Domar-PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onTraining}>
          <FileText size={14} className="mr-2" /> Tränings-PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onBuild}>
          <FileText size={14} className="mr-2" /> Bygg-PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onStartlist}>
          <FileText size={14} className="mr-2" /> Startlista
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Backup och import</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onJson}>
          <FileDown size={14} className="mr-2" /> Exportera JSON
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onImportJson}>
          <Upload size={14} className="mr-2" /> Importera JSON…
        </DropdownMenuItem>
        {(on3DView || on3DWalk) && <DropdownMenuSeparator />}
        {(on3DView || on3DWalk) && <DropdownMenuLabel>Visa bana</DropdownMenuLabel>}
        {on3DView && <DropdownMenuItem onSelect={on3DView}><Box size={14} className="mr-2" /> Visa 3D-vy</DropdownMenuItem>}
        {on3DWalk && <DropdownMenuItem onSelect={on3DWalk}><Footprints size={14} className="mr-2" /> Gå banan i 3D</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
