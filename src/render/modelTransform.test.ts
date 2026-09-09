// The scale/orientation/centering math used by BenchyModel. The last case
// re-derives the same placement through three.js itself, so the analytic
// version above can't quietly drift from the library's conventions.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MODEL_ROTATION_X, lightPosition, placeHullModel } from './modelTransform';
import type { ModelBox } from './modelTransform';

// Roughly Benchy's proportions in the source STL's millimetres, and
// deliberately not centred on the origin so the centering math is tested.
const benchyish: ModelBox = {
  min: { x: -20, y: -15, z: 2 },
  max: { x: 40, y: 16, z: 50 },
};

describe('placeHullModel', () => {
  it('scales the model to the vessel length along its fore-aft axis', () => {
    // 60mm of model becomes 12m of vessel.
    expect(placeHullModel(benchyish, 12).scale).toBeCloseTo(0.2, 10);
    expect(placeHullModel(benchyish, 30).scale).toBeCloseTo(0.5, 10);
  });

  it('rotates the source model’s up-axis onto three.js’s', () => {
    expect(placeHullModel(benchyish, 12).rotationX).toBe(-Math.PI / 2);
    expect(MODEL_ROTATION_X).toBe(-Math.PI / 2);
  });

  it('leaves the scale at 1 for a degenerate model', () => {
    const flat: ModelBox = { min: { x: 3, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } };
    expect(placeHullModel(flat, 12).scale).toBe(1);
  });

  it('leaves the scale at 1 for a nonsense vessel length', () => {
    for (const bad of [0, -12, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(placeHullModel(benchyish, bad).scale).toBe(1);
    }
  });

  it('centres fore-aft and athwartships and rests the keel on the waterline', () => {
    const { scale, position } = placeHullModel(benchyish, 12);
    const [x, y, z] = position;

    // World extents after the quarter turn about X: x from local x,
    // y from local z, z from negated local y.
    expect(scale * benchyish.min.x + x).toBeCloseTo(-(scale * benchyish.max.x + x), 10);
    expect(scale * benchyish.min.z + y).toBeCloseTo(0, 10);
    expect(-scale * benchyish.max.y + z).toBeCloseTo(-(-scale * benchyish.min.y + z), 10);
  });

  it('agrees with three.js when the placement is actually applied', () => {
    const size = {
      x: benchyish.max.x - benchyish.min.x,
      y: benchyish.max.y - benchyish.min.y,
      z: benchyish.max.z - benchyish.min.z,
    };
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z));
    // BoxGeometry is origin-centred; shift it to sit where benchyish does.
    mesh.geometry.translate(
      (benchyish.min.x + benchyish.max.x) / 2,
      (benchyish.min.y + benchyish.max.y) / 2,
      (benchyish.min.z + benchyish.max.z) / 2,
    );

    const raw = new THREE.Box3().setFromObject(mesh);
    expect(raw.min.x).toBeCloseTo(benchyish.min.x, 6);
    expect(raw.max.z).toBeCloseTo(benchyish.max.z, 6);

    const placement = placeHullModel(
      { min: { ...raw.min }, max: { ...raw.max } },
      12,
    );
    mesh.rotation.x = placement.rotationX;
    mesh.scale.setScalar(placement.scale);
    mesh.position.set(...placement.position);
    mesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(mesh);
    const centre = box.getCenter(new THREE.Vector3());
    const worldSize = box.getSize(new THREE.Vector3());

    expect(worldSize.x).toBeCloseTo(12, 6); // scaled to the vessel's length
    expect(centre.x).toBeCloseTo(0, 6); // centred fore-aft
    expect(centre.z).toBeCloseTo(0, 6); // centred athwartships
    expect(box.min.y).toBeCloseTo(0, 6); // keel on the waterline
  });
});

describe('lightPosition', () => {
  it('puts a light on the centreline at the bow on +X', () => {
    const [x, , z] = lightPosition({ fx: 1, py: 0, z: 0 }, 20);
    expect(x).toBeCloseTo(10);
    expect(z).toBeCloseTo(0);
  });

  it('puts a starboard light on +Z, on the same scale as fore-aft', () => {
    // Right-handed with the bow on +X and up on +Y: starboard is +Z.
    // Backwards here and green shows to port.
    const [, , z] = lightPosition({ fx: 0, py: 0.2, z: 0 }, 20);
    expect(z).toBeCloseTo(2);
  });

  it('keeps light height in the same ratio to length as the 2D profile', () => {
    // PZ(z) = 185 - z*150 against PX(fx) = 220 + fx*185: one unit of z is
    // 150/185 of a half-length. The 3D view must agree, or a masthead
    // light moves between tabs.
    const [, y] = lightPosition({ fx: 0, py: 0, z: 1 }, 20);
    expect(y).toBeCloseTo(10 * (150 / 185));
  });
});
