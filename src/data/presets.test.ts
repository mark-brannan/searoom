import { describe, expect, it } from 'vitest';
import { evaluateDisplayIn } from '../engine/evaluate';
import { PRESETS, presetFor } from './presets';
import { serialize, deserialize, DEFAULT_STATE } from '../state/urlState';
import appEn from '../i18n/en.json' with { type: 'json' };

describe('presets', () => {
  it('holds the design doc examples', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(
      expect.arrayContaining([
        'sloop',
        'trawler',
        'tug',
        'pilot',
        'anchor',
        'nuc',
        'ram',
      ]),
    );
  });

  for (const p of PRESETS) {
    it(`${p.id}: valid facts, named, and round-trips through the URL`, () => {
      expect(
        evaluateDisplayIn('intl', p.facts).displays.length,
      ).toBeGreaterThan(0);
      expect((appEn as Record<string, string>)[`preset.${p.id}`]).toBeTruthy();
      const back = deserialize(serialize({ ...DEFAULT_STATE, facts: p.facts }));
      expect(presetFor(back.facts)?.id).toBe(p.id);
    });
  }
});
