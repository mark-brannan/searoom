import { describe, expect, it } from 'vitest';
import { evaluateSignals } from 'colregs-engine';
import { findSignpost } from '../data/signposts';
import {
  DEFAULT_FACTS,
  DEFAULT_STATE,
  MAX_TILT,
  defaultCorpusFor,
  deserialize,
  serialize,
  stateWith,
} from './urlState';
import type { AppState } from './urlState';

describe('URL state round-trip', () => {
  it('round-trips the default state', () => {
    const s = deserialize(serialize(DEFAULT_STATE));
    expect(s).toEqual(DEFAULT_STATE);
  });

  it('round-trips a full sandbox configuration', () => {
    const state: AppState = stateWith({
      mode: 'sandbox',
      facts: {
        'fact:propulsion': 'propulsion:power',
        'fact:activity': 'activity:trawling',
        'fact:position': 'position:underway',
        'fact:making_way': false,
        'fact:length_m': 30.5,
      },
      sandbox: {
        view: 'plan',
        theta: 292,
        tilt: 35,
        displayIndex: 1,
        additionsOn: ['26b-mast'],
        hullHint: 65,
        sky: 40,
        bearingAside: false,
        drawer: true,
      },
      signpost: 'eu-cevni',
      locale: 'fi',
      corpus: 'intl@2016.es.boe',
    });
    expect(deserialize(serialize(state))).toEqual(state);
  });

  it('opens on the 3D view, black sky, hull plain to see, unless the URL says otherwise', () => {
    expect(DEFAULT_STATE.sandbox.view).toBe('model');
    expect(serialize(DEFAULT_STATE)).not.toContain('view=');
    expect(DEFAULT_STATE.sandbox.sky).toBe(0);
    expect(DEFAULT_STATE.sandbox.hullHint).toBeGreaterThan(0);
    const url = serialize(DEFAULT_STATE);
    expect(url).not.toContain('hh=');
    expect(url).not.toContain('bg=');
  });

  it('reads hull hint and sky as percent, so hh=0 still turns the hull off', () => {
    const s = deserialize('#/?view=model&hh=0&bg=100');
    expect(s.sandbox.hullHint).toBe(0);
    expect(s.sandbox.sky).toBe(100);
    expect(serialize(s)).toContain('hh=0');
  });

  it.each([
    ['900', 100],
    ['-5', 0],
    ['42.6', 43],
  ])('clamps and rounds hh=%s to %d', (raw, want) => {
    expect(deserialize(`#/?hh=${raw}&bg=${raw}`).sandbox.hullHint).toBe(want);
    expect(deserialize(`#/?hh=${raw}&bg=${raw}`).sandbox.sky).toBe(want);
  });

  it('opens the 3D view at 0.5 nm and keeps a range in the URL', () => {
    expect(DEFAULT_STATE.sandbox.range).toBe(0.5);
    expect(serialize(DEFAULT_STATE)).not.toContain('rg=');
    const s = deserialize('#/sandbox?view=model&rg=3');
    expect(s.sandbox.range).toBe(3);
    expect(serialize(s)).toContain('rg=3');
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it.each([
    ['9', 3],
    ['0', 0.5],
    ['1.26', 1.3],
    ['x', 0.5],
    ['', 0.5],
    ['Infinity', 0.5],
  ])('clamps rg=%j to %d nm, junk keeps the default', (raw, want) => {
    expect(deserialize(`#/?rg=${raw}`).sandbox.range).toBe(want);
  });

  it.each(['x', '', 'NaN'])('ignores a non-number hh/bg (%j)', (raw) => {
    const s = deserialize(`#/?hh=${raw}&bg=${raw}`);
    expect(s.sandbox.hullHint).toBe(DEFAULT_STATE.sandbox.hullHint);
    expect(s.sandbox.sky).toBe(DEFAULT_STATE.sandbox.sky);
  });

  it('drops a corpus id the package does not ship', () => {
    const s = deserialize('#/rules?cp=intl@2016.xx.nowhere');
    expect(s.corpus).toBe(DEFAULT_STATE.corpus);
  });

  it('scopes the corpus to the jurisdiction: a foreign id is dropped, the default omitted', () => {
    const s = deserialize('#/rules?j=us%2Finland&cp=intl@2016.es.boe');
    expect(s.jurisdiction).toBe('us/inland');
    expect(s.corpus).toBe(defaultCorpusFor('us/inland'));
    expect(s.corpus).not.toBe(DEFAULT_STATE.corpus);
    const url = serialize({ ...DEFAULT_STATE, jurisdiction: 'us/inland' });
    expect(url).not.toContain('cp=');
    expect(deserialize(url).corpus).toBe(defaultCorpusFor('us/inland'));
  });

  it('deep-links a rules paragraph', () => {
    const state = stateWith({ mode: 'rules', rules: { path: '27(a)(i)' } });
    const url = serialize(state);
    expect(url).toContain('/rules/');
    expect(deserialize(url).rules.path).toBe('27(a)(i)');
  });

  it('tolerates junk', () => {
    expect(deserialize('#/nonsense?th=abc&len=xyz').mode).toBe('sandbox');
    expect(deserialize('').sandbox.theta).toBe(DEFAULT_STATE.sandbox.theta);
    expect(deserialize('#/sandbox?tl=abc').sandbox.tilt).toBe(DEFAULT_STATE.sandbox.tilt);
  });

  it('keeps the tilt between the waterline and overhead', () => {
    expect(deserialize('#/sandbox?tl=-20').sandbox.tilt).toBe(0);
    // nav-wright's MAX_TILT: straight down from overhead
    expect(MAX_TILT).toBe(90);
    expect(deserialize('#/sandbox?tl=200').sandbox.tilt).toBe(MAX_TILT);
    expect(serialize(stateWith({ sandbox: { tilt: 40 } }))).toContain('tl=40');
  });

  it.each(['model', 'plan'] as const)('round-trips the %s view', (view) => {
    expect(deserialize(serialize(stateWith({ sandbox: { view } }))).sandbox.view).toBe(view);
  });

  it.each(['bearing', 'profile'])('reads a view=%s link as the 3D view', (view) => {
    expect(deserialize(`#/sandbox?view=${view}`).sandbox.view).toBe('model');
  });

  it('reads a junk view as the default', () => {
    expect(deserialize('#/sandbox?view=bogus').sandbox.view).toBe(DEFAULT_STATE.sandbox.view);
  });

  it('round-trips Benchy in place of her own model, and leaves it off by default', () => {
    const state = stateWith({ sandbox: { benchy: true } });
    expect(deserialize(serialize(state))).toEqual(state);
    expect(deserialize('#/sandbox?benchy=1').sandbox.benchy).toBe(true);
    expect(deserialize(serialize(DEFAULT_STATE)).sandbox.benchy).toBe(false);
    expect(deserialize('#/sandbox?benchy=0').sandbox.benchy).toBe(false);
    expect(deserialize('#/sandbox?bn=1').sandbox.benchy).toBe(false);
  });

  it('reads a view=benchy link as the 3D view with Benchy on', () => {
    const state = deserialize('#/sandbox?view=benchy&tl=30');
    expect(state.sandbox.view).toBe('model');
    expect(state.sandbox.benchy).toBe(true);
    expect(state.sandbox.tilt).toBe(30);
  });

  it('round-trips the 3D view with its camera and night settings', () => {
    const state = stateWith({ sandbox: { theta: 135, tilt: 25, hullHint: 0, sky: 60 } });
    expect(deserialize(serialize(state))).toEqual(state);
  });

  it('drops an out-of-range enum param instead of producing a fact evaluate() rejects', () => {
    // Regression for a hand-edited/stale URL like #/sandbox?p=bogus: the
    // engine's validateFacts() throws on an unrecognized enum value, and
    // nothing upstream (Sandbox.tsx's useMemo) catches it.
    const state = deserialize('#/sandbox?p=bogus&pos=underway');
    expect(state.facts['fact:propulsion']).toBe(DEFAULT_FACTS['fact:propulsion']);
    expect(() => evaluateSignals(state.facts)).not.toThrow();
  });
  it('round-trips the jurisdiction, and omits it at the default', () => {
    expect(serialize(DEFAULT_STATE)).not.toContain('j=');
    const url = serialize({ ...DEFAULT_STATE, jurisdiction: 'us/inland' });
    expect(deserialize(url).jurisdiction).toBe('us/inland');
  });

  it('falls back to the base for a jurisdiction the data does not carry', () => {
    // A hand-edited or stale URL must not hand the engine a rule set that
    // resolves to nothing.
    expect(deserialize('#/sandbox?j=xx%2Fnowhere').jurisdiction).toBe(
      DEFAULT_STATE.jurisdiction,
    );
  });

  it('shows the bearing view alongside by default, and a hidden one survives a reload', () => {
    expect(DEFAULT_STATE.sandbox.bearingAside).toBe(true);
    expect(serialize(DEFAULT_STATE)).not.toContain('ba=');
    const hidden = stateWith({ sandbox: { bearingAside: false } });
    expect(serialize(hidden)).toContain('ba=0');
    expect(deserialize(serialize(hidden)).sandbox.bearingAside).toBe(false);
    expect(deserialize('#/sandbox?ba=junk').sandbox.bearingAside).toBe(true);
  });

  it('round-trips the picked mesh for every hull scene, and omits the default', async () => {
    const { HULL_SCENES } = await import('../render/hullScenes');
    const { modelVariants, pickMesh } = await import('../render/hullModels');
    expect(serialize(DEFAULT_STATE)).not.toContain('ms=');
    for (const facts of Object.values(HULL_SCENES)) {
      for (const v of modelVariants(facts)) {
        const url = serialize(stateWith({ sandbox: { mesh: v.name } }));
        expect(deserialize(url).sandbox.mesh).toBe(v.name);
      }
      const mesh = pickMesh(facts, () => 0.7);
      expect(deserialize(serialize(stateWith({ sandbox: { mesh } }))).sandbox.mesh).toBe(mesh);
    }
  });
});

describe('readable routes (#107)', () => {
  it('quiz seed, question and direction round-trip', () => {
    const s = deserialize('#/quiz/7/3?dir=reverse');
    expect([s.mode, s.quiz.seed, s.quiz.n, s.quiz.direction]).toEqual(['quiz', 7, 3, 'reverse']);
    expect(serialize(s)).toMatch(/^#\/quiz\/7\/3\?.*dir=reverse/);
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it('bare #/quiz keeps working', () => {
    const s = deserialize('#/quiz');
    expect([s.quiz.seed, s.quiz.n]).toEqual([1, 1]);
    expect(serialize(s)).toMatch(/^#\/quiz\?/);
  });
  it('a preset alias loads the preset and a custom record stays in query fields', () => {
    const s = deserialize('#/sandbox/trawler?th=90');
    expect(s.facts['fact:activity']).toBe('activity:trawling');
    expect(serialize(s)).toBe('#/sandbox/trawler?th=90');
    expect(deserialize(serialize(s)).facts).toEqual(s.facts);
  });
  it('query fields on a preset alias refine that preset', () => {
    const s = deserialize('#/sandbox/trawler?len=40');
    expect(s.facts['fact:activity']).toBe('activity:trawling');
    expect(s.facts['fact:length_m']).toBe(40);
  });
  // Every hash scripts/screenshots.mjs has ever shot, sprint 1 (6d69220) on,
  // with what it must still open on. "Resolves" is: the mode, the fact record
  // and the view state it names come back, the signpost it opens exists, and
  // the hash it is rewritten to is a fixed point of the codec.
  const SAIL = '#/sandbox?p=sail&a=none&pos=underway&mw=1&len=12';
  it.each([
    [SAIL, { mode: 'sandbox', len: 12, view: 'model' }],
    [`${SAIL}&view=bearing&th=340&d=1`, { mode: 'sandbox', view: 'model', theta: 340, d: 1 }],
    [`${SAIL}&view=model&th=340&d=1`, { mode: 'sandbox', view: 'model', theta: 340, d: 1 }],
    [`${SAIL}&view=plan&th=45`, { mode: 'sandbox', view: 'plan', theta: 45 }],
    ['#/sandbox?p=power&a=trawling&pos=underway&mw=0&len=30', { mode: 'sandbox', len: 30 }],
    ['#/sandbox?p=power&a=none&pos=underway&mw=1&len=55', { mode: 'sandbox', len: 55 }],
    ['#/sandbox?p=power&a=towing&pos=underway&mw=1&len=30&tow=150', { mode: 'sandbox', len: 30 }],
    ['#/identify', { mode: 'identify' }],
    ['#/quiz', { mode: 'quiz' }],
    ['#/flashcards', { mode: 'flashcards' }],
    ['#/rules/27(a)(i)', { mode: 'rules', path: '27(a)(i)' }],
    ['#/sound', { mode: 'sound' }],
    ['#/sandbox?sp=us-inland', { mode: 'sandbox', sp: 'us-inland' }],
    ['#/sandbox?sp=eu-cevni', { mode: 'sandbox', sp: 'eu-cevni' }],
    ['#/sandbox?sp=part-b', { mode: 'sandbox', sp: 'part-b' }],
    ['#/sandbox?sp=locale-picker', { mode: 'sandbox', sp: 'locale-picker' }],
    [`${SAIL}&loc=fi`, { mode: 'sandbox', loc: 'fi' }],
  ] as const)('every screenshot URL still resolves: %s', (hash, want) => {
    const s = deserialize(hash);
    const params = new URLSearchParams(hash.split('?')[1] ?? '');
    expect(s.mode).toBe(want.mode);
    // the fact record it spells out, field by field
    if (params.has('p')) {
      expect(s.facts['fact:propulsion']).toBe(`propulsion:${params.get('p')}`);
      expect(s.facts['fact:activity']).toBe(`activity:${params.get('a')}`);
      expect(s.facts['fact:position']).toBe(`position:${params.get('pos')}`);
      expect(s.facts['fact:making_way']).toBe(params.get('mw') === '1');
    }
    if ('len' in want) expect(s.facts['fact:length_m']).toBe(want.len);
    if (params.has('tow')) expect(s.facts['fact:tow_length_m']).toBe(150);
    if ('view' in want) expect(s.sandbox.view).toBe(want.view);
    if ('theta' in want) expect(s.sandbox.theta).toBe(want.theta);
    if ('d' in want) expect(s.sandbox.displayIndex).toBe(want.d);
    if ('path' in want) expect(s.rules.path).toBe(want.path);
    if ('loc' in want) expect(s.locale).toBe(want.loc);
    if ('sp' in want) {
      expect(s.signpost).toBe(want.sp);
      if (want.sp !== 'locale-picker') expect(findSignpost(want.sp)).toBeDefined();
    }
    // the redirect: the canonical hash it is rewritten to opens the same state
    const canonical = serialize(s);
    expect(deserialize(canonical)).toEqual(s);
    expect(serialize(deserialize(canonical))).toBe(canonical);
  });

  it('the sprint-1 query form of a preset still resolves', () => {
    const s = deserialize('#/sandbox?p=power&a=trawling&pos=underway&mw=1&len=30');
    expect(s.facts['fact:activity']).toBe('activity:trawling');
  });
});

describe('per-mode view state (#111)', () => {
  it('writes only the view state of the mode in view', () => {
    const s = stateWith({
      sandbox: { theta: 90, view: 'plan' },
      quiz: { seed: 7, n: 3, mode: 'drill' },
      rules: { path: '27(a)(i)' },
    });
    const sandbox = serialize({ ...s, mode: 'sandbox' });
    expect(sandbox).toContain('th=90');
    expect(sandbox).not.toMatch(/qm=|\/quiz\/|\/rules\//);
    const quiz = serialize({ ...s, mode: 'quiz' });
    expect(quiz).toMatch(/^#\/quiz\/7\/3\?/);
    expect(quiz).toContain('qm=drill');
    expect(quiz).not.toMatch(/th=|view=/);
    const rules = serialize({ ...s, mode: 'rules' });
    expect(rules).toMatch(/^#\/rules\/27/);
    expect(rules).not.toMatch(/th=|qm=/);
  });
  it('keeps the situation and preferences in every mode', () => {
    const s = stateWith({ jurisdiction: 'us/inland', locale: 'fi' });
    for (const mode of ['sandbox', 'quiz', 'rules', 'identify'] as const) {
      const back = deserialize(serialize({ ...s, mode }));
      expect([back.jurisdiction, back.locale, back.facts]).toEqual([
        'us/inland',
        'fi',
        s.facts,
      ]);
    }
  });
});

describe('flashcards mode', () => {
  it('round-trips through the hash', () => {
    expect(deserialize('#/flashcards').mode).toBe('flashcards');
    expect(serialize({ ...DEFAULT_STATE, mode: 'flashcards' }).startsWith('#/flashcards')).toBe(true);
  });
});
