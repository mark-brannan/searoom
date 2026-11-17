// The night sea under a field of lights: nav-wright BearingView's seascape
// (sea gradient below a horizon line), drawn from the same CSS variables and
// fallbacks so a field outside the bearing view shows the same sea.

import { useId } from 'react';

/** The 3D view's sea brightness (nav-wright seaColor, 0..1) on the night
 *  sea: #071124, close to the near end of the gradient below (#0a1424), so
 *  the 3D view and Identify's field read as the same sea. nav-wright's own
 *  default, 0.1, is near black. */
export const SEASCAPE_SEA = 0.3;

export function Seascape({
  width,
  height,
  horizon,
}: {
  width: number;
  height: number;
  /** y of the horizon in the SVG's coordinates; the sea fills below it */
  horizon: number;
}) {
  const id = `sea-${useId().replace(/:/g, '')}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--bearing-sea-near, #0a1424)" />
          <stop offset="1" stopColor="var(--bearing-sea-far, #03060b)" />
        </linearGradient>
      </defs>
      <rect
        className="bearing-sea"
        x="0"
        y={horizon}
        width={width}
        height={height - horizon}
        fill={`url(#${id})`}
      />
      <line
        className="bearing-horizon"
        x1="0"
        y1={horizon}
        x2={width}
        y2={horizon}
        stroke="var(--bearing-horizon, #1b2a42)"
        strokeWidth={1}
      />
    </>
  );
}
