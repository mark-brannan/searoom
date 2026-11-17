// Identify mode: the reverse direction. Given lights the user says they
// see (a colour/character multiset), find every fact record + bearing that
// could lawfully explain them. Ends at one answer or an honest "these are
// indistinguishable from this bearing" — which is true of the real Rules.

import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';
import { BASE_JURISDICTION } from '../data/jurisdictions';
import { evaluateDisplayIn } from './evaluate';
import { placedVisibility } from './quiz';
import type { VisibleLight } from './quiz';
import type { Display, FactRecord } from './types';
import { bearingLabel } from 'nav-wright';

type Aspect = ReturnType<typeof bearingLabel>;

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: { name: string; facts: FactRecord; jurisdiction?: string }[];
};

export interface SeenLight {
  color: 'white' | 'red' | 'green' | 'yellow';
  flashing: boolean;
  /** masthead (shows over an arc) versus all-round; unset when the user can't tell */
  kind?: 'masthead' | 'all_round';
  /** in her fore half or her after half; unset when the user can't tell */
  seat?: 'forward' | 'aft';
}

/**
 * How the seen lights relate. 'free': a bag of lights, order unknown.
 * 'vertical': the list is one vertical line, top to bottom, so "white over
 * red" is an order — it must appear, in that order, as a run of the
 * centreline lights visible from the bearing. 'horizontal': the list is
 * every light she shows, left to right as the viewer sees them.
 */
export type Arrangement = 'free' | 'vertical' | 'horizontal';

/** The "what's at the masthead?" flow: one question at a time. */
export interface Answers {
  /** the vertical line at the top of her centreline, top to bottom */
  masthead: SeenLight[];
  sidelights: 'none' | 'red' | 'green' | 'both';
  /** every other light she shows, order unknown */
  others: SeenLight[];
}

export interface Candidate {
  facts: FactRecord;
  display: Display;
  /** bearings (deg) from which the display shows exactly these lights */
  thetas: number[];
}

// The candidate pool: every fixture fact record (deduplicated), plus a
// small grid filling situations the boundary probes leave out.
function buildPool(jurisdiction: string): FactRecord[] {
  const pool: FactRecord[] = [];
  const seen = new Set<string>();
  const add = (f: FactRecord) => {
    const k = JSON.stringify(
      Object.entries(f).sort(([a], [b]) => a.localeCompare(b)),
    );
    if (!seen.has(k)) {
      seen.add(k);
      pool.push(f);
    }
  };
  // the base's fact records describe vessels under any jurisdiction; a case
  // pinned to a third one may carry facts outside this rule set
  for (const c of fixtures.cases) {
    const own = c.jurisdiction ?? fixtures.jurisdiction;
    if (own !== jurisdiction && own !== BASE_JURISDICTION) continue;
    add(c.facts);
  }
  for (const length of [6, 15, 60]) {
    add({
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': length,
    });
    add({
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:anchored',
      'fact:length_m': length,
    });
  }
  return pool;
}

const poolCache = new Map<string, FactRecord[]>();

function poolFor(jurisdiction: string): FactRecord[] {
  let hit = poolCache.get(jurisdiction);
  if (!hit) {
    hit = buildPool(jurisdiction);
    poolCache.set(jurisdiction, hit);
  }
  return hit;
}

const THETA_STEP = 5;

export function signatureOf(seen: SeenLight[]): string {
  return seen
    .map((l) => `${l.color}${l.flashing ? '!' : ''}`)
    .sort()
    .join(',');
}

const KIND_ID = {
  masthead: 'light:masthead',
  all_round: 'light:all_round',
} as const;

const fits = (s: SeenLight, v: VisibleLight): boolean =>
  s.color === v.color &&
  s.flashing === v.flashing &&
  (s.kind === undefined || KIND_ID[s.kind] === v.lightId) &&
  (s.seat === undefined || (s.seat === 'forward' ? v.along >= 0 : v.along <= 0));

/** Where the light sits across the viewer's field, larger to their right. */
const screenX = (v: VisibleLight, theta: number): number => {
  const t = (theta * Math.PI) / 180;
  return v.along * Math.sin(t) - v.py * Math.cos(t);
};

/**
 * Pair every seen light with a distinct visible one, all of them used.
 * `next` may refuse a pairing given the one before (left-to-right order).
 */
