import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const requested = process.argv.slice(2);
const platforms = requested.length ? requested : ['ios', 'android'];
for (const platform of platforms) {
  if (!['ios', 'android'].includes(platform)) throw new Error('Use ios or android');
  const cap = (...args) => execFileSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', ...args], { stdio: 'inherit' });
  if (!existsSync(platform)) cap('add', platform);
  cap('sync', platform);
}
execFileSync(process.execPath, ['scripts/native-configure.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/native-assets.mjs'], { stdio: 'inherit' });
