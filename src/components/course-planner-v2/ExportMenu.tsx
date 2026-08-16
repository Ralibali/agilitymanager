/**
 * Banplaneraren v2 — Export-meny.
 * Mobile-first: tydlig knapp med text så användaren ser att banan kan laddas ner/importeras.
 *
 * Vattenmärke-toggle: gratisanvändare ser en låst "Premium"-badge.
 * Premium-användare kan slå av "agilitymanager.se-byline" i exporter.
 */
import { ChevronDown, FileDown, Upload, FileText, Box, Footprints, Share2, Lock } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface Props {
  onJudge: () => void;
  onTraining: () => void;
  onBuild: () => void;
  onStartlist: () => void;
  onJson: () => void;
  onImportJson: () => void;
  onShareImage?: () => void;
  on3DView?: () => void;
  on3DWalk?: () => void;
  /** Om användaren har aktiv premium — styr om vattenmärkes-checkboxen är låst. */
  isPremium?: boolean;
  /** Om byline-vattenmärket ska visas i exporten. Default = true. */
  showWatermark?: boolean;
  onToggleWatermark?: (next: boolean) => void;
  /** Anropas när en gratisanvändare klickar på "ta bort vattenstämpel". */
  onWatermarkUpsell?: () => void;
}

export function ExportMenu({
  onJudge, onTraining, onBuild, onStartlist, onJson, onImportJson,
  onShareImage, on3DView, on3DWalk,
  isPremium = false, showWatermark = true, onToggleWatermark, onWatermarkUpsell,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="course-planner-export-trigger inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-paper px-2.5 text-sm font-bold text-ink/70 transition hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:h-11 sm:px-3.5"
          title="Ladda ner eller exportera bana"
          aria-label="Ladda ner eller exportera bana"
        >
          <FileDown size={18} />
          <span className="hidden sm:inline">Ladda ner</span>
          <ChevronDown size={13} className="hidden opacity-70 sm:block" />

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
        {onShareImage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Dela</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onShareImage}>
              <Share2 size={14} className="mr-2" /> Dela som bild
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Vattenstämpel</DropdownMenuLabel>
        {isPremium && onToggleWatermark ? (
          <DropdownMenuCheckboxItem
            checked={showWatermark}
            onCheckedChange={(v) => onToggleWatermark(Boolean(v))}
            onSelect={(e) => e.preventDefault()}
          >
            Visa agilitymanager.se-stämpel
          </DropdownMenuCheckboxItem>
        ) : (
          <DropdownMenuItem onSelect={() => onWatermarkUpsell?.()}>
            <Lock size={12} className="mr-2" />
            <span className="flex-1">Exportera utan vattenstämpel</span>
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Betald
            </span>
          </DropdownMenuItem>
        )}
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
