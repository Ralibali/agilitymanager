import { readFileSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

renameSync('dist-native/mobile.html', 'dist-native/index.html');
const html = readFileSync('dist-native/index.html', 'utf8');
if (!html.includes('viewport-fit=cover') || /fonts\.googleapis|googletagmanager/.test(html)) {
  throw new Error('Native HTML must include safe areas and no external font/analytics scripts.');
}
for (const file of readdirSync('dist-native/assets')) {
  if (!file.endsWith('.js')) continue;
  const text = readFileSync(join('dist-native/assets', file), 'utf8');
  if (/googletagmanager\.com|google-analytics\.com|supabase\.co|\/auth\/v1|\/functions\/v1\/planner-social|Spara & dela publikt/.test(text)) {
    throw new Error(`Website analytics, backend or community code leaked into standalone native bundle: ${file}`);
  }
}
console.log('Native bundle verified: packaged HTML, local fonts, no analytics/backend/community loader.');
