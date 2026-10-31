import { describe, expect, it } from 'vitest';
import { JURISDICTIONS } from '../data/jurisdictions';
import { selectHull } from 'nav-wright';
import {
  DIFFICULTY_LEVELS,
  QUIZ_DIFFICULTIES,
  displaySignature,
  forwardHull,
  isRecreational,
  makeForward,
  makeReverse,
  scenarioPoolAt,
  scenarioPoolFor,
} from './quiz';
import type { FactRecord } from './types';
import { drillDifficulty, drillSeedAt, nextDrillSeed, questionFor, rulesInPool, rulesOfCite } from './quizProgress';
import { deserialize, serialize } from '../state/urlState';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const CHANGED = ['fact:activity', 'fact:propulsion', 'fact:position', 'fact:length_m'] as const;
const changesEverydayFact = (a: FactRecord, b: FactRecord) =>
  CHANGED.some((k) => a[k] !== b[k]);
const isEasy = DIFFICULTY_LEVELS.easy.scenario;
const isMedium = DIFFICULTY_LEVELS.medium.scenario;

it('easy scenarios are recreational: power, sail or oars, doing nothing, underway or anchored, under 20 m', () => {
  const base: FactRecord = {
    'fact:propulsion': 'propulsion:power',
    'fact:activity': 'activity:none',
    'fact:position': 'position:underway',
    'fact:length_m': 15,
  };
  expect(isEasy(base)).toBe(true);
  expect(isEasy({ ...base, 'fact:propulsion': 'propulsion:sail' })).toBe(true);
  expect(isEasy({ ...base, 'fact:propulsion': 'propulsion:oars' })).toBe(true);
  expect(isEasy({ ...base, 'fact:position': 'position:anchored' })).toBe(true);
  expect(isEasy({ ...base, 'fact:activity': 'activity:fishing' })).toBe(false);
  expect(isEasy({ ...base, 'fact:activity': 'activity:trawling' })).toBe(false);
  expect(isEasy({ ...base, 'fact:activity': 'activity:towing' })).toBe(false);
  expect(isEasy({ ...base, 'fact:position': 'position:aground' })).toBe(false);
  expect(isEasy({ ...base, 'fact:tow_length_m': 150 })).toBe(false);
  expect(isEasy({ ...base, 'fact:length_m': 20 })).toBe(false);
});

it('medium scenarios are everyday traffic in good visibility: no tows, restricted vessels or exotics', () => {
  const base: FactRecord = {
    'fact:propulsion': 'propulsion:power',
    'fact:activity': 'activity:trawling',
    'fact:position': 'position:underway',
    'fact:length_m': 30,
  };
  expect(isMedium(base)).toBe(true);
  expect(isMedium({ ...base, 'fact:activity': 'activity:towing' })).toBe(true);
  expect(isMedium({ ...base, 'fact:activity': 'activity:pushing' })).toBe(false);
  expect(isMedium({ ...base, 'fact:activity': 'activity:being_towed' })).toBe(false);
  expect(isMedium({ ...base, 'fact:activity': 'activity:ram' })).toBe(false);
  expect(isMedium({ ...base, 'fact:activity': 'activity:cbd' })).toBe(false);
  expect(isMedium({ ...base, 'fact:position': 'position:aground' })).toBe(false);
  expect(isMedium({ ...base, 'fact:visibility': 'visibility:restricted' })).toBe(false);
});

describe('easy keeps unusual and commercial options rare', () => {
  const MANY = Array.from({ length: 200 }, (_, i) => i + 1);
  it.each(['intl', 'us/inland'])('%s: at most one per question, in under a third of questions', (j) => {
    let withUnusual = 0;
    let total = 0;
    for (const s of MANY) {
      for (const q of [makeForward(s, j, 'easy'), makeReverse(s, j, 'easy')]) {
        const facts: FactRecord[] = q.options.map((o) => o.facts);
        const unusual = facts.filter((f) => !isRecreational(f)).length;
        expect(unusual).toBeLessThanOrEqual(1);
        total++;
        if (unusual > 0) withUnusual++;
      }
    }
    expect(withUnusual / total).toBeLessThan(1 / 3);
  });

  it('asks some length questions: the same kind of yacht, a different size', () => {
    const lengthOnly = MANY.map((s) => makeForward(s, 'intl', 'easy')).filter((q) =>
      q.distractors.some(
        (d) =>
          d.facts['fact:length_m'] !== q.facts['fact:length_m'] &&
          d.facts['fact:propulsion'] === q.facts['fact:propulsion'] &&
          d.facts['fact:activity'] === q.facts['fact:activity'],
      ),
    );
    expect(lengthOnly.length).toBeGreaterThan(0);
  });
});

