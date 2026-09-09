// The boat from abeam (starboard side), lights glowing in place.

import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import type { FactRecord } from '../engine/types';
import { render3dEnabled } from './featureFlags';
import type { Hull } from './hulls';
import { PX, PZ } from './hulls';
import type { PlacedLight } from './placement';
import type { SceneLabels } from './labels';
import { defaultSceneLabels } from './labels';
import { Glow } from './svg';

// Lazy: three.js only ships to a browser that actually hits the flag, so
// the 2D-default path's bundle is untouched.
const VesselModel3D = lazy(() =>
  import('./VesselModel3D').then((m) => ({ default: m.VesselModel3D })),
);

// The one hull the three.js path stands in for while it's behind a flag —
// see featureFlags.ts and MODELS.md. Every other hull keeps the SVG
// profile regardless of the flag.
const MODEL_3D_HULL_ID = 'power-small';

export function ProfileView({
  hull,
  placed,
  facts,
  labels = defaultSceneLabels,
}: {
  hull: Hull;
  placed: PlacedLight[];
  facts: FactRecord;
  labels?: SceneLabels;
}): ReactElement {
  const anchored = facts['fact:position'] === 'position:anchored';

  if (hull.spec.id === MODEL_3D_HULL_ID && render3dEnabled()) {
    const lengthMeters =
      typeof facts['fact:length_m'] === 'number' ? facts['fact:length_m'] : 12;
    return (
      <Suspense fallback={<div className="scene-3d" />}>
        <VesselModel3D lengthMeters={lengthMeters} />
      </Suspense>
    );
  }

  return (
    <svg
      viewBox="0 0 440 240"
      role="img"
      aria-label={labels.profileAlt}
      className="scene-svg"
    >
      <rect width="440" height="240" fill="var(--sea-night)" />
      {/* horizon + waterline */}
      <line x1="0" y1={PZ(0)} x2="440" y2={PZ(0)} stroke="var(--waterline)" strokeWidth="1" />
      <rect x="0" y={PZ(0)} width="440" height={240 - PZ(0)} fill="var(--sea-below)" />
      {anchored && (
        <line
          x1={PX(hull.spec.bowX)}
          y1={PZ(0.14)}
          x2={PX(hull.spec.bowX) + 26}
          y2={238}
          stroke="var(--rig-stroke)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      )}
      <hull.Profile />
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
    </svg>
  );
}
