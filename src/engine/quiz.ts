// Quiz generation. Questions are generated from the data, never
// hand-written: scenarios come from the colregs fixture fact records, and
// distractors come from near-miss fact records — a threshold crossed, an
// activity swapped, making_way flipped, a different bearing. The drift
// test's adjacency structure as a distractor generator.

import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';
import { lights } from '../data/colregs';
import { BASE_JURISDICTION, resolveEntries } from '../data/jurisdictions';
import { evaluateDisplayIn } from './evaluate';
import type { Display, FactRecord } from './types';
import { bearingInArc, selectHull } from 'nav-wright';
import { placeLights } from '../render/navWright';

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: {
    name: string;
    facts: FactRecord;
    expect: string[];
    jurisdiction?: string;
  }[];
};

/** deterministic PRNG so a quiz run is reproducible */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A display's visual identity, independent of hull scale: the
 * colour/character multiset plus the vertical order of the all-round
 * stack (so red-over-white and white-over-red stay distinct, but the
 * same lights on a bigger hull don't masquerade as a different answer).
 */
export function displaySignature(facts: FactRecord, display: Display): string {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts, lights);
  const multiset = placed
    .map((l) => `${l.color}:${l.character}`)
    .sort()
    .join(',');
  const stack = placed
    .filter((l) => l.lightId === 'light:all_round' && l.py === 0)
    .sort((a, b) => b.z - a.z)
    .map((l) => l.color)
    .join('>');
  return `${multiset}|${stack}`;
}

/** Lights visible from bearing theta, as a colour/character multiset. */
export function visibleSignature(
  facts: FactRecord,
  display: Display,
  theta: number,
): string {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts, lights);
  return placed
    .filter((l) => bearingInArc(theta, l.arc) && l.lightId !== 'light:deck_lights')
    .map((l) => `${l.color}${l.character === 'flashing' ? '!' : ''}`)
    .sort()
    .join(',');
}

/** A light as seen from one bearing, with the arrangement facts Identify asks about. */
export interface VisibleLight {
  color: string;
  flashing: boolean;
  /** 'light:masthead' vs 'light:all_round' vs sidelights and so on */
  lightId: string;
  /** on the centreline, so it can sit in a vertical line with others */
  centreline: boolean;
  /** height; higher is on top of the stack */
  z: number;
  /**
   * Horizontal offset as the viewer sees it, in the hull's fore-aft units
   * (fx * sin theta): lights on one mast share it from every bearing, lights
   * fore and aft line up only from ahead or astern.
   */
  across: number;
}

/** Place a display once; callers then ask what shows from each bearing. */
export function placedVisibility(
  facts: FactRecord,
  display: Display,
): (theta: number) => VisibleLight[] {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts, lights).filter(
    (l) => l.lightId !== 'light:deck_lights',
  );
  return (theta) =>
    placed
      .filter((l) => bearingInArc(theta, l.arc))
      .map((l) => ({
        color: l.color,
        flashing: l.character === 'flashing',
        lightId: l.lightId,
        centreline: l.py === 0,
        z: l.z,
        across: l.fx * Math.sin((theta * Math.PI) / 180),
      }));
}

/** Lights visible from bearing theta, with arrangement. Same filter as visibleSignature. */
export function visibleLights(
  facts: FactRecord,
  display: Display,
  theta: number,
): VisibleLight[] {
  return placedVisibility(facts, display)(theta);
}

/** What a near miss changes; difficulty levels choose among these. */
export type NearMissKind =
  | 'length'
  | 'making_way'
  | 'activity'
  | 'position'
  | 'propulsion'
  | 'tow_length';

/** Near-miss perturbations of a fact record. */
export function nearMisses(facts: FactRecord): FactRecord[] {
  return taggedNearMisses(facts).map((m) => m.facts);
}

