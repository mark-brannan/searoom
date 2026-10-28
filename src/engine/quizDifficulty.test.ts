import { describe, expect, it } from 'vitest';
import { JURISDICTIONS } from '../data/jurisdictions';
import {
  DIFFICULTY_LEVELS,
  QUIZ_DIFFICULTIES,
  makeForward,
  makeReverse,
  scenarioPoolAt,
} from './quiz';
import type { FactRecord } from './types';
import { drillDifficulty, nextDrillSeed, questionFor, rulesInPool, rulesOfCite } from './quizProgress';
import { deserialize, serialize } from '../state/urlState';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const CHANGED = ['fact:activity', 'fact:propulsion', 'fact:position'] as const;
const changesEverydayFact = (a: FactRecord, b: FactRecord) =>
  CHANGED.some((k) => a[k] !== b[k]);
const isEasy = DIFFICULTY_LEVELS.easy.scenario;

describe.each(JURISDICTIONS.map((j) => j.id))('difficulty in %s', (j) => {
  it.each(QUIZ_DIFFICULTIES)('%s: both directions generate for seeds 1..60', (d) => {
    for (const s of SEEDS) {
      expect(() => makeForward(s, j, d)).not.toThrow();
      expect(() => makeReverse(s, j, d)).not.toThrow();
    }
  });

  it('easy forward: everyday scenarios, at most 3 options, distractors change activity, propulsion or position', () => {
    for (const s of SEEDS) {
      const q = makeForward(s, j, 'easy');
      if (q.difficulty !== 'easy') continue; // widened: checked below
      expect(isEasy(q.facts)).toBe(true);
      expect(q.options.length).toBeLessThanOrEqual(3);
      for (const o of q.distractors) expect(changesEverydayFact(q.facts, o.facts)).toBe(true);
    }
  });

  it('easy reverse: everyday scenarios, square bearings, at most 3 options', () => {
    for (const s of SEEDS) {
      const q = makeReverse(s, j, 'easy');
      if (q.difficulty !== 'easy') continue;
      expect(isEasy(q.facts)).toBe(true);
      expect(q.options.length).toBeLessThanOrEqual(3);
      for (const o of q.options) {
        expect([0, 90, 180, 270]).toContain(o.theta);
        if (o.facts !== q.facts) expect(changesEverydayFact(q.facts, o.facts)).toBe(true);
      }
    }
  });

  it('a widened question only ever goes harder, and only when the easy pool could not make one', () => {
    for (const s of SEEDS) {
      for (const q of [makeForward(s, j, 'easy'), makeReverse(s, j, 'easy')]) {
        expect(QUIZ_DIFFICULTIES).toContain(q.difficulty);
        if (q.difficulty !== 'easy') expect(isEasy(q.facts)).toBe(false);
      }
    }
  });

  it('medium leaves out the rarest activities and exotic vessels', () => {
    for (const c of scenarioPoolAt(j, 'medium')) {
      expect(['activity:mine', 'activity:diving', 'activity:ram_underwater']).not.toContain(
        c.facts['fact:activity'],
      );
      expect(c.facts['fact:wig']).not.toBe(true);
      expect(c.facts['fact:composite_unit']).not.toBe(true);
    }
  });
});

describe('difficulty pools', () => {
  it('easy is a non-empty subset of medium, medium of hard', () => {
    const names = (d: (typeof QUIZ_DIFFICULTIES)[number]) =>
      new Set(scenarioPoolAt('intl', d).map((c) => c.name));
    const [e, m, h] = QUIZ_DIFFICULTIES.map(names);
    expect(e.size).toBeGreaterThan(0);
    expect([...e].every((n) => m.has(n))).toBe(true);
    expect([...m].every((n) => h.has(n))).toBe(true);
    expect(e.size).toBeLessThan(m.size);
    expect(m.size).toBeLessThan(h.size);
  });

  it('a drilled rule easy never asks about widens to a level that does', () => {
    const hardOnly = rulesInPool('intl').find((r) => !rulesInPool('intl', 'easy').includes(r));
    expect(hardOnly).toBeTruthy();
    const level = drillDifficulty('intl', hardOnly!, 'easy');
    expect(level).not.toBe('easy');
    const s = nextDrillSeed(1, false, 'intl', {}, hardOnly!, level);
    expect(rulesOfCite(questionFor(s, false, 'intl', level).cite)).toContain(hardOnly);
  });
});

describe('hard is the quiz as it was', () => {
  // recorded from the generator before difficulty existed
  it.each([
    [1, 'constrained by draft, by day', 0, 3],
    [2, 'Rule 35(c): sailing vessel 15 m in restricted visibility', 0, 4],
    [7, 'same yacht motoring', 0, 4],
  ])('forward seed %i', (seed, name, answerIndex, options) => {
    const q = makeForward(seed);
    expect([q.fixtureName, q.answerIndex, q.options.length]).toEqual([name, answerIndex, options]);
    expect(makeForward(seed, 'intl', 'hard')).toEqual(q);
  });

  it.each([
    [1, 'Rule 35(c): sailing vessel 15 m in restricted visibility', 90, 1, 4],
    [2, 'trawler 30 m drifting', 0, 2, 4],
    [3, 'Rule 35(e): the same tow unmanned -- she sounds nothing', 45, 0, 4],
  ])('reverse seed %i', (seed, name, theta, answerIndex, options) => {
    const q = makeReverse(seed);
    expect([q.fixtureName, q.theta, q.answerIndex, q.options.length]).toEqual([
      name,
      theta,
      answerIndex,
      options,
    ]);
  });
});

describe('difficulty in the URL', () => {
  it.each(['medium', 'hard'] as const)('%s round-trips', (d) => {
    const s = { ...deserialize('#/quiz'), quizDifficulty: d };
    expect(deserialize(serialize(s)).quizDifficulty).toBe(d);
  });

  it('a new run starts on easy and junk falls back to easy', () => {
    expect(deserialize('#/quiz').quizDifficulty).toBe('easy');
    expect(deserialize('#/quiz?qd=cheat').quizDifficulty).toBe('easy');
    expect(deserialize('#/quiz?qd=').quizDifficulty).toBe('easy');
    expect(serialize({ ...deserialize('#/quiz'), quizDifficulty: 'easy' })).not.toContain('qd=');
  });
});
