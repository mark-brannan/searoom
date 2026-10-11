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
// For every hull id with a registered mesh, this loads the .glb the way the
// view does (same placement, same edge sampling, same profile), then compares
// each seat the mesh yields with the spec station it stands in for, as a
// fraction of the vessel's length.
//
// The registered meshes are Kenney Watercraft Kit hulls (nav-wright#44):
// cartoon boats, short and tall, and none of them lands every light within
// tolerance. Each failure is recorded in KNOWN_MISFITS as an expected failure
// (`it.fails`), so the day a mesh that fits lands, this test flips loudly
// instead of silently passing a misfit.

import { describe, expect, it } from 'vitest';
import { allHulls } from 'nav-wright';
import type { Hull, HullSpec } from 'nav-wright';
// Not on nav-wright's export map: the pure profile API lives inside the
// package, next to the component that uses it. This reaches past the map on
// purpose; the alternative is re-deriving the seats and drifting from them.
import {
  bowShoulder,
  lightPosition,
  stationAt,
} from '../../node_modules/nav-wright/dist/modelTransform.js';
import type { StationProfile } from '../../node_modules/nav-wright/dist/modelTransform.js';
import { hasRegisteredModel, modelUrlForHull } from './hullModels';
import { loadHullScene, worldProfile } from './meshProfile';

/**
 * How far, as a fraction of LOA, a seat on the mesh may sit from the spec's
 * station and still count as the same place. A twentieth of the length: on a
 * 12 m boat, 60 cm. Coarser than that and a sidelight is visibly on the
 * wrong part of the hull; finer and the 2D profile's own hand-drawn
 * stations, set to two decimals of half-length, are inside the noise.
 */
export const REGISTRATION_TOLERANCE = 0.05;

/**
 * Hull ids whose registered mesh is known not to fit, with the measured
 * misses (Δ/LOA) at the time of writing. Remove an id here when a mesh that
 * registers lands; the test then fails until it does.
 *
 * Kenney Watercraft Kit meshes (nav-wright#44), measured 2026-10-11. Cartoon
 * proportions, so every one misses somewhere:
 *
 * open → boat-row-large: sidelight x -0.24, deck +0.09, half-beam +0.28;
 * masthead x -0.12, top +0.09; stern x -0.10, transom top +0.17.
 * power-small → boat-speed-j: sidelight x +0.11, deck +0.08, half-beam +0.06;
 * masthead x -0.47; aft mast x -0.25; stern x -0.08, transom top +0.21.
 * power-large → boat-house-c: sidelight x +0.29, half-beam +0.10; masthead
 * x -0.21, top +0.27; stern x -0.06, transom top +0.10.
 * sail-small → boat-sail-b: sidelight x +0.16, deck +0.16, half-beam +0.08;
 * masthead x -0.13, top +0.73; stern x -0.06, transom top +0.16.
 * sail-large → ship-small: sidelight deck +0.25, half-beam +0.07; masthead
 * top +0.51; aft mast x +0.15; stern x -0.06, transom top +0.80.
 * trawler → boat-fishing-small: sidelight x +0.33, deck +0.12, half-beam
 * +0.07; masthead x -0.14, top +0.38; aft mast x +0.18; stern x -0.07,
 * transom top +0.18.
 * tug → boat-tow-b: sidelight x +0.29, deck +0.07, half-beam +0.07; masthead
 * x +0.13, top +0.26; aft mast x +0.34; stern x -0.08, transom top +0.16.
 * container-ship → ship-cargo-a: sidelight x +0.56, deck -0.12; masthead
 * x -0.11; aft mast x +0.39.
 */
const KNOWN_MISFITS: ReadonlySet<string> = new Set([
  'open',
  'power-small',
  'power-large',
  'sail-small',
  'sail-large',
  'trawler',
  'tug',
  'container-ship',
]);

/** Any length works — every figure below is divided back out by it. */
const LENGTH_M = 2;

interface Miss {
  station: string;
  mesh: number;
  spec: number;
  /** (mesh - spec) / LOA */
  delta: number;
}

/**
 * Each seat `anchorLights` takes from the mesh, against the spec station
 * whose light it receives, in world metres. Fore-aft x, height y, and for
 * the sidelight the half-beam it is pushed out to.
 */
function compare(spec: HullSpec, profile: StationProfile, lengthMeters: number): Miss[] {
  const world = (fx: number, z: number, py = 0) => lightPosition({ fx, py, z }, lengthMeters);
  const shoulderX = bowShoulder(profile);
  const shoulder = stationAt(profile, shoulderX);
  const transom = stationAt(profile, profile.minX);
  const rows: [string, number, number][] = [
    ['sidelight x (bow shoulder)', shoulderX, world(spec.sideLightX, 0)[0]],
    ['sidelight y (deck at shoulder)', shoulder.deck, world(0, spec.sideLightZ)[1]],
    ['sidelight z (half-beam at shoulder)', shoulder.halfBeam, world(0, 0, spec.beam)[2]],
    ['masthead x (mast band fore edge)', profile.mast.foreX, world(spec.mastX, 0)[0]],
    ['masthead y (mast band top)', profile.mast.top, world(0, spec.mastTopZ)[1]],
    ['aft masthead x (mast band aft edge)', profile.mast.aftX, world(spec.aftMastX, 0)[0]],
    ['sternlight x (aftmost point)', profile.minX, world(spec.sternX, 0)[0]],
    ['sternlight y (transom top)', transom.top, world(0, spec.sternZ)[1]],
  ];
  return rows.map(([station, mesh, s]) => ({
    station,
    mesh,
    spec: s,
    delta: (mesh - s) / lengthMeters,
  }));
}

const registered = (Object.values(allHulls) as Hull[]).filter(hasRegisteredModel);

describe('hull mesh registration', () => {
  it('has at least one registered mesh to check', () => {
    expect(registered.map((h) => h.spec.id)).not.toEqual([]);
  });

  for (const hull of registered) {
    const { id } = hull.spec;
    const expectedToFail = KNOWN_MISFITS.has(id);
    const run = expectedToFail ? it.fails : it;
    const title = expectedToFail
      ? `${id}: mesh is a known misfit for its spec (remove from KNOWN_MISFITS when it registers)`
      : `${id}: mesh stations agree with the spec within ${REGISTRATION_TOLERANCE} of LOA`;

    run(title, async () => {
      const profile = worldProfile(await loadHullScene(modelUrlForHull(hull)), LENGTH_M);
      const misses = compare(hull.spec, profile, LENGTH_M).filter(
        (m) => Math.abs(m.delta) > REGISTRATION_TOLERANCE,
      );
      const report = misses
        .map((m) => `${m.station}: mesh ${m.mesh.toFixed(3)} spec ${m.spec.toFixed(3)} Δ/LOA ${m.delta.toFixed(3)}`)
        .join('\n');
      expect(misses.map((m) => m.station), report).toEqual([]);
    });
  }
});
