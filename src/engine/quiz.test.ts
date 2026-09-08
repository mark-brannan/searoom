// Quiz correctness-by-construction, and the language-neutrality proof:
// generation touches only data and ids, so no locale can change an answer
// (REQ-LANG-2 — the engine and generators never see a locale at all).

import { describe, expect, it } from 'vitest';
import { applicability } from '../data/colregs';
import { evaluate } from './evaluate';
import { displaySignature, makeForward, makeReverse, visibleSignature } from './quiz';
import { identifyCandidates } from './identify';

describe('forward quiz generation', () => {
  for (let seed = 1; seed <= 25; seed++) {
    it(`seed ${seed}: correct option is lawful, distractors are not`, () => {
      const q = makeForward(seed);
      const evaln = evaluate(applicability, q.facts);
      const lawful = new Set(
        evaln.displays.map((d) => displaySignature(q.facts, d)),
      );
      // the correct option is one of the scenario's lawful displays
      expect(lawful.has(displaySignature(q.facts, q.correct))).toBe(true);
      // every distractor is visually distinct from every lawful display
      for (const d of q.distractors) {
        expect(lawful.has(displaySignature(d.facts, d.display))).toBe(false);
      }
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options[q.answerIndex].display).toBe(q.correct);
    });
  }
});

describe('reverse quiz generation', () => {
  for (let seed = 1; seed <= 25; seed++) {
    it(`seed ${seed}: exactly one option matches the scene`, () => {
      const q = makeReverse(seed);
      const sceneSig = visibleSignature(q.facts, q.display, q.theta);
      expect(sceneSig).not.toBe('');
      let matches = 0;
      for (const o of q.options) {
        const evaln = evaluate(applicability, o.facts);
        const d = o.facts === q.facts ? q.display : evaln.displays[0];
        if (visibleSignature(o.facts, d, o.theta) === sceneSig) matches++;
      }
      expect(matches).toBe(1);
      expect(q.options[q.answerIndex].facts).toBe(q.facts);
    });
  }
});

describe('identify', () => {
  it('red over green at the masthead finds the sailing vessel', () => {
    const candidates = identifyCandidates([
      { color: 'red', flashing: false },
      { color: 'green', flashing: false },
    ]);
    expect(candidates.length).toBeGreaterThan(0);
    // 25(c) red-over-green seen from astern-ish where sidelights are hidden
    // is not possible (sternlight shows), but from ahead sidelights show;
    // the exact match is the 25(c) display where only the two all-rounds
    // plus nothing else are visible — impossible; instead check the classic:
    // red over green plus sidelights.
    const withSides = identifyCandidates([
      { color: 'red', flashing: false },
      { color: 'green', flashing: false },
      { color: 'red', flashing: false },
      { color: 'green', flashing: false },
    ]);
    const sail = withSides.filter(
      (c) => c.facts['fact:propulsion'] === 'propulsion:sail',
    );
    expect(sail.length).toBeGreaterThan(0);
  });

  it('single white light is honestly ambiguous', () => {
    const candidates = identifyCandidates([{ color: 'white', flashing: false }]);
    // anchor light, sternlight aspect, all-round white of a small boat …
    expect(candidates.length).toBeGreaterThan(2);
  });

  it('no lights, no candidates', () => {
    expect(identifyCandidates([])).toEqual([]);
  });
});
