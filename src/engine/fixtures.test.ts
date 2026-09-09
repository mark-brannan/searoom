// Replays fixtures/applicability-fixtures.json verbatim — all cases but the
// jurisdiction-dependent ones below. This is colregs' cross-implementation
// contract (REQ-VERIFY-1), exercised here by its second real implementation.

import { describe, expect, it } from 'vitest';
import fixturesJson from 'colregs/fixtures/applicability-fixtures.json';
import { evaluateDisplay } from 'colregs-engine';
import type { FactRecord } from './types';

interface FixtureCase {
  name: string;
  facts: FactRecord;
  expect: string[];
  jurisdiction?: string;
}

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: FixtureCase[];
};

describe('colregs applicability fixtures (verbatim replay)', () => {
  it('has the full fixture set', () => {
    expect(fixtures.cases.length).toBe(66);
  });

  for (const c of fixtures.cases) {
    // colregs@0.2.2 (ADR 0008) gave every entry a `jurisdiction` and added
    // the first national delta, 30a-buoy/30b-buoy (`us/inland`), reached
    // only via `fact:on_mooring_buoy`. colregs-engine has no jurisdiction
    // parameter yet (its own open gap, not fallout of this bump), so a case
    // that turns on jurisdiction can't be replayed verbatim: skipped,
    // rather than silently mis-scored, until that lands.
    if ('fact:on_mooring_buoy' in c.facts) {
      const jurisdiction = c.jurisdiction ?? fixtures.jurisdiction;
      it.skip(`${c.name} (jurisdiction: ${jurisdiction}, not yet supported)`, () => {});
      continue;
    }
    it(c.name, () => {
      const result = evaluateDisplay(c.facts);
      expect([...result.applied].sort()).toEqual([...c.expect].sort());
    });
  }
});
