// Screenshot goldens (#102). Dark colour scheme, 1280 and 360 px wide.
//   node scripts/goldens.mjs update [baseUrl]   rewrite screenshots/goldens/
//   node scripts/goldens.mjs check  [baseUrl]   compare; exit 1 if any shot
//                                               differs by more than 0.1% of pixels
// `check` writes actual and diff images to goldens-out/ (CI uploads them).
// Comparison runs in the browser on a canvas, so no image dependency is added.

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const mode = process.argv[2] ?? 'check';
const base = process.argv[3] ?? 'http://localhost:4173/searoom/';
const goldenDir = 'screenshots/goldens';
const outDir = 'goldens-out';
const MAX_DIFF_FRACTION = 0.001; // 0.1% of pixels
const MAX_HEIGHT = 3000; // px; enough for every sandbox state at 360 px
const CHANNEL_TOLERANCE = 16; // per-channel delta below this is anti-aliasing noise

const states = [
  ['sandbox', '#/sandbox'],
  ['identify', '#/identify'],
  ['quiz', '#/quiz'],
  ['rules', '#/rules'],
  ['sound', '#/sound'],
  ['sandbox-power-60m', '#/sandbox?p=power&a=none&pos=underway&mw=1&len=60'],
  ['sandbox-trawler', '#/sandbox?p=power&a=trawling&pos=underway&mw=0&len=30'],
];
const widths = [
  [1280, 900],
  [360, 740],
];

mkdirSync(mode === 'update' ? goldenDir : outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  colorScheme: 'dark',
  reducedMotion: 'reduce',
  deviceScaleFactor: 1,
});
// The first-run intro (#108) would cover the page; mark it seen.
await context.addInitScript(() => {
  localStorage.setItem('searoom.introSeen', '1');
});
// the opening mesh is random (searoom#174); pin it to the hull's first variant
await context.addInitScript(() => { Math.random = () => 0; });
const page = await context.newPage();
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
for (const [w, h] of widths) {
  await page.setViewportSize({ width: w, height: h });
  for (const [name, hash] of states) {
    const file = `${name}-${w}.png`;
    await page.goto(base + hash, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Past the viewport: at 360 px the first screen holds only the fact
    // record, so a viewport shot never sees the vessel drawing or the
    // displays. Clipped to the viewport width and MAX_HEIGHT so a long page
    // (the rules list) stays a reviewable PNG.
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const shot = await page.screenshot({
      fullPage: true,
      clip: { x: 0, y: 0, width: w, height: Math.min(height, MAX_HEIGHT) },
    });
    if (mode === 'update') {
      writeFileSync(`${goldenDir}/${file}`, shot);
      console.log('wrote', file);
      continue;
    }
    writeFileSync(`${outDir}/${file}`, shot);
    if (!existsSync(`${goldenDir}/${file}`)) {
      console.log('MISSING', file);
      failed++;
      continue;
    }
    const { fraction, diffPng } = await compare(
      readFileSync(`${goldenDir}/${file}`),
      shot,
    );
    const pct = (fraction * 100).toFixed(3);
    if (fraction > MAX_DIFF_FRACTION) {
      writeFileSync(`${outDir}/diff-${file}`, Buffer.from(diffPng, 'base64'));
      console.log(`FAIL ${file} ${pct}% differs`);
      failed++;
    } else {
      console.log(`ok   ${file} ${pct}%`);
    }
  }
}

await browser.close();
if (failed) {
  console.error(`${failed} golden(s) over ${MAX_DIFF_FRACTION * 100}%`);
  process.exit(1);
}
