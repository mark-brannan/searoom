// Identify mode: the reverse direction. Given lights the user says they
// see (a colour/character multiset), find every fact record + bearing that
// could lawfully explain them. Ends at one answer or an honest "these are
// indistinguishable from this bearing" — which is true of the real Rules.

import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';
import { applicability } from '../data/colregs';
import { evaluate } from './evaluate';
import { visibleSignature } from './quiz';
import type { Display, FactRecord } from './types';

const fixtures = fixturesJson as unknown as {
  cases: { name: string; facts: FactRecord }[];
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
function buildPool(): FactRecord[] {
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
  for (const c of fixtures.cases) add(c.facts);
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

const pool = buildPool();
const THETA_STEP = 5;

export function signatureOf(seen: SeenLight[]): string {
  return seen
    .map((l) => `${l.color}${l.flashing ? '!' : ''}`)
    .sort()
    .join(',');
}

/** All candidate explanations for the given lights. */
export function identifyCandidates(seen: SeenLight[]): Candidate[] {
  if (seen.length === 0) return [];
  const wanted = signatureOf(seen);
  const out: Candidate[] = [];
  for (const facts of pool) {
    const evaln = evaluate(applicability, facts);
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
