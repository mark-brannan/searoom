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

// --- Anchoring lights to the mesh -----------------------------------------
//
// lightPosition() puts a light where the idealized 2D profile would, which
// is nowhere in particular on a stand-in mesh whose proportions are a
// cartoon's (searoom#22): a sidelight floats off the shoulder, a masthead
// light sits inside the cabin. The fix is to read the hull's shape back
// out of the mesh — a station profile, as a naval architect would draw
// one — and seat each light on the surface at a point that makes sense
// for that light on that hull.

/**
 * The hull's shape sampled fore-aft: `stations` bins of equal width from
 * `minX` to `maxX` (world metres, bow on +X), each recording the widest
 * point, the height of the hull's edge there, and the highest point of
 * anything at that station. Arrays run stern to bow. `mast` is the
 * tallest structure — on a tug, the funnel — as the fore-aft extent of
 * everything within MAST_BAND of the mesh's highest point.
 */
export interface StationProfile {
  minX: number;
  maxX: number;
  /** Max |z| (half-beam) per station. */
  halfBeam: number[];
  /** Max y among vertices out at the beam edge: the gunwale or sheer. */
  deck: number[];
  /** Max y of anything at the station: deck, cabin roof, funnel, mast. */
  top: number[];
  mast: { aftX: number; foreX: number; top: number };
}

export interface Station {
  halfBeam: number;
  deck: number;
  top: number;
}

export const PROFILE_STATIONS = 24;

/**
 * A vertex counts as "at the beam edge" when it is at least this fraction
 * of the station's half-beam outboard. Wide enough to catch a low-poly
 * gunwale, narrow enough to exclude a cabin side set in from the rail —
 * which is exactly the surface a sidelight must not be lifted onto.
 */
export const DECK_EDGE_BAND = 0.9;

/** Points at least this fraction of the mesh's height up are "the mast". */
export const MAST_BAND = 0.9;

/**
 * Densify a triangle mesh for profiling: the vertices plus points along
 * every edge no more than `spacing` apart. A low-poly mesh puts a whole
 * cabin roof in one quad, so a station in the middle of that roof sees
 * no vertex at all and reads as open deck; sampling the edges fills the
 * gap. `index` is the triangle list (three vertex indices per face); with
 * no index the vertices are taken as an unindexed triangle list.
 */
export function sampleEdges(
  xyz: ArrayLike<number>,
  index: ArrayLike<number> | null,
  spacing: number,
): number[] {
  const out: number[] = Array.from(xyz as ArrayLike<number>);
  if (!(spacing > 0)) return out;
  const n = Math.floor(xyz.length / 3);
  const tri = (i: number): number => (index ? index[i] : i);
  const faces = Math.floor((index ? index.length : n) / 3);
  const seen = new Set<number>();
  for (let f = 0; f < faces; f++) {
    const ids = [tri(f * 3), tri(f * 3 + 1), tri(f * 3 + 2)];
    for (let e = 0; e < 3; e++) {
      const a = ids[e];
      const b = ids[(e + 1) % 3];
      const key = a < b ? a * n + b : b * n + a;
      if (seen.has(key)) continue;
      seen.add(key);
      const ax = xyz[a * 3], ay = xyz[a * 3 + 1], az = xyz[a * 3 + 2];
      const dx = xyz[b * 3] - ax, dy = xyz[b * 3 + 1] - ay, dz = xyz[b * 3 + 2] - az;
      const len = Math.hypot(dx, dy, dz);
      const steps = Math.ceil(len / spacing);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        out.push(ax + t * dx, ay + t * dy, az + t * dz);
      }
    }
  }
  return out;
}

/**
 * Bin the mesh's points fore-aft into a StationProfile. `xyz` is a flat
 * world-space [x0, y0, z0, x1, ...] array in the same frame the lights use
 * (bow +X, up +Y, starboard +Z), i.e. after the hull placement has been
 * applied — and ideally after sampleEdges(). Returns null when there is
 * nothing to profile.
 *
 * A station with no points borrows from its neighbours by linear
 * interpolation, so a light can always be seated somewhere plausible
 * rather than on a zero-beam ghost hull.
 */
