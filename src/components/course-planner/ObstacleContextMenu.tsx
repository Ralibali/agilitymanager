/**
 * ObstacleContextMenu – Fas 9C
 *
 * Kontextmeny som visas vid höger-klick på ett hinder på canvas.
 * Stänger automatiskt vid klick utanför eller ESC.
 */
import { useEffect, useRef } from 'react';
import { Copy, RotateCw, Trash2, Lock, Unlock } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  isLocked: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onRotate90: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

export function ObstacleContextMenu({
  x, y, isLocked, onClose, onDuplicate, onRotate90, onToggleLock, onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Litet timeout så att triggande right-click inte stänger direkt
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Justera position så menyn aldrig hamnar utanför viewport
  const menuW = 180;
  const menuH = 170;
  const adjX = Math.min(x, window.innerWidth - menuW - 8);
  const adjY = Math.min(y, window.innerHeight - menuH - 8);

  const item = "w-full px-3 py-1.5 text-[12px] text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors";

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border border-border/[0.08] rounded-md shadow-lg py-1 min-w-[180px]"
      style={{ left: adjX, top: adjY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button onClick={() => { onDuplicate(); onClose(); }} className={`${item} text-neutral-800`}>
        <Copy size={12} />
        Duplicera
        <span className="ml-auto text-[10px] text-neutral-400">⌘D</span>
      </button>
      <button onClick={() => { onRotate90(); onClose(); }} className={`${item} text-neutral-800`}>
        <RotateCw size={12} />
        Rotera 90°
        <span className="ml-auto text-[10px] text-neutral-400">R</span>
      </button>
      <button onClick={() => { onToggleLock(); onClose(); }} className={`${item} text-neutral-800`}>
        {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
        {isLocked ? 'Lås upp' : 'Lås position'}
      </button>
      <div className="border-t border-neutral-100 my-1" />
      <button onClick={() => { onDelete(); onClose(); }} className={`${item} text-red-600 hover:bg-red-50`}>
        <Trash2 size={12} />
        Ta bort
        <span className="ml-auto text-[10px] text-neutral-400">⌫</span>
      </button>
    </div>
  );
}
