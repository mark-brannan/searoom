// Identify mode: the reverse direction. Given lights the user says they
// see (a colour/character multiset), find every fact record + bearing that
// could lawfully explain them. Ends at one answer or an honest "these are
// indistinguishable from this bearing" — which is true of the real Rules.

import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';
import { BASE_JURISDICTION } from '../data/jurisdictions';
import { evaluateDisplayIn } from './evaluate';
import { visibleSignature } from './quiz';
import type { Display, FactRecord } from './types';

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: { name: string; facts: FactRecord; jurisdiction?: string }[];
};

export interface SeenLight {
  color: 'white' | 'red' | 'green' | 'yellow';
  flashing: boolean;
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

/** All candidate explanations for the given lights. */
export function identifyCandidates(
  seen: SeenLight[],
  jurisdiction: string = BASE_JURISDICTION,
): Candidate[] {
  if (seen.length === 0) return [];
  const wanted = signatureOf(seen);
  const out: Candidate[] = [];
  for (const facts of poolFor(jurisdiction)) {
    const evaln = evaluateDisplayIn(jurisdiction, facts);
    for (const display of evaln.displays) {
      if (display.lights.length === 0) continue;
      const thetas: number[] = [];
      for (let t = 0; t < 360; t += THETA_STEP) {
        if (visibleSignature(facts, display, t) === wanted) thetas.push(t);
      }
      if (thetas.length > 0) out.push({ facts, display, thetas });
    }
  }
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
