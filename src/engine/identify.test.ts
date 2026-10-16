// Arrangement-aware Identify (#118): order matters, masthead differs from
// all-round, and the matcher reads the same visible lights as the reverse quiz.

import { describe, expect, it } from 'vitest';
import { identifyCandidates } from './identify';
import type { Candidate, SeenLight } from './identify';
import { makeReverse, visibleLights } from './quiz';

const w: SeenLight = { color: 'white', flashing: false };
const r: SeenLight = { color: 'red', flashing: false };

const activities = (cs: Candidate[]) =>
  new Set(cs.map((c) => c.facts['fact:activity']));

describe('identify: vertical order', () => {
  it('white over red is the pilot vessel, not the fishing vessel', () => {
    const a = activities(identifyCandidates([w, r], undefined, 'vertical'));
    expect(a.has('activity:pilot')).toBe(true);
    expect(a.has('activity:fishing')).toBe(false);
    expect(a.has('activity:trawling')).toBe(false);
  });

  it('red over white is the fishing vessel', () => {
    const a = activities(identifyCandidates([r, w], undefined, 'vertical'));
    expect(a.has('activity:fishing')).toBe(true);
  });

  it('two whites in a vertical line cannot be told from the towing cases', () => {
    const cs = identifyCandidates([w, w], undefined, 'vertical');
    const tows = cs.filter((c) => c.facts['fact:activity'] === 'activity:towing');
    expect(tows.length).toBeGreaterThan(0);
    expect(cs.length).toBeGreaterThan(tows.length);
  });

  it('the free build still ignores order (white + red finds fishing)', () => {
    const a = activities(identifyCandidates([w, r]));
    expect(a.has('activity:fishing')).toBe(true);
  });
});

describe('identify: masthead versus all-round', () => {
  it('one white all-round is an anchored vessel; one white masthead is not', () => {
    const allRound = identifyCandidates([{ ...w, kind: 'all_round' }]);
    const mast = identifyCandidates([{ ...w, kind: 'masthead' }]);
    const anchored = (cs: Candidate[]) =>
      cs.some((c) => c.facts['fact:position'] === 'position:anchored');
    expect(anchored(allRound)).toBe(true);
    expect(anchored(mast)).toBe(false);
  });

  it('an unspecified kind matches both', () => {
    const any = identifyCandidates([w]).length;
    const a = identifyCandidates([{ ...w, kind: 'all_round' }]).length;
    const m = identifyCandidates([{ ...w, kind: 'masthead' }]).length;
    expect(any).toBeGreaterThanOrEqual(Math.max(a, m));
  });
});

describe('identify agrees with the reverse quiz', () => {
  for (let seed = 1; seed <= 10; seed++) {
    it(`seed ${seed}: the quiz scene is among the candidates for what it shows`, () => {
      const q = makeReverse(seed);
      const seen: SeenLight[] = visibleLights(q.facts, q.display, q.theta).map(
        (l) => ({ color: l.color as SeenLight['color'], flashing: l.flashing }),
      );
      const cs = identifyCandidates(seen);
      expect(
        cs.some(
          (c) =>
            c.thetas.includes(q.theta) &&
            c.facts['fact:activity'] === q.facts['fact:activity'] &&
            c.facts['fact:position'] === q.facts['fact:position'],
        ),
      ).toBe(true);
    });
  }
});
