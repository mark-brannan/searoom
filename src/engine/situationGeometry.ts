// Derives `Situation`'s relative-geometry fields (issue #95 item 2) from
// the two vessels' `kin:position`/`kin:heading_deg`/`kin:sog_kn`. Flat-earth
// approximation — fine at the few-nm scale this app works at, no need for
// great-circle math. No bearing/range helper exists in `nav-wright`
// (checked its exports: hull/placement/scene-rendering only), so this is
// hand-rolled.

interface LatLon {
  latitude: number;
  longitude: number;
}

const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LON_AT_EQUATOR = 111320;
const KN_TO_MS = 0.514444;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Flat-earth offset from `from` to `to`, in metres, east/north. */
function offsetMeters(from: LatLon, to: LatLon): { east: number; north: number } {
  const east =
    (to.longitude - from.longitude) *
    M_PER_DEG_LON_AT_EQUATOR *
    Math.cos(toRad(from.latitude));
  const north = (to.latitude - from.latitude) * M_PER_DEG_LAT;
  return { east, north };
}

function bearingDeg(from: LatLon, to: LatLon): number {
  const { east, north } = offsetMeters(from, to);
  return norm360(toDeg(Math.atan2(east, north)));
}

function velocityMs(headingDeg: number, sogKn: number): { east: number; north: number } {
  const sog = sogKn * KN_TO_MS;
  return { east: sog * Math.sin(toRad(headingDeg)), north: sog * Math.cos(toRad(headingDeg)) };
}

export interface DerivedGeometry {
  /** Bearing of `other` off `self`'s own heading (self's relative bearing). */
  selfRelBearingDeg: number;
  /** Bearing of `self` off `other`'s own heading (other's aspect). */
  otherRelBearingDeg: number;
  rangeM: number;
  /** `undefined` when the relative velocity is ~0 (parallel, same-speed
   * courses) — no CPA changes over time, so tcpa/cpa are unavailable rather
   * than a divide-by-~0 result. */
  tcpaS: number | undefined;
  cpaM: number | undefined;
  /** deg/min, positive when the compass bearing of `other` from `self` is
   * increasing. Derived the same way tcpa is: bearing now vs. bearing one
   * second forward along the relative-motion vector. */
  bearingChangeDegMin: number;
}

export interface VesselKinematics {
  position: LatLon;
  headingDeg: number;
  sogKn: number;
}

/** The caller (`situationBuilder.ts`) only calls this once both vessels
 * have a `kin:position`/`kin:heading_deg`/`kin:sog_kn` to derive from —
 * missing data is a caller-side branch, not this function's concern. */
export function deriveGeometry(
  self: VesselKinematics,
  other: VesselKinematics,
): DerivedGeometry {
  const selfToOther = bearingDeg(self.position, other.position);
  const otherToSelf = bearingDeg(other.position, self.position);
  const selfRelBearingDeg = norm360(selfToOther - self.headingDeg);
  const otherRelBearingDeg = norm360(otherToSelf - other.headingDeg);

  const rSelf = { east: 0, north: 0 };
  const rOther = offsetMeters(self.position, other.position);
  const rEast = rOther.east - rSelf.east;
  const rNorth = rOther.north - rSelf.north;

  const vSelf = velocityMs(self.headingDeg, self.sogKn);
  const vOther = velocityMs(other.headingDeg, other.sogKn);
  const vEast = vOther.east - vSelf.east;
  const vNorth = vOther.north - vSelf.north;

  const rangeM = Math.hypot(rEast, rNorth);
  const vv = vEast * vEast + vNorth * vNorth;
  const rv = rEast * vEast + rNorth * vNorth;

  // Parallel/same-speed courses: no CPA ever changes, so tcpa/cpa are
  // unavailable rather than a divide-by-~0 result. A diverging pair
  // (negative tcpa, CPA already passed) is a legitimate derived state and
  // is reported as-is — nothing in the schema clamps it to zero.
  let tcpaS: number | undefined;
  let cpaM: number | undefined;
  if (vv > 1e-6) {
    tcpaS = -rv / vv;
    const cEast = rEast + vEast * tcpaS;
    const cNorth = rNorth + vNorth * tcpaS;
    cpaM = Math.hypot(cEast, cNorth);
  }

  const dt = 1;
  const bearingNow = norm360(toDeg(Math.atan2(rEast, rNorth)));
  const bearingNext = norm360(
    toDeg(Math.atan2(rEast + vEast * dt, rNorth + vNorth * dt)),
  );
  let delta = bearingNext - bearingNow;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const bearingChangeDegMin = (delta / dt) * 60;

  return {
    selfRelBearingDeg,
    otherRelBearingDeg,
    rangeM,
    tcpaS,
    cpaM,
    bearingChangeDegMin,
  };
}