function pairsAll(
  seen: SeenLight[],
  visible: VisibleLight[],
  next?: (prev: VisibleLight | undefined, v: VisibleLight) => boolean,
): boolean {
  if (visible.length !== seen.length) return false;
  const used = new Array<boolean>(visible.length).fill(false);
  const go = (i: number, prev: VisibleLight | undefined): boolean => {
    if (i === seen.length) return true;
    for (let k = 0; k < visible.length; k++) {
      if (used[k] || !fits(seen[i], visible[k])) continue;
      if (next && !next(prev, visible[k])) continue;
      used[k] = true;
      if (go(i + 1, visible[k])) return true;
      used[k] = false;
    }
    return false;
  };
  return go(0, undefined);
}

/**
 * How far apart (in the hull's fore-aft units, where the hull spans 2) two
 * lights may look side to side and still read as one vertical line: about
 * 2% of the hull's length.
 */
const IN_LINE = 0.04;

const inOneLine = (run: VisibleLight[]): boolean => {
  const xs = run.map((v) => v.across);
  return Math.max(...xs) - Math.min(...xs) <= IN_LINE;
};

/** Do the seen lights explain exactly the visible ones, in this arrangement? */
export function matchesSeen(
  seen: SeenLight[],
  visible: VisibleLight[],
  arrangement: Arrangement,
  theta = 0,
): boolean {
  if (arrangement === 'vertical') return runAt(seen, stackOf(visible)) !== null;
  if (arrangement === 'horizontal')
    return pairsAll(
      seen,
      visible,
      (prev, v) =>
        prev === undefined ||
        screenX(prev, theta) <= screenX(v, theta) + IN_LINE,
    );
  return pairsAll(seen, visible);
}

const stackOf = (visible: VisibleLight[]): VisibleLight[] =>
  visible.filter((v) => v.centreline).sort((a, b) => b.z - a.z);

/** Where in the stack the seen lights run as one line, or null; `only` pins the start. */
function runAt(
  seen: SeenLight[],
  stack: VisibleLight[],
  only?: number,
): number | null {
  for (let i = only ?? 0; i + seen.length <= stack.length; i++) {
    const run = stack.slice(i, i + seen.length);
    if (inOneLine(run) && seen.every((s, j) => fits(s, run[j]))) return i;
    if (only !== undefined) break;
  }
  return null;
}

const SIDELIGHT_COLORS = {
  none: [],
  red: ['red'],
  green: ['green'],
  both: ['green', 'red'],
} as const;

/**
 * Do the answers account for every visible light: the masthead line as the
 * top of her centreline stack, the sidelights as said, the rest as listed?
 */
export function matchesAnswers(a: Answers, visible: VisibleLight[]): boolean {
  const isSide = (v: VisibleLight) => v.lightId.startsWith('light:sidelight');
  const sides = visible
    .filter(isSide)
    .map((v) => v.color)
    .sort();
  if (sides.join() !== SIDELIGHT_COLORS[a.sidelights].join()) return false;
  const rest = visible.filter((v) => !isSide(v));
  let left = rest;
  if (a.masthead.length > 0) {
    const stack = stackOf(rest);
    if (runAt(a.masthead, stack, 0) === null) return false;
    const taken = new Set(stack.slice(0, a.masthead.length));
    left = rest.filter((v) => !taken.has(v));
  }
  return pairsAll(a.others, left);
}

const answered = (a: Answers): boolean =>
  a.masthead.length + a.others.length > 0 || a.sidelights !== 'none';

function collect(
  jurisdiction: string,
  matches: (visible: VisibleLight[], theta: number) => boolean,
): Candidate[] {
  const out: Candidate[] = [];
  for (const facts of poolFor(jurisdiction)) {
    const evaln = evaluateDisplayIn(jurisdiction, facts);
    for (const display of evaln.displays) {
      if (display.lights.length === 0) continue;
      const thetas: number[] = [];
      const visibleAt = placedVisibility(facts, display);
      for (let t = 0; t < 360; t += THETA_STEP) {
        if (matches(visibleAt(t), t)) thetas.push(t);
      }
      if (thetas.length > 0) out.push({ facts, display, thetas });
    }
  }
  return collapse(out);
}

