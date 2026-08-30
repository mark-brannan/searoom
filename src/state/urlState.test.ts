import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, deserialize, serialize } from './urlState';
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
  });
});
