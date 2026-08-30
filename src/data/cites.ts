// Resolving entry cites (which may be ranges like "23(a)(iii)-(iv)" or
// bare rules like "28") to the paragraph paths of rules.json.

import { applicability, rules } from './colregs';
import type { FactRecord } from '../engine/types';
import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';

const paths = Object.keys(rules.paragraphs);

/** Paragraph paths a cite denotes, in document order. */
export function paragraphsForCite(cite: string): string[] {
  if (rules.paragraphs[cite]) return [cite];
  // range: "23(a)(iii)-(iv)" -> 23(a)(iii), 23(a)(iv)
  const range = cite.match(/^(.*\()([a-z]+)\)-\(([a-z]+)\)$/);
  if (range) {
    const [, stem, from, to] = range;
    const seq = paths.filter((p) => p.startsWith(stem));
    const fromPath = `${stem}${from})`;
    const toPath = `${stem}${to})`;
    const i = seq.indexOf(fromPath);
    const j = seq.indexOf(toPath);
    if (i !== -1 && j !== -1) return seq.slice(i, j + 1);
  }
  // bare rule ("28", "24(a)") -> its own paragraph plus direct children
  const own = paths.filter(
    (p) => p === cite || (p.startsWith(cite + '(') && rules.paragraphs[p]),
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
  cases: { name: string; facts: FactRecord; expect: string[] }[];
};

/**
 * A representative fact record firing the given entry — the first fixture
 * that exercises it (REQ-VERIFY-3 guarantees one exists for every entry).
 */
export function factsForEntry(entryId: string): FactRecord | undefined {
  return fixtures.cases.find((c) => c.expect.includes(entryId))?.facts;
}

/** All entries citing into a given rule number. */
export function entriesForRule(rule: string) {
  return applicability.entries.filter((e) => ruleOf(e.cite) === rule);
}
