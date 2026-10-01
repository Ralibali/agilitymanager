import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const icon = readFileSync('assets/app-icon.svg');
const render = (size, target) => sharp(icon).resize(size, size).png().toFile(target);

// Google Play requires a 512px, 32-bit PNG. Preserve the unchanged source mark.
await sharp(icon).resize(512, 512).ensureAlpha().png().toFile('assets/google-play-icon.png');

// Reuse the circle and paw from the source icon, without the orange icon tile
// or the obstacle below it. Crop to the circle's bounds so it sits centrally.
const splashMark = Buffer.from(icon.toString('utf8')
  .replace(/width="1024" height="1024" viewBox="0 0 1024 1024"/, 'width="630" height="630" viewBox="197 165 630 630"')
  .replace(/<rect\b[^>]*\/>/g, '')
  .replace(/<path\b[^>]*\bstroke=[^>]*\/>/g, ''));
let splashCount = 0;
async function renderSplash(width, height, target) {
  const markSize = Math.max(1, Math.round(Math.min(width, height) * 0.22));
  const mark = await sharp(splashMark).resize(markSize, markSize).png().toBuffer();
  await sharp({ create: { width, height, channels: 3, background: '#F4F0E6' } })
    .composite([{ input: mark, gravity: 'centre' }]).png().toFile(target);
  splashCount++;
}
if (existsSync('ios/App/App/Assets.xcassets')) {
  const dir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  mkdirSync(dir, { recursive: true });
  await sharp(icon).resize(1024, 1024).removeAlpha().png().toFile(`${dir}/AppIcon-512@2x.png`);
  const splashDir = 'ios/App/App/Assets.xcassets/Splash.imageset';
  if (existsSync(splashDir)) {
    for (const file of readdirSync(splashDir).filter(file => /^splash.*\.png$/.test(file)).sort()) {
      await renderSplash(2732, 2732, `${splashDir}/${file}`);
    }
  }
}
if (existsSync('android/app/src/main/res')) {
  const root = 'android/app/src/main/res';
  for (const [density, size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
    const dir = `${root}/mipmap-${density}`;
    mkdirSync(dir, { recursive: true });
    await render(size, `${dir}/ic_launcher.png`);
    await render(size, `${dir}/ic_launcher_round.png`);
  }
  // Adaptive icons keep the entire mark inside Android's safe zone.
  const foreground = `${root}/drawable/am_launcher_foreground.png`;
  const mark = await sharp(icon).resize(640, 640).png().toBuffer();
  await sharp({ create: { width:1024,height:1024,channels:4,background:'#FF9B32' } }).composite([{ input:mark,gravity:'centre' }]).png().toFile(foreground);
  const xml = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/icon_background"/><foreground android:drawable="@drawable/am_launcher_foreground"/></adaptive-icon>\n';
  writeFileSync(`${root}/mipmap-anydpi-v26/ic_launcher.xml`, xml);
  writeFileSync(`${root}/mipmap-anydpi-v26/ic_launcher_round.xml`, xml);
  writeFileSync(`${root}/values/icon_background.xml`, '<resources><color name="icon_background">#FF9B32</color></resources>\n');
  for (const dir of readdirSync(root).filter(dir => /^drawable(?:-|$)/.test(dir)).sort()) {
    const target = `${root}/${dir}/splash.png`;
    if (!existsSync(target)) continue;
    const { width, height } = await sharp(target).metadata();
    if (!width || !height) throw new Error(`Missing splash dimensions: ${target}`);
    // Keep each density/orientation resource at its existing resolution.
    await renderSplash(width, height, target);
  }
}
console.log(`Generated iOS, Android and Google Play icons and ${splashCount} branded splash resources from assets/app-icon.svg.`);
