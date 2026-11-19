// Screenshot goldens (#102). Dark colour scheme, 1280 and 360 px wide.
//   node scripts/goldens.mjs update [baseUrl]   rewrite screenshots/goldens/
//   node scripts/goldens.mjs check  [baseUrl]   compare; exit 1 if any shot
//                                               differs by more than 0.1% of pixels
// The fixtures (scripts/golden-fixtures.mjs) are the full-page states plus a
// matrix of every preset hull x view x theta x width, clipped to the scene
// panel, kept under screenshots/goldens/matrix/.
// `check` writes actual and diff images to goldens-out/ (CI uploads them),
// plus goldens-out/gallery.html: every picture, golden beside actual.
// Comparison runs in the browser on a canvas, so no image dependency is added.

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { states, widths, matrix } from './golden-fixtures.mjs';

const mode = process.argv[2] ?? 'check';
const base = process.argv[3] ?? 'http://localhost:4173/searoom/';
const goldenDir = 'screenshots/goldens';
const outDir = 'goldens-out';
const MAX_DIFF_FRACTION = 0.001; // 0.1% of pixels
const MAX_HEIGHT = 3000; // px; enough for every sandbox state at 360 px
const CHANNEL_TOLERANCE = 16; // per-channel delta below this is anti-aliasing noise

const only = process.argv[4]; // optional substring filter, for a local run

const matrixGolden = `${goldenDir}/matrix`;
const outDirs = mode === 'update' ? [goldenDir, matrixGolden] : [outDir, `${outDir}/matrix`, `${outDir}/golden/matrix`];
for (const d of outDirs) mkdirSync(d, { recursive: true });

const browser = await chromium.launch();
// One context per arcs setting: the Plan view is offered only while the arcs
// are hidden, and the app reads that preference once, from localStorage.
async function newContext(arcs) {
  const context = await browser.newContext({
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  // The first-run intro (#108) would cover the page; mark it seen.
  await context.addInitScript((a) => {
    localStorage.setItem('searoom.introSeen', '1');
    if (a === 'hidden') localStorage.setItem('searoom.arcs', 'hidden');
  }, arcs);
  // the opening mesh is random (searoom#174); pin it to the hull's first variant
  await context.addInitScript(() => { Math.random = () => 0; });
  return context;
}
const context = await newContext('shown');
const planContext = await newContext('hidden');
const page = await context.newPage();
const planPage = await planContext.newPage();
const cmp = await context.newPage();

// Returns { fraction, diffPng (base64) } for two PNG buffers.
async function compare(goldenPng, actualPng) {
  return cmp.evaluate(
    async ([g, a, tol]) => {
      const load = (b64) =>
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = 'data:image/png;base64,' + b64;
        });
      const [gi, ai] = await Promise.all([load(g), load(a)]);
      const w = Math.max(gi.width, ai.width);
      const h = Math.max(gi.height, ai.height);
      const px = (im) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0);
        return x.getImageData(0, 0, w, h);
      };
      const gd = px(gi);
      const ad = px(ai);
      const out = new ImageData(w, h);
      let bad = 0;
      for (let i = 0; i < gd.data.length; i += 4) {
        const d = Math.max(
          Math.abs(gd.data[i] - ad.data[i]),
          Math.abs(gd.data[i + 1] - ad.data[i + 1]),
          Math.abs(gd.data[i + 2] - ad.data[i + 2]),
        );
        const sizeMiss = gi.width !== ai.width || gi.height !== ai.height;
        if (d > tol || sizeMiss) {
          bad++;
          out.data.set([255, 0, 64, 255], i);
        } else {
          const v = ad.data[i] * 0.3;
          out.data.set([v, ad.data[i + 1] * 0.3, ad.data[i + 2] * 0.3, 255], i);
        }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').putImageData(out, 0, 0);
      return {
        fraction: bad / (w * h),
        diffPng: c.toDataURL('image/png').split(',')[1],
      };
    },
    [
      goldenPng.toString('base64'),
      actualPng.toString('base64'),
      CHANNEL_TOLERANCE,
    ],
  );
}

