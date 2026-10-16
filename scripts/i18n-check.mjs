// Catalog check (#114): en and fi hold the same keys, every message id written
// in source has an English string, and keys nothing refers to are reported.
// Fails on parity and missing ids; unused keys only print, because ids built
// by helpers cannot all be seen statically.
//
//   node scripts/i18n-check.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const en = load('../src/i18n/en.json');
const fi = load('../src/i18n/fi.json');

// Package ids come qualified as the app sees them (see src/i18n/index.ts).
const pkgEn = JSON.parse(
  readFileSync(new URL('../node_modules/colregs/data/i18n/en.json', import.meta.url), 'utf8'),
);
const pkgKeys = new Set();
for (const [cat, group] of Object.entries(pkgEn.strings))
  for (const k of Object.keys(group))
    pkgKeys.add(k.includes(':') ? k.replace(':', '.') : `${cat}.${k}`);

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(p);
  }
};
walk(new URL('../src', import.meta.url).pathname);

const literal = new Set();
const prefixes = new Set();
const idRe = /\bid(?:=|:\s*)(?:"([^"]+)"|'([^']+)'|`([^`]+)`|\{`([^`]+)`\})/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(idRe)) {
    const id = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (id.includes('${')) prefixes.add(id.slice(0, id.indexOf('${')));
    else literal.add(id);
  }
}

const enKeys = new Set(Object.keys(en));
const fiKeys = new Set(Object.keys(fi));
const onlyEn = [...enKeys].filter((k) => !fiKeys.has(k));
// Finnish may carry package-owned vocabulary keys until colregs ships them in
// Finnish (see i18n.test.ts); those need an English string only from the package.
// app.draftBanner is Finnish-only on purpose: App.tsx reads it from fi.json.
const FI_ONLY = new Set(['app.draftBanner']);
const onlyFi = [...fiKeys].filter(
  (k) => !enKeys.has(k) && !pkgKeys.has(k) && !FI_ONLY.has(k),
);
// Only ids that look like catalog keys; DOM ids and rule ids (34a.port) are not.
const missing = [...literal].filter(
  (id) => /^[a-z][\w-]*\./i.test(id) && !enKeys.has(id) && !pkgKeys.has(id),
);
const unused = [...enKeys].filter(
  (k) => !literal.has(k) && ![...prefixes].some((p) => p && k.startsWith(p)),
);

const show = (title, list) => {
  if (list.length) console.log(`${title} (${list.length}):\n${list.map((k) => `  ${k}`).join('\n')}`);
};
show('In en.json, not fi.json', onlyEn);
show('In fi.json, not en.json', onlyFi);
show('Ids used in source with no English string', missing);
show('Unused keys (reported only)', unused);

const bad = onlyEn.length + onlyFi.length + missing.length;
console.log(bad ? 'i18n check FAILED' : 'i18n check passed');
process.exit(bad ? 1 : 0);
