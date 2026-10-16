import { describe, expect, it } from 'vitest';
import { evaluateDisplay } from 'colregs-engine';
import {
  DEFAULT_FACTS,
  DEFAULT_STATE,
  defaultCorpusFor,
  deserialize,
  serialize,
} from './urlState';
import type { AppState } from './urlState';

describe('URL state round-trip', () => {
  it('round-trips the default state', () => {
    const s = deserialize(serialize(DEFAULT_STATE));
    expect(s).toEqual(DEFAULT_STATE);
  });

  it('round-trips a full sandbox configuration', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      mode: 'sandbox',
      facts: {
        'fact:propulsion': 'propulsion:power',
        'fact:activity': 'activity:trawling',
        'fact:position': 'position:underway',
        'fact:making_way': false,
        'fact:length_m': 30.5,
      },
      view: 'bearing',
      theta: 292,
      tilt: 35,
      displayIndex: 1,
      additionsOn: ['26b-mast'],
      signpost: 'eu-cevni',
      locale: 'fi',
      corpus: 'intl@2016.es.boe',
      hullHint: 65,
      sky: 40,
      bearingAside: false,
      drawer: true,
    };
    expect(deserialize(serialize(state))).toEqual(state);
  });

  it('keeps the bearing view black with a faint hull unless the URL says otherwise', () => {
    expect(DEFAULT_STATE.sky).toBe(0);
    expect(DEFAULT_STATE.hullHint).toBeGreaterThan(0);
    const url = serialize(DEFAULT_STATE);
    expect(url).not.toContain('hh=');
    expect(url).not.toContain('bg=');
  });

  it('reads hull hint and sky as percent, so hh=0 still turns the hull off', () => {
    const s = deserialize('#/?view=bearing&hh=0&bg=100');
    expect(s.hullHint).toBe(0);
    expect(s.sky).toBe(100);
    expect(serialize(s)).toContain('hh=0');
  });

  it.each([
    ['900', 100],
    ['-5', 0],
    ['42.6', 43],
  ])('clamps and rounds hh=%s to %d', (raw, want) => {
    expect(deserialize(`#/?hh=${raw}&bg=${raw}`).hullHint).toBe(want);
    expect(deserialize(`#/?hh=${raw}&bg=${raw}`).sky).toBe(want);
  });

  it('opens the bearing view at 0.5 nm and keeps a range in the URL', () => {
    expect(DEFAULT_STATE.range).toBe(0.5);
    expect(serialize(DEFAULT_STATE)).not.toContain('rg=');
    const s = deserialize('#/sandbox?view=bearing&rg=3');
    expect(s.range).toBe(3);
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
    expect(deserialize(`#/?rg=${raw}`).range).toBe(want);
  });

  it.each(['x', '', 'NaN'])('ignores a non-number hh/bg (%j)', (raw) => {
    const s = deserialize(`#/?hh=${raw}&bg=${raw}`);
    expect(s.hullHint).toBe(DEFAULT_STATE.hullHint);
    expect(s.sky).toBe(DEFAULT_STATE.sky);
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
    const state: AppState = {
      ...DEFAULT_STATE,
      mode: 'rules',
      rulePath: '27(a)(i)',
    };
    const url = serialize(state);
    expect(url).toContain('/rules/');
    expect(deserialize(url).rulePath).toBe('27(a)(i)');
  });

  it('tolerates junk', () => {
    expect(deserialize('#/nonsense?th=abc&len=xyz').mode).toBe('sandbox');
    expect(deserialize('').theta).toBe(DEFAULT_STATE.theta);
    expect(deserialize('#/sandbox?tl=abc').tilt).toBe(DEFAULT_STATE.tilt);
  });

  it('keeps the tilt between the waterline and overhead', () => {
    expect(deserialize('#/sandbox?tl=-20').tilt).toBe(0);
    expect(deserialize('#/sandbox?tl=200').tilt).toBe(85);
    expect(serialize({ ...DEFAULT_STATE, tilt: 40, view: 'bearing' })).toContain('tl=40');
  });

  it.each(['profile', 'bearing', 'plan'] as const)('round-trips the %s view', (view) => {
    expect(deserialize(serialize({ ...DEFAULT_STATE, view })).view).toBe(view);
  });

  it('reads the retired Model tab as the merged bearing view, and junk as the default', () => {
    expect(deserialize('#/sandbox?view=model').view).toBe('bearing');
    expect(deserialize('#/sandbox?view=bogus').view).toBe(DEFAULT_STATE.view);
  });

  it('round-trips Benchy in place of her own model, and leaves it off by default', () => {
    const state = { ...DEFAULT_STATE, view: 'bearing' as const, benchy: true };
    expect(deserialize(serialize(state))).toEqual(state);
    expect(deserialize(serialize(DEFAULT_STATE)).benchy).toBe(false);
    expect(deserialize('#/sandbox?view=bearing&bn=0').benchy).toBe(false);
  });

  it('reads the retired Benchy tab as the bearing view with Benchy on', () => {
    const state = deserialize('#/sandbox?view=benchy&tl=30');
    expect(state.view).toBe('bearing');
    expect(state.benchy).toBe(true);
    expect(state.tilt).toBe(30);
  });

  it('round-trips the merged view with its camera and night settings', () => {
    const state = { ...DEFAULT_STATE, view: 'bearing' as const, theta: 135, tilt: 25, hullHint: 0, sky: 60 };
    expect(deserialize(serialize(state))).toEqual(state);
  });

  it('drops an out-of-range enum param instead of producing a fact evaluate() rejects', () => {
    // Regression for a hand-edited/stale URL like #/sandbox?p=bogus: the
    // engine's validateFacts() throws on an unrecognized enum value, and
    // nothing upstream (Sandbox.tsx's useMemo) catches it.
    const state = deserialize('#/sandbox?p=bogus&pos=underway');
    expect(state.facts['fact:propulsion']).toBe(DEFAULT_FACTS['fact:propulsion']);
    expect(() => evaluateDisplay(state.facts)).not.toThrow();
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
    expect(DEFAULT_STATE.bearingAside).toBe(true);
    expect(serialize(DEFAULT_STATE)).not.toContain('ba=');
    const hidden = { ...DEFAULT_STATE, bearingAside: false };
    expect(serialize(hidden)).toContain('ba=0');
    expect(deserialize(serialize(hidden)).bearingAside).toBe(false);
    expect(deserialize('#/sandbox?ba=junk').bearingAside).toBe(true);
  });

  it('round-trips the picked mesh for every hull, and omits the default', async () => {
    const { allHulls } = await import('nav-wright');
    const { modelVariantsForHull, pickMesh } = await import('../render/hullModels');
    expect(serialize(DEFAULT_STATE)).not.toContain('ms=');
    for (const hull of Object.values(allHulls)) {
      for (const v of modelVariantsForHull(hull)) {
        const url = serialize({ ...DEFAULT_STATE, mesh: v.name });
        expect(deserialize(url).mesh).toBe(v.name);
      }
      const mesh = pickMesh(hull, () => 0.7);
      expect(deserialize(serialize({ ...DEFAULT_STATE, mesh })).mesh).toBe(mesh);
    }
  });
});

describe('readable routes (#107)', () => {
  it('quiz seed, question and direction round-trip', () => {
    const s = deserialize('#/quiz/7/3?dir=reverse');
    expect([s.mode, s.quizSeed, s.quizN, s.quizDirection]).toEqual(['quiz', 7, 3, 'reverse']);
    expect(serialize(s)).toMatch(/^#\/quiz\/7\/3\?.*dir=reverse/);
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it('bare #/quiz keeps working', () => {
    const s = deserialize('#/quiz');
    expect([s.quizSeed, s.quizN]).toEqual([1, 1]);
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
  it('the sprint-1 query form of a preset still resolves', () => {
    const s = deserialize('#/sandbox?p=power&a=trawling&pos=underway&mw=1&len=30');
    expect(s.facts['fact:activity']).toBe('activity:trawling');
  });
});
