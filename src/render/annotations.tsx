// The scene annotations shared by the 2D profile and the 3D model view:
// the anchor cable and every placed light, in the profile's coordinate
// space (viewBox 0 0 440 240). Both views consume the same `placed` array
// (the output of placeLights), so there is exactly one light-placement
// implementation.

import type { ReactElement } from 'react';
import type { FactRecord } from '../engine/types';
import type { Hull } from './hulls';
import { PX, PZ } from './hulls';
import type { PlacedLight } from './placement';
import { Glow } from './svg';

export function AnchorCable({
  hull,
  facts,
}: {
  hull: Hull;
  facts: FactRecord;
}): ReactElement | null {
  if (facts['fact:position'] !== 'position:anchored') return null;
  return (
    <line
      x1={PX(hull.spec.bowX)}
      y1={PZ(0.14)}
      x2={PX(hull.spec.bowX) + 26}
      y2={238}
      stroke="var(--rig-stroke)"
      strokeWidth={1}
      strokeDasharray="3 4"
    />
  );
}

export function ProfileLights({ placed }: { placed: PlacedLight[] }): ReactElement {
  return (
    <>
      {placed.map((l) => (
        <Glow
          key={l.key}
          x={PX(l.fx) + l.py * 10}
          y={PZ(l.z)}
          color={l.color}
          flashing={l.character === 'flashing'}
          dim={l.py < -0.05}
          r={l.lightId === 'light:deck_lights' ? 9 : 5}
        />
      ))}
    </>
  );
}
