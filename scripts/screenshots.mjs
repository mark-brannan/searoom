// Screenshot capture for the demo. colorScheme is set explicitly, per
// standing Playwright rules — the night theme is the app's identity.
// Usage: node scripts/screenshots.mjs [baseUrl] [outDir]

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
const outDir = process.argv[3] ?? 'screenshots';
mkdirSync(outDir, { recursive: true });

const shots = [
  ['sandbox-sloop', '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12'],
  [
    'sandbox-sloop-bearing',
    '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&view=bearing&th=340&d=1',
  ],
  [
    'sandbox-plan-arcs',
    '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&view=plan&th=45',
  ],
  [
    'sandbox-trawler-drifting',
    '#/sandbox?p=power&a=trawling&pos=underway&mw=0&len=30',
  ],
  [
    'sandbox-ship-55m',
    '#/sandbox?p=power&a=none&pos=underway&mw=1&len=55',
  ],
  ['identify', '#/identify'],
  ['quiz', '#/quiz'],
  ['rules', '#/rules/27(a)(i)'],
  ['sound-stub', '#/sound'],
  ['signpost-us-inland', '#/sandbox?sp=us-inland'],
  ['signpost-eu-cevni', '#/sandbox?sp=eu-cevni'],
  ['signpost-part-b', '#/sandbox?sp=part-b'],
  ['locale-picker', '#/sandbox?sp=locale-picker'],
  ['sandbox-fi-draft', '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&loc=fi'],
];

const browser = await chromium.launch();
const context = await browser.newContext({
  colorScheme: 'dark',
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

for (const [name, hash] of shots) {
  await page.goto(base + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
  console.log(name);
}

// one phone-width shot for the responsive check
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + shots[0][1], { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/sandbox-phone.png` });
console.log('sandbox-phone');

await browser.close();