let failed = 0;
const gallery = []; // { file, golden, actual, pct, status }

// One picture: shoot it, then write it (update) or compare it (check).
async function settle(pg, w, h, hash, shotOf) {
  await pg.setViewportSize({ width: w, height: h });
  await pg.goto(base + hash, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  return shotOf(pg);
}
async function record(file, shot) {
  if (mode === 'update') {
    writeFileSync(`${goldenDir}/${file}`, shot);
    console.log('wrote', file);
    return;
  }
  writeFileSync(`${outDir}/${file}`, shot);
  const entry = { file, pct: null, status: 'missing' };
  gallery.push(entry);
  if (!existsSync(`${goldenDir}/${file}`)) {
    console.log('MISSING', file);
    failed++;
    return;
  }
  copyFileSync(`${goldenDir}/${file}`, `${outDir}/golden/${file}`);
  const { fraction, diffPng } = await compare(
    readFileSync(`${goldenDir}/${file}`),
    shot,
  );
  entry.pct = (fraction * 100).toFixed(3);
  if (fraction > MAX_DIFF_FRACTION) {
    writeFileSync(`${outDir}/diff-${file.replace("/", "-")}`, Buffer.from(diffPng, 'base64'));
    entry.status = 'fail';
    console.log(`FAIL ${file} ${entry.pct}% differs`);
    failed++;
  } else {
    entry.status = 'ok';
    console.log(`ok   ${file} ${entry.pct}%`);
  }
}

for (const [w, h] of widths) {
  for (const [name, hash] of states) {
    if (only && !name.includes(only)) continue;
    // Past the viewport: at 360 px the first screen holds only the fact
    // record, so a viewport shot never sees the vessel drawing or the
    // displays. Clipped to the viewport width and MAX_HEIGHT so a long page
    // (the rules list) stays a reviewable PNG.
    const shot = await settle(page, w, h, hash, async (pg) => {
      const height = await pg.evaluate(
        () => document.documentElement.scrollHeight,
      );
      return pg.screenshot({
        fullPage: true,
        clip: { x: 0, y: 0, width: w, height: Math.min(height, MAX_HEIGHT) },
      });
    });
    await record(`${name}-${w}.png`, shot);
  }
  for (const { name, hash, arcs } of matrix) {
    if (only && !name.includes(only)) continue;
    const pg = arcs === 'hidden' ? planPage : page;
    const shot = await settle(pg, w, h, hash, async (p) => {
      // at phone width the fixed fact sheet covers the scene panel's foot
      const handle = p.locator('.sheet-handle[aria-expanded="true"]');
      if (await handle.isVisible()) await handle.click();
      return p.locator('.scene-panel').first().screenshot();
    });
    await record(`matrix/${name}-${w}.png`, shot);
  }
}

if (mode === 'check') {
  const rows = gallery
    .map(
      (g) =>
        `<figure class="${g.status}"><figcaption>${g.file} ${g.pct ?? ''}% ${g.status}</figcaption>` +
        `<img loading="lazy" src="golden/${g.file}" alt="golden">` +
        `<img loading="lazy" src="${g.file}" alt="actual"></figure>`,
    )
    .join('\n');
  // Self-contained in the artifact: the goldens are copied into golden/.
  writeFileSync(
    `${outDir}/gallery.html`,
    `<!doctype html><meta charset="utf-8"><title>searoom goldens</title>` +
      `<style>body{background:#111;color:#ddd;font:14px sans-serif}` +
      `figure{display:inline-block;margin:6px;vertical-align:top}` +
      `figure.fail{outline:2px solid #f04}img{max-width:360px;display:block;margin:2px 0}` +
      `</style>\n<h1>${gallery.length} goldens: golden above, actual below</h1>\n${rows}\n`,
  );
}

await browser.close();
if (failed) {
  console.error(`${failed} golden(s) over ${MAX_DIFF_FRACTION * 100}%`);
  process.exit(1);
}
