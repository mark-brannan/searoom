// CI end-to-end: click through every mode from the header nav, plus one
// threshold crossing on the length slider. Chromium only; colorScheme is
// set to dark explicitly (the night theme is the app's identity).
// Usage: node scripts/e2e.mjs [baseUrl]   (serve the built dist first)

import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const context = await browser.newContext({ colorScheme: 'dark' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base, { waitUntil: 'networkidle' });
const tab = (name) => page.locator('.mode-nav .mode-tab', { hasText: name });

// every mode: click its tab, expect it active and its body non-blank
for (const [name, hash, probe] of [
  ['Sandbox', '#/sandbox', '.sandbox-grid'],
  ['Identify', '#/identify', '.color-btn'],
  ['Quiz', '#/quiz', '.quiz-option'],
  ['Rules', '#/rules', '[id^="rule-"]'],
  ['Sound', '#/sound', '.panel'],
]) {
  await tab(name).first().click();
  await page.waitForFunction((h) => location.hash.startsWith(h), hash);
  await page.locator(probe).first().waitFor({ timeout: 5000 }).catch(() => {});
  check(
    `${name} mode renders`,
    (await page.locator(probe).count()) > 0 &&
      (await tab(name).first().getAttribute('class')).includes('active'),
  );
}

// threshold crossing: the second masthead light is an optional addition
// below 50 m and drops out at 55 m (23(a)(ii))
await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&mw=1&len=49`, {
  waitUntil: 'networkidle',
});
const addition = page.locator('.chip.addition', { hasText: '23(a)(ii)' });
const below = await addition.first().waitFor({ timeout: 5000 }).then(() => addition.count(), () => 0);
await page.locator('#length').fill('55');
const above = await addition.first().waitFor({ state: 'detached', timeout: 5000 }).then(() => 0, () => addition.count());
check(`length slider crosses 50 m (${below} -> ${above} optional additions)`, below === 1 && above === 0);

check('no uncaught page errors', errors.length === 0);
await browser.close();
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