/** nearMisses, each with the kind of change that made it, in the same order. */
export function taggedNearMisses(
  facts: FactRecord,
): { kind: NearMissKind; facts: FactRecord }[] {
  const out: { kind: NearMissKind; facts: FactRecord }[] = [];
  let kind: NearMissKind = 'length';
  const push = (f: FactRecord) => out.push({ kind, facts: f });

  const len = facts['fact:length_m'];
  if (typeof len === 'number') {
    for (const threshold of [7, 12, 20, 50, 100]) {
      if (len < threshold) {
        push({ ...facts, 'fact:length_m': threshold + 5 });
        break;
      }
    }
    for (const threshold of [100, 50, 20, 12, 7]) {
      if (len >= threshold) {
        push({ ...facts, 'fact:length_m': threshold - 1 });
        break;
      }
    }
  }
  kind = 'making_way';
  if (typeof facts['fact:making_way'] === 'boolean') {
    push({ ...facts, 'fact:making_way': !facts['fact:making_way'] });
  }
  const activity = facts['fact:activity'];
  const swaps: Record<string, string[]> = {
    'activity:none': ['activity:fishing', 'activity:nuc', 'activity:pilot'],
    'activity:fishing': ['activity:trawling', 'activity:none'],
    'activity:trawling': ['activity:fishing', 'activity:none'],
    'activity:towing': ['activity:pushing', 'activity:none'],
    'activity:pushing': ['activity:towing', 'activity:none'],
    'activity:nuc': ['activity:ram', 'activity:none'],
    'activity:ram': ['activity:nuc', 'activity:cbd'],
    'activity:ram_underwater': ['activity:ram', 'activity:nuc'],
    'activity:cbd': ['activity:ram', 'activity:none'],
    'activity:mine': ['activity:ram', 'activity:none'],
    'activity:pilot': ['activity:none', 'activity:nuc'],
    'activity:diving': ['activity:ram_underwater', 'activity:none'],
    'activity:being_towed': ['activity:none'],
  };
  kind = 'activity';
  for (const a of swaps[String(activity)] ?? []) {
    // `a` is a plain string here (indexed out of `swaps`), not the literal
    // union FactRecord's `fact:activity` carries — but every value in
    // `swaps` above is itself a real activity: identifier.
    push({ ...facts, 'fact:activity': a } as FactRecord);
  }
  kind = 'position';
  const position = facts['fact:position'];
  if (position === 'position:underway') {
    push({ ...facts, 'fact:position': 'position:anchored' });
  } else if (position === 'position:anchored') {
    push({ ...facts, 'fact:position': 'position:underway', 'fact:making_way': true });
  }
  kind = 'propulsion';
  if (facts['fact:propulsion'] === 'propulsion:sail') {
    push({ ...facts, 'fact:propulsion': 'propulsion:power' });
  } else if (
    facts['fact:propulsion'] === 'propulsion:power' &&
    activity === 'activity:none'
  ) {
    push({ ...facts, 'fact:propulsion': 'propulsion:sail' });
  }
  kind = 'tow_length';
  const tow = facts['fact:tow_length_m'];
  if (typeof tow === 'number') {
    push({
      ...facts,
      'fact:tow_length_m': tow <= 200 ? 300 : 150,
    });
  }
  return out;
}

export interface ForwardQuestion {
  kind: 'forward';
  /** the level the question was made at: the asked one, or a harder one if that pool ran dry */
  difficulty: QuizDifficulty;
  facts: FactRecord;
  fixtureName: string;
  /** the lawful option (one of the scenario's displays) */
  correct: Display;
  correctFacts: FactRecord;
  /** unlawful-for-this-scenario displays from near-miss records */
  distractors: { display: Display; facts: FactRecord }[];
  /** index of the correct option after shuffling */
  answerIndex: number;
  options: { display: Display; facts: FactRecord }[];
  cite: string;
}

export interface ReverseQuestion {
  kind: 'reverse';
  /** as ForwardQuestion.difficulty */
  difficulty: QuizDifficulty;
  facts: FactRecord;
  fixtureName: string;
  display: Display;
  theta: number;
  answerIndex: number;
  options: { facts: FactRecord; theta: number }[];
  cite: string;
}

export type QuizQuestion = ForwardQuestion | ReverseQuestion;

export function citeOf(jurisdiction: string, d: Display): string {
  const byId = new Map(resolveEntries(jurisdiction).map((e) => [e.id, e]));
  return d.entries
    .map((id) => byId.get(id)?.cite)
    .filter(Boolean)
    .join(', ');
}

/**
 * Fixture cases that make good scenarios under one jurisdiction: the base's,
 * whose fact records are equally valid questions under a delta, plus the
 * ones pinned to this jurisdiction. A case pinned to a *third* jurisdiction
 * is left out — its facts may sit outside this rule set's vocabulary. Pure
 * boundary probes make dull questions.
 */
