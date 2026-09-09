// Naming a relative bearing. Its own module so both the bearing view and
// the shared ThetaControl can use it without importing a view.

import type { Aspect } from './labels';

export function bearingLabel(theta: number): Aspect {
  // named aspects at the conventional sector centers
  const t = ((theta % 360) + 360) % 360;
  if (t < 11.25 || t >= 348.75) return 'ahead';
  if (t < 78.75) return 'starboard-bow';
  if (t < 101.25) return 'starboard-beam';
  if (t < 168.75) return 'starboard-quarter';
  if (t < 191.25) return 'astern';
  if (t < 258.75) return 'port-quarter';
  if (t < 281.25) return 'port-beam';
  return 'port-bow';
}
