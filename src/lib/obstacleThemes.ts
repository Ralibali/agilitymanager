/* ───── Obstacle Color Theme System ───── */

export type ObstacleColors = {
  body: string;       // main fill/stroke
  contact?: string;   // contact zone color (a_frame, dog_walk, seesaw, balance)
  accent?: string;    // secondary element (posts, stripes, frame)
  stroke?: string;    // outline/border
};

export type ObstacleTheme = {
  [type: string]: ObstacleColors;
};

export type SavedTheme = {
  name: string;
  theme: ObstacleTheme;
};

/* ─── Standard (realistic Swedish hall colors) ─── */
export const STANDARD_THEME: ObstacleTheme = {
  jump:      { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },          // röd bom, vita stöd
  long_jump: { body: 'hsl(215, 60%, 50%)', accent: 'hsl(0, 0%, 92%)' },          // blå/vit
  oxer:      { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },          // röd/vit
  wall:      { body: 'hsl(0, 0%, 70%)',    accent: 'hsl(0, 0%, 90%)' },          // grå/vit
  tunnel:    { body: 'hsl(42, 55%, 55%)',  accent: 'hsl(42, 40%, 40%)' },        // mörkgul/beige
  a_frame:   { body: 'hsl(50, 85%, 55%)', contact: 'hsl(0, 70%, 50%)',  stroke: 'hsl(50, 70%, 40%)' }, // gul, röd kontakt
  dog_walk:  { body: 'hsl(50, 85%, 55%)', contact: 'hsl(0, 70%, 50%)',  stroke: 'hsl(50, 70%, 40%)' }, // gul, röd kontakt (brygga = same as dog_walk typically)
  balance:   { body: 'hsl(215, 55%, 50%)', contact: 'hsl(50, 85%, 55%)', stroke: 'hsl(215, 45%, 38%)' }, // blå, gul kontakt
  seesaw:    { body: 'hsl(140, 50%, 42%)', contact: 'hsl(0, 70%, 50%)',  stroke: 'hsl(140, 40%, 32%)' }, // grön, röd kontakt
  weave:     { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },          // röd/vit
  tire:      { body: 'hsl(0, 0%, 15%)',    accent: 'hsl(50, 85%, 55%)' },        // svart, gul ram
  start:     { body: 'hsl(120, 60%, 35%)' },
  finish:    { body: 'hsl(0, 70%, 45%)' },
  // Hoopers
  hoop:           { body: 'hsl(50, 85%, 55%)',  accent: 'hsl(215, 60%, 50%)' },  // gul båge, blå ram
  hoopers_tunnel: { body: 'hsl(215, 55%, 50%)', accent: 'hsl(215, 40%, 70%)' },  // blå/grå
  barrel:         { body: 'hsl(215, 60%, 50%)', accent: 'hsl(215, 45%, 38%)' },  // blå
  gate:           { body: 'hsl(25, 85%, 55%)',  accent: 'hsl(25, 70%, 42%)' },   // orange
  handler_zone:   { body: 'hsl(0, 70%, 50%)' },
};

/* ─── Galican (popular Swedish manufacturer) ─── */
export const GALICAN_THEME: ObstacleTheme = {
  jump:      { body: 'hsl(215, 60%, 50%)', accent: 'hsl(0, 0%, 92%)' },          // blå/vit
  long_jump: { body: 'hsl(215, 60%, 50%)', accent: 'hsl(0, 0%, 92%)' },
  oxer:      { body: 'hsl(215, 60%, 50%)', accent: 'hsl(0, 0%, 92%)' },
  wall:      { body: 'hsl(0, 0%, 70%)',    accent: 'hsl(0, 0%, 90%)' },
  tunnel:    { body: 'hsl(0, 65%, 48%)',   accent: 'hsl(0, 50%, 35%)' },         // röd
  a_frame:   { body: 'hsl(0, 0%, 60%)',   contact: 'hsl(25, 85%, 55%)', stroke: 'hsl(0, 0%, 45%)' }, // grå, orange kontakt
  dog_walk:  { body: 'hsl(0, 0%, 60%)',   contact: 'hsl(25, 85%, 55%)', stroke: 'hsl(0, 0%, 45%)' },
  balance:   { body: 'hsl(0, 0%, 60%)',   contact: 'hsl(25, 85%, 55%)', stroke: 'hsl(0, 0%, 45%)' },
  seesaw:    { body: 'hsl(0, 0%, 60%)',   contact: 'hsl(25, 85%, 55%)', stroke: 'hsl(0, 0%, 45%)' },
  weave:     { body: 'hsl(215, 60%, 50%)', accent: 'hsl(0, 0%, 92%)' },
  tire:      { body: 'hsl(0, 0%, 20%)',    accent: 'hsl(25, 85%, 55%)' },
  start:     { body: 'hsl(120, 60%, 35%)' },
  finish:    { body: 'hsl(0, 70%, 45%)' },
};

