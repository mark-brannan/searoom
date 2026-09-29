// Turns Encounters mode's control state into the `Situation` object
// `evaluateEncounterIn` reads. One function, called by both the React
// component and `encounterFixtures.test.ts`'s round-trip half, so "the UI
// round-trips the schema's fixtures" (issue #95's done-when) is a claim
// this function proves rather than a description of the component.

import type { Pair, Situation, Subject } from './types';
import { deriveGeometry, type VesselKinematics } from './situationGeometry';

export interface EncounterState {
  /** The control state's own shape IS `Situation`, unedited, for
   * self/other fact+kin+hist and pair.env — those are always exactly what
   * the user set. The only split from `Situation` is geometry, below. */
  situation: Situation;
  /**
   * "Set directly" override (issue #95 item 2) for the geometry that's
   * normally derived from positions/vectors: range, CPA, TCPA, and both
   * vessels' relative bearing/aspect — one toggle covering all of them,
   * rather than one per field. This schema is still `status: "pencil"`;
   * five near-identical per-field checkboxes buy nothing today that one
   * clearly-labelled toggle doesn't. When on, `state.situation`'s own
   * `self.geo`/`other.geo`/`pair.geo` values (typed directly by the user)
   * pass through unchanged. `geo:in_sight`, `geo:risk_of_collision` and
   * `geo:windward` are never derivable (judgment calls the Rules leave to
   * observation, not positions) and are always plain checkboxes in
   * `state.situation`, independent of this flag.
   */
  overrideGeometry: boolean;
}

function kinOf(subject: Subject | undefined): VesselKinematics | undefined {
  const pos = subject?.kin?.['kin:position'];
  const heading = subject?.kin?.['kin:heading_deg'];
  const sog = subject?.kin?.['kin:sog_kn'];
  if (!pos || typeof heading !== 'number' || typeof sog !== 'number')
    return undefined;
  return { position: pos, headingDeg: heading, sogKn: sog };
}

export function buildSituation(state: EncounterState): Situation {
  const { situation } = state;
  const self: Subject = { ...situation.self, geo: { ...situation.self.geo } };
  const other: Subject | undefined = situation.other
    ? { ...situation.other, geo: { ...situation.other.geo } }
    : undefined;
  let pair: Pair | undefined = situation.pair
    ? { geo: { ...situation.pair.geo }, env: { ...situation.pair.env } }
    : undefined;

  if (!state.overrideGeometry && other) {
    const selfKin = kinOf(self);
    const otherKin = kinOf(other);
    if (selfKin && otherKin) {
      const d = deriveGeometry(selfKin, otherKin);
      self.geo = { ...self.geo, 'geo:rel_bearing_deg': d.selfRelBearingDeg };
      other.geo = {
        ...other.geo,
        'geo:rel_bearing_deg': d.otherRelBearingDeg,
      };
      pair = {
        ...pair,
        geo: {
          ...pair?.geo,
          'geo:range_m': d.rangeM,
          'geo:bearing_change_deg_min': d.bearingChangeDegMin,
          ...(d.cpaM !== undefined ? { 'geo:cpa_m': d.cpaM } : {}),
          ...(d.tcpaS !== undefined ? { 'geo:tcpa_s': d.tcpaS } : {}),
        },
      };
    }
  }

  return {
    self,
    ...(other ? { other } : {}),
    ...(pair ? { pair } : {}),
  };
}
