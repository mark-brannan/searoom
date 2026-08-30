// Click-through verification of a deployed (or previewed) build — the
// fixture spot-checks from the acceptance bar, run against the real DOM.
// Usage: node scripts/verify-live.mjs [baseUrl]

import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const context = await browser.newContext({ colorScheme: 'dark' });
const page = await context.newPage();

// 1. the 12 m sloop: exactly three lawful displays
await page.goto(`${base}#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12`, {
  waitUntil: 'networkidle',
});
const chips = page.locator('.chips [role="radio"]');
check('sloop shows 3 display chips', (await chips.count()) === 3);
check(
  'elimination names the tricolor exclusion',
  (await page.locator('.elim', { hasText: 'never be shown together' }).count()) > 0,
);

// 2. crossing 50 m changes the masthead answer
await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&mw=1&len=49`, {
  waitUntil: 'networkidle',
});
const additions49 = await page
  .locator('.chip.addition', { hasText: '23(a)(ii)' })
  .count();
await page.goto(`${base}#/sandbox?p=power&a=none&pos=underway&mw=1&len=55`, {
  waitUntil: 'networkidle',
});
const additions55 = await page
  .locator('.chip.addition', { hasText: '23(a)(ii)' })
  .count();
check(
  'second masthead optional at 49 m, mandatory at 55 m',
  additions49 === 1 && additions55 === 0,
);

// 3. drifting trawler: identity lights stay, sidelights/sternlight go
const countLights = async () =>
  page.locator('.scene-svg g > circle:nth-child(3)').count();
await page.goto(
  `${base}#/sandbox?p=power&a=trawling&pos=underway&mw=1&len=30`,
  { waitUntil: 'networkidle' },
);
const making = await countLights();
await page.goto(
  `${base}#/sandbox?p=power&a=trawling&pos=underway&mw=0&len=30`,
  { waitUntil: 'networkidle' },
);
const drifting = await countLights();
check(
  `trawler lights: ${making} making way -> ${drifting} drifting`,
  making === 5 && drifting === 2,
);

// 4. bearing view: tricolor shows exactly one light from port bow
await page.goto(
  `${base}#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&view=bearing&th=300&d=1`,
  { waitUntil: 'networkidle' },
);
const bearingLights = await page
  .locator('.scene-svg-black g > circle:nth-child(3)')
  .count();
check('tricolor from port bow shows exactly one light', bearingLights === 1);

// 5. locale switch changes strings, not the entry set (REQ-LANG-2)
const appliedIds = async () => {
  await page.locator('.drawer summary').click();
  const pre = await page.locator('.drawer pre').nth(1).textContent();
  return [...pre.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1]).join(',');
};
await page.goto(`${base}#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12`, {
  waitUntil: 'networkidle',
});
const idsEn = await appliedIds();
const chipsEn = (await chips.count());
await page.goto(
  `${base}#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12&loc=fi`,
  { waitUntil: 'networkidle' },
);
const idsFi = await appliedIds();
const chipsFi = (await chips.count());
const fiBanner = await page.locator('.draft-banner').count();
check(
  'locale switch: same entries, same display count',
  idsEn === idsFi && idsEn.length > 0 && chipsEn === chipsFi,
);
check('Finnish UI carries the draft banner', fiBanner === 1);

// 6. identify: white+red (order-blind) finds the fishing vessel — a
// pilot vessel never shows only these two, since some sector always
// carries a sidelight or sternlight
await page.goto(`${base}#/identify`, { waitUntil: 'networkidle' });
await page.locator('.color-btn').nth(0).click(); // white
await page.locator('.color-btn').nth(1).click(); // red
const candidates = await page.locator('.candidate').count();
const fishing = await page
  .locator('.candidate', { hasText: /fishing/i })
  .count();
check(
  `identify white+red: ${candidates} candidates incl. fishing vessel`,
  candidates >= 1 && fishing >= 1,
);

// 7. quiz: answer a question, get feedback with a citation
await page.goto(`${base}#/quiz`, { waitUntil: 'networkidle' });
await page.locator('.quiz-option').first().click();
const feedback = await page.locator('.quiz-feedback').textContent();
check('quiz feedback cites a rule', /\d/.test(feedback ?? ''));

// 8. rules deep link highlights the paragraph
await page.goto(`${base}#/rules/${encodeURIComponent('27(a)(i)')}`, {
  waitUntil: 'networkidle',
});
check(
  'rules deep link renders 27(a)(i)',
  (await page.locator('[data-path="27(a)(i)"]').count()) === 1,
);
check(
  'known omissions panel lists five gaps',
  (await page.locator('.entry .badge', { hasText: 'gap' }).count()) === 5,
);

// 9. signposts: EU CEVNI panel names its blocker
await page.goto(`${base}#/sandbox?sp=eu-cevni`, { waitUntil: 'networkidle' });
const cevni = await page.locator('.signpost-panel').textContent();
check(
  'EU CEVNI panel: largest delta + Q-3 by name',
  /largest delta/.test(cevni ?? '') && /Q-3/.test(cevni ?? ''),
);

// 10. sound stub names Q-1; Part B is a deliberate dead end
await page.goto(`${base}#/sound`, { waitUntil: 'networkidle' });
const sound = await page.locator('.panel').first().textContent();
check('sound stub names Q-1', /Q-1/.test(sound ?? ''));

// 11. anchored 6 m clear of channel: exemption shown, not silence
await page.goto(
  `${base}#/sandbox?p=power&a=none&pos=anchored&len=6&nc=0`,
  { waitUntil: 'networkidle' },
);
const exempted = await page
  .locator('.panel', { hasText: 'Exempted' })
  .count();
check('30(e) exemption is visible', exempted >= 1);

await browser.close();
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
