/// <reference types="node" />
// Registration of a hull's mesh to its HullSpec stations (searoom#22 facet 2).
//
// The 3D view seats each light on the loaded mesh: nav-wright's `anchorLights`
// reads a StationProfile back out of the geometry and moves the sidelights to
// the bow shoulder on the rail, the masthead lights to the tallest structure,
// the sternlight to the transom top. The 2D views put the same lights at the
// HullSpec's analytic stations. The two agree only if the mesh is shaped like
// the profile — which nothing checked until this test.
//
// For every hull the app can draw (hullScenes.ts), this loads the mesh the
// picker offers first for that hull's scene, the way the view does (same
// placement, same edge sampling, same profile), then compares each seat the
// mesh yields with the spec station it stands in for, as a fraction of the
// vessel's length.
//
// None yet lands every light within tolerance; each is recorded in
// KNOWN_MISFITS (meshProfile.ts) with the mesh it was measured on, as an
// expected failure (`it.fails`), so the day a mesh that fits lands, this test
// flips loudly instead of silently passing a misfit. A hull whose best-fit
// mesh changes runs as a plain test until its entry is re-measured.

import { describe, expect, it } from 'vitest';
import { selectHull } from 'nav-wright';
import { defaultModelUrl, modelVariants } from './hullModels';
import { HULL_SCENES } from './hullScenes';
import {
  KNOWN_MISFITS,
  REGISTRATION_TOLERANCE,
  compareToSpec as compare,
  loadHullScene,
  worldProfile,
} from './meshProfile';

/** Any length works — every figure is divided back out by it. */
const LENGTH_M = 2;

const registered = Object.entries(HULL_SCENES).map(([id, facts]) => ({
  id,
  hull: selectHull(facts),
  mesh: modelVariants(facts)[0].name,
  url: defaultModelUrl(facts),
}));

describe('hull mesh registration', () => {
  it('has at least one registered mesh to check', () => {
    expect(registered.map((r) => r.id)).not.toEqual([]);
  });

  for (const { id, hull, mesh, url } of registered) {
    const expectedToFail = KNOWN_MISFITS.get(id) === mesh;
    const run = expectedToFail ? it.fails : it;
    const title = expectedToFail
      ? `${id} on ${mesh}: a known misfit for its spec (remove from KNOWN_MISFITS when it registers)`
      : `${id} on ${mesh}: mesh stations agree with the spec within ${REGISTRATION_TOLERANCE} of LOA`;

    run(title, async () => {
      const profile = worldProfile(await loadHullScene(url), LENGTH_M);
      const misses = compare(hull.spec, profile, LENGTH_M).filter(
        (m) => Math.abs(m.delta) > REGISTRATION_TOLERANCE,
      );
      const report = misses
        .map(
          (m) =>
            `${m.station}: mesh ${m.mesh.toFixed(3)} spec ${m.spec.toFixed(3)} Δ/LOA ${m.delta.toFixed(3)}`,
        )
        .join('\n');
      expect(
        misses.map((m) => m.station),
        report,
      ).toEqual([]);
    });
  }
});
