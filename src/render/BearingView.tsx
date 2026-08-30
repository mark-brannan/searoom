// The exam-critical view: lights only, on black, seen from relative
// bearing theta. Sidelight cutoffs and masthead arc edges happen live as
// theta sweeps — arcs come straight from lights.json via placement.

import type { ReactElement } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Hull } from './hulls';
import type { PlacedLight } from './placement';
import { bearingInArc } from './placement';
import { Glow } from './svg';

const CX = 220;
const HORIZON = 150;
const SCALE = 150;
const ZSCALE = 95;

export function bearingLabel(theta: number): string {
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

export function BearingView({
  hull,
  placed,
  theta,
  onTheta,
  hullHint,
}: {
  hull: Hull;
  placed: PlacedLight[];
  theta: number;
  onTheta: (t: number) => void;
  hullHint: boolean;
}): ReactElement {
  const intl = useIntl();
  const rad = (theta * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);

  const projected = placed
    .map((l) => ({
      light: l,
      visible: bearingInArc(theta, l.arc),
      x: CX + (l.fx * sin - l.py * cos) * SCALE,
      y: HORIZON - l.z * ZSCALE,
    }))
    .filter((p) => p.visible);

  // faint hull hint: project the plan outline to a horizontal extent
  const hullXs = hull.plan.map(([fx, py]) => CX + (fx * sin - py * cos) * SCALE);
  const minX = Math.min(...hullXs);
  const maxX = Math.max(...hullXs);

  return (
    <div className="bearing-view">
      <svg
        viewBox="0 0 440 240"
        role="img"
        aria-label={intl.formatMessage(
          { id: 'scene.bearing.alt' },
          { theta: Math.round(theta) },
        )}
        className="scene-svg scene-svg-black"
      >
        <rect width="440" height="240" fill="#000000" />
        {hullHint && (
          <path
            d={`M${minX},${HORIZON + 14} L${minX + 8},${HORIZON + 4} L${maxX - 8},${HORIZON + 4} L${maxX},${HORIZON + 14} Z`}
            fill="#10161f"
            stroke="#1d2836"
            strokeWidth={1}
          />
        )}
        {projected.map((p) => (
          <Glow
            key={p.light.key}
            x={p.x}
            y={p.y}
            color={p.light.color}
            flashing={p.light.character === 'flashing'}
            r={5.5}
          />
        ))}
        {projected.length === 0 && (
          <text x="220" y="120" textAnchor="middle" className="bearing-empty">
            <FormattedMessage id="scene.bearing.noLights" />
          </text>
        )}
      </svg>
      <div className="theta-control">
        <label htmlFor="theta">
          <FormattedMessage id="scene.bearing.thetaLabel" />
        </label>
        <input
          id="theta"
          type="range"
          min={0}
          max={359}
          step={1}
          value={Math.round(theta)}
          onChange={(e) => onTheta(Number(e.target.value))}
          aria-valuetext={intl.formatMessage(
            { id: 'scene.bearing.thetaValue' },
            {
              theta: Math.round(theta),
              aspect: intl.formatMessage({
                id: `aspect.${bearingLabel(theta)}`,
              }),
            },
          )}
        />
        <span className="theta-readout">
          {Math.round(theta)}°&ensp;
          <FormattedMessage id={`aspect.${bearingLabel(theta)}`} />
        </span>
      </div>
    </div>
  );
}
