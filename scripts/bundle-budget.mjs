// Bundle budget: run after `npm run build`. Gzip sizes of dist/assets.
// Fails if the main chunk or the JS+CSS total passes its ceiling, or if
// three.js ends up in the main chunk (it belongs to the lazy 3D chunk).
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Ceilings in gzip bytes: measured + 5%. Lower them when the bundle shrinks.
// The total also carries the mesh Profile view (#191, +5229 B), which loads
// three.js for the Sandbox's Profile tab, nav-wright's mesh catalog (the
// Mesh picker's data, +9455 B) and nav-wright bbf764f..5a959ae (+9747 B).
const CEILING = { main: 125757, total: 533946 };
const dir = 'dist/assets';
const gz = (f) => gzipSync(readFileSync(`${dir}/${f}`)).length;
const files = readdirSync(dir).filter((f) => /\.(js|css)$/.test(f));
const html = readFileSync('dist/index.html', 'utf8');
const mainJs = /assets\/(index-[^"]+\.js)/.exec(html)?.[1];
if (!mainJs) throw new Error('main chunk not found in dist/index.html');

const main = gz(mainJs);
const total = files.reduce((n, f) => n + gz(f), 0);
const hasThree = /__THREE__|WebGLRenderer/.test(readFileSync(`${dir}/${mainJs}`, 'utf8'));
const row = (k, v, c) => `${k.padEnd(6)} ${String(v).padStart(8)} B gzip  ceiling ${c}`;
console.log(row('main', main, CEILING.main));
console.log(row('total', total, CEILING.total));
console.log(`three.js in main chunk: ${hasThree}`);
const bad = [];
if (main > CEILING.main) bad.push('main chunk over ceiling');
if (total > CEILING.total) bad.push('total over ceiling');
if (hasThree) bad.push('three.js is in the main chunk');
if (bad.length) {
  console.error('bundle budget FAILED: ' + bad.join('; '));
  process.exit(1);
}
