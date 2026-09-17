// Resolving entry cites (which may be ranges like "23(a)(iii)-(iv)" or
// bare rules like "28") to the paragraph paths of the skeleton — which is
// the jurisdiction's resolved one, so a cite under `us/inland` denotes the
// paths Inland actually spells (colregs ADR 0020).

import { BASE_JURISDICTION, resolveEntries, resolveSkeleton } from './jurisdictions';
import type { FactRecord } from '../engine/types';
import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';

/** Paragraph paths a cite denotes, in document order. */
export function paragraphsForCite(
  cite: string,
  jurisdiction: string = BASE_JURISDICTION,
): string[] {
  const skeleton = resolveSkeleton(jurisdiction);
  const paths = Object.keys(skeleton);
  if (skeleton[cite]) return [cite];
  // range: "23(a)(iii)-(iv)" -> 23(a)(iii), 23(a)(iv)
  const range = cite.match(/^(.*\()([a-z]+)\)-\(([a-z]+)\)$/);
  if (range) {
    const [, stem, from, to] = range;
    const seq = paths.filter((p) => p.startsWith(stem));
    const i = seq.indexOf(`${stem}${from})`);
    const j = seq.indexOf(`${stem}${to})`);
    if (i !== -1 && j !== -1) return seq.slice(i, j + 1);
  }
  // bare rule ("28", "24(a)") -> its own paragraph plus direct children
  const own = paths.filter(
    (p) => p === cite || (p.startsWith(cite + '(') && skeleton[p]),
  );
  if (own.length > 0) return own;
  return [];
}

/** Rule number of a paragraph path ("27(a)(i)" -> "27"). */
export function ruleOf(path: string): string {
  const m = path.match(/^(\d+)/);
  return m ? m[1] : path;
}

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: {
    name: string;
    facts: FactRecord;
    expect: string[];
    jurisdiction?: string;
  }[];
};

/**
 * A representative fact record firing the given entry — the first fixture
 * that exercises it (REQ-VERIFY-3 guarantees one exists for every entry).
 */
export function factsForEntry(entryId: string): FactRecord | undefined {
  return fixtures.cases.find((c) => c.expect.includes(entryId))?.facts;
}

/** The jurisdiction whose fixtures exercise an entry, if one is pinned. */
export function jurisdictionForEntry(entryId: string): string | undefined {
  const c = fixtures.cases.find((x) => x.expect.includes(entryId));
  return c && (c.jurisdiction ?? fixtures.jurisdiction);
}

/** All entries in force under a jurisdiction citing into a given rule. */
export function entriesForRule(
  rule: string,
  jurisdiction: string = BASE_JURISDICTION,
) {
  return resolveEntries(jurisdiction).filter((e) => ruleOf(e.cite) === rule);
}
