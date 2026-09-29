// Replays colregs/fixtures/situation-fixtures.json against evaluateEncounter
// two ways (issue #95's done-when: "the schema's own fixtures replay from
// UI-built records"):
//
// 1. Verbatim, mirroring `fixtures.test.ts`'s applicability replay — the
//    cross-implementation contract, exercised by searoom's own jurisdiction
//    resolution.
// 2. Through `buildSituation`, the same pure function Encounters mode's
//    component calls to turn its control state into a `Situation` — proving
//    the UI's state shape round-trips losslessly, not just that the engine
//    wrapper works.

import { describe, expect, it } from 'vitest';
import fixturesJson from 'colregs/fixtures/situation-fixtures.json';
import { evaluateEncounterIn } from './evaluateEncounter';
import { buildSituation, type EncounterState } from './situationBuilder';
import { deriveGeometry } from './situationGeometry';
import type { Situation } from './types';

type ExpectItem = string | { entry: string; modality: string };

interface FixtureCase {
  name: string;
  status: 'illustrative' | 'binding';
  expect: ExpectItem[];
  situation: Situation;
  jurisdiction?: string;
}

const entryOf = (e: ExpectItem) => (typeof e === 'string' ? e : e.entry);

const fixtures = fixturesJson as unknown as {
  jurisdiction: string;
  cases: FixtureCase[];
};

const jurisdictionOf = (c: FixtureCase) => c.jurisdiction ?? fixtures.jurisdiction;

// `expect` is empty and asserts nothing for an `illustrative` case (fixture
// schema's own `case_status.note`) — it fixes the record shape before the
// entries it names exist, and joins the replay once it becomes `binding`.
const binding = fixtures.cases.filter((c) => c.status === 'binding');

// The four fields `overrideGeometry` covers (issue #95 item 2) — present
// directly on 26 of the 85 fixtures; a fixture that states one of them
// asserted it as a "set directly" value, not something we should require
// our own derivation to reproduce independently (the exact wording of
// issue #95's own note on this).
function statesOverrideGeometryDirectly(s: Situation): boolean {
  const pg = s.pair?.geo ?? {};
  if (
    'geo:range_m' in pg ||
    'geo:cpa_m' in pg ||
    'geo:tcpa_s' in pg ||
    'geo:bearing_change_deg_min' in pg
  )
    return true;
  if (s.self.geo && 'geo:rel_bearing_deg' in s.self.geo) return true;
  if (s.other?.geo && 'geo:rel_bearing_deg' in s.other.geo) return true;
  return false;
}

describe('colregs situation fixtures (verbatim replay)', () => {
  it('has the full fixture set', () => {
    expect(fixtures.cases.length).toBe(85);
  });

  for (const c of binding) {
    it(`${c.name} [${jurisdictionOf(c)}]`, () => {
      const result = evaluateEncounterIn(jurisdictionOf(c), c.situation);
      expect([...result.applied].sort()).toEqual(c.expect.map(entryOf).sort());
      for (const e of c.expect) {
        if (typeof e === 'string') continue;
        expect(result.modalities[e.entry]).toBe(e.modality);
      }
    });
  }
});

describe('colregs situation fixtures (round-trip through buildSituation)', () => {
  // None of the 85 fixtures state positions without also stating the
  // override-covered geometry directly (checked by hand against the
  // fixture set as of this writing), so the derivation branch itself isn't
  // exercised by this loop — that's covered separately below, against a
  // synthetic scenario built from real fixture kinematics.
  for (const c of binding) {
    it(`${c.name} replays identically as UI-built state`, () => {
      const state: EncounterState = {
        situation: c.situation,
        overrideGeometry: statesOverrideGeometryDirectly(c.situation),
      };
      const built = buildSituation(state);
      const direct = evaluateEncounterIn(jurisdictionOf(c), c.situation);
      const rebuilt = evaluateEncounterIn(jurisdictionOf(c), built);
      expect(rebuilt.applied).toEqual(direct.applied);
      expect(rebuilt.risk_of_collision).toEqual(direct.risk_of_collision);
      expect(rebuilt.roles).toEqual(direct.roles);
      expect(rebuilt.encounter).toEqual(direct.encounter);
    });
  }
});

describe('deriveGeometry', () => {
  it('matches the crossing fixture’s own stated bearings within a degree', () => {
    // Same self/other kinematics as "crossing: self power-driven, other
    // fine on the starboard bow" (situation-fixtures.json), which states
    // self:geo:rel_bearing_deg 40 and other:geo:rel_bearing_deg 280
    // directly — a real, independently-authored data point to check the
    // flat-earth derivation against, rather than a synthetic round-number
    // scenario that would only prove the arithmetic self-consistent.
    const self = {
      position: { latitude: 50, longitude: -1.4 },
      headingDeg: 0,
      sogKn: 12,
    };
    const other = {
      position: { latitude: 50.0383, longitude: -1.35 },
      headingDeg: 300,
      sogKn: 7.83,
    };
    const d = deriveGeometry(self, other);
    expect(d).toBeDefined();
    expect(d!.selfRelBearingDeg).toBeCloseTo(40, 0);
    expect(d!.otherRelBearingDeg).toBeCloseTo(280, 0);
    expect(d!.rangeM).toBeGreaterThan(0);
  });

  it('reports tcpa/cpa as unavailable on parallel, same-speed courses', () => {
    const self = {
      position: { latitude: 50, longitude: -1.4 },
      headingDeg: 90,
      sogKn: 10,
    };
    const other = {
      position: { latitude: 50.01, longitude: -1.4 },
      headingDeg: 90,
      sogKn: 10,
    };
    const d = deriveGeometry(self, other);
    expect(d!.tcpaS).toBeUndefined();
    expect(d!.cpaM).toBeUndefined();
  });
});
