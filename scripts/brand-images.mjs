// Regenerates the committed brand images in public/ from the running app:
//   og.png               1200x630 social preview, the bearing view (a
//                        sloop's lights seen from 0 degrees, bows-on): the scene
//                        host lifted to fill the viewport, scaled 1.5x, lights low-centre, so the
//                        vessel fills most of the frame height.
//                        Open Graph and Twitter card.
//   apple-touch-icon.png 180x180, rendered from public/favicon.svg.
// Usage: node scripts/brand-images.mjs [baseUrl]   (default: vite preview)
// `ms=` (empty) pins the best-fit hull: with no ms the app draws a random
// mesh (#174), so og.png would change on every deploy.
// colorScheme is dark: the night theme is the identity (docs/identity.md).

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
const hash =
  '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&view=model&th=0&d=1&ms=';

// swiftshader: headless CI has no GPU; e2e.mjs and lit-canvas.mjs use the same flag.
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const context = await browser.newContext({
  colorScheme: 'dark',
  viewport: { width: 1200, height: 900 },
});
const page = await context.newPage();
await page.goto(base + hash, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
// Lift the scene host (.scene-3d-stack, see src/index.css) to 1.5x the
// frame, offset so the vessel is drawn 1.5x larger and the frame
// shows the lights; no controls around it.
await page.setViewportSize({ width: 1200, height: 630 });
await page.evaluate(() => {
  const host = document.querySelector('.scene-3d-stack');
  if (!host) throw new Error('no .scene-3d-stack host');
  host.style.cssText +=
    ';position:fixed;left:-300px;top:-255px;width:1800px;height:945px;aspect-ratio:auto;z-index:99999;border-radius:0;border:0;background:#000';
});
await page.waitForTimeout(2000);
const box = await page.locator('.scene-3d-stack canvas').first().boundingBox();
if (!box) throw new Error('no scene canvas found');
await page.screenshot({ path: 'public/og.png' });
console.log('public/og.png', JSON.stringify(box));

const svg = readFileSync('public/favicon.svg', 'utf8');
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<body style="margin:0">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body>`,
);
await icon.screenshot({ path: 'public/apple-touch-icon.png' });
console.log('public/apple-touch-icon.png');
await browser.close();
