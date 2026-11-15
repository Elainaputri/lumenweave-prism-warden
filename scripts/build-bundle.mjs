// build-bundle.mjs — local helper: rebuild game/bundle.min.js from
// game/src/*.js without running main.ts. Same concatenation main.ts uses,
// so the checked-in bundle always matches what the entry program writes.
// Usage: node scripts/build-bundle.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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

const parts = [
  '// Lumenweave: Prism Warden — generated offline bundle (game/src/*.js).',
  '// No network requests: every asset is drawn or synthesised at runtime.',
  '(function () {',
  "'use strict';",
];
for (const name of SRC_FILES) {
  parts.push(`\n// ---- ${name} ----\n`);
  parts.push(readFileSync(join(root, 'game', 'src', name), 'utf8'));
}
parts.push('\n})();\n');
writeFileSync(join(root, 'game', 'bundle.min.js'), parts.join('\n'));
console.log('wrote game/bundle.min.js');
