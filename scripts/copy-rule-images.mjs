// Copies the USCG public-domain diagrams (NRHB_*) out of the colregs
// package into public/ so the built site can serve them. The five
// *arc.gif files are deliberately NOT copied: colregs' PROVENANCE.md
// records their provenance as unresolved.

import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'colregs', 'images');
const dest = join(root, 'public', 'rule-images');

mkdirSync(dest, { recursive: true });
let n = 0;
for (const file of readdirSync(src)) {
  if (!file.startsWith('NRHB_')) continue;
  copyFileSync(join(src, file), join(dest, file));
  n++;
}
console.log(`copied ${n} NRHB_* diagrams to public/rule-images/`);
