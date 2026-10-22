// Never re-baselined: on the default Sandbox load the WebGL canvas must show
// the vessel, and show it dim. Unlike the screenshot goldens, this number
// is not copied over in an update commit, so a change that hides the 3D view
// cannot be waved through by re-baselining (searoom#218).
// Usage: node scripts/lit-canvas.mjs [baseUrl [hash]]   (serve the built dist first)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { canvasLight, MIN_SEEN_FRACTION, MAX_BRIGHT_FRACTION } from './canvas-light.mjs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
// Seen and bright are defined in canvas-light.mjs. The default hull is dark
// on the sea, not lit, so the floor counts its silhouette and the ceiling
// fails a glowing hull.

const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const context = await browser.newContext({
  colorScheme: 'dark',
  reducedMotion: 'reduce',
  viewport: { width: 1280, height: 900 },
});
// The first-run intro (#108) would cover the page; mark it seen.
await context.addInitScript(() => {
  localStorage.setItem('searoom.introSeen', '1');
});
// the opening mesh is random (searoom#174); pin it to the hull's first variant
await context.addInitScript(() => { Math.random = () => 0; });
const page = await context.newPage();
await page.goto(`${base}${process.argv[3] ?? '#/sandbox'}`, { waitUntil: 'networkidle' });

const canvas = page.locator('canvas').first();
const hasCanvas = await canvas.waitFor({ timeout: 10000 }).then(() => true, () => false);

async function measure() {
  const png = await canvas.screenshot();
  mkdirSync('goldens-out', { recursive: true });
  writeFileSync('goldens-out/lit-canvas.png', png);
  return canvasLight(page, png);
}

let light = { seen: 0, bright: 0 };
if (hasCanvas) {
  // the mesh streams in after the canvas mounts; give it a few frames
  for (let i = 0; i < 10 && light.seen <= MIN_SEEN_FRACTION; i++) {
    await page.waitForTimeout(500);
    light = await measure();
  }
}
await browser.close();

const pct = (f) => `${(f * 100).toFixed(2)}%`;
const msg = hasCanvas
  ? `${pct(light.seen)} seen (need > ${pct(MIN_SEEN_FRACTION)}), ${pct(light.bright)} bright (need <= ${pct(MAX_BRIGHT_FRACTION)})`
  : 'no canvas';
if (!hasCanvas || light.seen <= MIN_SEEN_FRACTION || light.bright > MAX_BRIGHT_FRACTION) {
  console.error(`FAIL default Sandbox WebGL canvas: ${msg}`);
  process.exit(1);
}
console.log(`ok   default Sandbox WebGL canvas: ${msg}`);
