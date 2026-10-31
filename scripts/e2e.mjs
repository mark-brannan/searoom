// CI end-to-end, a gate: the default Sandbox draws a dim 3D vessel; at 360
// and 1280 px every mode opens from the header nav and four interactions
// (length slider across 50 m, a display chip, an identify light, a quiz
// answer) each change the page. Chromium only, software WebGL so the 3D canvas draws headless;
// colorScheme is set to dark explicitly (the night theme is the app's identity).
// Usage: node scripts/e2e.mjs [baseUrl]   (serve the built dist first)

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { canvasLight, MIN_SEEN_FRACTION, MAX_BRIGHT_FRACTION } from './canvas-light.mjs';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const context = await browser.newContext({ colorScheme: 'dark' });
// The first-run intro (#108) would cover the page; mark it seen.
await context.addInitScript(() => {
  localStorage.setItem('searoom.introSeen', '1');
});
// the opening mesh is random (searoom#174); pin it to the hull's first variant
await context.addInitScript(() => { Math.random = () => 0; });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base, { waitUntil: 'networkidle' });
const tab = (name) => page.locator('.mode-nav .mode-tab', { hasText: name });

// The 3D vessel is the Sandbox's primary view, dim by default (refs #218):
// the default page draws a WebGL canvas whose vessel is seen and not bright.
// Seen and bright, and the bar they pass, are defined in canvas-light.mjs.
await page.goto(`${base}#/sandbox`, { waitUntil: 'networkidle' });
const sceneCanvas = page.locator('.scene-main canvas').first();
const hasCanvas = await sceneCanvas.waitFor({ timeout: 10000 }).then(() => true, () => false);
let light = { seen: 0, bright: 0 };
if (hasCanvas) {
  // the mesh streams in after the canvas mounts; give it a few frames
  for (let i = 0; i < 10 && light.seen <= MIN_SEEN_FRACTION; i++) {
    await page.waitForTimeout(500);
    light = await canvasLight(page, await sceneCanvas.screenshot());
  }
}
const pct = (f) => `${(f * 100).toFixed(2)}%`;
check(
  `Sandbox draws a dim 3D vessel (${hasCanvas ? `${pct(light.seen)} seen, need > ${pct(MIN_SEEN_FRACTION)}; ${pct(light.bright)} bright, need <= ${pct(MAX_BRIGHT_FRACTION)}` : 'no canvas'})`,
  hasCanvas && light.seen > MIN_SEEN_FRACTION && light.bright <= MAX_BRIGHT_FRACTION,
);

