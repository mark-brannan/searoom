import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAP_S,
  DURATION_S,
  patternDurationS,
  patternSignature,
  timeline,
  whistleBandFor,
  whistleHz,
  WHISTLE_BANDS,
} from './signalPattern';

describe('timeline', () => {
  it('starts at zero and spaces soundings by the default gap', () => {
    const t = timeline({ elements: [{ sound: 'short' }, { sound: 'short' }] });
    expect(t.map((s) => s.atS)).toEqual([0, DURATION_S.short + DEFAULT_GAP_S]);
  });

  it('honours a gap the rule names — 35(b)\'s two seconds', () => {
    const t = timeline({
      elements: [{ sound: 'prolonged', gapAfterS: 2 }, { sound: 'prolonged' }],
    });
    expect(t[1].atS).toBe(DURATION_S.prolonged + 2);
  });

  it('adds no trailing gap after the last sounding', () => {
    const one = patternDurationS({ elements: [{ sound: 'short' }] });
    expect(one).toBe(DURATION_S.short);
  });

  it('honours a per-element duration override', () => {
    const t = timeline({ elements: [{ sound: 'short', durationS: 0.8 }] });
    expect(t[0].durationS).toBe(0.8);
  });

  it('is empty for an empty pattern', () => {
    expect(timeline({ elements: [] })).toEqual([]);
    expect(patternDurationS({ elements: [] })).toBe(0);
  });
});

describe('Rule 32 durations', () => {
  it('makes a short blast about a second and a prolonged one four to six', () => {
    expect(DURATION_S.short).toBeCloseTo(1, 1);
    expect(DURATION_S.prolonged).toBeGreaterThanOrEqual(4);
    expect(DURATION_S.prolonged).toBeLessThanOrEqual(6);
  });
});

describe('patternSignature', () => {
  it('separates patterns that sound different', () => {
    const a = patternSignature({ elements: [{ sound: 'short' }] });
    const b = patternSignature({
      elements: [{ sound: 'short' }, { sound: 'short' }],
    });
    expect(a).not.toBe(b);
  });

  it('ignores the repetition interval, which is not part of the sound', () => {
    const a = patternSignature({ elements: [{ sound: 'prolonged' }] });
    const b = patternSignature({
      elements: [{ sound: 'prolonged' }],
      repeatEveryS: 120,
    });
    expect(a).toBe(b);
  });
});

describe('Annex III whistle bands', () => {
  it.each([
    [250, 200],
    [200, 200],
    [120, 75],
    [30, 20],
    [12, 0],
    [0, 0],
  ])('puts a %d m hull in the band from %d m', (lengthM, minLengthM) => {
    expect(whistleBandFor(lengthM).minLengthM).toBe(minLengthM);
  });

  it('sounds a bigger hull lower than a smaller one', () => {
    expect(whistleHz(250)).toBeLessThan(whistleHz(30));
    expect(whistleHz(120)).toBeLessThan(whistleHz(12));
  });

  it('keeps every pitch inside its own band', () => {
    for (const band of WHISTLE_BANDS) {
      const hz = whistleHz(band.minLengthM);
      expect(hz).toBeGreaterThanOrEqual(band.lowHz);
      expect(hz).toBeLessThanOrEqual(band.highHz);
    }
  });
});
