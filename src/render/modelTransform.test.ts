// The scale/orientation/centering math used by BenchyModel. The last case
// re-derives the same placement through three.js itself, so the analytic
// version above can't quietly drift from the library's conventions.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  DECK_EDGE_BAND,
  MODEL_ROTATION_X,
  anchorLights,
  lightPosition,
  placeHullModel,
  stationAt,
  stationProfile,
} from './modelTransform';
import type { ModelBox, StationProfile } from './modelTransform';

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

// A synthetic hull as a point cloud, world frame (bow +X, up +Y,
// starboard +Z): 20 m long, half-beam 3 amidships tapering to the bow,
// deck edge at y = 2, a cabin set in from the rail (half-beam 2, roof at
// y = 5) from x = -2 to 4, and a funnel on the centreline at x = -3 up to
// y = 7. Enough vertices per station that nothing has to be interpolated.
function syntheticHull(): number[] {
  const xyz: number[] = [];
  const push = (x: number, y: number, z: number) => xyz.push(x, y, z);
  for (let x = -10; x <= 10; x += 0.25) {
    const hb = x > 6 ? 3 * (1 - (x - 6) / 4.5) : 3; // taper over the last 4 m
    for (const side of [-1, 1]) {
      push(x, 0, 0); // keel
      push(x, 1, side * hb); // bilge-ish
      push(x, 2, side * hb); // deck edge
      if (x >= -2 && x <= 4) {
        push(x, 2, side * 2);
        push(x, 5, side * 2); // cabin roof, inside the deck-edge band
      }
    }
    if (Math.abs(x + 3) < 0.3) push(x, 7, 0); // funnel
  }
  return xyz;
}

describe('stationProfile', () => {
  const profile = stationProfile(syntheticHull(), 20)!;

  it('spans the mesh fore-aft with one entry per station', () => {
    expect(profile.minX).toBe(-10);
    expect(profile.maxX).toBe(10);
    expect(profile.halfBeam).toHaveLength(20);
    expect(profile.deck).toHaveLength(20);
    expect(profile.top).toHaveLength(20);
  });

  it('reads the half-beam, the deck edge and the top at each station', () => {
    // Amidships (x ≈ -7): plain hull, nothing above the deck.
    const s = stationAt(profile, -7);
    expect(s.halfBeam).toBeCloseTo(3, 6);
    expect(s.deck).toBeCloseTo(2, 6);
    expect(s.top).toBeCloseTo(2, 6);
  });

  it('keeps a cabin set in from the rail out of the deck height', () => {
    // The cabin at 2/3 of the half-beam is inside DECK_EDGE_BAND, so the
    // deck stays at the gunwale while the top rises to the roof. This is
    // the distinction that keeps a sidelight off the cabin roof.
    expect(2 / 3).toBeLessThan(DECK_EDGE_BAND);
    const s = stationAt(profile, 1);
    expect(s.deck).toBeCloseTo(2, 6);
    expect(s.top).toBeCloseTo(5, 6);
  });

  it('sees the funnel as the top at its station only', () => {
    expect(stationAt(profile, -3).top).toBeCloseTo(7, 6);
    expect(stationAt(profile, -7).top).toBeCloseTo(2, 6);
  });

  it('narrows toward the bow', () => {
    expect(stationAt(profile, 9).halfBeam).toBeLessThan(
      stationAt(profile, 0).halfBeam,
    );
  });

  it('returns null for nothing to profile', () => {
    expect(stationProfile([])).toBeNull();
    expect(stationProfile([1, 2, 3, 1, 5, 6])).toBeNull(); // no length
  });

  it('fills an empty station from its neighbours', () => {
    // Vertices only at the ends: every station between must still have
    // a usable half-beam rather than zero.
    const sparse = [-10, 0, 1, -10, 2, 3, 10, 0, 1, 10, 2, 1];
    const p = stationProfile(sparse, 4)!;
    expect(p.halfBeam).toEqual([3, 3 + (1 - 3) / 3, 3 + (2 * (1 - 3)) / 3, 1]);
    expect(p.deck).toEqual([2, 2, 2, 2]);
  });
});

describe('stationAt', () => {
  const profile: StationProfile = {
    minX: 0,
    maxX: 4,
    halfBeam: [1, 2, 3, 4],
    deck: [1, 1, 1, 1],
    top: [1, 2, 3, 4],
  };

  it('interpolates between station centres', () => {
    // Centres at 0.5, 1.5, 2.5, 3.5.
    expect(stationAt(profile, 1.5).halfBeam).toBeCloseTo(2, 6);
    expect(stationAt(profile, 2).halfBeam).toBeCloseTo(2.5, 6);
  });

  it('clamps beyond the ends', () => {
    expect(stationAt(profile, -5).halfBeam).toBe(1);
    expect(stationAt(profile, 50).halfBeam).toBe(4);
  });
});