export function stationProfile(
  xyz: ArrayLike<number>,
  stations = PROFILE_STATIONS,
): StationProfile | null {
  const n = Math.floor(xyz.length / 3);
  if (n === 0 || stations < 1) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = xyz[i * 3];
    const y = xyz[i * 3 + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const span = maxX - minX;
  if (!(span > 0)) return null;

  const binOf = (x: number): number =>
    Math.min(stations - 1, Math.max(0, Math.floor(((x - minX) / span) * stations)));

  const halfBeam = new Array<number>(stations).fill(0);
  const top = new Array<number>(stations).fill(-Infinity);
  const deck = new Array<number>(stations).fill(-Infinity);
  const count = new Array<number>(stations).fill(0);
  const mast = { aftX: Infinity, foreX: -Infinity, top: maxY };
  const mastFloor = MAST_BAND * maxY;

  // Two passes: half-beam first, because "at the beam edge" is defined
  // relative to it.
  for (let i = 0; i < n; i++) {
    const x = xyz[i * 3];
    const b = binOf(x);
    const y = xyz[i * 3 + 1];
    const z = Math.abs(xyz[i * 3 + 2]);
    count[b]++;
    if (z > halfBeam[b]) halfBeam[b] = z;
    if (y > top[b]) top[b] = y;
    if (y >= mastFloor) {
      if (x < mast.aftX) mast.aftX = x;
      if (x > mast.foreX) mast.foreX = x;
    }
  }
  for (let i = 0; i < n; i++) {
    const b = binOf(xyz[i * 3]);
    const y = xyz[i * 3 + 1];
    const z = Math.abs(xyz[i * 3 + 2]);
    if (z >= DECK_EDGE_BAND * halfBeam[b] && y > deck[b]) deck[b] = y;
  }

  fillEmptyStations(count, halfBeam);
  fillEmptyStations(count, top);
  fillEmptyStations(count, deck);

  return { minX, maxX, halfBeam, deck, top, mast };
}

/** Replace the values of empty stations by interpolating between the
 * nearest filled neighbours, extending the end values outward. */
function fillEmptyStations(count: number[], values: number[]): void {
  const filled: number[] = [];
  for (let i = 0; i < count.length; i++) if (count[i] > 0) filled.push(i);
  if (filled.length === 0 || filled.length === count.length) return;
  for (let i = 0; i < count.length; i++) {
    if (count[i] > 0) continue;
    let lo = -1;
    let hi = -1;
    for (const f of filled) {
      if (f < i) lo = f;
      if (f > i && hi === -1) hi = f;
    }
    if (lo === -1) values[i] = values[hi];
    else if (hi === -1) values[i] = values[lo];
    else {
      const t = (i - lo) / (hi - lo);
      values[i] = values[lo] + t * (values[hi] - values[lo]);
    }
  }
}

/** World x of station i's centre. */
function stationX(profile: StationProfile, i: number): number {
  const width = (profile.maxX - profile.minX) / profile.halfBeam.length;
  return profile.minX + (i + 0.5) * width;
}

/** The hull's cross-section at world x, interpolated between station
 * centres and clamped to the ends of the profile. */
export function stationAt(profile: StationProfile, x: number): Station {
  const n = profile.halfBeam.length;
  const width = (profile.maxX - profile.minX) / n;
  // Position in station units, measured from the first station's centre.
  const u = Math.min(n - 1, Math.max(0, (x - profile.minX) / width - 0.5));
  const i = Math.floor(u);
  const j = Math.min(n - 1, i + 1);
  const t = u - i;
  const lerp = (a: number[]): number => a[i] + t * (a[j] - a[i]);
  return {
    halfBeam: lerp(profile.halfBeam),
    deck: lerp(profile.deck),
    top: lerp(profile.top),
  };
}

/**
 * Where the bow starts to narrow: the half-beam has fallen to this
 * fraction of the hull's widest. Sidelights go here, as on a small craft,
 * where the flare of the bow itself gives them their 112.5° arc.
 */
export const BOW_SHOULDER = 0.8;

/** World x of the bow shoulder: the forward-most point at which the
 * half-beam is still BOW_SHOULDER of the maximum. */
export function bowShoulder(profile: StationProfile): number {
  const hb = profile.halfBeam;
  const n = hb.length;
  const threshold = BOW_SHOULDER * Math.max(...hb);
  for (let i = n - 1; i >= 0; i--) {
    if (hb[i] < threshold) continue;
    if (i === n - 1) return stationX(profile, i);
    // Crossing between station i (wide enough) and i + 1 (too narrow).
    const t = (hb[i] - threshold) / (hb[i] - hb[i + 1]);
    return stationX(profile, i) + t * (stationX(profile, i + 1) - stationX(profile, i));
  }
  return stationX(profile, n - 1);
}

/**
 * Athwartships offset, as a multiple of the hull's half-beam, at or
 * beyond which a light is treated as sitting on the hull's side — a
 * sidelight. Below it the light is on the centreline (or a tricolour's
 * twin halves either side of it); above it the light hangs outboard of
 * the hull on a yard and keeps its height.
 */
export const SIDE_LIGHT_BAND: [number, number] = [0.8, 1.2];

export interface LightSeat {
  fx: number;
  py: number;
  z: number;
}

/** The hull spec's stations that placeLights keys lights on, in fx/py
 * units: enough to recognise "this light is on the mast" without a
 * light having to say so. */
export interface HullStations {
  /** Half-beam. */
  beam: number;
  mastX: number;
  aftMastX: number;
  sternX: number;
}

/**
 * Where each light sits on the mesh, in the same world as lightPosition():
 * one position per input light, in order.
 *
 * - A sidelight (|py| within SIDE_LIGHT_BAND of the half-beam) goes to
 *   the bow shoulder, on the rail at deck height, `clearance` above it.
 * - Lights on the hull's mast (fx = mastX) go to the front edge of the
 *   mesh's tallest structure — the funnel, on this tug — at its top;
 *   lights on the aft mast (fx = aftMastX) go to its aft edge, and the
 *   two share one lift so the aft masthead light stays higher than the
 *   forward one by the same margin the 2D profile gives it.
 * - Lights at the stern (fx = sternX) go to the aftmost point of the
 *   hull, on the transom's top edge.
 * - Every other light keeps its analytic station, and athwartships every
 *   light keeps its offset as a fraction of the half-beam, so a yard-end
 *   light hangs the same proportion outboard as in the 2D views.
 * - Except for sidelights, the lights sharing a station are lifted
 *   together — by however much the lowest of them needs — to clear the
 *   top of whatever the mesh has there. Together, so a vertical stack
 *   stays a stack with its spacing intact.
 *
 * Pure: no three.js, and the mesh is only present as its profile.
 */
export function anchorLights(
  lights: LightSeat[],
  lengthMeters: number,
  hull: HullStations,
  profile: StationProfile,
  clearance = 0,
): [number, number, number][] {
  const { beam } = hull;
  const analytic = lights.map((l) => lightPosition(l, lengthMeters));
  const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

  const isSide = (l: LightSeat): boolean => {
    if (!(beam > 0)) return false;
    const r = Math.abs(l.py) / beam;
    return r >= SIDE_LIGHT_BAND[0] && r <= SIDE_LIGHT_BAND[1];
  };

  // Where each light's station lands on the mesh, and how high the mesh
  // is there.
  const shoulderX = bowShoulder(profile);
  const seat = lights.map((l, i): { x: number; top: number; mast: boolean } => {
    if (isSide(l)) return { x: shoulderX, top: 0, mast: false };
    if (same(l.fx, hull.mastX))
      return { x: profile.mast.foreX, top: profile.mast.top, mast: true };
    if (same(l.fx, hull.aftMastX))
      return { x: profile.mast.aftX, top: profile.mast.top, mast: true };
    if (same(l.fx, hull.sternX))
      return { x: profile.minX, top: stationAt(profile, profile.minX).top, mast: false };
    const x = analytic[i][0];
    return { x, top: stationAt(profile, x).top, mast: false };
  });

  // Lift per station group: keyed on fx, since that is what placeLights
  // shares between the members of a stack. Both masts share one key.
  const groupKey = (l: LightSeat, i: number): string =>
    seat[i].mast ? 'mast' : String(Math.round(l.fx * 1000));
  const lift = new Map<string, number>();
  lights.forEach((l, i) => {
    if (isSide(l)) return;
    const key = groupKey(l, i);
    const need = seat[i].top + clearance - analytic[i][1];
    lift.set(key, Math.max(lift.get(key) ?? 0, need, 0));
  });

  return lights.map((l, i) => {
    const { x } = seat[i];
    const s = stationAt(profile, x);
    const z = beam > 0 ? (l.py / beam) * s.halfBeam : 0;
    if (isSide(l)) return [x, s.deck + clearance, z];
    return [x, analytic[i][1] + (lift.get(groupKey(l, i)) ?? 0), z];
  });
}
