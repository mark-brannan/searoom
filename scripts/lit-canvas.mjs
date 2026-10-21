// Never re-baselined: on the default Sandbox load the WebGL canvas must have
// more than 0.3% of its pixels lit. Unlike the screenshot goldens, this number
// is not copied over in an update commit, so a change that hides the 3D view
// cannot be waved through by re-baselining (searoom#218).
// Lit = luminance more than LIT_OVER_SKY above the canvas's median luminance
// (its sky), so a black, blank or see-through canvas counts nothing.
// Usage: node scripts/lit-canvas.mjs [baseUrl [hash]]   (serve the built dist first)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
// The floor separates the model present from the model absent, not bright from
// dark: the traced hull's night render is dark on purpose. Measured on 52257be,
// 1280x900 swiftshader, three runs each:
//   model present (Hans Christian 38T): 0.583% lit
//   model absent (empty glTF; the masthead light alone): 0.102% lit
// 0.3% sits 2.9x over absent and 1.9x under present.
const MIN_LIT_FRACTION = 0.003; // hard-coded on purpose; never re-baselined (searoom#218)
const LIT_OVER_SKY = 4; // of 255; the default scene is dim, so "lit" is "not sky"

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

async function litFraction() {
  const png = await canvas.screenshot();
  mkdirSync('goldens-out', { recursive: true });
  writeFileSync('goldens-out/lit-canvas.png', png);
  return page.evaluate(
    async ([b64, over]) => {
      const im = new Image();
      await new Promise((res, rej) => {
        im.onload = res;
        im.onerror = rej;
        im.src = 'data:image/png;base64,' + b64;
      });
      const c = document.createElement('canvas');
      c.width = im.width;
      c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data;
      const lum = new Float32Array(d.length / 4);
      for (let i = 0; i < lum.length; i++) {
        lum[i] = 0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2];
      }
      const sky = Float32Array.from(lum).sort()[lum.length >> 1];
      return lum.filter((v) => v > sky + over).length / lum.length;
    },
    [png.toString('base64'), LIT_OVER_SKY],
  );
}

let lit = 0;
if (hasCanvas) {
  // the mesh streams in after the canvas mounts; give it a few frames
  for (let i = 0; i < 10 && lit <= MIN_LIT_FRACTION; i++) {
    await page.waitForTimeout(500);
    lit = await litFraction();
  }
}
await browser.close();

const pct = (lit * 100).toFixed(2);
if (!hasCanvas || lit <= MIN_LIT_FRACTION) {
  console.error(
    `FAIL default Sandbox WebGL canvas: ${hasCanvas ? `${pct}% lit` : 'no canvas'}, need > ${(MIN_LIT_FRACTION * 100).toFixed(1)}%`,
  );
  process.exit(1);
}
console.log(`ok   default Sandbox WebGL canvas ${pct}% lit (need > ${(MIN_LIT_FRACTION * 100).toFixed(1)}%)`);