describe('anchorLights', () => {
  // Hand-built profile for a 20 m vessel: half-beam 3 everywhere except a
  // 1.5 m bow station; deck at 2; a 6 m high structure at the second
  // station from the stern and nothing else above the deck.
  const profile: StationProfile = {
    minX: -10,
    maxX: 10,
    halfBeam: [3, 3, 3, 1.5],
    deck: [2, 2, 2, 2],
    top: [2, 6, 2, 2],
  };
  const L = 20;
  const beam = 0.22; // the hull spec's half-beam in py units

  it('seats a sidelight on the deck edge at its station, starboard on +Z', () => {
    const [stbd, port] = anchorLights(
      [
        { fx: 0.25, py: beam, z: 0.2 },
        { fx: 0.25, py: -beam, z: 0.2 },
      ],
      L,
      beam,
      profile,
      0.2,
    );
    expect(stbd[0]).toBeCloseTo(2.5, 6); // station is unchanged
    expect(stbd[1]).toBeCloseTo(2.2, 6); // deck + clearance, not analytic
    expect(stbd[2]).toBeCloseTo(3, 6); // on the rail
    expect(port[2]).toBeCloseTo(-3, 6); // red to port
  });

  it('follows the hull as it narrows', () => {
    const [bow] = anchorLights([{ fx: 0.95, py: beam, z: 0.2 }], L, beam, profile);
    expect(bow[2]).toBeCloseTo(1.5, 6);
  });

  it('lifts a centreline light above the structure at its station', () => {
    // At fx = -0.25 (x = -2.5, the centre of the tall station) the
    // analytic height of z = 0.6 is 0.6 * 10 * (150/185) ≈ 4.9, inside
    // the 6 m structure.
    const [masthead] = anchorLights([{ fx: -0.25, py: 0, z: 0.6 }], L, beam, profile, 0.2);
    expect(masthead[1]).toBeCloseTo(6.2, 6);
    expect(masthead[2]).toBeCloseTo(0, 6);
  });

  it('leaves a light already clear of the structure at its analytic height', () => {
    const [high] = anchorLights([{ fx: -0.25, py: 0, z: 1.2 }], L, beam, profile, 0.2);
    expect(high[1]).toBeCloseTo(lightPosition({ fx: -0.25, py: 0, z: 1.2 }, L)[1], 6);
  });

  it('lifts a stack together, keeping its spacing', () => {
    const stack = [
      { fx: -0.25, py: 0, z: 0.6 },
      { fx: -0.25, py: 0, z: 0.47 },
      { fx: -0.25, py: 0, z: 0.34 },
    ];
    const ys = anchorLights(stack, L, beam, profile, 0.2).map((p) => p[1]);
    const analytic = stack.map((l) => lightPosition(l, L)[1]);
    // The lowest clears the top; the others keep their offsets above it.
    expect(ys[2]).toBeCloseTo(6.2, 6);
    expect(ys[0] - ys[2]).toBeCloseTo(analytic[0] - analytic[2], 6);
    expect(ys[1] - ys[2]).toBeCloseTo(analytic[1] - analytic[2], 6);
  });

  it('keeps a tricolour’s halves either side of the centreline, not on the rail', () => {
    const [g, r] = anchorLights(
      [
        { fx: 0.1, py: 0.02, z: 1 },
        { fx: 0.1, py: -0.02, z: 1 },
      ],
      L,
      beam,
      profile,
    );
    expect(g[2]).toBeCloseTo((0.02 / beam) * 3, 6);
    expect(r[2]).toBeCloseTo(-(0.02 / beam) * 3, 6);
    expect(g[1]).toBeCloseTo(lightPosition({ fx: 0.1, py: 0.02, z: 1 }, L)[1], 6);
  });

  it('hangs a yard-end light outboard in proportion, at its own height', () => {
    const [yard] = anchorLights([{ fx: 0.1, py: beam * 1.6, z: 0.8 }], L, beam, profile);
    expect(yard[2]).toBeCloseTo(1.6 * 3, 6);
    expect(yard[1]).toBeCloseTo(lightPosition({ fx: 0.1, py: 0, z: 0.8 }, L)[1], 6);
  });

  it('collapses athwartships when the hull spec has no beam', () => {
    const [p] = anchorLights([{ fx: 0, py: 0.3, z: 0.2 }], L, 0, profile);
    expect(p[2]).toBe(0);
  });
});
