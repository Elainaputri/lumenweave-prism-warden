// Lumenweave: Prism Warden — entry program (Node 22, standard library only).
//
// v2 (2026-11-16): title attract-mode demo, HUD safe-zone scrims, clean
// end screens (no entity sprites behind the stats overlay), and a
// ?shot=victory render mode — all inside game/src/*.js; this file's build
// (concatenate the fragments in fixed order, copy game/ + screenshots/,
// write dossier.json) is unchanged and still fully deterministic.
//
// What it does, in order:
//   1. Builds the playable bundle: game/src/*.js are plain JavaScript
//      fragments (no imports between them, one clear job each) that
//      are concatenated in a fixed order inside a single IIFE and written out
//      as game/bundle.min.js, the classic script game/index.html loads.
//   2. Copies game/ and screenshots/ from beside this file to /output
//      (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
//      /output/dossier.json with the vendored make.fun library.
// The whole run is deterministic: fixed file order, no timestamps, no
// randomness, so two runs write byte-identical output.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Source fragments in load order: each one declares the names the next ones
// use, and engine.js (last) boots the game. Keep this list in sync with
// game/src/ — a missing file fails loudly instead of shipping a half game.
const SRC_FILES = [
  'types.js',
  'constants.js',
  'math-utils.js',
  'audio.js',
  'prism-optics.js',
  'entities.js',
  'waves.js',
  'renderer.js',
  'engine.js',
];

// Join the fragments into one self-contained classic script. The banner and
// per-file markers are fixed strings, so the output never changes between
// runs for the same sources.
function buildBundle(srcDir) {
  const parts = [
    '// Lumenweave: Prism Warden — generated offline bundle (game/src/*.js).',
    '// No network requests: every asset is drawn or synthesised at runtime.',
    "(function () {",
    "'use strict';",
  ];
  for (const name of SRC_FILES) {
    const text = readFileSync(join(srcDir, name), 'utf8');
    parts.push(`\n// ---- ${name} ----\n`);
    parts.push(text);
  }
  parts.push('\n})();\n');
  // Join with newlines: the banner lines above are //-comments, and joining
  // without a separator would comment out the IIFE's opening line.
  return parts.join('\n');
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const srcDir = join(here, 'game', 'src');

// Rebuild the bundle from source first, so /output always carries the bundle
// that matches the sources in this commit — never a stale checked-in copy.
const bundle = buildBundle(srcDir);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
writeFileSync(join(out, 'game', 'bundle.min.js'), bundle);
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
