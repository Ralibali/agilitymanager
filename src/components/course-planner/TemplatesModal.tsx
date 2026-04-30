/**
 * TemplatesModal – Fas 9C
 *
 * Modal med 3 inbyggda mallar (Tom, Nybörjare, Standard K1) och
 * användarens egna mallar (sparade i localStorage).
 *
 * Mallar lagras endast lokalt – delade mallar i databas är ett 9D/framtida steg.
 */
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ObstacleIconKey } from './obstacleIcons';

export interface TemplateObstacle {
  key: ObstacleIconKey;
  xM: number;
  yM: number;
  rotation: number;
  sizeM?: number;
  color?: string;
}

export interface CourseTemplate {
  id: string;
  name: string;
  description: string;
  obstacles: TemplateObstacle[];
  builtin?: boolean;
}

const STORAGE_KEY = 'course-planner-beta-templates-v1';

const BUILTIN_TEMPLATES: CourseTemplate[] = [
  {
    id: 'builtin-empty',
    name: 'Tom bana',
    description: 'Börja från noll – inga hinder utplacerade.',
    obstacles: [],
    builtin: true,
  },
  {
    id: 'builtin-beginner',
    name: 'Nybörjare',
    description: '8 grundhinder i en enkel slinga – perfekt för första passet.',
    builtin: true,
    obstacles: [
      { key: 'jump', xM: 8, yM: 8, rotation: 0 },
      { key: 'jump', xM: 14, yM: 8, rotation: 0 },
      { key: 'softTunnel', xM: 22, yM: 10, rotation: 0 },
      { key: 'jump', xM: 30, yM: 14, rotation: 90 },
      { key: 'jump', xM: 30, yM: 22, rotation: 90 },
      { key: 'softTunnel', xM: 22, yM: 28, rotation: 0 },
      { key: 'jump', xM: 14, yM: 32, rotation: 0 },
      { key: 'jump', xM: 8, yM: 32, rotation: 0 },
    ],
  },
  {
    id: 'builtin-k1',
    name: 'Standard K1',
    description: '15 hinder i klassisk K1-banflyt med kontaktfält.',
    builtin: true,
    obstacles: [
      { key: 'jump', xM: 6, yM: 8, rotation: 0 },
      { key: 'jump', xM: 12, yM: 8, rotation: 0 },
      { key: 'softTunnel', xM: 20, yM: 10, rotation: 0 },
      { key: 'aFrame', xM: 30, yM: 12, rotation: 0 },
      { key: 'jump', xM: 40, yM: 14, rotation: 45 },
      { key: 'weave12', xM: 38, yM: 22, rotation: 0 },
      { key: 'jump', xM: 30, yM: 26, rotation: 90 },
      { key: 'dogwalk', xM: 22, yM: 28, rotation: 0 },
      { key: 'jump', xM: 12, yM: 30, rotation: 0 },
      { key: 'tire', xM: 6, yM: 30, rotation: 0 },
      { key: 'jump', xM: 6, yM: 22, rotation: 0 },
      { key: 'rigidTunnel', xM: 14, yM: 18, rotation: 90 },
      { key: 'jump', xM: 24, yM: 18, rotation: 0 },
      { key: 'seesaw', xM: 34, yM: 30, rotation: 0 },
      { key: 'jump', xM: 44, yM: 30, rotation: 0 },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (template: CourseTemplate) => void;
  /** Nuvarande hinder – används vid "Spara som mall". Tom array = disable knappen. */
  currentObstacles: TemplateObstacle[];
}

export function TemplatesModal({ open, onClose, onApply, currentObstacles }: Props) {
  const [customTemplates, setCustomTemplates] = useState<CourseTemplate[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState('');

  // Ladda egna mallar från localStorage vid mount och när modal öppnas
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustomTemplates(JSON.parse(raw));
    } catch {
      setCustomTemplates([]);
    }
  }, [open]);

  const persistCustom = (next: CourseTemplate[]) => {
    setCustomTemplates(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  const handleSaveCurrent = () => {
    if (!newName.trim() || currentObstacles.length === 0) return;
    const tpl: CourseTemplate = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      description: `${currentObstacles.length} hinder`,
      obstacles: currentObstacles,
    };
    persistCustom([tpl, ...customTemplates]);
    setNewName('');
    setShowSaveForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    persistCustom(customTemplates.filter((t) => t.id !== id));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#1a6b3c]" />
            <h2 className="text-[15px] font-medium text-neutral-900">Välj mall</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
            aria-label="Stäng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Inbyggda mallar */}
          <section>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500 mb-2">
              Förvalda mallar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BUILTIN_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { onApply(tpl); onClose(); }}
                  className="group text-left bg-neutral-50 hover:bg-card hover:border-[#1a6b3c]/30 border border-transparent rounded-lg p-3 transition-all"
                >
                  <div className="text-[13px] font-medium text-neutral-900 mb-0.5">
                    {tpl.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-snug mb-2">
                    {tpl.description}
                  </div>
                  <div className="text-[10px] text-neutral-400 tabular-nums">
                    {tpl.obstacles.length} hinder
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Egna mallar */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                Mina mallar
              </h3>
              {!showSaveForm && (
                <button
                  onClick={() => setShowSaveForm(true)}
                  disabled={currentObstacles.length === 0}
                  className="text-[11px] text-[#1a6b3c] hover:underline disabled:text-neutral-300 disabled:no-underline flex items-center gap-1"
                  title={currentObstacles.length === 0 ? 'Lägg till hinder först' : 'Spara nuvarande bana som mall'}
                >
                  <Plus size={11} />
                  Spara nuvarande
                </button>
              )}
            </div>

            {showSaveForm && (
              <div className="bg-neutral-50 rounded-lg p-3 mb-2 flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mallens namn"
                  className="flex-1 px-2.5 py-1.5 text-[13px] border border-neutral-200 rounded-md focus:outline-none focus:border-[#1a6b3c]"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCurrent(); }}
                />
                <Button size="sm" onClick={handleSaveCurrent} disabled={!newName.trim()} className="h-8 text-[12px] bg-[#1a6b3c] hover:bg-[#155830]">
                  Spara
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowSaveForm(false); setNewName(''); }} className="h-8 text-[12px]">
                  Avbryt
                </Button>
              </div>
            )}

            {customTemplates.length === 0 ? (
              <p className="text-[12px] text-neutral-400 italic py-3">
                Du har inga egna mallar än. Bygg en bana och spara den här.
              </p>
            ) : (
              <div className="space-y-1.5">
                {customTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center gap-2 bg-neutral-50 hover:bg-card border border-transparent hover:border-neutral-200 rounded-lg px-3 py-2 transition-all"
                  >
                    <button
                      onClick={() => { onApply(tpl); onClose(); }}
                      className="flex-1 text-left"
                    >
                      <div className="text-[13px] text-neutral-900 font-medium">{tpl.name}</div>
                      <div className="text-[11px] text-neutral-500 tabular-nums">{tpl.obstacles.length} hinder</div>
                    </button>
                    <button
                      onClick={() => handleDeleteCustom(tpl.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label="Ta bort mall"
                      title="Ta bort"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
