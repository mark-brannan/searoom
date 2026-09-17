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

/** Near-miss perturbations of a fact record. */
export function nearMisses(facts: FactRecord): FactRecord[] {
  const out: FactRecord[] = [];
  const push = (f: FactRecord) => out.push(f);

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
  for (const a of swaps[String(activity)] ?? []) {
    // `a` is a plain string here (indexed out of `swaps`), not the literal
    // union FactRecord's `fact:activity` carries — but every value in
    // `swaps` above is itself a real activity: identifier.
    push({ ...facts, 'fact:activity': a } as FactRecord);
  }
  const position = facts['fact:position'];
  if (position === 'position:underway') {
    push({ ...facts, 'fact:position': 'position:anchored' });
  } else if (position === 'position:anchored') {
    push({ ...facts, 'fact:position': 'position:underway', 'fact:making_way': true });
  }
  if (facts['fact:propulsion'] === 'propulsion:sail') {
    push({ ...facts, 'fact:propulsion': 'propulsion:power' });
  } else if (
    facts['fact:propulsion'] === 'propulsion:power' &&
    activity === 'activity:none'
  ) {
    push({ ...facts, 'fact:propulsion': 'propulsion:sail' });
  }
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
  facts: FactRecord;
  fixtureName: string;
  display: Display;
  theta: number;
  answerIndex: number;
  options: { facts: FactRecord; theta: number }[];
  cite: string;
}

export type QuizQuestion = ForwardQuestion | ReverseQuestion;

function citeOf(jurisdiction: string, d: Display): string {
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

export function makeForward(
  seed: number,
  jurisdiction: string = BASE_JURISDICTION,
): ForwardQuestion {
  const rng = mulberry32(seed);
  const scenarioPool = scenarioPoolFor(jurisdiction);
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
    for (const miss of nearMisses(fixture.facts)) {
      const missEval = evaluateDisplayIn(jurisdiction, miss);
      for (const d of missEval.displays) {
        if (d.lights.length === 0) continue;
        const sig = displaySignature(miss, d);
        if (lawfulSignatures.has(sig) || seen.has(sig)) continue;
        seen.add(sig);
        distractors.push({ display: d, facts: miss });
        break; // one display per near-miss keeps the spread wide
      }
      if (distractors.length >= 3) break;
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
  throw new Error('could not generate a forward question');
}

const THETAS = [0, 20, 45, 90, 135, 180, 225, 270, 315, 340];

export function makeReverse(
  seed: number,
  jurisdiction: string = BASE_JURISDICTION,
): ReverseQuestion {
  const rng = mulberry32(seed ^ 0x5eed);
  const scenarioPool = scenarioPoolFor(jurisdiction);
  for (let attempt = 0; attempt < 60; attempt++) {
    const fixture =
      scenarioPool[Math.floor(rng() * scenarioPool.length)];
    const evaln = evaluateDisplayIn(jurisdiction, fixture.facts);
    if (evaln.displays.length === 0) continue;
    const display =
      evaln.displays[Math.floor(rng() * evaln.displays.length)];
    if (display.lights.length === 0) continue;
    const theta = THETAS[Math.floor(rng() * THETAS.length)];
    const sceneSig = visibleSignature(fixture.facts, display, theta);
    if (sceneSig === '') continue;

    const options: { facts: FactRecord; theta: number }[] = [
      { facts: fixture.facts, theta },
    ];
    for (const miss of nearMisses(fixture.facts)) {
      if (options.length >= 4) break;
      const missEval = evaluateDisplayIn(jurisdiction, miss);
      if (missEval.displays.length === 0) continue;
      const d = missEval.displays[0];
      const missTheta = THETAS[Math.floor(rng() * THETAS.length)];
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
      facts: fixture.facts,
      fixtureName: fixture.name,
      display,
      theta,
      options,
      answerIndex,
      cite: citeOf(jurisdiction, display),
    };
  }
  throw new Error('could not generate a reverse question');
}