export function scenarioPoolFor(jurisdiction: string) {
  return fixtures.cases.filter((c) => {
    const own = c.jurisdiction ?? fixtures.jurisdiction;
    return (
      !c.name.includes('boundary') &&
      (own === jurisdiction || own === BASE_JURISDICTION)
    );
  });
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export const QUIZ_DIFFICULTIES: QuizDifficulty[] = ['easy', 'medium', 'hard'];

const ALL_THETAS = [0, 20, 45, 90, 135, 180, 225, 270, 315, 340];

/** Facts that make a vessel unusual; a scenario with any of them set is exotic. */
const EXOTIC_FACTS = [
  'fact:wig',
  'fact:wig_near_surface',
  'fact:seaplane',
  'fact:non_displacement',
  'fact:composite_unit',
  'fact:partly_submerged',
  'fact:full_display_impracticable',
  'fact:tow_display_impracticable',
  'fact:tow_restricts_deviation',
  'fact:nearing_obscured_bend',
  'fact:motorsailing',
] as const;

const isExotic = (f: FactRecord): boolean => {
  const bag = f as Record<string, unknown>;
  return EXOTIC_FACTS.some((k) => bag[k] === true);
};

/** Facts an everyday vessel's record may carry, beyond the exotic ones (which must be unset or false). */
const EASY_KEYS = new Set<string>([
  'fact:propulsion',
  'fact:activity',
  'fact:position',
  'fact:making_way',
  'fact:length_m',
  ...EXOTIC_FACTS,
]);

/** Values of other facts that leave an everyday vessel everyday. */
const EASY_BENIGN: Record<string, unknown> = {
  'fact:visibility': 'visibility:good',
  'fact:manned': true,
  'fact:near_channel': false,
  'fact:obstruction_exists': false,
  'fact:on_mooring_buoy': false,
};

interface Level {
  scenario: (f: FactRecord) => boolean;
  kinds: ReadonlySet<NearMissKind>;
  maxDistractors: number;
  thetas: number[];
}

export const DIFFICULTY_LEVELS: Record<QuizDifficulty, Level> = {
  easy: {
    scenario: (f) =>
      ['propulsion:power', 'propulsion:sail'].includes(String(f['fact:propulsion'])) &&
      String(f['fact:activity']) === 'activity:none' &&
      ['position:underway', 'position:anchored'].includes(String(f['fact:position'])) &&
      Number(f['fact:length_m'] ?? 0) < 20 &&
      !isExotic(f) &&
      Object.entries(f).every(
        ([k, v]) => EASY_KEYS.has(k) || (k in EASY_BENIGN && EASY_BENIGN[k] === v),
      ),
    kinds: new Set(['activity', 'propulsion', 'position']),
    maxDistractors: 2,
    thetas: [0, 90, 180, 270],
  },
  medium: {
    scenario: (f) =>
      !['activity:mine', 'activity:diving', 'activity:ram_underwater'].includes(
        String(f['fact:activity']),
      ) && !isExotic(f),
    kinds: new Set(['length', 'activity', 'position', 'propulsion', 'tow_length']),
    maxDistractors: 3,
    thetas: ALL_THETAS,
  },
  hard: {
    scenario: () => true,
    kinds: new Set(['length', 'making_way', 'activity', 'position', 'propulsion', 'tow_length']),
    maxDistractors: 3,
    thetas: ALL_THETAS,
  },
};

/** The scenario pool at one difficulty. */
export function scenarioPoolAt(jurisdiction: string, difficulty: QuizDifficulty) {
  const keep = DIFFICULTY_LEVELS[difficulty].scenario;
  return scenarioPoolFor(jurisdiction).filter((c) => keep(c.facts));
}

/** This level, then each harder one: a pool that can't make a question widens. */
function levelsFrom(difficulty: QuizDifficulty): QuizDifficulty[] {
  return QUIZ_DIFFICULTIES.slice(QUIZ_DIFFICULTIES.indexOf(difficulty));
}

export function makeForward(
  seed: number,
  jurisdiction: string = BASE_JURISDICTION,
  difficulty: QuizDifficulty = 'hard',
): ForwardQuestion {
  for (const level of levelsFrom(difficulty)) {
    const q = forwardAt(seed, jurisdiction, level);
    if (q) return q;
  }
  throw new Error('could not generate a forward question');
}

function forwardAt(
  seed: number,
  jurisdiction: string,
  difficulty: QuizDifficulty,
): ForwardQuestion | null {
  const rng = mulberry32(seed);
  const { kinds, maxDistractors } = DIFFICULTY_LEVELS[difficulty];
  const scenarioPool = scenarioPoolAt(jurisdiction, difficulty);
  if (scenarioPool.length === 0) return null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const fixture =
      scenarioPool[Math.floor(rng() * scenarioPool.length)];
    const evaln = evaluateDisplayIn(jurisdiction, fixture.facts);
    if (evaln.displays.length === 0 || evaln.displays[0].lights.length === 0)
      continue;
    const correct =
      evaln.displays[Math.floor(rng() * evaln.displays.length)];
    const lawfulSignatures = new Set(
      evaln.displays.map((d) => displaySignature(fixture.facts, d)),
    );
    const distractors: { display: Display; facts: FactRecord }[] = [];
    const seen = new Set<string>();
    for (const { kind, facts: miss } of taggedNearMisses(fixture.facts)) {
      if (!kinds.has(kind)) continue;
      const missEval = evaluateDisplayIn(jurisdiction, miss);
      for (const d of missEval.displays) {
        if (d.lights.length === 0) continue;
        const sig = displaySignature(miss, d);
        if (lawfulSignatures.has(sig) || seen.has(sig)) continue;
        seen.add(sig);
        distractors.push({ display: d, facts: miss });
        break; // one display per near-miss keeps the spread wide
      }
      if (distractors.length >= maxDistractors) break;
    }
    if (distractors.length < 2) continue;
    const options = [{ display: correct, facts: fixture.facts }, ...distractors];
    // Fisher-Yates with the seeded rng
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const answerIndex = options.findIndex((o) => o.display === correct);
    return {
      kind: 'forward',
      difficulty,
      facts: fixture.facts,
      fixtureName: fixture.name,
      correct,
      correctFacts: fixture.facts,
      distractors,
      options,
      answerIndex,
      cite: citeOf(jurisdiction, correct),
    };
  }
  return null;
}

