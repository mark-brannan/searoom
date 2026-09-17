// Build the Finnish review pack: one printable page per draft string, with
// the screen it appears on. REQ-LANG-8 needs a named native reviewer before
// the draft label comes off (searoom#88), and a reviewer should not have to
// go hunting for where a string renders — that hunt is what turns an
// afternoon into a project.
//
//   npm run build && npm run preview          # or npm run dev
//   node scripts/fi-review-pack.mjs http://localhost:4173/searoom/
//
// Output (gitignored): fi-review-pack/index.html, one screenshot per screen,
// and verdicts.tsv for a reviewer who would rather work in a spreadsheet.

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4173/searoom/';
const outDir = process.argv[3] ?? resolve(root, 'fi-review-pack');

const readJson = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const appEn = readJson('src/i18n/en.json');
const appFi = readJson('src/i18n/fi.json');
const pkgFi = readJson('node_modules/colregs/data/i18n/fi.json');

/** Package-owned Finnish: colregs' to fix, listed so the reviewer knows. */
const packageFi = {};
for (const [category, entries] of Object.entries(pkgFi.strings))
  for (const [key, value] of Object.entries(entries))
    packageFi[key.includes(':') ? key.replace(':', '.') : `${category}.${key}`] =
      value;

/**
 * `sp.*` and `blocker.*` keys reach the screen through a signpost panel whose
 * id is not derivable from the key (`sp.en-us.*` renders under `en-US-uscg`),
 * so read the mapping out of the data file that owns it.
 */
function signpostContexts() {
  const src = readFileSync(resolve(root, 'src/data/signposts.ts'), 'utf8');
  const map = new Map();
  // each record starts at `id: '<x>'` and runs to the next one
  const starts = [...src.matchAll(/^ {4}id: '([^']+)',$/gm)];
  starts.forEach((m, i) => {
    const body = src.slice(m.index, starts[i + 1]?.index ?? src.length);
    for (const k of body.matchAll(/'((?:sp|blocker)\.[^']+)'/g))
      if (!map.has(k[1])) map.set(k[1], `#/sandbox?sp=${m[1]}&loc=fi`);
  });
  return map;
}

const SIGNPOSTS = signpostContexts();

/** First match wins; `undefined` hash means the key has no single screen. */
const SCREENS = [
  [/^sound\./, 'Äänimerkit', '#/sound?loc=fi'],
  [/^quiz\./, 'Visa', '#/quiz?loc=fi'],
  [/^identify\./, 'Tunnista', '#/identify?loc=fi'],
  [/^(color|light)\./, 'Tunnista — valot', '#/identify?loc=fi'],
  [/^(locale|sp\.(locale|jurisdictions|parts|corpora))\./, 'Kielivalitsin', '#/sandbox?sp=locale-picker&loc=fi'],
  [/^signpost\./, 'Viitoituspaneeli', '#/sandbox?sp=us-inland&loc=fi'],
  [/^(rules|corpus|fallback|jurisdiction)\./, 'Säännöt', '#/rules/27(a)(i)?loc=fi'],
  [/^(aspect|scene)\./, 'Harjoittelu — suuntima', '#/sandbox?p=power&a=trawling&pos=underway&mw=1&len=30&view=bearing&th=340&loc=fi'],
  [/^(app|mode|header|night|view|sandbox|fact|propulsion|activity|position|obstruction_side|modality|drawer)\./, 'Harjoittelu', '#/sandbox?p=power&a=trawling&pos=underway&mw=1&len=30&loc=fi'],
];

function contextFor(key) {
  if (SIGNPOSTS.has(key)) return ['Viitoituspaneeli', SIGNPOSTS.get(key)];
  for (const [re, screen, hash] of SCREENS)
    if (re.test(key)) return [screen, hash];
  return ['—', undefined];
}

// Every Finnish string a reviewer can change, in catalog order.
const rows = Object.keys(appFi).map((key) => {
  const [screen, hash] = contextFor(key);
  return {
    key,
    en: appEn[key] ?? '—',
    fi: appFi[key],
    owner: 'searoom',
    screen,
    hash,
  };
});
for (const [key, fi] of Object.entries(packageFi)) {
  const [screen, hash] = contextFor(key);
  rows.push({ key, en: '—', fi, owner: 'colregs', screen, hash });
}

const unmapped = rows.filter((r) => !r.hash).map((r) => r.key);

