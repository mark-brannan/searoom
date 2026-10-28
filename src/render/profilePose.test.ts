// The profile pose (searoom#22 facet 4): at theta=90, tilt=0 the 3D view
// looks at the vessel from the beam, level with the waterline — the same
// vantage the 2D profile draws. Both `.scene-3d` and `.scene-svg` are sized
// to the same 440 x 240 box (nav-wright's style.css), so a light's pixel
// position in one should match its pixel position in the other, exactly by
// construction, if the mesh is a fit for the hull it stands in for.
//
// This projects each light's anchored 3D position (the same
// `anchorLights` output BenchyModel seats a light at) through a camera built
// to BenchyModel's own formula — same fov/near/far, same orbit distance and
// target, same theta/tilt-to-position math — onto that box, and compares the
// result to ProfileView's PX/PZ pixel position for the same light.
//
// Every hull's best-fit mesh is already known (KNOWN_MISFITS, meshProfile.ts) not
// to fit its hull's stations; its pose is recorded in KNOWN_POSE_MISFITS as an
// expected failure for the same reason.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { evaluateSignals } from 'colregs-engine';
import type { FactRecord } from '../engine/types';
import { PX, PZ, selectHull } from 'nav-wright';
import { placeLights } from './navWright';
import { lights } from '../data/colregs';
import { anchorLights } from 'nav-wright/profile';
import { defaultModelUrl, modelVariants } from './hullModels';
import { HULL_SCENES } from './hullScenes';
import { KNOWN_MISFITS, loadHullScene, worldProfile } from './meshProfile';

/** BenchyModel's own constants (searoom's copy: nav-wright's are internal). */
const ORBIT_DISTANCE = 1.6;
const CANVAS_WIDTH = 440;
const CANVAS_HEIGHT = 240;
const FOV_DEG = 40;

function lightRadius(lengthMeters: number): number {
  return Math.max(lengthMeters * 0.012, 0.12);
}

/** BenchyModel's OrbitRig camera position, at a given theta/tilt. */
function cameraPositionFor(
  theta: number,
  tilt: number,
  lengthMeters: number,
): [number, number, number] {
  const DEG = Math.PI / 180;
  const distance = lengthMeters * ORBIT_DISTANCE;
  const targetY = lengthMeters * 0.38;
  const polar = (90 - tilt) * DEG;
  const rad = theta * DEG;
  return [
    distance * Math.sin(polar) * Math.cos(rad),
    distance * Math.cos(polar) + targetY,
    distance * Math.sin(polar) * Math.sin(rad),
  ];
}

/** Project a world position the way `.scene-3d`'s canvas would draw it: BenchyModel's
 * camera, at theta=90/tilt=0 (the profile pose), to a pixel in the 440x240 box. */
function projectToCanvas(
  world: [number, number, number],
  lengthMeters: number,
): [number, number] {
  const camera = new THREE.PerspectiveCamera(
    FOV_DEG,
    CANVAS_WIDTH / CANVAS_HEIGHT,
    0.1,
    lengthMeters * 40,
  );
  camera.position.set(...cameraPositionFor(90, 0, lengthMeters));
  camera.lookAt(0, lengthMeters * 0.38, 0);
  camera.updateMatrixWorld();
  const ndc = new THREE.Vector3(...world).project(camera);
  return [((ndc.x + 1) / 2) * CANVAS_WIDTH, ((1 - ndc.y) / 2) * CANVAS_HEIGHT];
}

/** ProfileView's pixel position for the same light. */
function profilePixel(fx: number, py: number, z: number): [number, number] {
  return [PX(fx) + py * 10, PZ(z)];
}

const FACTS: FactRecord = {
  'fact:propulsion': 'propulsion:power',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 12,
};
const LENGTH_M = 12;

/**
 * How far, as a fraction of the canvas's larger dimension, a light's 3D
 * pixel may sit from its 2D pixel and still count as the same place. Coarse
 * — this is a camera-projection check on top of hullRegistration.test.ts's
 * stricter station tolerance, not a replacement for it.
 */
const POSE_TOLERANCE = 0.08;

/** A mesh that misses its stations (KNOWN_MISFITS) necessarily poses its
 * lights off the profile too: every hull's best-fit mesh does, by 0.13
 * (power-small, tug, pilot-boat) to 0.50 (bulker) of the canvas on its worst
 * light, measured at the time of writing. The failure report prints each. */
const KNOWN_POSE_MISFITS: ReadonlyMap<string, string> = KNOWN_MISFITS;

const registered = Object.entries(HULL_SCENES).map(([id, facts]) => ({
  id,
  hull: selectHull(facts),
  mesh: modelVariants(facts)[0].name,
  url: defaultModelUrl(facts),
}));

describe('3D pose vs. 2D profile at theta=90, tilt=0 (searoom#22 facet 4)', () => {
  it('has at least one registered mesh to check', () => {
    expect(registered.map((r) => r.id)).not.toEqual([]);
  });

  for (const { id, hull, mesh, url } of registered) {
    const expectedToFail = KNOWN_POSE_MISFITS.get(id) === mesh;
    const run = expectedToFail ? it.fails : it;
    const title = expectedToFail
      ? `${id} on ${mesh}: pose is a known misfit (remove from KNOWN_POSE_MISFITS once the mesh registers)`
      : `${id} on ${mesh}: 3D pose agrees with the 2D profile within ${POSE_TOLERANCE} of the canvas`;

    run(title, async () => {
      const evaln = evaluateSignals(FACTS);
      const display = evaln.displays[0];
      const placed = placeLights(display.lights, hull.spec, FACTS, lights);
      expect(placed.length).toBeGreaterThan(0);

      const profile = worldProfile(await loadHullScene(url), LENGTH_M);
      const anchored = anchorLights(
        placed,
        LENGTH_M,
        hull.spec,
        profile,
        lightRadius(LENGTH_M),
      ) as [number, number, number][];

      const misses = placed
        .map((l, i) => {
          const [threeX, threeY] = projectToCanvas(anchored[i], LENGTH_M);
          const [svgX, svgY] = profilePixel(l.fx, l.py, l.z);
          const delta =
            Math.hypot(threeX - svgX, threeY - svgY) / Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
          return { light: l.lightId, threeX, threeY, svgX, svgY, delta };
        })
        .filter((m) => m.delta > POSE_TOLERANCE);

      const report = misses
        .map(
          (m) =>
            `${m.light}: 3D (${m.threeX.toFixed(1)}, ${m.threeY.toFixed(1)}) ` +
            `svg (${m.svgX.toFixed(1)}, ${m.svgY.toFixed(1)}) Δ/canvas ${m.delta.toFixed(3)}`,
        )
        .join('\n');
      expect(misses.map((m) => m.light), report).toEqual([]);
    });
  }
});
