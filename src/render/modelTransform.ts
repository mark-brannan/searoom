// Pure geometry for seating a 3D hull model in the profile scene: scale to
// the vessel's length, rotate the source model's up-axis onto three.js's,
// centre it fore-aft and athwartships, and rest the keel on the waterline.
//
// Deliberately free of three.js and React so it can be unit-tested with
// plain numbers (modelTransform.test.ts) and travel alongside placement.ts
// if these renderers move into a library. The caller supplies the model's
// untransformed bounding box; everything after that is arithmetic.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** An axis-aligned bounding box in the source model's own coordinates. */
export interface ModelBox {
  min: Vec3;
  max: Vec3;
}

export interface ModelPlacement {
  /** Uniform scale factor applied to the model. */
  scale: number;
  /** Rotation about X, in radians, applied before the scale is measured. */
  rotationX: number;
  /** Translation applied after rotation and scale, as [x, y, z]. */
  position: [number, number, number];
}

/**
 * Source models here (Benchy, from an STL) are authored Z-up with the bow
 * on local +X. A quarter turn about X puts height on three.js's +Y and
 * leaves the bow on +X — the "bow right" convention the SVG profile uses.
 */
export const MODEL_ROTATION_X = -Math.PI / 2;

/**
 * Where to put a hull model so it reads as a vessel of `lengthMeters`
 * floating at the origin: bow on +X, keel on the waterline (y = 0),
 * centred fore-aft and athwartships.
 *
 * A degenerate model (no length) or a nonsense vessel length leaves the
 * scale at 1 rather than collapsing or inverting the mesh.
 */
export function placeHullModel(
  raw: ModelBox,
  lengthMeters: number,
): ModelPlacement {
  const rawLength = raw.max.x - raw.min.x;
  const scale =
    rawLength > 0 && Number.isFinite(lengthMeters) && lengthMeters > 0
      ? lengthMeters / rawLength
      : 1;

  // MODEL_ROTATION_X maps local (x, y, z) to world (x, z, -y), so the
  // world extents of the scaled box are:
  //   x: [s*min.x, s*max.x]   (fore-aft)
  //   y: [s*min.z, s*max.z]   (height)
  //   z: [-s*max.y, -s*min.y] (athwartships)
  const centreX = (scale * (raw.min.x + raw.max.x)) / 2;
  const keelY = scale * raw.min.z;
  const centreZ = (-scale * (raw.min.y + raw.max.y)) / 2;

  return {
    scale,
    rotationX: MODEL_ROTATION_X,
    position: [-centreX, -keelY, -centreZ],
  };
}

/**
 * Where a placed light sits in the 3D scene, in the same world the hull
 * model is placed into: bow on +X, up on +Y, starboard on +Z. (Bow and up
 * fix the third axis: in a right-handed frame X x Y = Z is east when X is
 * north and Y is up, so +Z is starboard. Get this backwards and the
 * sidelights swap sides, which is the one error this app cannot make.)
 *
 * `placeLights` works in hull-relative fractions (fx fore-aft, py
 * athwartships, z height) that the SVG profile scales by PX/PZ. The ratio
 * of those two scales (150 vertical to 185 half-length) is what keeps a
 * masthead light at the same relative height here as it is in the 2D
 * views; anything else and the same light would sit at two different
 * heights depending on which tab you were on.
 */
export const LIGHT_Z_TO_X = 150 / 185;

export function lightPosition(
  light: { fx: number; py: number; z: number },
  lengthMeters: number,
): [number, number, number] {
  // fx and py share one scale — the plan view plots both against
  // HULL_SCALE — so athwartships needs no separate beam figure.
  const halfLength = lengthMeters / 2;
  return [
    light.fx * halfLength,
    light.z * halfLength * LIGHT_Z_TO_X,
    light.py * halfLength,
  ];
}
