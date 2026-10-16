// CI end-to-end: click through every mode from the header nav, plus one
// threshold crossing on the length slider. Chromium only; colorScheme is
// set to dark explicitly (the night theme is the app's identity).
// Usage: node scripts/e2e.mjs [baseUrl]   (serve the built dist first)

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const context = await browser.newContext({ colorScheme: 'dark' });
// the opening mesh is random (searoom#174); pin it to the hull's first variant
await context.addInitScript(() => { Math.random = () => 0; });
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
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of serious) console.log(`     axe ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  check(`${name} axe: zero serious or critical violations`, serious.length === 0);
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

// every Sandbox view: axe, then the theta dial and the display chips by keyboard
for (const view of ['profile', 'bearing', 'plan']) {
  await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&len=30&view=${view}`, { waitUntil: 'networkidle' });
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of serious) console.log(`     axe ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  check(`Sandbox ${view} view axe: zero serious or critical violations`, serious.length === 0);
}
await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&len=30&view=bearing&th=45`, { waitUntil: 'networkidle' });
const settles = (fn) => page.waitForFunction(fn, null, { timeout: 5000 }).then(() => true, () => false);
const dial = page.locator('.sandbox-grid input#theta');
if ((await dial.count()) > 0) {
  await dial.focus();
  await page.keyboard.press('PageUp');
  check('theta dial moves by keyboard (PageUp, 45 -> 60)', await settles(() => location.hash.includes('th=60')));
} else check('theta dial is focusable', false);
const tabsEl = page.locator('.view-tabs [role=tab]');
await tabsEl.first().focus();
await page.keyboard.press('ArrowRight');
const tabMoved = await settles(() => document.activeElement?.getAttribute('aria-selected') === 'true' && location.hash.includes('view=bearing'));
check('view tabs move by arrow key', tabMoved && (await tabsEl.nth(1).getAttribute('tabindex')) === '0');
// a sailing vessel under 20 m has several lawful displays, so the chips have somewhere to go
await page.goto(`${base}#/sandbox?p=sail&a=none&pos=underway&len=10&view=profile`, { waitUntil: 'networkidle' });
const chipsEl = page.locator('.chips [role=radio]');
const nChips = await chipsEl.count();
await chipsEl.first().focus();
await page.keyboard.press('ArrowRight');
const chipMoved = await settles(() => document.activeElement?.getAttribute('aria-checked') === 'true');
const second = [await chipsEl.nth(1).getAttribute('aria-checked'), await chipsEl.nth(1).getAttribute('tabindex')];
check(`display chips move by arrow key (${nChips} chips)`, nChips > 1 && chipMoved && second[0] === 'true' && second[1] === '0');

check('no uncaught page errors', errors.length === 0);
await browser.close();
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