// At phone and desktop width: every mode renders from its tab, then the four
// interactions each change the page. Loose on purpose: a check asks that
// something rendered or moved, never which value or which pixels (#116).
const MODES = [
  ['Sandbox', '#/sandbox', '.sandbox-grid'],
  ['Identify', '#/identify', '.color-btn'],
  ['Quiz', '#/quiz', '.quiz-option'],
  ['Flashcards', '#/flashcards', '.flashcard'],
  ['Rules', '#/rules', '[id^="rule-"]'],
  ['Sound', '#/sound', '.panel'],
];
const text = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText ?? '', sel);
// reads fn() once it holds still for half a second, so a lazy chunk landing
// after networkidle is not mistaken for the interaction's effect
const settled = async (fn) => {
  let prev = await fn();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const cur = await fn();
    if (cur === prev) return cur;
    prev = cur;
  }
  return prev;
};
// waits for fn() to differ from before; true once it does
const changes = async (fn, before) => {
  for (let i = 0; i < 20; i++) {
    if ((await fn()) !== before) return true;
    await page.waitForTimeout(250);
  }
  return false;
};
for (const width of [360, 1280]) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`${base}#/sandbox`, { waitUntil: 'networkidle' });
  for (const [name, hash, probe] of MODES) {
    await tab(name).first().click();
    await page.waitForFunction((h) => location.hash.startsWith(h), hash);
    await page.locator(probe).first().waitFor({ timeout: 5000 }).catch(() => {});
    if (width === 1280) {
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      for (const v of serious) console.log(`     axe ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      check(`${name} axe: zero serious or critical violations`, serious.length === 0);
    }
    check(
      `${width}px ${name} mode renders`,
      (await page.locator(probe).count()) > 0 &&
        (await tab(name).first().getAttribute('class')).includes('active'),
    );
  }

  // the length slider across 50 m changes the lawful displays shown
  await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&mw=1&len=49`, { waitUntil: 'networkidle' });
  await page.locator('.sandbox-rest').first().waitFor({ timeout: 5000 }).catch(() => {});
  const displays = () => text('.sandbox-rest');
  const beforeLen = await settled(displays);
  await page.locator('#length').fill('55');
  check(`${width}px length slider across 50 m changes the displays`, beforeLen !== '' && (await changes(displays, beforeLen)));

  // picking another display chip changes what the 3D scene draws
  await page.goto(`${base}#/sandbox?p=sail&a=none&pos=underway&len=10`, { waitUntil: 'networkidle' });
  const chip = page.locator('.chips [role=radio][aria-checked=false]').first();
  const hasChip = await chip.waitFor({ timeout: 5000 }).then(() => true, () => false);
  const scene = page.locator('.scene-main canvas').first();
  const pixels = () => scene.screenshot().then((b) => b.toString('base64'), () => '');
  const beforeChip = await settled(pixels);
  if (hasChip) await chip.click();
  check(`${width}px display chip changes the scene`, hasChip && beforeChip !== '' && (await changes(pixels, beforeChip)));

  // adding a seen light in Identify changes the page
  await page.goto(`${base}#/identify`, { waitUntil: 'networkidle' });
  const colour = page.locator('.color-btn').first();
  const hasColour = await colour.waitFor({ timeout: 5000 }).then(() => true, () => false);
  const beforeSeen = await settled(() => text('#root'));
  if (hasColour) await colour.click();
  check(`${width}px identify light changes the page`, hasColour && (await changes(() => text('#root'), beforeSeen)));

  // answering a quiz question changes the page
  await page.goto(`${base}#/quiz`, { waitUntil: 'networkidle' });
  const option = page.locator('.quiz-option').first();
  const hasOption = await option.waitFor({ timeout: 5000 }).then(() => true, () => false);
  const beforeAnswer = await settled(() => text('#root'));
  if (hasOption) await option.click();
  check(`${width}px quiz answer changes the page`, hasOption && (await changes(() => text('#root'), beforeAnswer)));
}
await page.setViewportSize({ width: 1280, height: 720 });

// every Sandbox view: axe, then the theta dial and the display chips by keyboard
for (const view of ['model', 'plan']) {
  await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&len=30&view=${view}`, { waitUntil: 'networkidle' });
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of serious) console.log(`     axe ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  check(`Sandbox ${view} view axe: zero serious or critical violations`, serious.length === 0);
}
await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&len=30&th=45`, { waitUntil: 'networkidle' });
const settles = (fn) => page.waitForFunction(fn, null, { timeout: 5000 }).then(() => true, () => false);
const dial = page.locator('.sandbox-grid input#theta');
if ((await dial.count()) > 0) {
  await dial.focus();
  await page.keyboard.press('PageUp');
  check('theta dial moves by keyboard (PageUp, 45 -> 60)', await settles(() => location.hash.includes('th=60')));
} else check('theta dial is focusable', false);
// with the arcs beside the scene the 3D view stands alone; hide them for a second tab
await page.locator('.arcs-panel .arcs-toggle').click();
const tabsEl = page.locator('.view-tabs [role=tab]');
await tabsEl.first().waitFor({ timeout: 5000 }).catch(() => {});
await tabsEl.first().focus();
await page.keyboard.press('ArrowRight');
const tabMoved = await settles(() => document.activeElement?.getAttribute('aria-selected') === 'true' && location.hash.includes('view=plan'));
check('view tabs move by arrow key', tabMoved && (await tabsEl.nth(1).getAttribute('tabindex')) === '0');
// a sailing vessel under 20 m has several lawful displays, so the chips have somewhere to go
await page.goto(`${base}#/sandbox?p=sail&a=none&pos=underway&len=10`, { waitUntil: 'networkidle' });
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
