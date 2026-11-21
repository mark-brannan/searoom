// Arrangement-aware Identify (#118): order matters, masthead differs from
// all-round, and the matcher reads the same visible lights as the reverse quiz.

import { describe, expect, it } from 'vitest';
import { ambiguities, identifyByAnswers, identifyCandidates } from './identify';
import type { Answers, Candidate, SeenLight } from './identify';
import { makeReverse, visibleLights } from './quiz';

const w: SeenLight = { color: 'white', flashing: false };
const r: SeenLight = { color: 'red', flashing: false };

const activities = (cs: Candidate[]) =>
  new Set(cs.map((c) => c.facts['fact:activity']));

describe('identify: vertical order', () => {
  it('white over red is the pilot vessel, not the fishing vessel', () => {
    const cs = identifyCandidates([w, r], undefined, 'vertical');
    expect(activities(cs).has('activity:pilot')).toBe(true);
    // bow-on, an aground vessel's fore anchor light sits over its 30(d) reds
    const afloat = activities(
      cs.filter((c) => c.facts['fact:position'] !== 'position:aground'),
    );
    expect(afloat.has('activity:fishing')).toBe(false);
    expect(afloat.has('activity:trawling')).toBe(false);
  });

  it('red over white is the fishing vessel', () => {
    const a = activities(identifyCandidates([r, w], undefined, 'vertical'));
    expect(a.has('activity:fishing')).toBe(true);
  });

  it('two whites in a vertical line cannot be told from the towing cases', () => {
    const cs = identifyCandidates([w, w], undefined, 'vertical');
    const tows = cs.filter(
      (c) => c.facts['fact:activity'] === 'activity:towing',
    );
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

describe('identify: a vertical line is one line as seen from the bearing', () => {
  it('two whites in a vertical line are not an anchored vessel seen on the beam', () => {
    const anchoredAtBeam = identifyCandidates(
      [w, w],
      undefined,
      'vertical',
    ).some(
      (c) =>
        c.facts['fact:activity'] === 'activity:none' &&
        c.facts['fact:position'] === 'position:anchored' &&
        c.thetas.includes(90),
    );
    expect(anchoredAtBeam).toBe(false);
  });

  it('fore and aft lights still line up from dead ahead', () => {
    const anchoredAhead = identifyCandidates(
      [w, w],
      undefined,
      'vertical',
    ).some(
      (c) =>
        c.facts['fact:position'] === 'position:anchored' &&
        c.thetas.includes(0),
    );
    expect(anchoredAhead).toBe(true);
  });
});

const g: SeenLight = { color: 'green', flashing: false };
const at = (cs: Candidate[], theta: number) =>
  cs.filter((c) => c.thetas.includes(theta));

describe('identify: a horizontal pair, left to right as seen', () => {
  it('green left of red is a sailing vessel head-on', () => {
    const cs = at(identifyCandidates([g, r], undefined, 'horizontal'), 0);
    expect(
      cs.some((c) => c.facts['fact:propulsion'] === 'propulsion:sail'),
    ).toBe(true);
  });

  it('red left of green, head-on, is only a combined lantern', () => {
    const cs = at(identifyCandidates([r, g], undefined, 'horizontal'), 0);
    for (const c of cs) {
      expect(c.display.lights.some((l) => l.spec.combined)).toBe(true);
    }
  });
});

describe('identify: forward versus aft', () => {
  const mast = { ...w, kind: 'masthead' } as const;
  const power60 = (cs: Candidate[]) =>
    at(cs, 90).some(
      (c) =>
        c.facts['fact:propulsion'] === 'propulsion:power' &&
        c.facts['fact:activity'] === 'activity:none' &&
        Number(c.facts['fact:length_m']) >= 50,
    );

  it('a masthead light forward and one aft, on the beam, is a power vessel over 50 m', () => {
    const cs = identifyCandidates([
      { ...mast, seat: 'forward' },
      { ...mast, seat: 'aft' },
      g,
    ]);
    expect(power60(cs)).toBe(true);
  });

  it('two masthead lights both aft are not her', () => {
    const cs = identifyCandidates([
      { ...mast, seat: 'aft' },
      { ...mast, seat: 'aft' },
      g,
    ]);
    expect(power60(cs)).toBe(false);
  });
});

describe("identify: the what's-at-the-masthead questions", () => {
  const ask = (a: Partial<Answers>) =>
    activities(
      identifyByAnswers({ masthead: [], sidelights: 'none', others: [], ...a }),
    );

  it('white over red at the masthead, both sidelights, is the pilot vessel', () => {
    const a = ask({ masthead: [w, r], sidelights: 'both' });
    expect(a.has('activity:pilot')).toBe(true);
    expect(a.has('activity:fishing')).toBe(false);
  });

  it('red over white at the masthead, both sidelights, is fishing', () => {
    const a = ask({ masthead: [r, w], sidelights: 'both' });
    expect(a.has('activity:fishing')).toBe(true);
    expect(a.has('activity:pilot')).toBe(false);
  });

  it('one white all-round and nothing else is the anchored vessel', () => {
    const cs = identifyByAnswers({
      masthead: [],
      sidelights: 'none',
      others: [w],
    });
    expect(
      cs.some((c) => c.facts['fact:position'] === 'position:anchored'),
    ).toBe(true);
  });

  it('a masthead white, both sidelights and another white is a power vessel of 50 m or more', () => {
    const cs = identifyByAnswers({
      masthead: [w],
      sidelights: 'both',
      others: [w],
    });
    expect(
      cs.some(
        (c) =>
          c.facts['fact:propulsion'] === 'propulsion:power' &&
          c.facts['fact:activity'] === 'activity:none' &&
          Number(c.facts['fact:length_m']) >= 50,
      ),
    ).toBe(true);
  });

  it('nothing answered yet is no candidates', () => {
    expect(
      identifyByAnswers({ masthead: [], sidelights: 'none', others: [] }),
    ).toEqual([]);
  });
});

describe('identify: what stays indistinguishable, and why', () => {
  it('two whites in a vertical line: the note names the towing cases beside the others', () => {
    const groups = ambiguities(
      identifyCandidates([w, w], undefined, 'vertical'),
    );
    const withTow = groups.find(
      (gr) =>
        gr.members.some(
          (m) => m.facts['fact:activity'] === 'activity:towing',
        ) &&
        gr.members.some((m) => m.facts['fact:activity'] !== 'activity:towing'),
    );
    expect(withTow).toBeDefined();
    expect(withTow!.differ).toContain('activity');
    // another aspect tells them apart: the sidelights, the towing light
    expect(withTow!.partedFrom.length).toBeGreaterThan(0);
  });

  it('a fact one record leaves unset does not read as a difference', () => {
    const [c] = identifyCandidates([w, r], undefined, 'vertical').filter(
      (m) => m.facts['fact:making_way'] === true,
    );
    const { ['fact:making_way']: _, ...unset } = c.facts;
    const [group] = ambiguities([c, { ...c, facts: unset }]);
    expect(group.differ).not.toContain('making_way');
  });

  it('one situation from one aspect is no ambiguity', () => {
    expect(
      ambiguities(
        identifyCandidates([w, r], undefined, 'vertical').slice(0, 1),
      ),
    ).toEqual([]);
  });
});