/** All candidate explanations for the given lights. */
export function identifyCandidates(
  seen: SeenLight[],
  jurisdiction: string = BASE_JURISDICTION,
  arrangement: Arrangement = 'free',
): Candidate[] {
  if (seen.length === 0) return [];
  return collect(jurisdiction, (v, t) => matchesSeen(seen, v, arrangement, t));
}

/** All candidate explanations for the question flow's answers so far. */
export function identifyByAnswers(
  answers: Answers,
  jurisdiction: string = BASE_JURISDICTION,
): Candidate[] {
  if (!answered(answers)) return [];
  return collect(jurisdiction, (v) => matchesAnswers(answers, v));
}

/** Situations that show the same lights from some aspects, and what parts them. */
export interface Ambiguity {
  aspects: Aspect[];
  members: Candidate[];
  /** the fact axes they differ on; 'display' when only the chosen display does */
  differ: FactAxis[];
  /** aspects from which their lights no longer all look alike */
  partedFrom: Aspect[];
}

export type FactAxis =
  'propulsion' | 'activity' | 'position' | 'making_way' | 'length' | 'display';

const AXES: [FactAxis, (c: Candidate) => unknown][] = [
  ['activity', (c) => c.facts['fact:activity']],
  ['propulsion', (c) => c.facts['fact:propulsion']],
  ['position', (c) => c.facts['fact:position']],
  ['making_way', (c) => c.facts['fact:making_way']],
  ['length', (c) => bandOf(c.facts['fact:length_m'])],
];

const lookOf = (v: VisibleLight[]): string =>
  v
    .map((l) => `${l.color}${l.flashing ? '!' : ''}`)
    .sort()
    .join();

/**
 * Group the candidates by the aspect they are seen from; every set of two or
 * more that share aspects is one ambiguity, with the facts the lights don't
 * tell apart.
 */
export function ambiguities(candidates: Candidate[]): Ambiguity[] {
  const byAspect = new Map<Aspect, number[]>();
  candidates.forEach((c, i) => {
    for (const a of new Set(c.thetas.map(bearingLabel))) {
      byAspect.set(a, [...(byAspect.get(a) ?? []), i]);
    }
  });
  const bySet = new Map<string, Aspect[]>();
  for (const [aspect, idx] of byAspect) {
    if (idx.length < 2) continue;
    const key = idx.join();
    bySet.set(key, [...(bySet.get(key) ?? []), aspect]);
  }
  const out: Ambiguity[] = [];
  for (const [key, aspects] of bySet) {
    const members = key.split(',').map((i) => candidates[Number(i)]);
    const differ = AXES.filter(
      ([, get]) => new Set(members.map((m) => String(get(m)))).size > 1,
    ).map(([axis]) => axis);
    const looks = members.map((m) => placedVisibility(m.facts, m.display));
    const parted = new Set<Aspect>();
    for (let t = 0; t < 360; t += THETA_STEP) {
      const seenAt = new Set(looks.map((at) => lookOf(at(t))));
      if (seenAt.size > 1) parted.add(bearingLabel(t));
    }
    for (const a of aspects) parted.delete(a);
    out.push({
      aspects,
      members,
      differ: differ.length > 0 ? differ : ['display'],
      partedFrom: [...parted],
    });
  }
  return out;
}

function collapse(out: Candidate[]): Candidate[] {
  // collapse candidates that describe the same situation (same fact axes)
  const byKey = new Map<string, Candidate>();
  for (const c of out) {
    const key = JSON.stringify([
      c.facts['fact:propulsion'],
      c.facts['fact:activity'],
      c.facts['fact:position'],
      c.facts['fact:making_way'],
      bandOf(c.facts['fact:length_m']),
      c.display.entries,
    ]);
    const existing = byKey.get(key);
    if (existing) existing.thetas = mergeThetas(existing.thetas, c.thetas);
    else byKey.set(key, { ...c, thetas: [...c.thetas] });
  }
  return [...byKey.values()];
}

function bandOf(len: unknown): string {
  if (typeof len !== 'number') return '?';
  if (len < 7) return '<7';
  if (len < 12) return '7-12';
  if (len < 20) return '12-20';
  if (len < 50) return '20-50';
  if (len < 100) return '50-100';
  return '>=100';
}

function mergeThetas(a: number[], b: number[]): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}
