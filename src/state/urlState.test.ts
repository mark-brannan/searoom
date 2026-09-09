import { describe, expect, it } from 'vitest';
import { evaluateDisplay } from 'colregs-engine';
import { DEFAULT_FACTS, DEFAULT_STATE, deserialize, serialize } from './urlState';
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
      hullHint: false,
      drawer: true,
    };
    expect(deserialize(serialize(state))).toEqual(state);
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
    expect(serialize({ ...DEFAULT_STATE, tilt: 40, view: 'benchy' })).toContain('tl=40');
  });

  it('drops an out-of-range enum param instead of producing a fact evaluate() rejects', () => {
    // Regression for a hand-edited/stale URL like #/sandbox?p=bogus: the
    // engine's validateFacts() throws on an unrecognized enum value, and
    // nothing upstream (Sandbox.tsx's useMemo) catches it.
    const state = deserialize('#/sandbox?p=bogus&pos=underway');
    expect(state.facts['fact:propulsion']).toBe(DEFAULT_FACTS['fact:propulsion']);
    expect(() => evaluateDisplay(state.facts)).not.toThrow();
  });
});
