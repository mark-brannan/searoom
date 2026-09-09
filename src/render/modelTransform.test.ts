// The scale/orientation/centering math used by BenchyModel. The last case
// re-derives the same placement through three.js itself, so the analytic
// version above can't quietly drift from the library's conventions.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BOW_SHOULDER,
  DECK_EDGE_BAND,
  MODEL_ROTATION_X,
  anchorLights,
  bowShoulder,
  lightPosition,
  placeHullModel,
  sampleEdges,
  stationAt,
  stationProfile,
} from './modelTransform';
import type { HullStations, ModelBox, StationProfile } from './modelTransform';

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

  it('finds the tallest structure’s extent as the mast', () => {
    // The funnel: the only thing within MAST_BAND of the mesh's height.
    expect(profile.mast.top).toBe(7);
    expect(profile.mast.aftX).toBeCloseTo(-3.25, 6);
    expect(profile.mast.foreX).toBeCloseTo(-2.75, 6);
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

describe('sampleEdges', () => {
  it('fills the middle of a flat quad that spans several stations', () => {
    // A roof from x = -4 to 4 as two triangles: vertices only at the
    // corners, so stations in the middle would see nothing.
    const xyz = [-4, 5, -2, 4, 5, -2, 4, 5, 2, -4, 5, 2];
    const index = [0, 1, 2, 0, 2, 3];
    const bare = stationProfile(xyz, 8)!;
    const dense = stationProfile(sampleEdges(xyz, index, 0.5), 8)!;
    // Without sampling the inner stations are interpolated from empty;
    // with it every station has a point on the roof's edge.
    expect(dense.top.every((t) => t === 5)).toBe(true);
    expect(bare.top.every((t) => t === 5)).toBe(true); // by interpolation
    expect(sampleEdges(xyz, index, 0.5).length).toBeGreaterThan(xyz.length);
  });

  it('keeps the original vertices and skips shared edges once', () => {
    const xyz = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const index = [0, 1, 2, 0, 2, 3];
    const out = sampleEdges(xyz, index, 0.5);
    expect(out.slice(0, 12)).toEqual(xyz);
    // 5 distinct edges (the diagonal once): 4 unit edges x 1 midpoint,
    // the diagonal (√2) split into 3 -> 2 midpoints.
    expect((out.length - 12) / 3).toBe(6);
  });

  it('treats an unindexed array as a triangle list', () => {
    const xyz = [0, 0, 0, 2, 0, 0, 0, 2, 0];
    expect((sampleEdges(xyz, null, 1).length - 9) / 3).toBe(1 + 1 + 2);
  });
});

describe('bowShoulder', () => {
  it('finds where the half-beam falls below the shoulder fraction', () => {
    const profile: StationProfile = {
      minX: 0,
      maxX: 4,
      halfBeam: [4, 4, 4, 2], // centres at 0.5, 1.5, 2.5, 3.5
      deck: [1, 1, 1, 1],
      top: [1, 1, 1, 1],
      mast: { aftX: 0, foreX: 0, top: 1 },
    };
    // Threshold 3.2 is crossed between the 2.5 and 3.5 stations, at 0.4
    // of the way.
    expect(BOW_SHOULDER).toBe(0.8);
    expect(bowShoulder(profile)).toBeCloseTo(2.9, 6);
  });

  it('uses the bow station itself when the hull never narrows', () => {
    const profile: StationProfile = {
      minX: 0,
      maxX: 4,
      halfBeam: [4, 4, 4, 4],
      deck: [1, 1, 1, 1],
      top: [1, 1, 1, 1],
      mast: { aftX: 0, foreX: 0, top: 1 },
    };
    expect(bowShoulder(profile)).toBe(3.5);
  });
});

describe('stationAt', () => {
  const profile: StationProfile = {
    minX: 0,
    maxX: 4,
    halfBeam: [1, 2, 3, 4],
    deck: [1, 1, 1, 1],
    top: [1, 2, 3, 4],
    mast: { aftX: 3, foreX: 4, top: 4 },
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
  // Hand-built profile for a 20 m vessel with 8 stations (2.5 m each,
  // centres at -8.75 ... 8.75): half-beam 3 amidships tapering over the
  // last two stations; deck at 2; a 6 m funnel from x = -3 to -1; a 4 m
  // cabin at the station forward of it; the transom top at 2.5.
  const profile: StationProfile = {
    minX: -10,
    maxX: 10,
    halfBeam: [3, 3, 3, 3, 3, 3, 2, 1],
    deck: [2.5, 2, 2, 2, 2, 2, 2, 2],
    top: [2.5, 2, 2, 6, 4, 2, 2, 2],
    mast: { aftX: -3, foreX: -1, top: 6 },
  };
  const L = 20;
  const hull: HullStations = { beam: 0.22, mastX: 0.2, aftMastX: -0.4, sternX: -0.88 };
  const { beam } = hull;
  const shoulderX = bowShoulder(profile);

  it('puts the bow shoulder where the hull starts to narrow', () => {
    // 3 -> 2 between the 3.75 and 6.25 stations; threshold 2.4 is 0.6
    // of the way along.
    expect(shoulderX).toBeCloseTo(3.75 + 0.6 * 2.5, 6);
  });

  it('seats the sidelights at the bow shoulder on the rail, starboard on +Z', () => {
    const [stbd, port] = anchorLights(
      [
        { fx: 0.3, py: beam, z: 0.32 },
        { fx: 0.3, py: -beam, z: 0.32 },
      ],
      L,
      hull,
      profile,
      0.2,
    );
    const s = stationAt(profile, shoulderX);
    expect(stbd[0]).toBeCloseTo(shoulderX, 6); // not the analytic station
    expect(stbd[1]).toBeCloseTo(s.deck + 0.2, 6); // deck + clearance
    expect(stbd[2]).toBeCloseTo(s.halfBeam, 6); // on the rail
    expect(port[2]).toBeCloseTo(-s.halfBeam, 6); // red to port
    expect(s.halfBeam).toBeCloseTo(2.4, 6);
  });

  it('puts the masthead light on the front edge of the mast, at its top', () => {
    // Analytic: x = 2 (over the cabin), y ≈ 4.9 — clear of the cabin but
    // nowhere near the funnel. It goes to the funnel's front edge instead,
    // lifted to its top.
    const [mh] = anchorLights([{ fx: hull.mastX, py: 0, z: 0.6 }], L, hull, profile, 0.2);
    expect(mh[0]).toBeCloseTo(-1, 6);
    expect(mh[1]).toBeCloseTo(6.2, 6);
    expect(mh[2]).toBeCloseTo(0, 6);
  });

  it('puts the aft masthead light on the aft edge, higher by the profile’s margin', () => {
    const fore = { fx: hull.mastX, py: 0, z: 0.6 };
    const aft = { fx: hull.aftMastX, py: 0, z: 0.77 };
    const [f, a] = anchorLights([fore, aft], L, hull, profile, 0.2);
    expect(a[0]).toBeCloseTo(-3, 6);
    expect(a[1] - f[1]).toBeCloseTo(
      lightPosition(aft, L)[1] - lightPosition(fore, L)[1],
      6,
    );
    expect(f[1]).toBeCloseTo(6.2, 6);
  });

  it('keeps a mast stack together on the mast', () => {
    const stack = [0.78, 0.65, 0.52].map((z) => ({ fx: hull.mastX, py: 0, z }));
    const out = anchorLights(stack, L, hull, profile, 0.2);
    const analytic = stack.map((l) => lightPosition(l, L)[1]);
    expect(out.every((p) => p[0] === -1)).toBe(true);
    expect(out[2][1]).toBeCloseTo(6.2, 6); // the lowest clears the funnel
    expect(out[0][1] - out[2][1]).toBeCloseTo(analytic[0] - analytic[2], 6);
  });

  it('puts the sternlight on the aft edge of the transom, and the towing light above it', () => {
    const stern = { fx: hull.sternX, py: 0, z: 0.24 };
    const towing = { fx: hull.sternX, py: 0, z: 0.37 };
    const [s, t] = anchorLights([stern, towing], L, hull, profile, 0.2);
    expect(s[0]).toBe(-10);
    expect(s[1]).toBeCloseTo(2.7, 6); // transom top + clearance
    expect(t[0]).toBe(-10);
    expect(t[1] - s[1]).toBeCloseTo(
      lightPosition(towing, L)[1] - lightPosition(stern, L)[1],
      6,
    );
  });

  it('lifts any other centreline light above the structure at its own station', () => {
    // An anchor light forward of the mast, at x = 1.25 (the cabin station,
    // 4 m high) and analytic height ≈ 2.4.
    const [p] = anchorLights([{ fx: 0.125, py: 0, z: 0.3 }], L, hull, profile, 0.2);
    expect(p[0]).toBeCloseTo(1.25, 6);
    expect(p[1]).toBeCloseTo(4.2, 6);
  });

  it('leaves a light already clear of the structure at its analytic height', () => {
    const l = { fx: 0.125, py: 0, z: 1.2 };
    const [p] = anchorLights([l], L, hull, profile, 0.2);
    expect(p[1]).toBeCloseTo(lightPosition(l, L)[1], 6);
  });

  it('keeps a tricolour’s halves either side of the mast, not on the rail', () => {
    const [g, r] = anchorLights(
      [
        { fx: hull.mastX, py: 0.02, z: 1 },
        { fx: hull.mastX, py: -0.02, z: 1 },
      ],
      L,
      hull,
      profile,
    );
    const hb = stationAt(profile, -1).halfBeam;
    expect(g[2]).toBeCloseTo((0.02 / beam) * hb, 6);
    expect(r[2]).toBeCloseTo(-(0.02 / beam) * hb, 6);
    expect(g[0]).toBe(-1);
  });

  it('hangs a yard-end light outboard in proportion, at its own station', () => {
    const [yard] = anchorLights([{ fx: 0.125, py: beam * 1.6, z: 0.8 }], L, hull, profile);
    expect(yard[0]).toBeCloseTo(1.25, 6);
    expect(yard[2]).toBeCloseTo(1.6 * 3, 6);
    expect(yard[1]).toBeCloseTo(lightPosition({ fx: 0.125, py: 0, z: 0.8 }, L)[1], 6);
  });

  it('collapses athwartships when the hull spec has no beam', () => {
    const [p] = anchorLights([{ fx: 0, py: 0.3, z: 0.2 }], L, { ...hull, beam: 0 }, profile);
    expect(p[2]).toBe(0);
  });
});
