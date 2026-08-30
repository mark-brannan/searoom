// The boat from abeam (starboard side), lights glowing in place.

import type { ReactElement } from 'react';
import { useIntl } from 'react-intl';
import type { FactRecord } from '../engine/types';
import type { Hull } from './hulls';
import { PX, PZ } from './hulls';
import type { PlacedLight } from './placement';
import { Glow } from './svg';

export function ProfileView({
  hull,
  placed,
  facts,
}: {
  hull: Hull;
  placed: PlacedLight[];
  facts: FactRecord;
}): ReactElement {
  const intl = useIntl();
  const anchored = facts['fact:position'] === 'position:anchored';
  return (
    <svg
      viewBox="0 0 440 240"
      role="img"
      aria-label={intl.formatMessage({ id: 'scene.profile.alt' })}
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
