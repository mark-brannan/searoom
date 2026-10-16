// Regenerates the committed brand images in public/ from the running app:
//   og.png               1200x630 social preview, the bearing view (a
//                        sloop's lights seen from 0 degrees, bows-on) cropped around
//                        the scene canvas. Open Graph and Twitter card.
//   apple-touch-icon.png 180x180, rendered from public/favicon.svg.
// Usage: node scripts/brand-images.mjs [baseUrl]   (default: vite preview)
// colorScheme is dark: the night theme is the identity (docs/identity.md).

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
const hash = '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&view=bearing&th=0&d=1';

const browser = await chromium.launch();
const context = await browser.newContext({
  colorScheme: 'dark',
  viewport: { width: 1200, height: 900 },
});
const page = await context.newPage();
await page.goto(base + hash, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
// Lift the scene canvas's container to fill a 1200x630 viewport so the
// image is the scene alone, with no controls around it.
await page.setViewportSize({ width: 1200, height: 630 });
await page.evaluate(() => {
  const host = document.querySelector('canvas').parentElement.parentElement;
  host.style.cssText +=
    ';position:fixed;inset:0;width:1200px;height:630px;z-index:99999;border-radius:0;border:0;background:#000';
});
await page.waitForTimeout(1500);
const box = await page.locator('canvas').first().boundingBox();
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
