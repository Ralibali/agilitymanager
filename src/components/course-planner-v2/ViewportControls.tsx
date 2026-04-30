/**
 * Viewport-kontroller (zoom, fit, fullscreen).
 * Flytande knappgrupp i nedre högra hörnet.
 */
import { useState, useRef, useEffect } from "react";
import { Plus, Minus, Maximize2, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZOOM_STEPS } from "@/features/course-planner-v2/useCanvasViewport";

interface ViewportControlsProps {
  zoom: number;
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (zoom: number) => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onToggleFullscreen: () => void;
}

export function ViewportControls(props: ViewportControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const btn = "w-10 h-10 grid place-items-center bg-card hover:bg-muted border border-border text-foreground/80 hover:text-foreground transition";

  return (
    <div ref={ref} className="absolute bottom-4 right-4 z-30 flex flex-col rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
      <button type="button" onClick={props.onZoomIn} title="Zooma in (Ctrl + +)" className={cn(btn, "rounded-t-xl")}>
        <Plus size={16} />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          title="Välj zoom-nivå"
          className={cn(btn, "border-t-0 text-[10px] font-bold tracking-tight")}
        >
          {Math.round(props.zoom * 100)}%
        </button>
        {menuOpen && (
          <div className="absolute right-full mr-2 bottom-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
            <button
              type="button"
              onClick={() => { props.onFitToScreen(); setMenuOpen(false); }}
              className="w-full px-3 py-2 text-left text-[12px] hover:bg-muted flex justify-between items-center gap-3"
            >
              <span>Anpassa till skärm</span>
              <span className="text-[10px] text-muted-foreground font-mono">Ctrl+1</span>
            </button>
            <div className="border-t border-border" />
            {ZOOM_STEPS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => { props.onZoomTo(z); setMenuOpen(false); }}
                className={cn(
                  "w-full px-3 py-2 text-left text-[12px] hover:bg-muted flex justify-between items-center gap-3",
                  Math.abs(z - props.zoom) < 0.01 && "bg-primary/10 text-primary font-semibold",
                )}
              >
                <span>{Math.round(z * 100)}%</span>
                {z === 1 && <span className="text-[10px] text-muted-foreground font-mono">Ctrl+0</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={props.onZoomOut} title="Zooma ut (Ctrl + −)" className={cn(btn, "border-t-0")}>
        <Minus size={16} />
      </button>
      <button type="button" onClick={props.onFitToScreen} title="Anpassa till skärm (Ctrl+1)" className={cn(btn, "border-t-0")}>
        <Maximize2 size={16} />
      </button>
      <button
        type="button"
        onClick={props.onToggleFullscreen}
        title={props.isFullscreen ? "Lämna helskärm (Esc)" : "Helskärmsläge (F)"}
        className={cn(btn, "border-t-0 rounded-b-xl")}
      >
        {props.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
}
