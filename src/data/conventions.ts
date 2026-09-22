// What a mariner actually shows, layered on top of the lawful alternatives
// colregs-engine returns unranked (searoom issue #152): the engine
// enumerates the product of in_lieu_of/one_of choices and combination 0 is
// always "no alternative chosen", not the common case. This table picks the
// Sandbox's opening displayIndex and badges that chip "usual" with a
// one-line reason. The engine and colregs data stay pure; this is searoom's
// own pedagogy, kept small and shaped so it could be lifted into colregs as
// a sidecar later if another consumer needs the same answers.
//
// Covers every "yes" row of the issue's sibling table only. Rows marked
// "mild", "unsure" or "no" there are left at display 0, same as today.

import type { Display, FactRecord } from '../engine/types';

export interface ConventionRow {
  /** The entry id this row prefers — matches a `Display.chosen` entry. */
  id: string;
  jurisdiction: string;
  when: (facts: FactRecord) => boolean;
  /** The `Display.chosen` set of the preferred display, order-independent. */
  chosen: string[];
  /** i18n message id for the one-line reason shown on the "usual" badge. */
  whyId: string;
}

const lt = (facts: FactRecord, key: keyof FactRecord, n: number): boolean => {
  const v = facts[key];
  return typeof v === 'number' && v < n;
};

const lte = (facts: FactRecord, key: keyof FactRecord, n: number): boolean => {
  const v = facts[key];
  return typeof v === 'number' && v <= n;
};

// Order matters: `conventionFor` takes the first match, so a more specific
// row (pilot vessel, the sub-7m/sub-7kn powerboat) must precede the general
// anchor/powerboat row it would otherwise also satisfy.
export const CONVENTIONS: ConventionRow[] = [
  {
    id: 'rule:29a',
    jurisdiction: 'intl',
    when: (f) =>
      f['fact:activity'] === 'activity:pilot' &&
      f['fact:position'] === 'position:anchored' &&
      lt(f, 'fact:length_m', 50),
    chosen: ['rule:30b'],
    whyId: 'convention.29a.why',
  },
  {
    id: 'rule:30d',
    jurisdiction: 'intl',
    when: (f) =>
      f['fact:position'] === 'position:aground' && lt(f, 'fact:length_m', 50),
    chosen: ['rule:30b'],
    whyId: 'convention.30d.why',
  },
  {
    id: 'rule:30b',
    jurisdiction: 'intl',
    when: (f) =>
      f['fact:position'] === 'position:anchored' && lt(f, 'fact:length_m', 50),
    chosen: ['rule:30b'],
    whyId: 'convention.30b.why',
  },
  {
    id: 'rule:30b:mooring_buoy',
    jurisdiction: 'us/inland',
    when: (f) =>
      f['fact:position'] === 'position:moored' &&
      f['fact:on_mooring_buoy'] === true &&
      lt(f, 'fact:length_m', 50),
    chosen: ['rule:30b:mooring_buoy'],
    whyId: 'convention.30bMooringBuoy.why',
  },
  {
    id: 'rule:23d_ii',
    jurisdiction: 'intl',
    when: (f) =>
      f['fact:propulsion'] === 'propulsion:power' &&
      f['fact:activity'] === 'activity:none' &&
      f['fact:position'] === 'position:underway' &&
      lt(f, 'fact:length_m', 7) &&
      lte(f, 'fact:max_speed_kn', 7),
    chosen: ['rule:23d_ii'],
    whyId: 'convention.23dii.why',
  },
  {
    id: 'rule:23d_i',
    jurisdiction: 'intl',
    when: (f) =>
      f['fact:propulsion'] === 'propulsion:power' &&
      f['fact:activity'] === 'activity:none' &&
      f['fact:position'] === 'position:underway' &&
      lt(f, 'fact:length_m', 12),
    chosen: ['rule:23d_i'],
    whyId: 'convention.23di.why',
  },
  {
    id: 'rule:25d_ii',
    jurisdiction: 'intl',
    when: (f) =>
      f['fact:propulsion'] === 'propulsion:oars' &&
      f['fact:position'] === 'position:underway',
    chosen: [],
    whyId: 'convention.25dii.why',
  },
];

/** The convention row for `facts` under `jurisdiction`, if any. */
export function conventionFor(
  jurisdiction: string,
  facts: FactRecord,
): ConventionRow | undefined {
  return CONVENTIONS.find(
    (c) => c.jurisdiction === jurisdiction && c.when(facts),
  );
}

function sameChosen(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...a].sort();
  return [...b].sort().every((id, i) => id === sorted[i]);
}

/**
 * The index into `displays` (as `evaluateDisplayIn` returned them, same
 * order) that a matching convention row prefers. `undefined` when no row
 * matches or its `chosen` set isn't among `displays` — the caller falls
 * back to display 0, same as before this table existed.
 */
export function usualDisplayIndex(
  jurisdiction: string,
  facts: FactRecord,
  displays: readonly Display[],
): number | undefined {
  const row = conventionFor(jurisdiction, facts);
  if (!row) return undefined;
  const idx = displays.findIndex((d) => sameChosen(d.chosen, row.chosen));
  return idx === -1 ? undefined : idx;
}
