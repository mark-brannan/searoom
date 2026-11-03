// A preset's thumbnail (searoom#103): her profile drawing at night with the
// first lawful display's lights, small enough to sit on a gallery card. Drawn
// from the same hull and placement the scene uses, so the thumbnail and the
// scene she opens never disagree. Until the roster's drawings land these are
// the current ones.

import { useMemo } from 'react';
import { Glow, PX, PZ, selectHull } from 'nav-wright';
import { placeLights } from '../render/navWright';
import { lights as lightCatalog } from '../data/colregs';
import { evaluateDisplayIn } from '../engine/evaluate';
import type { FactRecord } from '../engine/types';

// the hull spans x 35..405 and the lights stand above the waterline at 185;
// cropping the scene's 440×240 frame to that keeps her large on a small card
const VIEW = { x: 20, y: 20, w: 400, h: 190 };
// a light at the scene's radius is a pixel at thumbnail size
const LIGHT_R = 11;

export function PresetThumb({
  facts,
  jurisdiction,
}: {
  facts: FactRecord;
  jurisdiction: string;
}) {
  const hull = selectHull(facts);
  const placed = useMemo(() => {
    const display = evaluateDisplayIn(jurisdiction, facts).displays[0];
    if (!display) return [];
    return placeLights(display.lights, hull.spec, facts, lightCatalog);
  }, [jurisdiction, facts, hull.spec]);
  return (
    <svg
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      className="preset-thumb"
      aria-hidden="true"
    >
      <rect
        x={VIEW.x}
        y={VIEW.y}
        width={VIEW.w}
        height={VIEW.h}
        fill="var(--sea-night)"
      />
      <line
        x1={VIEW.x}
        y1={PZ(0)}
        x2={VIEW.x + VIEW.w}
        y2={PZ(0)}
        stroke="var(--waterline)"
      />
      <hull.Profile />
      {placed.map((l) => (
        <Glow
          key={l.key}
          x={PX(l.fx) + l.py * 10}
          y={PZ(l.z)}
          r={LIGHT_R}
          color={l.color}
          flashing={l.character === 'flashing'}
          dim={l.py < -0.05}
        />
      ))}
    </svg>
  );
}
