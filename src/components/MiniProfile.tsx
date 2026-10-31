import { Glow, PX, PZ, selectHull } from 'nav-wright';
import type { Hull } from 'nav-wright';
import { placeLights } from '../render/navWright';
import { lights } from '../data/colregs';
import type { Display, FactRecord } from '../engine/types';

export function MiniProfile({
  facts,
  display,
  hull = selectHull(facts),
}: {
  facts: FactRecord;
  display: Display;
  /** draw on this hull rather than the one `facts` selects (a quiz question's shared hull) */
  hull?: Hull;
}) {
  const placed = placeLights(display.lights, hull.spec, facts, lights);
  return (
    <svg viewBox="0 0 440 240" className="scene-svg" aria-hidden="true">
      <rect width="440" height="240" fill="var(--sea-night)" />
      <line x1="0" y1={PZ(0)} x2="440" y2={PZ(0)} stroke="var(--waterline)" />
      <hull.Profile />
      {placed.map((l) => (
        <Glow
          key={l.key}
          x={PX(l.fx) + l.py * 10}
          y={PZ(l.z)}
          color={l.color}
          flashing={l.character === 'flashing'}
          dim={l.py < -0.05}
        />
      ))}
    </svg>
  );
}
