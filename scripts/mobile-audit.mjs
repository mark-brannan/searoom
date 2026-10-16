// Mobile layout audit: touch-emulated chromium at 360 and 412 px. Reports
// horizontal overflow, controls past the viewport edge and tap targets under
// 44 px, and writes screenshots. Usage: node scripts/mobile-audit.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
const outDir = process.argv[3] ?? 'screenshots';
mkdirSync(outDir, { recursive: true });
const pages = [
  ['sandbox', '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12'],
  [
    'sandbox-bearing',
    '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&view=bearing&th=340&d=1',
  ],
  ['identify', '#/identify'],
  ['quiz', '#/quiz'],
  ['rules', '#/rules/27(a)(i)'],
  ['sound', '#/sound'],
];
const browser = await chromium.launch();
for (const w of [360, 412]) {
  const ctx = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: w, height: 780 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('searoom.introSeen', '1');
  });
  // the opening mesh is random (searoom#174); pin it to the hull's first variant
  await ctx.addInitScript(() => { Math.random = () => 0; });
  const page = await ctx.newPage();
  for (const [name, hash] of pages) {
    await page.goto(base + hash, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const r = await page.evaluate((w) => {
      const de = document.documentElement;
      const bad = [],
        small = [];
      for (const el of document.querySelectorAll(
        'button,a,select,input,[role=tab],[role=radio],summary,label',
      )) {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const d = (
          el.tagName +
          '.' +
          el.className +
          ' ' +
          (el.textContent || '').trim().slice(0, 18)
        ).slice(0, 50);
        if (!el.closest('.mode-nav') && (b.right > w + 1 || b.left < -1))
          bad.push(d);
        if (
          (el.tagName !== 'LABEL' || el.closest('.segmented,.check-row')) &&
          !(el.tagName === 'INPUT' && el.closest('label')) &&
          (b.height < 43.5 || b.width < 43.5) &&
          !(el.tagName === 'INPUT' && el.type === 'range')
        )
          small.push(d + ` ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      return {
        scrollW: de.scrollWidth,
        overflowX: de.scrollWidth > w,
        bad,
        small,
      };
    }, w);
    console.log(
      `${w} ${name}: scrollW=${r.scrollW} overflowX=${r.overflowX} offscreen=${r.bad.length} small=${r.small.length}`,
    );
    if (process.env.V)
      console.log(
        ' off:',
        r.bad.slice(0, 8),
        '\n small:',
        r.small.slice(0, 10),
      );
    await page.screenshot({ path: `${outDir}/mobile-${w}-${name}.png` });
  }
  await ctx.close();
}
await browser.close();
