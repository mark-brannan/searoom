// The boat from abeam (starboard side), lights glowing in place.

import type { ReactElement } from 'react';
import type { FactRecord } from '../engine/types';
import { AnchorCable, ProfileLights } from './annotations';
import type { Hull } from './hulls';
import { PZ } from './hulls';
import type { PlacedLight } from './placement';
import type { SceneLabels } from './labels';
import { defaultSceneLabels } from './labels';

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
      <AnchorCable hull={hull} facts={facts} />
      <hull.Profile />
      <ProfileLights placed={placed} />
    </svg>
  );
}