describe('every option in a forward question is drawn on one hull', () => {
  it.each(QUIZ_DIFFICULTIES)('%s: the asked vessel\'s hull, and the options still differ on it', (d) => {
    let ownHullDiffers = 0;
    for (const s of SEEDS) {
      const q = makeForward(s, 'intl', d);
      const shared = forwardHull(q);
      expect(shared.spec.id).toBe(selectHull(q.facts).spec.id);
      const sigs = q.options.map((o) => displaySignature(o.facts, o.display, q.facts));
      expect(new Set(sigs).size).toBe(q.options.length);
      if (q.options.some((o) => selectHull(o.facts).spec.id !== shared.spec.id)) ownHullDiffers++;
    }
    // drawn on their own hulls, some options would have shown a different silhouette
    if (d !== 'easy') expect(ownHullDiffers).toBeGreaterThan(0);
  });
});

describe.each(JURISDICTIONS.map((j) => j.id))('difficulty in %s', (j) => {
  it.each(QUIZ_DIFFICULTIES)('%s: both directions generate for seeds 1..60', (d) => {
    for (const s of SEEDS) {
      expect(() => makeForward(s, j, d)).not.toThrow();
      expect(() => makeReverse(s, j, d)).not.toThrow();
    }
  });

  it('easy forward: everyday scenarios, at most 3 options, distractors change activity, propulsion, position or length', () => {
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

  it('medium reverse: no near-ahead bearings', () => {
    for (const s of SEEDS) {
      const q = makeReverse(s, j, 'medium');
      if (q.difficulty !== 'medium') continue;
      for (const o of q.options) expect([0, 45, 90, 135, 180, 225, 270, 315]).toContain(o.theta);
    }
  });

  it('hard leaves out the rarest activities and exotic vessels', () => {
    for (const c of scenarioPoolAt(j, 'hard')) {
      expect(['activity:mine', 'activity:diving', 'activity:ram_underwater']).not.toContain(
        c.facts['fact:activity'],
      );
      expect(c.facts['fact:wig']).not.toBe(true);
      expect(c.facts['fact:composite_unit']).not.toBe(true);
    }
  });
});

describe('difficulty pools', () => {
  it('each level is a non-empty strict subset of the next', () => {
    const names = (d: (typeof QUIZ_DIFFICULTIES)[number]) =>
      new Set(scenarioPoolAt('intl', d).map((c) => c.name));
    const pools = QUIZ_DIFFICULTIES.map(names);
    expect(pools[0].size).toBeGreaterThan(0);
    for (let i = 1; i < pools.length; i++) {
      expect([...pools[i - 1]].every((n) => pools[i].has(n))).toBe(true);
      expect(pools[i - 1].size).toBeLessThan(pools[i].size);
    }
  });

  it('extreme admits every scenario', () => {
    expect(scenarioPoolAt('intl', 'extreme')).toEqual(scenarioPoolFor('intl'));
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

describe('a drill changing level', () => {
  const asks = (s: number, level: (typeof QUIZ_DIFFICULTIES)[number]) =>
    rulesOfCite(questionFor(s, false, 'intl', level).cite);

  it('re-picks a seed whose question at the new level asks about the drilled rule', () => {
    // find an extreme drill seed whose easy-level question is about another rule
    let found: { rule: string; seed: number } | undefined;
    for (const rule of rulesInPool('intl', 'easy')) {
      for (let after = 0; after < 40 && !found; after++) {
        const seed = nextDrillSeed(after, false, 'intl', {}, rule, 'extreme');
        if (!asks(seed, 'easy').includes(rule)) found = { rule, seed };
      }
      if (found) break;
    }
    expect(found).toBeTruthy();
    const { rule, seed } = found!;
    const level = drillDifficulty('intl', rule, 'easy');
    expect(asks(drillSeedAt(seed, false, 'intl', {}, rule, level), level)).toContain(rule);
  });

  it('keeps the seed when it still fits, or when no rule is drilled', () => {
    const rule = rulesInPool('intl', 'easy')[0];
    const seed = nextDrillSeed(0, false, 'intl', {}, rule, 'easy');
    expect(drillSeedAt(seed, false, 'intl', {}, rule, 'easy')).toBe(seed);
    expect(drillSeedAt(seed, false, 'intl', {}, '', 'easy')).toBe(seed);
  });
});

describe('extreme is the quiz as it was', () => {
  // recorded from the generator before difficulty existed
  it.each([
    [1, 'constrained by draft, by day', 0, 3],
    [2, 'Rule 35(c): sailing vessel 15 m in restricted visibility', 0, 4],
    [7, 'same yacht motoring', 0, 4],
  ])('forward seed %i', (seed, name, answerIndex, options) => {
    const q = makeForward(seed);
    expect([q.fixtureName, q.answerIndex, q.options.length]).toEqual([name, answerIndex, options]);
    expect(makeForward(seed, 'intl', 'extreme')).toEqual(q);
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
  it.each(['medium', 'hard', 'extreme'] as const)('%s round-trips', (d) => {
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
