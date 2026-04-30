#!/usr/bin/env node
/**
 * Skannar src/ efter hårdkodade färger som borde vara designtokens.
 *
 * Vad vi flaggar:
 *   - Hex-litteraler i className/JSX (t.ex. bg-[#1a6b3c], text-[#fff], border-[#c85d1e])
 *   - Råa Tailwind-färger som kringgår tokens (bg-white, text-white, bg-black,
 *     bg-neutral-*, bg-gray-*, bg-slate-50/100, etc.)
 *
 * Vad vi INTE flaggar:
 *   - SVG-attribut (fill="#..", stroke="#..") — banytan/PDF-export är medvetet hårdkodad
 *   - Tailwind-säkra accenter (amber-500, primary, destructive, etc.)
 *   - Filer i ALLOWLIST (canvas, PDF, 3D, free-planner light-scope)
 *
 * Exit-kod 0 = inga nya träffar, 1 = över tröskeln (CI-fail om --strict).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const STRICT = process.argv.includes("--strict");

// Filer/mappar där hårdkodade färger är avsiktliga (banyta, PDF, 3D-scen).
const ALLOWLIST = [
  /^src\/pages\/v3\/V3CoursePlannerV2Page\.tsx$/,           // SVG-banyta
  /^src\/pages\/v3\/V3CoursePlannerV2JudgePage\.tsx$/,      // SVG-banyta (domarvy)
  /^src\/pages\/v3\/V3CoursePlannerPage(Fixed|UX|TunnelIntegrated)?\.tsx$/,
  /^src\/components\/course-planner-v2\//,                  // canvas-chrome med fasta färger
  /^src\/components\/course-planner\//,                     // canvas-chrome
  /^src\/features\/course-planner-v2\//,                    // PDF-export
  /^src\/features\/course-planner\/3d\//,                   // 3D-scen
  /^src\/lib\/(pdf|obstacleThemes|courseObstacleInfo)\.ts$/,
  /^src\/pages\/FreeCoursePlannerPage\.tsx$/,               // light-scoped marketing
  /^src\/index\.css$/,
  /^src\/App\.css$/,
  /^src\/styles\//,
  /\.test\.tsx?$/,
];

// Mönster att flagga inom JSX className/attribut.
const HEX_IN_BRACKETS = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|decoration|placeholder|caret|accent)-\[#[0-9a-fA-F]{3,8}(?:\/\d+)?\]/g;
const TW_RAW_WHITE_BLACK = /\b(?:bg|text|border|ring|from|to|via|placeholder)-(?:white|black)(?:\/\d+)?\b/g;
const TW_RAW_NEUTRAL_GRAY = /\b(?:bg|text|border|ring|from|to|via)-(?:neutral|gray|zinc|stone)-\d{2,3}(?:\/\d+)?\b/g;

// Hex i style-objekt (inline) — vanligt missfall: style={{ color: "#fff" }}.
const HEX_IN_STYLE = /style=\{\{[^}]*?#[0-9a-fA-F]{3,8}[^}]*?\}\}/g;

// Tröskel: max nya träffar utöver "kända" rader. Sätt till 0 vid full migration.
const THRESHOLD = Number(process.env.HARDCODED_COLOR_THRESHOLD ?? "0");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if ([".tsx", ".ts", ".jsx", ".js"].includes(extname(name))) out.push(full);
  }
  return out;
}

function isAllowed(relPath) {
  return ALLOWLIST.some((re) => re.test(relPath));
}

function scanFile(file) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (isAllowed(rel)) return [];
  const src = readFileSync(file, "utf8");
  const hits = [];
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    // Skippa rena SVG-attribut-rader (fill="#..", stroke="#..") — använda i
    // canvas-internt även i tokenade filer.
    if (/\b(?:fill|stroke)\s*=\s*["']#[0-9a-fA-F]{3,8}["']/.test(line)) {
      // Ta bort SVG-bitarna innan vi letar JSX-tokens på samma rad.
      line = line.replace(/\b(?:fill|stroke)\s*=\s*["']#[0-9a-fA-F]{3,8}["']/g, "");
    }
    const matchers = [
      ["hex-bracket", HEX_IN_BRACKETS],
      ["raw-white-black", TW_RAW_WHITE_BLACK],
      ["raw-neutral-gray", TW_RAW_NEUTRAL_GRAY],
      ["hex-inline-style", HEX_IN_STYLE],
    ];
    for (const [kind, re] of matchers) {
      re.lastIndex = 0;
      const m = line.match(re);
      if (m) hits.push({ file: rel, line: i + 1, kind, snippet: m.slice(0, 3).join("  ") });
    }
  });
  return hits;
}

const files = walk(SRC);
const allHits = files.flatMap(scanFile);

if (allHits.length === 0) {
  console.log("✓ Inga hårdkodade färger funna i UI-komponenter.");
  process.exit(0);
}

// Gruppera per fil för läsbar output.
const byFile = new Map();
for (const h of allHits) {
  if (!byFile.has(h.file)) byFile.set(h.file, []);
  byFile.get(h.file).push(h);
}

console.log(`\n⚠  Hittade ${allHits.length} hårdkodad(e) färg(er) i ${byFile.size} fil(er):\n`);
for (const [file, hits] of byFile) {
  console.log(`  ${file}`);
  for (const h of hits.slice(0, 5)) {
    console.log(`    L${h.line}  [${h.kind}]  ${h.snippet}`);
  }
  if (hits.length > 5) console.log(`    … +${hits.length - 5} fler`);
}

console.log(
  `\nTips: använd semantiska tokens (bg-card, text-foreground, border-border, text-primary).` +
  `\nÄr filen avsiktlig (canvas/PDF)? Lägg till i ALLOWLIST i scripts/check-hardcoded-colors.mjs.\n`,
);

if (STRICT && allHits.length > THRESHOLD) {
  console.error(`✗ Över tröskeln (${allHits.length} > ${THRESHOLD}). CI faller.`);
  process.exit(1);
}

process.exit(0);