// One screenshot per distinct screen, in the app's own night theme.
mkdirSync(outDir, { recursive: true });
const shots = new Map();
const browser = await chromium.launch();
const context = await browser.newContext({
  colorScheme: 'dark',
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
for (const { hash } of rows) {
  if (!hash || shots.has(hash)) continue;
  const file = `shot-${shots.size}.png`;
  await page.goto(base + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${file}`, fullPage: true });
  shots.set(hash, file);
  console.log(`${file}  ${hash}`);
}
await browser.close();

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const card = (r, i) => `
<section class="s" id="${esc(r.key)}">
  <h2>${i + 1}. <code>${esc(r.key)}</code></h2>
  <p class="meta">${esc(r.screen)} · katalogi: ${esc(r.owner)}${
    r.owner === 'colregs'
      ? ' <b>(korjaus kuuluu colregs-pakettiin, ei tähän sovellukseen)</b>'
      : ''
  }</p>
  <dl>
    <dt>englanti</dt><dd class="en">${esc(r.en)}</dd>
    <dt>suomi (luonnos)</dt><dd class="fi">${esc(r.fi)}</dd>
  </dl>
  <p class="verdict">Arvio: ☐ kelpaa ☐ korjattava — korjaus:</p>
  <p class="write"></p>
  ${
    r.hash
      ? `<figure><img src="${shots.get(r.hash)}" alt=""><figcaption>${esc(
          r.hash,
        )}</figcaption></figure>`
      : ''
  }
</section>`;

writeFileSync(
  `${outDir}/index.html`,
  `<!doctype html><meta charset="utf-8">
<title>Searoom — suomenkielisen luonnoksen tarkastuspaketti</title>
<style>
  :root { color-scheme: light; }
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 46rem; padding: 2rem 1rem; }
  h1 { font-size: 1.6rem; }
  .s { break-after: page; border-top: 2px solid #333; padding-top: 1rem; margin-top: 2rem; }
  .s h2 { font-size: 1.1rem; margin: 0 0 .25rem; }
  code { font-size: .9em; }
  .meta { color: #555; margin: 0 0 1rem; font-size: .9rem; }
  dl { margin: 0; }
  dt { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #555; }
  dd { margin: .15rem 0 .8rem; padding: .5rem .7rem; border-left: 3px solid #ccc; }
  dd.fi { border-left-color: #b8860b; background: #fffbf0; }
  .verdict { margin: 1rem 0 .2rem; font-weight: 600; }
  .write { border-bottom: 1px solid #999; height: 3.5rem; margin: 0 0 1rem; }
  figure { margin: 0; }
  img { width: 100%; border: 1px solid #ccc; }
  figcaption { font-size: .8rem; color: #666; word-break: break-all; }
  @media print { figure { max-height: 9cm; overflow: hidden; } }
</style>
<h1>Searoom — suomenkielisen käyttöliittymän tarkastuspaketti</h1>
<p>Käyttöliittymän suomi on konekirjoitettu luonnos ja se näkyy sovelluksessa
luonnos-merkinnällä, kunnes nimetty äidinkielinen tarkastaja on käynyt sen läpi
(REQ-LANG-8). <b>Sääntöteksti ei ole tässä</b> — sitä ei käännetä sovelluksessa
lainkaan, vaan se näytetään sellaisenaan lähdekorpuksesta.</p>
<p>Yksi sivu per merkkijono: englanninkielinen alkuteksti, suomenkielinen
luonnos ja kuva siitä näkymästä, jossa merkkijono esiintyy. Sanastovalinnat,
jotka kaipaavat erityistä huomiota, on koottu tiedostoon
<code>docs/fi-glossary-notes.md</code>.</p>
<p>Merkkijonoja: ${rows.length} (${
    rows.filter((r) => r.owner === 'colregs').length
  } niistä tulee colregs-paketista).
Aaltosulkeissa olevat nimet, kuten <code>{count}</code>, ovat muuttujia — ne on
säilytettävä sellaisenaan.</p>
${rows.map(card).join('\n')}
`,
);

writeFileSync(
  `${outDir}/verdicts.tsv`,
  ['key\tscreen\towner\ten\tfi\tverdict\tcorrection']
    .concat(
      rows.map((r) =>
        [r.key, r.screen, r.owner, r.en, r.fi, '', ''].join('\t'),
      ),
    )
    .join('\n') + '\n',
);

console.log(`\n${rows.length} strings, ${shots.size} screens -> ${outDir}`);
if (unmapped.length)
  console.log(`no screen mapped for: ${unmapped.join(', ')}`);
