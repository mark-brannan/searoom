// Replays fixtures/applicability-fixtures.json verbatim — every case, under
// the jurisdiction the case names. This is colregs' cross-implementation
// contract (REQ-VERIFY-1), exercised here by its second real implementation,
// and it is the statement that searoom's app-side merge-patch resolution
// agrees with the package's own (colregs ADR 0018, ADR 0020).

import { describe, expect, it } from 'vitest';
import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';
import { evaluateDisplayIn } from './evaluate';
import type { FactRecord } from './types';

// colregs' fixture schema widened `expect` from a bare entry id to
// `RuleId | { entry, modality }` for the Rule 20(c) modality shift (colregs
// ADR 0021). A bare id still asserts only that the entry applied; the object
// form additionally pins the modality the engine resolved for it.
type ExpectItem = string | { entry: string; modality: string };

interface FixtureCase {
  name: string;
  facts: FactRecord;
  expect: ExpectItem[];
  jurisdiction?: string;
}

const entryOf = (e: ExpectItem) => (typeof e === 'string' ? e : e.entry);

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: FixtureCase[];
};

const jurisdictionOf = (c: FixtureCase) =>
  c.jurisdiction ?? fixtures.jurisdiction;

describe('colregs applicability fixtures (verbatim replay)', () => {
  it('has the full fixture set', () => {
    expect(fixtures.cases.length).toBe(114);
  });

  it('covers more than one jurisdiction', () => {
    expect(new Set(fixtures.cases.map(jurisdictionOf)).size).toBeGreaterThan(1);
  });

  for (const c of fixtures.cases) {
    it(`${c.name} [${jurisdictionOf(c)}]`, () => {
      const result = evaluateDisplayIn(jurisdictionOf(c), c.facts);
      expect([...result.applied].sort()).toEqual(c.expect.map(entryOf).sort());
      for (const e of c.expect) {
        if (typeof e === 'string') continue;
        expect(result.modalities[e.entry]).toBe(e.modality);
      }
    });
  }
});
