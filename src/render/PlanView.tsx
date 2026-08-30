// Top-down arc sectors: each light's from/to bearing drawn around the
// hull — the view that explains why the bearing view changes.

import type { ReactElement } from 'react';
import { useIntl } from 'react-intl';
import type { Hull } from './hulls';
import type { PlacedLight } from './placement';
import { Glow, lightFill, polar, sectorPath } from './svg';

const C = 220;
const HULL_SCALE = 62;

export function PlanView({
  hull,
  placed,
  theta,
  onTheta,
}: {
  hull: Hull;
  placed: PlacedLight[];
  theta: number;
  onTheta: (t: number) => void;
}): ReactElement {
  const intl = useIntl();
  // one ring radius per distinct light arc+color, staggered outward
  const arcLights = placed.filter((l) => l.arc !== null);
  const ringKeys: string[] = [];
  for (const l of arcLights) {
    const k = `${l.color}:${l.arc!.from_deg}:${l.arc!.to_deg}`;
    if (!ringKeys.includes(k)) ringKeys.push(k);
  }
  const ringOf = (l: PlacedLight) =>
    ringKeys.indexOf(`${l.color}:${l.arc!.from_deg}:${l.arc!.to_deg}`);

  const seen = new Set<string>();
  const rings = arcLights.filter((l) => {
    const k = `${l.color}:${l.arc!.from_deg}:${l.arc!.to_deg}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const hullPath =
    hull.plan
      .map(
        ([fx, py], i) =>
          `${i === 0 ? 'M' : 'L'}${C + py * HULL_SCALE},${C - fx * HULL_SCALE}`,
      )
      .join(' ') + ' Z';

  const setFromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 440 - C;
    const y = ((e.clientY - rect.top) / rect.height) * 440 - C;
    const deg = (Math.atan2(x, -y) * 180) / Math.PI;
    onTheta(Math.round((deg + 360) % 360));
  };

  const [nx, ny] = polar(C, C, 196, theta);

  return (
    <svg
      viewBox="0 0 440 440"
      role="img"
      aria-label={intl.formatMessage({ id: 'scene.plan.alt' })}
      className="scene-svg plan-svg"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromPointer(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) setFromPointer(e);
      }}
    >
      <rect width="440" height="440" fill="var(--sea-night)" />
      {rings.map((l, i) => (
        <path
          key={l.key}
          d={sectorPath(
            C,
            C,
            84 + i * 13,
            84 + i * 13 + 11,
            l.arc!.from_deg,
            l.arc!.to_deg,
          )}
          fill={lightFill(l.color)}
          opacity={0.28}
          stroke={lightFill(l.color)}
          strokeOpacity={0.75}
          strokeWidth={1}
        />
      ))}
      {/* cutoff tick marks at 112.5 / 247.5 */}
      {[112.5, 247.5, 0].map((b) => {
        const [x1, y1] = polar(C, C, 74, b);
        const [x2, y2] = polar(C, C, 186, b);
        return (
          <line
            key={b}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--grid-line)"
            strokeWidth={1}
            strokeDasharray="2 5"
          />
        );
      })}
      <path d={hullPath} fill="var(--hull-fill)" stroke="var(--hull-stroke)" strokeWidth={1.5} />
      {/* lights at their true positions on the hull */}
      {arcLights.map((l) => (
        <Glow
          key={l.key}
          x={C + l.py * HULL_SCALE}
          y={C - l.fx * HULL_SCALE}
          color={l.color}
          r={3.2 + (ringOf(l) === 0 ? 0 : 0)}
          flashing={l.character === 'flashing'}
        />
      ))}
      {/* observer bearing needle */}
      <line x1={C} y1={C} x2={nx} y2={ny} stroke="var(--accent-soft)" strokeWidth={1.5} strokeDasharray="4 4" />
      <circle cx={nx} cy={ny} r={7} fill="none" stroke="var(--accent-soft)" strokeWidth={1.5} />
      <circle cx={nx} cy={ny} r={2.4} fill="var(--accent-soft)" />
    </svg>
  );
}
