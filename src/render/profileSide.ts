// Which side the profile shows: the observer's side of the vessel at
// relative bearing θ, so Profile and the 3D view agree on what is near.

export type ProfileSide = 'starboard' | 'port';

export function profileSide(theta: number): ProfileSide {
  const t = ((theta % 360) + 360) % 360;
  return t < 180 ? 'starboard' : 'port';
}

/** Lights as drawn from `side`: from port the athwartships offset flips, so
 * the starboard lights become the dimmed far side. */
export function seenFrom<T extends { py: number }>(
  placed: T[],
  side: ProfileSide,
): T[] {
  return side === 'starboard'
    ? placed
    : placed.map((l) => ({ ...l, py: -l.py }));
}
