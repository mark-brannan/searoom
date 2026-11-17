// Unlawful displays (#212): every one the quiz shows is unlawful by the
// engine's own account, and every "why" counted right really mends it.

import { describe, expect, it } from 'vitest';
import { identifyCandidates } from './identify';
import type { SeenLight } from './identify';
import { visibleLights } from './quiz';
import { questionFor } from './quizProgress';
import type { ReverseQuestion } from './quiz';
import {
  UNLAWFUL_SHARE,
  explainUnlawful,
  isLawfulView,
  oneChange,
} from './unlawful';
import { BASE_JURISDICTION } from '../data/jurisdictions';

const J = BASE_JURISDICTION;
const asSeen = (ls: { color: string; flashing: boolean }[]): SeenLight[] =>
  ls.map((l) => ({
    color: l.color as SeenLight['color'],
    flashing: l.flashing,
  }));

const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);
const questions = SEEDS.map(
  (s) => questionFor(s, true, J, 'extreme') as ReverseQuestion,
);
const unlawful = questions.filter((q) => q.unlawful);

describe('judged questions', () => {
  it('about one in five shows an unlawful display', () => {
    const share = unlawful.length / questions.length;
    expect(share).toBeGreaterThan(UNLAWFUL_SHARE - 0.08);
    expect(share).toBeLessThan(UNLAWFUL_SHARE + 0.08);
  });

  it.each(unlawful.map((q) => [q.fixtureName, q] as const))(
    '%s: no lawful vessel in scope shows the scene from any bearing',
    (_, q) => {
      const shown = visibleLights(q.facts, q.unlawful!.shown, q.theta);
      expect(shown.length).toBeGreaterThan(0);
      expect(isLawfulView(shown, J)).toBe(false);
      // Identify, matching independently, finds no candidate either
      expect(identifyCandidates(asSeen(shown), J)).toEqual([]);
    },
  );

  it.each(unlawful.map((q) => [q.fixtureName, q] as const))(
    '%s: one change from the lawful display; the right "why" answers are the kinds that mend it',
    (_, q) => {
      const before = visibleLights(q.facts, q.display, q.theta);
      const after = visibleLights(q.facts, q.unlawful!.shown, q.theta);
      expect(oneChange(before, after)).toEqual(q.unlawful!.reason);
      expect(q.unlawful!.mends).toContain(q.unlawful!.reason.kind);
      const kinds = new Set(explainUnlawful(after, J).map((e) => e.kind));
      expect(new Set(q.unlawful!.mends)).toEqual(kinds);
    },
  );

  it('a lawful question keeps a scene that Identify can explain', () => {
    for (const q of questions.filter((q) => !q.unlawful)) {
      const shown = visibleLights(q.facts, q.display, q.theta);
      expect(isLawfulView(shown, J)).toBe(true);
    }
  });

  it('the same seed gives the same question', () => {
    expect(questionFor(7, true, J)).toEqual(questionFor(7, true, J));
  });
});

describe('explainUnlawful', () => {
  const w = { color: 'white', flashing: false };
  const r = { color: 'red', flashing: false };
  const g = { color: 'green', flashing: false };

  it('a power vessel head-on is lawful and needs no reason', () => {
    expect(isLawfulView([w, r, g], J)).toBe(true);
    expect(explainUnlawful([w, r, g], J)).toEqual([]);
  });

  it('every reason it gives mends the view into a lawful one', () => {
    const lights = [w, g, g, g, g];
    expect(isLawfulView(lights, J)).toBe(false);
    const reasons = explainUnlawful(lights, J);
    expect(reasons.length).toBeGreaterThan(0);
    for (const e of reasons) {
      const ex = visibleLights(
        e.example.facts,
        e.example.display,
        e.example.theta,
      );
      expect(isLawfulView(ex, J)).toBe(true);
      expect(oneChange(ex, lights)?.kind).toBe(e.kind);
    }
  });
});
