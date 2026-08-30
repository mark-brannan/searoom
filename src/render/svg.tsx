// Shared SVG bits: the light glow and sector-arc path math.

import type { ReactElement } from 'react';

export const LIGHT_COLORS: Record<string, string> = {
  white: '#f5f5f0',
  red: '#ff4d42',
  green: '#3fd05e',
  yellow: '#ffd23f',
};

export function lightFill(color: string): string {
  return LIGHT_COLORS[color] ?? LIGHT_COLORS.white;
}

export function Glow({
  x,
  y,
  color,
  r = 5,
  flashing = false,
  dim = false,
}: {
  x: number;
  y: number;
  color: string;
  r?: number;
  flashing?: boolean;
  dim?: boolean;
}): ReactElement {
  const fill = lightFill(color);
  return (
    <g
      className={flashing ? 'light-flash' : undefined}
      opacity={dim ? 0.45 : 1}
    >
      <circle cx={x} cy={y} r={r * 2.6} fill={fill} opacity={0.16} />
      <circle cx={x} cy={y} r={r * 1.5} fill={fill} opacity={0.3} />
      <circle cx={x} cy={y} r={r} fill={fill} />
      <circle cx={x} cy={y} r={r * 0.45} fill="#ffffff" opacity={0.85} />
    </g>
  );
}

/** Point at bearing β (deg cw from ahead) and radius r, bow pointing up. */
export function polar(
  cx: number,
  cy: number,
  r: number,
  bearingDeg: number,
): [number, number] {
  const a = (bearingDeg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

/** Annulus sector from bearing `from` clockwise to `to`. */
export function sectorPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  from: number,
  to: number,
): string {
  let extent = (to - from + 360) % 360;
  if (extent === 0) extent = 360;
  if (extent >= 360) {
    // full ring: two half arcs
    const [ax, ay] = polar(cx, cy, r1, 0);
    const [bx, by] = polar(cx, cy, r1, 180);
    const [cx0, cy0] = polar(cx, cy, r0, 0);
    const [dx, dy] = polar(cx, cy, r0, 180);
    return [
      `M${ax},${ay}`,
      `A${r1},${r1} 0 1 1 ${bx},${by}`,
      `A${r1},${r1} 0 1 1 ${ax},${ay}`,
      `M${cx0},${cy0}`,
      `A${r0},${r0} 0 1 0 ${dx},${dy}`,
      `A${r0},${r0} 0 1 0 ${cx0},${cy0}`,
    ].join(' ');
  }
  const large = extent > 180 ? 1 : 0;
  const [a1x, a1y] = polar(cx, cy, r1, from);
  const [a2x, a2y] = polar(cx, cy, r1, to);
  const [b2x, b2y] = polar(cx, cy, r0, to);
  const [b1x, b1y] = polar(cx, cy, r0, from);
  return [
    `M${a1x},${a1y}`,
    `A${r1},${r1} 0 ${large} 1 ${a2x},${a2y}`,
    `L${b2x},${b2y}`,
    `A${r0},${r0} 0 ${large} 0 ${b1x},${b1y}`,
    'Z',
  ].join(' ');
}
