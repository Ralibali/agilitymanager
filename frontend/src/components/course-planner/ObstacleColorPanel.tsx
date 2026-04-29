import { useState } from 'react';
import { Palette, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  PRESET_THEMES,
  STANDARD_THEME,
  loadSavedThemes,
  saveSavedThemes,
  type ObstacleTheme,
  type ObstacleColors,
  type SavedTheme,
} from '@/lib/obstacleThemes';

const OBSTACLE_TYPE_LABELS: { type: string; label: string }[] = [
  { type: 'jump', label: 'Hopp' },
  { type: 'a_frame', label: 'A-hinder' },
  { type: 'dog_walk', label: 'Brygga' },
  { type: 'balance', label: 'Balansbom' },
  { type: 'seesaw', label: 'Vipp' },
  { type: 'weave', label: 'Slalom' },
  { type: 'tunnel', label: 'Tunnel' },
  { type: 'tire', label: 'Däck' },
  { type: 'wall', label: 'Mur' },
  { type: 'long_jump', label: 'Längdhopp' },
  { type: 'oxer', label: 'Oxer' },
];

interface Props {
  activeThemeId: string;
  currentTheme: ObstacleTheme;
  customOverrides: ObstacleTheme;
  onSelectPreset: (id: string) => void;
  onSetTypeColor: (type: string, field: keyof ObstacleColors, color: string) => void;
  onResetAll: () => void;
  onClose: () => void;
}

export default function ObstacleColorPanel({
  activeThemeId,
  currentTheme,
  customOverrides,
  onSelectPreset,
  onSetTypeColor,
  onResetAll,
  onClose,
}: Props) {
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(loadSavedThemes);
  const [saveName, setSaveName] = useState('');
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = saveName.trim();
    if (!trimmed) { toast.error('Ange ett namn'); return; }
    if (savedThemes.length >= 3) { toast.error('Max 3 sparade teman'); return; }
    const merged: ObstacleTheme = {};
    for (const key of Object.keys(STANDARD_THEME)) {
      merged[key] = currentTheme[key] ?? STANDARD_THEME[key];
    }
    const updated = [...savedThemes, { name: trimmed, theme: merged }];
    saveSavedThemes(updated);
    setSavedThemes(updated);
    setSaveName('');
    toast.success(`Tema "${trimmed}" sparat`);
  };

  const handleDeleteSaved = (idx: number) => {
    const updated = savedThemes.filter((_, i) => i !== idx);
    saveSavedThemes(updated);
    setSavedThemes(updated);
    toast.success('Tema raderat');
  };

  const handleLoadSaved = (t: SavedTheme) => {
    onSelectPreset('custom:' + t.name);
    // Apply all colors from saved theme
    for (const [type, colors] of Object.entries(t.theme)) {
      if (colors.body) onSetTypeColor(type, 'body', colors.body);
      if (colors.contact) onSetTypeColor(type, 'contact', colors.contact);
      if (colors.accent) onSetTypeColor(type, 'accent', colors.accent);
      if (colors.stroke) onSetTypeColor(type, 'stroke', colors.stroke);
    }
  };

  const getColor = (type: string, field: keyof ObstacleColors): string => {
    return (currentTheme[type]?.[field] as string) ?? '';
  };

  const hasContact = (type: string) => ['a_frame', 'dog_walk', 'balance', 'seesaw'].includes(type);

  return (
    <div className="bg-card rounded-lg p-3 shadow-card border border-border mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Hinderfärger</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Preset theme buttons */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {PRESET_THEMES.map(p => (
          <button
            key={p.id}
            onClick={() => onSelectPreset(p.id)}
            className={`text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
              activeThemeId === p.id
                ? 'bg-primary/15 border-primary text-primary font-medium'
                : 'bg-secondary border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Saved custom themes */}
      {savedThemes.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sparade teman</span>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {savedThemes.map((t, i) => (
              <div key={i} className="flex items-center gap-0.5">
                <button
                  onClick={() => handleLoadSaved(t)}
                  className="text-[11px] px-2 py-1 rounded-l-md border border-border bg-secondary text-muted-foreground hover:border-primary/50"
                >
                  {t.name}
                </button>
                <button
                  onClick={() => handleDeleteSaved(i)}
                  className="text-[11px] px-1 py-1 rounded-r-md border border-l-0 border-border bg-secondary text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-type color list */}
      <div className="space-y-1 mb-3 max-h-[280px] overflow-y-auto">
        {OBSTACLE_TYPE_LABELS.map(({ type, label }) => {
          const bodyColor = getColor(type, 'body');
          const contactColor = getColor(type, 'contact');
          const isExpanded = expandedType === type;
          const isOverridden = type in customOverrides;

          return (
            <div key={type}>
              <button
                onClick={() => setExpandedType(isExpanded ? null : type)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                  isExpanded ? 'bg-primary/5 border border-primary/20' : 'hover:bg-secondary border border-transparent'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
                  style={{ backgroundColor: bodyColor }}
                />
                {hasContact(type) && contactColor && (
                  <span
                    className="w-3 h-3 rounded-full border border-border/50 flex-shrink-0 -ml-3 mt-2"
                    style={{ backgroundColor: contactColor }}
                  />
                )}
                <span className="text-xs text-foreground flex-1">{label}</span>
                {isOverridden && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">Anpassad</span>
                )}
              </button>

              {isExpanded && (
                <div className="ml-2 pl-4 border-l-2 border-primary/20 py-2 space-y-2">
                  <ColorRow
                    label="Huvudfärg"
                    color={bodyColor}
                    onChange={(c) => onSetTypeColor(type, 'body', c)}
                  />
                  {hasContact(type) && (
                    <ColorRow
                      label="Kontaktfält"
                      color={contactColor}
                      onChange={(c) => onSetTypeColor(type, 'contact', c)}
                    />
                  )}
                  {!hasContact(type) && getColor(type, 'accent') && (
                    <ColorRow
                      label="Accent"
                      color={getColor(type, 'accent')}
                      onChange={(c) => onSetTypeColor(type, 'accent', c)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={onResetAll}>
          <RotateCcw size={12} /> Återställ
        </Button>
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Temanamn..."
            className="h-7 text-xs flex-1"
            maxLength={20}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={handleSave}
            disabled={savedThemes.length >= 3}
          >
            <Save size={12} /> Spara
          </Button>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, color, onChange }: { label: string; color: string; onChange: (c: string) => void }) {
  // Convert HSL string to hex for the input
  const hexFromHsl = (hsl: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = hsl;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const hexColor = color ? hexFromHsl(color) : '#888888';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-16">{label}</span>
      <label className="relative cursor-pointer">
        <span
          className="block w-6 h-6 rounded-md border border-border/50 shadow-sm"
          style={{ backgroundColor: color || '#888' }}
        />
        <input
          type="color"
          value={hexColor}
          onChange={(e) => {
            // Convert hex to hsl-ish for consistency — just use the hex directly
            onChange(e.target.value);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <span className="text-[10px] text-muted-foreground font-mono">{hexColor}</span>
    </div>
  );
}