export function makeReverse(
  seed: number,
  jurisdiction: string = BASE_JURISDICTION,
  difficulty: QuizDifficulty = 'hard',
): ReverseQuestion {
  for (const level of levelsFrom(difficulty)) {
    const q = reverseAt(seed, jurisdiction, level);
    if (q) return q;
  }
  throw new Error('could not generate a reverse question');
}

function reverseAt(
  seed: number,
  jurisdiction: string,
  difficulty: QuizDifficulty,
): ReverseQuestion | null {
  const rng = mulberry32(seed ^ 0x5eed);
  const { kinds, maxDistractors, thetas } = DIFFICULTY_LEVELS[difficulty];
  const scenarioPool = scenarioPoolAt(jurisdiction, difficulty);
  if (scenarioPool.length === 0) return null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const fixture =
      scenarioPool[Math.floor(rng() * scenarioPool.length)];
    const evaln = evaluateDisplayIn(jurisdiction, fixture.facts);
    if (evaln.displays.length === 0) continue;
    const display =
      evaln.displays[Math.floor(rng() * evaln.displays.length)];
    if (display.lights.length === 0) continue;
    const theta = thetas[Math.floor(rng() * thetas.length)];
    const sceneSig = visibleSignature(fixture.facts, display, theta);
    if (sceneSig === '') continue;

    const options: { facts: FactRecord; theta: number }[] = [
      { facts: fixture.facts, theta },
    ];
    for (const { kind, facts: miss } of taggedNearMisses(fixture.facts)) {
      if (options.length > maxDistractors) break;
      if (!kinds.has(kind)) continue;
      const missEval = evaluateDisplayIn(jurisdiction, miss);
      if (missEval.displays.length === 0) continue;
      const d = missEval.displays[0];
      const missTheta = thetas[Math.floor(rng() * thetas.length)];
      // a distractor must actually look different from the scene, or it
      // would also be a correct answer
      if (visibleSignature(miss, d, missTheta) === sceneSig) continue;
      options.push({ facts: miss, theta: missTheta });
    }
    if (options.length < 3) continue;
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const answerIndex = options.findIndex((o) => o.facts === fixture.facts);
    return {
      kind: 'reverse',
      difficulty,
      facts: fixture.facts,
      fixtureName: fixture.name,
      display,
      theta,
      options,
      answerIndex,
      cite: citeOf(jurisdiction, display),
    };
  }
  return null;
}
