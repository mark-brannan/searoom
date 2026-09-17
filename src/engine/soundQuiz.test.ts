import { describe, expect, it } from 'vitest';
import { patternSignature } from '../audio/signalPattern';
import { signals } from '../data/soundSignals';
import { distractorPool, makeSoundForward, makeSoundReverse } from './soundQuiz';

const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

describe.each([
  ['forward', makeSoundForward],
  ['reverse', makeSoundReverse],
] as const)('%s questions', (_name, make) => {
  it('puts the answer among the options', () => {
    for (const seed of seeds) {
      const q = make(seed);
      expect(q.options[q.answerIndex].id).toBe(q.signal.id);
    }
  });

  it('offers no option that sounds like the answer', () => {
    for (const seed of seeds) {
      const q = make(seed);
      const answer = patternSignature(q.signal.pattern);
      const others = q.options
        .filter((o) => o.id !== q.signal.id)
        .map((o) => patternSignature(o.pattern));
      expect(others).not.toContain(answer);
    }
  });

  it('offers at least three options, never a repeat', () => {
    for (const seed of seeds) {
      const q = make(seed);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
    }
  });

  it('is reproducible from its seed', () => {
    const a = make(7);
    const b = make(7);
    expect(b.signal.id).toBe(a.signal.id);
    expect(b.options.map((o) => o.id)).toEqual(a.options.map((o) => o.id));
  });

  it('cites the paragraph the signal comes from', () => {
    const q = make(3);
    expect(q.cite).toContain(q.signal.paragraph);
  });

  it('asks about more than one signal across a run', () => {
    const asked = new Set(seeds.map((s) => make(s).signal.id));
    expect(asked.size).toBeGreaterThan(5);
  });
});

describe('distractors', () => {
  it('prefers the same rule, then the same category', () => {
    const signal = signals.find((s) => s.id === '34a.port')!;
    const pool = distractorPool(signal, signals);
    expect(pool[0].rule).toBe('34');
    expect(pool.some((s) => s.rule === '35')).toBe(true);
  });

  it('never offers the signal itself', () => {
    for (const s of signals) {
      expect(distractorPool(s, signals).map((d) => d.id)).not.toContain(s.id);
    }
  });
});

describe('an unmodelled jurisdiction', () => {
  it('refuses rather than inventing a question', () => {
    expect(() => makeSoundForward(1, 'us/inland')).toThrow();
  });
});