/* ─── Bing (another common manufacturer) ─── */
export const BING_THEME: ObstacleTheme = {
  jump:      { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },          // röd/vit
  long_jump: { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },
  oxer:      { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },
  wall:      { body: 'hsl(0, 0%, 65%)',    accent: 'hsl(0, 0%, 85%)' },
  tunnel:    { body: 'hsl(50, 80%, 50%)',  accent: 'hsl(50, 60%, 38%)' },        // gul
  a_frame:   { body: 'hsl(215, 55%, 50%)', contact: 'hsl(50, 85%, 55%)', stroke: 'hsl(215, 45%, 38%)' }, // blå, gul kontakt
  dog_walk:  { body: 'hsl(215, 55%, 50%)', contact: 'hsl(50, 85%, 55%)', stroke: 'hsl(215, 45%, 38%)' },
  balance:   { body: 'hsl(215, 55%, 50%)', contact: 'hsl(50, 85%, 55%)', stroke: 'hsl(215, 45%, 38%)' },
  seesaw:    { body: 'hsl(215, 55%, 50%)', contact: 'hsl(50, 85%, 55%)', stroke: 'hsl(215, 45%, 38%)' },
  weave:     { body: 'hsl(0, 70%, 50%)',   accent: 'hsl(0, 0%, 92%)' },
  tire:      { body: 'hsl(0, 0%, 15%)',    accent: 'hsl(50, 85%, 55%)' },
  start:     { body: 'hsl(120, 60%, 35%)' },
  finish:    { body: 'hsl(0, 70%, 45%)' },
};

/* ─── Mörk hall (high contrast planning) ─── */
export const DARK_THEME: ObstacleTheme = {
  jump:      { body: 'hsl(0, 80%, 60%)',    accent: 'hsl(0, 0%, 95%)' },
  long_jump: { body: 'hsl(200, 80%, 60%)',  accent: 'hsl(0, 0%, 95%)' },
  oxer:      { body: 'hsl(30, 80%, 60%)',   accent: 'hsl(0, 0%, 95%)' },
  wall:      { body: 'hsl(0, 0%, 80%)',     accent: 'hsl(0, 0%, 95%)' },
  tunnel:    { body: 'hsl(50, 90%, 55%)',   accent: 'hsl(50, 70%, 40%)' },
  a_frame:   { body: 'hsl(50, 90%, 60%)',  contact: 'hsl(0, 85%, 60%)',  stroke: 'hsl(50, 80%, 45%)' },
  dog_walk:  { body: 'hsl(140, 70%, 55%)', contact: 'hsl(50, 90%, 60%)', stroke: 'hsl(140, 55%, 40%)' },
  balance:   { body: 'hsl(270, 65%, 60%)', contact: 'hsl(180, 80%, 55%)', stroke: 'hsl(270, 50%, 45%)' },
  seesaw:    { body: 'hsl(30, 80%, 55%)',  contact: 'hsl(340, 80%, 60%)', stroke: 'hsl(30, 65%, 40%)' },
  weave:     { body: 'hsl(320, 80%, 60%)', accent: 'hsl(0, 0%, 95%)' },
  tire:      { body: 'hsl(180, 70%, 55%)', accent: 'hsl(50, 90%, 60%)' },
  start:     { body: 'hsl(120, 75%, 50%)' },
  finish:    { body: 'hsl(0, 80%, 55%)' },
};

export const PRESET_THEMES: { id: string; label: string; theme: ObstacleTheme; darkCanvas?: boolean }[] = [
  { id: 'standard', label: 'Standard', theme: STANDARD_THEME },
  { id: 'galican',  label: 'Galican',  theme: GALICAN_THEME },
  { id: 'bing',     label: 'Bing',     theme: BING_THEME },
  { id: 'dark',     label: 'Mörk hall', theme: DARK_THEME, darkCanvas: true },
];

export function getObstacleColors(theme: ObstacleTheme, type: string): ObstacleColors {
  return theme[type] ?? { body: 'hsl(0, 0%, 50%)' };
}

const SAVED_THEMES_KEY = 'obstacle-custom-themes';
const ACTIVE_THEME_KEY = 'obstacle-active-theme';

export function loadSavedThemes(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(SAVED_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSavedThemes(themes: SavedTheme[]) {
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
}

export function loadActiveThemeId(): string {
  return localStorage.getItem(ACTIVE_THEME_KEY) ?? 'standard';
}

export function saveActiveThemeId(id: string) {
  localStorage.setItem(ACTIVE_THEME_KEY, id);
}

export function loadCustomOverrides(): ObstacleTheme {
  try {
    const raw = localStorage.getItem('obstacle-custom-overrides');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveCustomOverrides(overrides: ObstacleTheme) {
  localStorage.setItem('obstacle-custom-overrides', JSON.stringify(overrides));
}
